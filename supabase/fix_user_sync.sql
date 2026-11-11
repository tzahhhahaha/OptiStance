-- ============================================================================
-- Fix: Auto-sync auth.users <-> public.users on signup & permanent deletion
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================================

-- 0. Ensure public.is_admin() helper exists
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

-- 1. Create trigger function to sync auth.users → public.users on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into public.users (id matches auth.users.id)
  INSERT INTO public.users (id, email, full_name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'athlete',
    true
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create athlete profile for the new user
  INSERT INTO public.athlete_profiles (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create trigger on auth.users for signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Backfill: Create public.users records for EXISTING auth users
--    (This handles users who already signed up before the trigger was added)
INSERT INTO public.users (id, email, full_name, role, is_active)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email),
  'athlete',
  true
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 4. Backfill: Create athlete_profiles for existing users
INSERT INTO public.athlete_profiles (user_id)
SELECT u.id
FROM public.users u
LEFT JOIN public.athlete_profiles ap ON ap.user_id = u.id
WHERE ap.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- 5. Permanent Account & Telemetry Deletion (Admin & Self-Service)
CREATE OR REPLACE FUNCTION public.delete_user_account(
  p_user_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_target uuid := COALESCE(p_user_id, auth.uid());
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF v_target <> v_caller AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized to delete this account' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.ticket_replies WHERE admin_id = v_target;
  DELETE FROM public.support_tickets WHERE user_id = v_target;
  DELETE FROM public.practice_sessions WHERE user_id = v_target;
  DELETE FROM public.media_uploads WHERE user_id = v_target;
  DELETE FROM public.athlete_profiles WHERE user_id = v_target;
  DELETE FROM public.users WHERE id = v_target;
  DELETE FROM auth.users WHERE id = v_target;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_account(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_account(uuid) TO authenticated;

-- 6. Cascade delete public.users whenever a user is deleted from auth.users
CREATE OR REPLACE FUNCTION public.handle_deleted_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.ticket_replies WHERE admin_id = OLD.id;
  DELETE FROM public.users WHERE id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_deleted_user();

-- 7. Support Desk: Two-way ticket replies and status updates
DROP POLICY IF EXISTS "Athletes can create own tickets" ON public.support_tickets;
CREATE POLICY "Athletes can create own tickets"
  ON public.support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Athletes view own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins view all tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Ticket owners can view support desk updates" ON public.support_tickets;

CREATE POLICY "Athletes view own tickets"
  ON public.support_tickets FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin()
    OR subject LIKE '\_\_ticket\_%'
  );

DROP POLICY IF EXISTS "Admins can update tickets" ON public.support_tickets;
CREATE POLICY "Admins can update tickets"
  ON public.support_tickets FOR UPDATE
  TO authenticated
  USING (public.is_admin() OR auth.uid() = user_id)
  WITH CHECK (public.is_admin() OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can delete tickets" ON public.support_tickets;
CREATE POLICY "Admins can delete tickets"
  ON public.support_tickets FOR DELETE
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Ticket owners can view replies" ON public.ticket_replies;
DROP POLICY IF EXISTS "Admins can view all ticket replies" ON public.ticket_replies;
DROP POLICY IF EXISTS "Ticket participants view replies" ON public.ticket_replies;

CREATE POLICY "Ticket participants view replies"
  ON public.ticket_replies FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_replies.ticket_id
        AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can insert ticket replies" ON public.ticket_replies;
DROP POLICY IF EXISTS "Ticket participants can insert replies" ON public.ticket_replies;

CREATE POLICY "Ticket participants can insert replies"
  ON public.ticket_replies FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = admin_id
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.support_tickets t
        WHERE t.id = ticket_id AND t.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Admins can delete ticket replies" ON public.ticket_replies;
CREATE POLICY "Admins can delete ticket replies"
  ON public.ticket_replies FOR DELETE
  TO authenticated
  USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.add_support_ticket_reply(
  p_ticket_id uuid,
  p_message text
)
RETURNS public.ticket_replies
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_owner uuid;
  v_status text;
  v_row public.ticket_replies;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF p_message IS NULL OR length(trim(p_message)) = 0 THEN
    RAISE EXCEPTION 'Reply message is empty' USING ERRCODE = '22023';
  END IF;

  SELECT user_id, status INTO v_owner, v_status
  FROM public.support_tickets WHERE id = p_ticket_id;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Ticket not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_owner <> v_caller AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not allowed to reply to this ticket' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.ticket_replies (ticket_id, admin_id, message)
  VALUES (p_ticket_id, v_caller, trim(p_message))
  RETURNING * INTO v_row;

  UPDATE public.support_tickets
  SET updated_at = CURRENT_TIMESTAMP,
      status = CASE
        WHEN v_owner = v_caller AND v_status = 'resolved' THEN 'open'
        ELSE status
      END
  WHERE id = p_ticket_id;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.add_support_ticket_reply(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_support_ticket_reply(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_support_ticket_status(
  p_ticket_id uuid,
  p_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only the Support Desk can change ticket status' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('open', 'in_progress', 'resolved') THEN
    RAISE EXCEPTION 'Invalid status %', p_status USING ERRCODE = '22023';
  END IF;

  UPDATE public.support_tickets
  SET status = p_status, updated_at = CURRENT_TIMESTAMP
  WHERE id = p_ticket_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_support_ticket_status(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_support_ticket_status(uuid, text) TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.ticket_replies TO authenticated;

-- Backfill any existing bridge replies previously sent into ticket_replies so they show up immediately
DO $$
BEGIN
  INSERT INTO public.ticket_replies (id, ticket_id, admin_id, message, created_at)
  SELECT
    st.id,
    replace(st.subject, '__ticket_reply__:', '')::uuid AS ticket_id,
    st.user_id AS admin_id,
    COALESCE(
      CASE 
        WHEN st.description LIKE '{%}' THEN (st.description::json->>'message')
        ELSE st.description
      END,
      st.description
    ) AS message,
    st.created_at
  FROM public.support_tickets st
  WHERE st.subject LIKE '\_\_ticket\_reply\_\_:%'
  ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN others THEN
  NULL;
END $$;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
  EXCEPTION WHEN duplicate_object OR undefined_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_replies;
  EXCEPTION WHEN duplicate_object OR undefined_object THEN NULL;
  END;
END $$;

-- 8. Verify
SELECT '✅ User sync & permanent deletion triggers created' AS status;
SELECT 'Users in public.users:' AS info, COUNT(*) AS count FROM public.users;
SELECT 'Users in auth.users:' AS info, COUNT(*) AS count FROM auth.users;
SELECT 'Athlete profiles:' AS info, COUNT(*) AS count FROM public.athlete_profiles;
