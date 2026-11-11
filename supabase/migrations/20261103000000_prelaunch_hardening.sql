-- ============================================================================
-- Pre-Launch Security & Architecture Fixes Migration
-- Resolves: B1 (Bridge forgery & RLS leaks), B2 (Public channel hardening),
--           H7 (Data validation CHECK constraints), H8 (RPC execute grants revocation),
--           H9 (missing last_seen_at column & insights)
-- ============================================================================

-- 1. Ensure last_seen_at column and touch_last_seen() exist
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.touch_last_seen()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  UPDATE public.users
  SET last_seen_at = now()
  WHERE id = auth.uid();
END;
$$;

-- 2. Revoke dangerous anon execute privileges on all SECURITY DEFINER RPCs (H8)
REVOKE ALL ON FUNCTION public.touch_last_seen() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.touch_last_seen() TO authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'delete_user_account') THEN
    REVOKE ALL ON FUNCTION public.delete_user_account(uuid) FROM PUBLIC, anon;
    GRANT EXECUTE ON FUNCTION public.delete_user_account(uuid) TO authenticated;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'admin_set_user_password') THEN
    REVOKE ALL ON FUNCTION public.admin_set_user_password(uuid, text) FROM PUBLIC, anon;
    GRANT EXECUTE ON FUNCTION public.admin_set_user_password(uuid, text) TO authenticated;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'review_verification') THEN
    REVOKE ALL ON FUNCTION public.review_verification(uuid, boolean, text) FROM PUBLIC, anon;
    GRANT EXECUTE ON FUNCTION public.review_verification(uuid, boolean, text) TO authenticated;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'request_verification') THEN
    REVOKE ALL ON FUNCTION public.request_verification() FROM PUBLIC, anon;
    GRANT EXECUTE ON FUNCTION public.request_verification() TO authenticated;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'add_support_ticket_reply') THEN
    REVOKE ALL ON FUNCTION public.add_support_ticket_reply(uuid, text) FROM PUBLIC, anon;
    GRANT EXECUTE ON FUNCTION public.add_support_ticket_reply(uuid, text) TO authenticated;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_support_ticket_status') THEN
    REVOKE ALL ON FUNCTION public.update_support_ticket_status(uuid, text) FROM PUBLIC, anon;
    GRANT EXECUTE ON FUNCTION public.update_support_ticket_status(uuid, text) TO authenticated;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') THEN
    REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
    GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
  END IF;
END $$;

-- 3. Hardened Stunt Difficulty Insights RPC (resolves 404 in DarkAdminAnalytics)
CREATE OR REPLACE FUNCTION public.get_stunt_difficulty_insights()
RETURNS TABLE (
  difficulty_tier TEXT,
  average_accuracy FLOAT,
  total_sessions BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(s.difficulty_tier, 'beginner')::TEXT as difficulty_tier,
    ROUND(AVG(COALESCE(ps.overall_accuracy, 0))::numeric, 1)::FLOAT as average_accuracy,
    COUNT(ps.id) as total_sessions
  FROM public.stunts s
  LEFT JOIN public.practice_sessions ps ON ps.stunt_id = s.id
  WHERE s.is_archived = false
  GROUP BY s.difficulty_tier;
$$;

REVOKE ALL ON FUNCTION public.get_stunt_difficulty_insights() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_stunt_difficulty_insights() TO authenticated;

-- 4. B1 Fix: Remove vulnerable subject wildcard from support_tickets SELECT policy
-- Athletes can ONLY see their own genuine support tickets; admins can see all tickets.
DROP POLICY IF EXISTS "Athletes view own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Athletes can view own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins view all tickets" ON public.support_tickets;

CREATE POLICY "Athletes view own tickets"
  ON public.support_tickets FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin()
  );

-- 5. B1 Fix: Disallow '__' prefixed internal spoofing in support_tickets INSERT
DROP POLICY IF EXISTS "Athletes can create own tickets" ON public.support_tickets;

CREATE POLICY "Athletes can create own tickets"
  ON public.support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND subject NOT LIKE '\_\_%'
    AND length(trim(subject)) >= 3
    AND length(subject) <= 150
    AND length(trim(description)) >= 5
    AND length(description) <= 5000
  );

-- 6. H7 Fix: DB validation checks for integrity on practice_sessions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_practice_session_accuracy') THEN
    ALTER TABLE public.practice_sessions
      ADD CONSTRAINT check_practice_session_accuracy
      CHECK (overall_accuracy >= 0 AND overall_accuracy <= 100);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_practice_session_duration') THEN
    ALTER TABLE public.practice_sessions
      ADD CONSTRAINT check_practice_session_duration
      CHECK (duration_minutes >= 0 AND duration_minutes <= 1440);
  END IF;
END $$;

-- 7. Clean up any historical bridge metadata records in support_tickets
DELETE FROM public.support_tickets WHERE subject LIKE '\_\_%';

SELECT '✅ Migration 20261103000000_prelaunch_hardening applied successfully' as status;
