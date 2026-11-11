-- ============================================================================
-- Fix: two tables were readable and writable by anyone holding the anon key,
-- and one policy exposed every account in the system.
--
-- 1. joint_angle_standards had NO row-level security at all
--
--    schema.sql creates a SELECT policy on it, but the table is missing from
--    the `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` list, so that policy was
--    inert. With RLS disabled, Postgres ignores policies entirely and the table
--    is readable *and writable* by any role with a grant -- including `anon`,
--    whose key ships inside the app bundle. That table is the scoring rubric:
--    an athlete could rewrite their own mastery criteria.
--
--    This went unnoticed for the same reason `jointAngleService` was never
--    called: with RLS off, the "missing" write policies were never needed, so
--    nothing failed and nothing looked wrong.
--
-- 2. analytics_snapshots had the same gap
--
--    Same shape, and it does have code paths reading it, so the fix is to turn
--    RLS on and let its existing SELECT policy take effect. Reads keep working;
--    writes stop being available to anyone.
--
-- 3. "Users can view all user profiles" let any athlete read every account
--
--    USING (true), FOR SELECT TO authenticated. Postgres ORs permissive
--    policies together, so satisfying this one policy was enough to select every
--    row in `users` -- full_name and email for every athlete in the system. It
--    also made "Admins can view all users" redundant, since an admin satisfies
--    it too.
--
--    The policy's comment said it existed "for leaderboards, coach views, etc."
--    There is no athlete-facing leaderboard: the only ranking lives in the admin
--    console, and every other read of `users` in the app is already scoped with
--    `.eq('id', ...)` or runs behind public.is_admin(). So dropping it closes
--    the hole without removing a feature.
--
--    Left in place, scoped correctly:
--      - "Users can view own profile"  -> an athlete sees only their own row
--      - "Admins can view all users"   -> public.is_admin() sees every row
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. The account-enumeration hole
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view all user profiles" ON public.users;

-- ---------------------------------------------------------------------------
-- 2. Scoring rubric: readable by signed-in athletes, writable only by admins
-- ---------------------------------------------------------------------------

ALTER TABLE public.joint_angle_standards ENABLE ROW LEVEL SECURITY;

-- The pre-existing SELECT policy ("Authenticated users can view joint angle
-- standards") becomes live now that RLS is on. It is intentionally kept: the
-- runtime scorer reads these standards on device to score a practice session,
-- so an athlete must be able to read them.
--
-- Written separately per operation rather than as FOR ALL, so a future
-- read-only grant for athletes cannot be widened by accident.

DROP POLICY IF EXISTS "Admins can insert joint angle standards" ON public.joint_angle_standards;
DROP POLICY IF EXISTS "Admins can update joint angle standards" ON public.joint_angle_standards;
DROP POLICY IF EXISTS "Admins can delete joint angle standards" ON public.joint_angle_standards;

CREATE POLICY "Admins can insert joint angle standards"
  ON public.joint_angle_standards FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update joint angle standards"
  ON public.joint_angle_standards FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete joint angle standards"
  ON public.joint_angle_standards FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- The table has never been written to by the app, so there is no evidence that
-- the default Supabase grants cover it. Stated explicitly rather than assumed,
-- so a policy that permits the write is not silently undone by a missing grant.
-- The anon revoke is the point of the whole change: policy or no policy, the
-- public key must not be able to alter the scoring rubric.
GRANT SELECT ON public.joint_angle_standards TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.joint_angle_standards TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.joint_angle_standards FROM anon;

-- ---------------------------------------------------------------------------
-- 3. Analytics snapshots: same missing-RLS gap
-- ---------------------------------------------------------------------------

ALTER TABLE public.analytics_snapshots ENABLE ROW LEVEL SECURITY;

-- "Authenticated users can view analytics" (FOR SELECT TO authenticated USING
-- true) already exists in schema.sql and now takes effect, so the reads in
-- supabaseService.ts keep working. No write policy is added, because nothing in
-- the app writes this table and an admin writing aggregate analytics is not a
-- feature that exists today.
