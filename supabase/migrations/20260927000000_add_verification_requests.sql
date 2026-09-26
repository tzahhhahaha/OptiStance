-- ============================================================================
-- Verification request workflow (tier 2 -> tier 3)
--
-- Access model:
--   1. Guest      - no account, local only
--   2. Unverified - signed up; only Beginner poses, may request verification
--   3. Verified   - admin approved; all poses
--   4. Admin      - role = 'admin'; may approve/reject requests
--
-- Design notes:
--   * verification_status is the single source of truth for workflow state.
--   * is_verified becomes a STORED GENERATED column derived from it, so the
--     two can never drift. All existing app code keeps reading is_verified.
--   * Athletes cannot UPDATE public.users directly: the table has no UPDATE
--     RLS policy. Request + review both go through SECURITY DEFINER RPCs so
--     the authorisation check lives server-side and an athlete can never set
--     themselves to 'verified'.
-- ============================================================================

-- 1. Workflow state + review metadata
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS verification_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_note TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_verification_status_check'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_verification_status_check
      CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected'));
  END IF;
END $$;

-- 2. Single source of truth: derive is_verified from verification_status.
--    Drop and recreate because GENERATED cannot be added to an existing column.
--    Existing rows are preserved by seeding status from the old boolean first.
UPDATE public.users
   SET verification_status = 'verified'
 WHERE is_verified = true
   AND verification_status <> 'verified';

ALTER TABLE public.users DROP COLUMN IF EXISTS is_verified;

ALTER TABLE public.users
  ADD COLUMN is_verified BOOLEAN
    GENERATED ALWAYS AS (verification_status = 'verified') STORED;

-- 3. Athlete: request verification. Own row only, cannot self-approve.
CREATE OR REPLACE FUNCTION public.request_verification()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     UUID := auth.uid();
  v_status  TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT verification_status INTO v_status
    FROM public.users
   WHERE id = v_uid
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No profile row for the current user' USING ERRCODE = 'P0002';
  END IF;

  IF v_status = 'verified' THEN
    RAISE EXCEPTION 'Already verified' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.users
     SET verification_status        = 'pending',
         verification_requested_at = now(),
         verification_reviewed_at   = NULL,
         verification_note          = NULL
   WHERE id = v_uid;

  RETURN (SELECT to_jsonb(u) FROM public.users u WHERE u.id = v_uid);
END;
$$;

-- 4. Admin: approve or reject a pending request.
CREATE OR REPLACE FUNCTION public.review_verification(
  p_user_id UUID,
  p_approve BOOLEAN,
  p_note    TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
    FROM public.users
   WHERE id = auth.uid();

  IF v_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  UPDATE public.users
     SET verification_status      = CASE WHEN p_approve THEN 'verified' ELSE 'rejected' END,
         verification_reviewed_at = now(),
         verification_note        = p_note
   WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN (SELECT to_jsonb(u) FROM public.users u WHERE u.id = p_user_id);
END;
$$;

-- 5. Grants. Both functions are SECURITY DEFINER, so revoke the default
--    PUBLIC execute grant and hand it out explicitly.
REVOKE ALL ON FUNCTION public.request_verification() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.review_verification(UUID, BOOLEAN, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.request_verification() TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_verification(UUID, BOOLEAN, TEXT) TO authenticated;
