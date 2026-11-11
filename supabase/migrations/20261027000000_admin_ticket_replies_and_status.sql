-- ============================================================================
-- Support Desk: two-way ticket replies, status updates & real-time sync
--
-- Safe to run more than once in Supabase Dashboard -> SQL Editor.
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

-- 1. Ensure authenticated users can insert their own tickets
DROP POLICY IF EXISTS "Athletes can create own tickets" ON public.support_tickets;

CREATE POLICY "Athletes can create own tickets"
  ON public.support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 2. Allow admins and owners to view tickets (including bridge updates)
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

-- 3. Allow admins to update support ticket status & timestamps
DROP POLICY IF EXISTS "Admins can update tickets" ON public.support_tickets;

CREATE POLICY "Admins can update tickets"
  ON public.support_tickets FOR UPDATE
  TO authenticated
  USING (public.is_admin() OR auth.uid() = user_id)
  WITH CHECK (public.is_admin() OR auth.uid() = user_id);

-- 4. Allow admins to delete support tickets (cascades to ticket_replies)
DROP POLICY IF EXISTS "Admins can delete tickets" ON public.support_tickets;

CREATE POLICY "Admins can delete tickets"
  ON public.support_tickets FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- 5. Replies: Allow ticket participants (admin or ticket owner) to view replies
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

-- 6. Replies: admins AND the ticket owner (athlete) can post in the thread
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

-- 7. RPC: add a reply (works for the Support Desk admin and the ticket owner)
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

  -- Athlete replying on a resolved ticket re-opens it for the Support Desk.
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

-- 8. RPC: update ticket status (Support Desk admins only)
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

-- 9. Explicit table grants so policies are never blocked by missing role privileges
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.ticket_replies TO authenticated;

-- 10. Backfill any existing bridge replies previously sent into ticket_replies so they show up immediately
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
  -- Ignore backfill format exceptions
  NULL;
END $$;

-- 11. Real-time: stream ticket & reply changes to the Admin and Athlete screens
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

SELECT '✅ Support Desk two-way replies & status update migration complete' AS status;
