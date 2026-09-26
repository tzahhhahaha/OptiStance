import { useState } from 'react';
import { requestVerification } from '../../services/supabaseApi';
import type { UserProfile, VerificationStatus } from '../types';
import { describeAuthError } from '../utils/authErrors';

/**
 * Drives the pose-access unlock flow on the profile screen.
 *
 * Note this is a *different* thing from Supabase email confirmation: email
 * confirmation proves the address is real, while this controls whether the
 * athlete reaches Intermediate + Advanced poses.
 *
 * The unlock is self-service and immediate — the database grants it in the same
 * call via the request_verification() SECURITY DEFINER RPC, so no administrator
 * is involved. Athletes still cannot write their own row directly (there is no
 * UPDATE policy on public.users); the RPC is the only route, which is also why
 * the grant cannot be faked or replayed for somebody else's account.
 */
export const useAthleteVerification = (
  user: UserProfile,
  onUpdateUser: (patch: Partial<UserProfile>) => void
) => {
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const status: VerificationStatus = user.verificationStatus ?? 'unverified';

  const request = async () => {
    setError(null);
    setNotice(null);
    setIsRequesting(true);
    try {
      const next = await requestVerification();
      onUpdateUser({ verificationStatus: next, isVerified: next === 'verified' });
      setNotice('Unlocked. Intermediate and Advanced poses are available now.');
    } catch (err) {
      setError(describeAuthError(err));
    } finally {
      setIsRequesting(false);
    }
  };

  return { status, isRequesting, error, notice, request };
};
