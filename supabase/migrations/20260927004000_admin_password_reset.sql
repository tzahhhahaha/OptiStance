-- ============================================================================
-- Admin password reset — the escape hatch for account lockout.
--
-- The problem this solves
--   Supabase sends password-reset emails over SMTP, and this project has no
--   SMTP host configured. The "Forgot password" button in the app therefore
--   reports success and silently delivers nothing, so an athlete who forgets
--   their password has no way back in and no way for an admin to help them
--   without editing auth.users by hand in the Supabase dashboard.
--
-- Why an RPC rather than the service-role key
--   Supabase's documented way to set another user's password is
--   PUT /auth/v1/admin/users/:id with the service_role key. Putting that key in
--   a client app would hand every user full read/write access to the entire
--   database, so that is not an option. Instead this writes the bcrypt hash
--   directly, inside a SECURITY DEFINER function, so no privileged credential
--   ever leaves the database.
--
-- Why the hash is computed here
--   auth.users.encrypted_password stores bcrypt ($2a$10$..., 60 chars), which is
--   exactly what pgcrypto's crypt(password, gen_salt('bf')) produces. The
--   function runs as the table owner, which is the only way to write there.
--
-- This is NOT email-based self-service. It is deliberately admin-mediated: an
-- admin who can identify the person resets the password out of band. That is
-- the correct trade-off while SMTP is absent, because an unauthenticated
-- "email me a reset link" flow cannot be made to work without a mail server.
-- ============================================================================

-- Audit trail. Records that a reset happened and who did it, never the
-- password itself. Without this, a reset is invisible and indistinguishable
-- from ordinary login.
CREATE TABLE IF NOT EXISTS public.password_reset_audit (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  target_email  text        NOT NULL,
  actor_user_id uuid        REFERENCES auth.users (id) ON DELETE SET NULL,
  actor_email   text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS password_reset_audit_target_idx
  ON public.password_reset_audit (target_user_id, created_at DESC);

ALTER TABLE public.password_reset_audit ENABLE ROW LEVEL SECURITY;

-- Only admins read the audit log. Writes come solely from the SECURITY
-- DEFINER function below, so there is deliberately no INSERT policy for users.
DROP POLICY IF EXISTS "Admins can view password reset audit" ON public.password_reset_audit;
CREATE POLICY "Admins can view password reset audit"
  ON public.password_reset_audit FOR SELECT
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- admin_set_user_password
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_set_user_password(
  p_user_id   uuid,
  p_password  text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_actor    uuid := auth.uid();
  v_email    text;
  v_actor_em text;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  -- Admin only. is_admin() is itself SECURITY DEFINER, so this check does not
  -- recurse back into the users policies.
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  -- Match the strength floor Supabase enforces at signup, and reject values
  -- that would silently fail to meet it.
  IF p_password IS NULL OR length(p_password) < 8 THEN
    RAISE EXCEPTION 'Password must be at least 8 characters' USING ERRCODE = '22023';
  END IF;
  IF p_password ~ '^\s|\s$' THEN
    RAISE EXCEPTION 'Password cannot start or end with whitespace' USING ERRCODE = '22023';
  END IF;

  SELECT email INTO v_email
    FROM auth.users
   WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No account found for that user' USING ERRCODE = 'P0002';
  END IF;

  SELECT email INTO v_actor_em
    FROM auth.users
   WHERE id = v_actor;

  UPDATE auth.users
     SET encrypted_password = crypt(p_password, gen_salt('bf')),
         updated_at          = now()
   WHERE id = p_user_id;

  INSERT INTO public.password_reset_audit
    (target_user_id, target_email, actor_user_id, actor_email)
  VALUES
    (p_user_id, v_email, v_actor, v_actor_em);

  RETURN v_email;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_user_password(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_user_password(uuid, text) TO authenticated;
