-- ============================================================================
-- Fix: Auto-create public.users record when a user signs up via Supabase Auth
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================================

-- 1. Create trigger function to sync auth.users → public.users
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

-- 2. Create trigger on auth.users
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

-- 5. Verify
SELECT '✅ User sync trigger created' AS status;
SELECT 'Users in public.users:' AS info, COUNT(*) AS count FROM public.users;
SELECT 'Users in auth.users:' AS info, COUNT(*) AS count FROM auth.users;
SELECT 'Athlete profiles:' AS info, COUNT(*) AS count FROM public.athlete_profiles;