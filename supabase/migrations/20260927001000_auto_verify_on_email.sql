-- ============================================================================
-- Verification is NOT tied to email confirmation.
--
-- Access model (no admin involvement, no email round-trip):
--   Guest      -> no account, local only
--   Unverified -> signed up and can log in immediately; Beginner poses only
--   Verified   -> tapped "Request verification" in the profile; all poses
--   Admin      -> role = 'admin'
--
-- Why email confirmation is deliberately NOT the gate:
--   Supabase refuses to issue a session for an unconfirmed email
--   (error_code = 'email_not_confirmed'). Allowing people to log in before
--   confirming therefore requires mailer_autoconfirm = true, which sets
--   email_confirmed_at at signup. So while autoconfirm is on, email
--   confirmation is true for every account and cannot distinguish unverified
--   from verified. Gating on it would make the unverified tier unreachable.
--
--   The upgrade path is therefore the request_verification() RPC (see
--   20260927002000_auto_approve_verification.sql), which grants verification
--   immediately with no admin step. This file only backfills history for
--   accounts that already confirmed their email before the switch, so nobody
--   who was verified under the old rule loses access.
--
-- verification_status remains the single source of truth; is_verified is a
-- STORED GENERATED column derived from it, so they cannot drift.
-- ============================================================================

-- Backfill: accounts already confirmed under the previous email-based rule
-- stay verified. New signups deliberately do NOT get this.
UPDATE public.users u
   SET verification_status = 'verified'
  FROM auth.users a
 WHERE a.id = u.id
   AND a.email_confirmed_at IS NOT NULL
   AND u.verification_status IS DISTINCT FROM 'verified';

-- Drop the email-based trigger: it would auto-verify every new signup and
-- make the unverified tier unreachable.
DROP TRIGGER IF EXISTS on_auth_user_verified ON auth.users;
DROP FUNCTION IF EXISTS public.sync_verification_from_email();
