-- ============================================================================
-- Fix: infinite recursion in the "admins can view everything" RLS policies.
--
-- The bug
--   Seven tables had an admin check written as a subquery against the users
--   table itself:
--
--     USING (EXISTS (SELECT 1 FROM users u
--                      WHERE u.id = auth.uid() AND u.role = 'admin'))
--
--   Reading `users` re-applies RLS on `users`, which re-evaluates that same
--   policy, which reads `users` again. Postgres aborts with
--
--     42P17  infinite recursion detected in policy for relation "users"
--
--   That is not a silent failure -- it is a hard 500 from PostgREST. Because
--   one of the seven policies is on `users` itself, EVERY read of the users
--   table failed, including the .from('users').select('*') call in
--   supabaseLogin(). No user could sign in, and no admin panel query worked.
--
-- The fix
--   Move the admin lookup into a SECURITY DEFINER function. A function owned
--   by the table owner runs with the owner's rights and therefore bypasses
--   RLS, so the subquery is not re-checked against the policies it is
--   defined in. The policies then call that function instead of inlining the
--   subquery, and recursion disappears.
--
--   This is safe to expose: is_admin() reads auth.uid(), which comes from the
--   caller's own verified JWT and cannot be spoofed. It reveals only whether
--   the caller is an admin.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.users u
     WHERE u.id = auth.uid()
       AND u.role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Rewrite each broken policy in place. The policy bodies are identical apart
-- from the table they sit on, so the same substitution applies to all seven.
DROP POLICY IF EXISTS "Admins can view all users"                 ON public.users;
DROP POLICY IF EXISTS "Admins can view all athlete profiles"      ON public.athlete_profiles;
DROP POLICY IF EXISTS "Admins can view all joint corrections"     ON public.joint_corrections;
DROP POLICY IF EXISTS "Admins can view all media"                 ON public.media_uploads;
DROP POLICY IF EXISTS "Admins view all sessions"                  ON public.practice_sessions;
DROP POLICY IF EXISTS "Admins view all tickets"                   ON public.support_tickets;
DROP POLICY IF EXISTS "Admins can view all ticket replies"        ON public.ticket_replies;

CREATE POLICY "Admins can view all users"
  ON public.users FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can view all athlete profiles"
  ON public.athlete_profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can view all joint corrections"
  ON public.joint_corrections FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can view all media"
  ON public.media_uploads FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins view all sessions"
  ON public.practice_sessions FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins view all tickets"
  ON public.support_tickets FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can view all ticket replies"
  ON public.ticket_replies FOR SELECT
  USING (public.is_admin());
