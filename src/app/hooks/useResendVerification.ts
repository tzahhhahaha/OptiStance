import { useState } from 'react';
import { supabaseResendConfirmation } from '../../services/supabaseApi';
import { describeAuthError } from '../utils/authErrors';

/**
 * Sends (or re-sends) the Supabase email-confirmation link for an account.
 * Shared by the verification banner and the profile screen so the resend logic
 * lives in one place.
 */
export const useResendVerification = (email: string) => {
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resend = async () => {
    setStatus(null);
    setError(null);
    setIsSending(true);
    try {
      await supabaseResendConfirmation(email);
      setStatus('Verification email sent. Check your inbox (and spam folder).');
    } catch (err) {
      setError(describeAuthError(err));
    } finally {
      setIsSending(false);
    }
  };

  return { isSending, status, error, resend };
};
