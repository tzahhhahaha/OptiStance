-- ============================================================================
-- Create Admin Account in Supabase
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================================

-- 0. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Create admin user in auth.users (only if not exists)
DO $$
DECLARE
  admin_id uuid;
BEGIN
  -- Check if admin already exists
  SELECT id INTO admin_id FROM auth.users WHERE email = 'admin@optistance.com' LIMIT 1;

  -- If not exists, create the admin user
  IF admin_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change,
      email_change_token_new
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'admin@optistance.com',
      crypt('OptiStance2026!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"System Manager"}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO admin_id;
  END IF;

  -- 2. Create/update public.users record with admin role
  INSERT INTO public.users (id, email, full_name, role, is_active)
  VALUES (
    admin_id,
    'admin@optistance.com',
    'System Manager',
    'admin',
    true
  )
  ON CONFLICT (id) DO UPDATE SET role = 'admin', is_active = true;

  -- 3. Create athlete profile for admin
  INSERT INTO public.athlete_profiles (user_id)
  VALUES (admin_id)
  ON CONFLICT (user_id) DO NOTHING;

  RAISE NOTICE 'Admin account ready with ID: %', admin_id;
END $$;

-- 4. Verify
SELECT '✅ Admin account ready' AS status;
SELECT id, email, full_name, role, is_active FROM public.users WHERE email = 'admin@optistance.com';