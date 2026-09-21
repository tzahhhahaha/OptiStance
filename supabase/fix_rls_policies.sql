-- ============================================================================
-- Fix RLS Policies to Make Data Visible
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================================

-- ============================================================
-- 1. STUNTS - Make visible to all authenticated users
--    (This is the reference library - everyone needs to see it)
-- ============================================================
CREATE POLICY "Authenticated users can view stunts"
  ON stunts
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- 2. JOINT ANGLE STANDARDS - Visible to all authenticated users
-- ============================================================
CREATE POLICY "Authenticated users can view joint angle standards"
  ON joint_angle_standards
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- 3. ATHLETE PROFILES - Owner can view own, admins can view all
-- ============================================================
CREATE POLICY "Athletes can view own profile"
  ON athlete_profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::uuid);

CREATE POLICY "Admins can view all athlete profiles"
  ON athlete_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::uuid AND role = 'admin'
    )
  );

-- ============================================================
-- 4. JOINT CORRECTIONS - Session owner can view, admins can view all
-- ============================================================
CREATE POLICY "Session owners can view joint corrections"
  ON joint_corrections
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM practice_sessions
      WHERE practice_sessions.id = joint_corrections.session_id
        AND practice_sessions.user_id = auth.uid()::uuid
    )
  );

CREATE POLICY "Admins can view all joint corrections"
  ON joint_corrections
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::uuid AND role = 'admin'
    )
  );

-- ============================================================
-- 5. TICKET REPLIES - Ticket owner can view, admins can view all
-- ============================================================
CREATE POLICY "Ticket owners can view replies"
  ON ticket_replies
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE support_tickets.id = ticket_replies.ticket_id
        AND support_tickets.user_id = auth.uid()::uuid
    )
  );

CREATE POLICY "Admins can view all ticket replies"
  ON ticket_replies
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::uuid AND role = 'admin'
    )
  );

-- ============================================================
-- 6. MEDIA UPLOADS - Owner can view own, admins can view all
-- ============================================================
CREATE POLICY "Users can view own media"
  ON media_uploads
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::uuid);

CREATE POLICY "Admins can view all media"
  ON media_uploads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::uuid AND role = 'admin'
    )
  );

-- ============================================================
-- 7. ANALYTICS SNAPSHOTS - Visible to all authenticated users
--    (Dashboard analytics - everyone should see the stats)
-- ============================================================
CREATE POLICY "Authenticated users can view analytics"
  ON analytics_snapshots
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- 8. USERS - Allow users to view other users' basic info
--    (Needed for leaderboards, coach views, etc.)
-- ============================================================
CREATE POLICY "Users can view all user profiles"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- OPTIONAL: If you want to see data WITHOUT logging in
-- (e.g., for testing in the dashboard), uncomment these:
-- ============================================================
-- CREATE POLICY "Public can view stunts" ON stunts
--   FOR SELECT TO anon USING (true);
--
-- CREATE POLICY "Public can view joint angle standards" ON joint_angle_standards
--   FOR SELECT TO anon USING (true);
--
-- CREATE POLICY "Public can view analytics" ON analytics_snapshots
--   FOR SELECT TO anon USING (true);

-- ============================================================
-- VERIFICATION QUERY
-- Run this after executing the policies above to confirm
-- ============================================================
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;