-- ============================================================================
-- Verification gating: is_verified on public.users
-- Run this in Supabase Dashboard → SQL Editor
--
-- The app reads this column to gate Intermediate/Advanced poses in the gallery
-- and the AI camera. New users default to false (unverified). To verify an
-- athlete, flip the flag (step 3).
-- ============================================================================

-- 1. Add the is_verified column (default false → verified only when set)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false;

-- 2. Realtime delivery: postgres_changes UPDATE payloads only carry the new
--    column values when the table uses REPLICA IDENTITY FULL. Without this the
--    app's subscribeToVerification() listener would receive just the primary
--    key on UPDATE and never see is_verified flip.
ALTER TABLE public.users REPLICA IDENTITY FULL;

-- 3. Optional helper: verify an athlete (one user; swap in the real uuid)
--    UPDATE public.users
--       SET is_verified = true
--     WHERE id = '<auth user uuid>';

-- 4. Verify the state
SELECT id, email, is_verified
FROM public.users
ORDER BY created_at DESC
LIMIT 20;