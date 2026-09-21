-- ============================================================================
-- Remove Coach Role from Database
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================================

-- 1. Update any existing users with 'coach' role to 'athlete'
UPDATE public.users
SET role = 'athlete'
WHERE role = 'coach';

-- 2. Update the CHECK constraint on users.role to only allow athlete/admin
ALTER TABLE public.users
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
ADD CONSTRAINT users_role_check
CHECK (role IN ('athlete', 'admin'));

-- 3. Verify
SELECT role, COUNT(*) FROM public.users GROUP BY role;