-- ============================================================================
-- Auto-approve verification: no admin involvement.
--
-- An athlete's request is granted immediately by the database. The admin panel
-- keeps the ability to REVOKE a verification later (a moderation safety valve),
-- but nothing has to be clicked for an athlete to unlock Intermediate +
-- Advanced poses.
--
-- Request path is unchanged (request_verification() SECURITY DEFINER RPC), so
-- athletes still cannot write public.users directly and still cannot set
-- themselves to 'verified' by any other route.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.request_verification()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  -- Lock the row so two concurrent taps cannot race.
  PERFORM 1 FROM public.users WHERE id = v_uid FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No profile row for the current user' USING ERRCODE = 'P0002';
  END IF;

  IF (SELECT verification_status FROM public.users WHERE id = v_uid) = 'verified' THEN
    RAISE EXCEPTION 'Already verified' USING ERRCODE = 'P0001';
  END IF;

  -- Auto-approve: verified immediately, no admin step, no email round-trip.
  UPDATE public.users
     SET verification_status      = 'verified',
         verification_requested_at = now(),
         verification_reviewed_at   = now(),
         verification_note          = 'auto-approved'
   WHERE id = v_uid;

  RETURN (SELECT to_jsonb(u) FROM public.users u WHERE u.id = v_uid);
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_verification() TO authenticated;
