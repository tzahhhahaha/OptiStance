-- ============================================================================
-- Permanent Account & Telemetry Deletion (Admin & Self-Service)
--
-- Allows:
--   1. An athlete to permanently delete their own account and all telemetry
--      ("Delete Account & Telemetry" in SettingsScreen.tsx)
--   2. A System Manager (admin) to permanently remove an athlete and erase all
--      their records from the Admin console ("Remove" in DarkAdminUsers.tsx)
--   3. Deleting a user in Supabase Dashboard (Authentication -> Users) to
--      automatically cascade-delete their public.users row and all child tables
-- ============================================================================

-- 1. Ensure RLS DELETE policies exist on public.users and child tables
DROP POLICY IF EXISTS "Users can delete own profile" ON public.users;
CREATE POLICY "Users can delete own profile"
  ON public.users FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can delete any user" ON public.users;
CREATE POLICY "Admins can delete any user"
  ON public.users FOR DELETE
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update any user" ON public.users;
CREATE POLICY "Admins can update any user"
  ON public.users FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users can delete own sessions" ON public.practice_sessions;
CREATE POLICY "Users can delete own sessions"
  ON public.practice_sessions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Users can delete own athlete profile" ON public.athlete_profiles;
CREATE POLICY "Users can delete own athlete profile"
  ON public.athlete_profiles FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Users can delete own support tickets" ON public.support_tickets;
CREATE POLICY "Users can delete own support tickets"
  ON public.support_tickets FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Users can delete own media uploads" ON public.media_uploads;
CREATE POLICY "Users can delete own media uploads"
  ON public.media_uploads FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

GRANT DELETE ON public.users TO authenticated;
GRANT DELETE ON public.athlete_profiles TO authenticated;
GRANT DELETE ON public.practice_sessions TO authenticated;
GRANT DELETE ON public.joint_corrections TO authenticated;
GRANT DELETE ON public.support_tickets TO authenticated;
GRANT DELETE ON public.ticket_replies TO authenticated;
GRANT DELETE ON public.media_uploads TO authenticated;

-- 2. SECURITY DEFINER RPC to permanently erase a user from public.* AND auth.users
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

  -- Allowed only if deleting own account OR caller is an admin
  IF v_target <> v_caller AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized to delete this account' USING ERRCODE = '42501';
  END IF;

  -- Remove any ticket replies authored by this user so FK on ticket_replies.admin_id never blocks
  DELETE FROM public.ticket_replies WHERE admin_id = v_target;

  -- Remove all user-owned records (also cascades joint_corrections and ticket_replies)
  DELETE FROM public.support_tickets WHERE user_id = v_target;
  DELETE FROM public.practice_sessions WHERE user_id = v_target;
  DELETE FROM public.media_uploads WHERE user_id = v_target;
  DELETE FROM public.athlete_profiles WHERE user_id = v_target;

  -- Delete the public profile row
  DELETE FROM public.users WHERE id = v_target;

  -- Delete the Supabase Auth account so the email is completely erased and reusable
  DELETE FROM auth.users WHERE id = v_target;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_account(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_account(uuid) TO authenticated;

-- 3. Trigger: If a user is deleted directly in Supabase Dashboard (auth.users),
--    automatically erase their public.users row and all cascaded records too.
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
