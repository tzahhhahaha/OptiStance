// Translate raw Supabase auth errors into clear, actionable messages.
export const describeAuthError = (err: unknown): string => {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  const lower = raw.toLowerCase();

  if (lower.includes('rate limit') || lower.includes('too many')) {
    return "Email rate limit exceeded. Supabase's built-in email service only allows a few emails per hour — wait a few minutes and try again, or configure custom SMTP / turn off email confirmation in your Supabase project.";
  }
  if (lower.includes('not confirmed')) {
    return 'Your email is not confirmed yet. Open the confirmation link we sent (check your spam folder) — or resend it.';
  }
  if (lower.includes('already registered') || lower.includes('already been registered')) {
    return 'An account with this email already exists. Try logging in instead.';
  }
  if (lower.includes('invalid login credentials')) {
    return 'Invalid email or password.';
  }
  if (lower.includes('password should be')) {
    return 'Password is too weak. Use at least 8 characters with a mix of letters and numbers.';
  }
  return raw || 'Something went wrong. Please try again.';
};
