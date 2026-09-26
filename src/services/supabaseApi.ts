import { supabase } from './supabaseService';
import {
  userService,
  stuntService,
  sessionService,
  analyticsService,
} from './supabaseService';
import type { StuntInsert, SessionWithRelations } from './supabaseService';
import type { VerificationStatus } from '@/app/types';
import type { Stunt, User as DbUser, UserRole as DbUserRole, AnalyticsSnapshot } from '@/types/supabase';

// ============================================================
// Types (app-facing, camelCase)
// ============================================================

export type UserRole = 'SystemManager' | 'Athlete';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  createdAt: string;
  /** Whether the account's email is confirmed (undefined = unknown/verified). */
  emailVerified?: boolean;
  /** Whether the athlete is verified (unlocks Intermediate + Advanced poses). */
  isVerified: boolean;
  /** Workflow state of the verification request (see VerificationStatus). */
  verificationStatus?: VerificationStatus;
}

/** Map a `users` table row to the app's auth User shape. */
export const mapProfileRow = (row: {
  id: string;
  full_name: string;
  email: string;
  role?: string | null;
  created_at?: string | null;
  is_verified?: boolean | null;
  verification_status?: VerificationStatus | null;
}): User => ({
  id: row.id,
  fullName: row.full_name,
  email: row.email,
  role: row.role === 'admin' ? 'SystemManager' : 'Athlete',
  createdAt: row.created_at ?? '',
  emailVerified: true,
  isVerified: Boolean(row.is_verified),
  verificationStatus: row.verification_status ?? (row.is_verified ? 'verified' : 'unverified'),
});

// ============================================================
// Authentication / session helpers
// ============================================================

export const supabaseResetPassword = async (email: string): Promise<void> => {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: window.location.origin,
  });
  if (error) throw error;
};

/**
 * Re-send the signup confirmation email. Subject to Supabase's email rate
 * limit (built-in mailer allows only a few emails per hour).
 */
export const supabaseResendConfirmation = async (email: string): Promise<void> => {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email.trim(),
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) throw error;
};

export const supabaseUpdatePassword = async (newPassword: string): Promise<void> => {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
};

export const supabaseDeactivateAccount = async (userId: string): Promise<void> => {
  const { error } = await supabase.from('users').update({ is_active: false }).eq('id', userId);
  if (error) throw error;
  await supabase.auth.signOut();
};

export const supabaseLogin = async (email: string, password: string): Promise<User> => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw error;
  if (data.user) {
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();
    if (!profileError && profile) {
      return { ...mapProfileRow(profile), emailVerified: Boolean(data.user.email_confirmed_at) };
    }
  }
  throw new Error('User profile not found. Please run the setup script.');
};

export const supabaseSignUp = async (
  fullName: string,
  email: string,
  password: string
): Promise<{ user: User; requiresEmailConfirmation: boolean }> => {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: { full_name: fullName.trim() },
      // No confirmation email is requested here anymore — the "Confirm email"
      // action in the Profile screen is the only place the confirmation link
      // is sent (see supabaseResendConfirmation), so signup stays frictionless.
    },
  });
  if (error) throw error;
  if (data.user) {
    // signUp returns NO session exactly when the project requires email
    // confirmation. This is the authoritative signal from the auth service
    // (a later getSession() could be fooled by a stale stored session).
    const requiresEmailConfirmation = !data.session;
    const userId = data.user.id;
    const cleanEmail = email.trim();

    // The public.users row is normally created by the handle_new_user trigger
    // (supabase/fix_user_sync.sql). Direct client inserts are intentionally
    // blocked by RLS (there is no INSERT policy on users), so failing to insert
    // here is expected and MUST NOT fail the signup – the trigger owns this row.
    const { error: userError } = await supabase.from('users').insert({
      id: userId,
      email: cleanEmail,
      full_name: fullName.trim(),
      role: 'athlete',
      is_active: true,
    });
    if (userError) {
      console.warn(
        `[supabaseApi] Client insert of users row skipped (RLS). Ensure the handle_new_user trigger is installed: ${userError.message}`
      );
    }

    // Best-effort athlete profile (the trigger also creates this).
    const { error: profileError } = await supabase
      .from('athlete_profiles')
      .insert({ user_id: userId, total_sessions: 0, total_minutes: 0, overall_accuracy: 0 });
    if (profileError) {
      console.warn(`[supabaseApi] Client insert of athlete_profiles row skipped: ${profileError.message}`);
    }

    // When a session was issued (email confirmation disabled), verify that the
    // trigger-created profile actually exists and warn otherwise. Never throw
    // here: the app continues in local/offline mode, and login + the setup docs
    // surface the missing-trigger guidance.
    if (data.session) {
      const { data: profileRow } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .maybeSingle();
      if (!profileRow) {
        console.warn(
          '[supabaseApi] No public.users row found after signup. Run supabase/fix_user_sync.sql in the Supabase SQL editor to enable automatic user sync.'
        );
      }
    }

    return {
      user: {
        id: userId,
        fullName: fullName.trim(),
        email: cleanEmail,
        role: 'Athlete',
        createdAt: new Date().toISOString(),
        // No session === Supabase still wants the email confirmed.
        emailVerified: !requiresEmailConfirmation,
        // New accounts start unverified until an admin flips is_verified.
        isVerified: false,
      },
      requiresEmailConfirmation,
    };
  }
  throw new Error('Sign up failed.');
};

/**
 * Read the current auth session without throwing when the backend is
 * unreachable or unconfigured (returns null in those cases).
 */
const getAuthSessionQuietly = async (): Promise<Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']> => {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session;
  } catch {
    return null;
  }
};

/**
 * Whether the browser currently holds an active Supabase auth session, and the
 * auth user id backing it (null when inactive).
 */
export const getSupabaseSession = async (): Promise<{ active: boolean; userId: string | null }> => {
  const session = await getAuthSessionQuietly();
  return { active: Boolean(session), userId: session?.user.id ?? null };
};

/**
 * Load the profile (`users` row) for the current Supabase session. Returns null
 * when there is no session or no matching profile row.
 */
export const getCurrentUser = async (): Promise<User | null> => {
  const session = await getAuthSessionQuietly();
  const authUser = session?.user;
  if (!authUser) return null;

  const { data: profile, error } = await supabase.from('users').select('*').eq('id', authUser.id).single();

  if (error || !profile) return null;
  // The auth session carries the authoritative confirmation timestamp.
  return { ...mapProfileRow(profile), emailVerified: Boolean(authUser.email_confirmed_at) };
};

/**
 * Fetch the current athlete's `is_verified` flag straight from the profile
 * table. Returns false when unauthenticated or unreadable.
 */
export const getVerificationStatus = async (): Promise<boolean> => {
  const session = await getAuthSessionQuietly();
  const authUser = session?.user;
  if (!authUser) return false;

  const { data: profile, error } = await supabase
    .from('users')
    .select('is_verified')
    .eq('id', authUser.id)
    .single();

  if (error || !profile) return false;
  return Boolean(profile.is_verified);
};

/**
 * Full verification state for the signed-in athlete: the derived
 * `is_verified` gate plus the workflow `verification_status` that drives the
 * profile banner. Returns 'unverified' when unauthenticated or unreadable.
 */
export const getVerificationState = async (): Promise<{
  isVerified: boolean;
  status: VerificationStatus;
}> => {
  const session = await getAuthSessionQuietly();
  const authUser = session?.user;
  if (!authUser) return { isVerified: false, status: 'unverified' };

  const { data: profile, error } = await supabase
    .from('users')
    .select('is_verified, verification_status')
    .eq('id', authUser.id)
    .single();

  if (error || !profile) return { isVerified: false, status: 'unverified' };

  const status = (profile.verification_status ?? 'unverified') as VerificationStatus;
  return { isVerified: Boolean(profile.is_verified), status };
};

/**
 * Subscribe to live `is_verified` changes for a user so gated poses/camera
 * unlock the moment the flag flips (no refresh needed). Returns an unsubscribe
 * function. Requires the table to have REPLICA IDENTITY FULL so the UPDATE
 * payload carries the new column values (see supabase/add_verification.sql).
 */
export const subscribeToVerification = (
  userId: string,
  onChange: (isVerified: boolean) => void
): (() => void) => {
  if (!userId) return () => {};

  const channel = supabase
    .channel(`user-verification-${userId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${userId}` },
      (payload) => {
        if (payload.new && typeof payload.new.is_verified === 'boolean') {
          onChange(payload.new.is_verified);
        }
      }
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
};

// ============================================================
// Verification request workflow
//
// Athletes never UPDATE public.users directly — the table has no UPDATE RLS
// policy. Both directions go through SECURITY DEFINER RPCs so the
// authorisation check lives in the database (see
// supabase/migrations/20260927000000_add_verification_requests.sql).
// ============================================================

/**
 * Submit (or re-submit) a verification request for the signed-in athlete.
 * Moves verification_status to 'pending'. The database rejects the call if the
 * athlete is already verified, so this is a no-op for tier 3 accounts.
 */
export const requestVerification = async (): Promise<VerificationStatus> => {
  const { data, error } = await supabase.rpc('request_verification');
  if (error) throw new Error(error.message);

  const status = (data as { verification_status?: VerificationStatus } | null)?.verification_status;
  return status ?? 'pending';
};

/** A verification request as shown in the admin review queue. */
export interface VerificationRequest {
  id: string;
  email: string;
  fullName: string;
  status: VerificationStatus;
  requestedAt: string | null;
  reviewedAt: string | null;
  note: string | null;
}

/**
 * All athletes with a verification request in flight, oldest request first.
 * RLS on public.users restricts this to admins (see the
 * "Admins can view all users" policy).
 */
export const listVerificationRequests = async (): Promise<VerificationRequest[]> => {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, full_name, verification_status, verification_requested_at, verification_reviewed_at, verification_note')
    .in('verification_status', ['pending', 'rejected'])
    .order('verification_requested_at', { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    status: (row.verification_status ?? 'unverified') as VerificationStatus,
    requestedAt: row.verification_requested_at ?? null,
    reviewedAt: row.verification_reviewed_at ?? null,
    note: row.verification_note ?? null,
  }));
};

/**
 * Approve or reject a pending verification request. Enforced server-side: the
 * RPC raises unless the caller has role = 'admin'.
 */
export const reviewVerification = async (
  userId: string,
  approve: boolean,
  note?: string
): Promise<void> => {
  const { error } = await supabase.rpc('review_verification', {
    p_user_id: userId,
    p_approve: approve,
    p_note: note?.trim() ? note.trim() : null,
  });
  if (error) throw new Error(error.message);
};

/**
 * Set another user's password. Admin-only, enforced server-side.
 *
 * This exists because the project has no SMTP host, so Supabase cannot deliver
 * a password-reset email and the "Forgot password" flow is a dead end. An admin
 * who has identified an athlete out of band can set a new password here instead.
 *
 * The reset is recorded in password_reset_audit. The password itself is never
 * logged or sent anywhere — treat the value as write-only and hand it to the
 * athlete through a channel you trust.
 *
 * Returns the target account's email so the caller can confirm who was changed.
 */
export const adminSetUserPassword = async (
  userId: string,
  newPassword: string
): Promise<string> => {
  const { data, error } = await supabase.rpc('admin_set_user_password', {
    p_user_id: userId,
    p_password: newPassword,
  });
  if (error) throw new Error(error.message);
  return typeof data === 'string' ? data : '';
};

/**
 * File a support ticket as the signed-in athlete.
 *
 * The user id is resolved from the live auth session rather than passed in, so a
 * caller cannot file a ticket as somebody else. RLS independently requires
 * user_id to equal the caller's own id, so a forged value is rejected too.
 *
 * Throws when there is no session — a ticket is not stored locally, so it is
 * better to tell the athlete it failed than to show a success that never was.
 */
export const supabaseCreateSupportTicket = async (
  subject: string,
  description: string
): Promise<void> => {
  const session = await getAuthSessionQuietly();
  if (!session) {
    throw new Error('You need to be signed in to send a support ticket.');
  }

  const cleanSubject = subject.trim();
  const cleanDescription = description.trim();
  if (!cleanSubject || !cleanDescription) {
    throw new Error('Please fill in both a subject and a message.');
  }

  const { error } = await supabase.from('support_tickets').insert({
    user_id: session.user.id,
    subject: cleanSubject,
    description: cleanDescription,
  });
  if (error) throw new Error(error.message);
};

/**
 * Recent admin password resets, newest first. Admin-only.
 */
export const listPasswordResets = async (): Promise<
  Array<{ targetEmail: string; actorEmail: string | null; createdAt: string }>
> => {
  const { data, error } = await supabase
    .from('password_reset_audit')
    .select('target_email, actor_email, created_at')
    .order('created_at', { ascending: false })
    .limit(25);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    targetEmail: row.target_email,
    actorEmail: row.actor_email ?? null,
    createdAt: row.created_at,
  }));
};

/** Sign out of the Supabase session (clears the stored auth token). */
export const supabaseSignOut = async (): Promise<void> => {
  try {
    await supabase.auth.signOut();
  } catch {
    // Session already gone or backend unreachable – nothing to sign out.
  }
};

export type StartupAuthResult =
  | { action: 'authenticated'; user: User }
  | { action: 'clear' }
  | { action: 'none' };

/**
 * Decide what to do with the persisted app auth state on startup.
 *
 *  - `authenticated`: a real Supabase session exists (fresh login, remembered
 *    session, OR the redirect after clicking the email confirmation link) —
 *    load the profile so the app enters the home screen.
 *  - `clear`: localStorage claims an authenticated non-guest user but there is
 *    no session behind it — drop the stale state.
 *  - `none`: nothing to change.
 */
export const resolveStartupAuth = async (persisted: {
  isAuthenticated: boolean;
  userId?: string;
  isGuest?: boolean;
  emailVerified?: boolean;
}): Promise<StartupAuthResult> => {
  const { active, userId } = await getSupabaseSession();

  if (!active || !userId) {
    // No Supabase session behind the persisted state. Keep accounts that are
    // still pending email verification: the new signup flow lets unverified
    // users use the app and verify whenever they choose. Only genuinely stale
    // (already-verified or unknown) sessions are cleared.
    if (persisted.isAuthenticated && !persisted.isGuest) {
      return persisted.emailVerified === false ? { action: 'none' } : { action: 'clear' };
    }
    return { action: 'none' };
  }

  // Already signed in as the session's user — nothing to do.
  if (persisted.isAuthenticated && !persisted.isGuest && persisted.userId === userId) {
    return { action: 'none' };
  }

  const user = await getCurrentUser();
  return user ? { action: 'authenticated', user } : { action: 'none' };
};

// ============================================================
// Admin / management helpers (thin, typed wrappers over services)
// ============================================================
//
// These exist so UI code keeps a stable, camelCase surface while the actual
// queries live in the typed services in supabaseService.ts.

export const supabaseGetUsers = async (): Promise<User[]> => {
  const rows = await userService.getAllUsers();
  return rows.map(mapProfileRow);
};

export const supabaseDeleteUser = async (userId: string): Promise<void> => {
  await userService.deleteUser(userId);
};

export const supabaseUpdateUserRole = async (userId: string, role: DbUserRole): Promise<void> => {
  await userService.updateUserRole(userId, role);
};

export const supabaseGetStunts = async (): Promise<Stunt[]> => {
  return stuntService.getAllStunts();
};

export const supabaseCreateStunt = async (stunt: StuntInsert): Promise<Stunt> => {
  return stuntService.createStunt(stunt);
};

export const supabaseUpdateStunt = async (stuntId: string, updates: Partial<Stunt>): Promise<void> => {
  await stuntService.updateStunt(stuntId, updates);
};

export const supabaseDeleteStunt = async (stuntId: string): Promise<void> => {
  await stuntService.archiveStunt(stuntId);
};

export const supabaseGetSessions = async (): Promise<SessionWithRelations[]> => {
  return sessionService.getAllSessions();
};

export const supabaseGetAnalytics = async (): Promise<AnalyticsSnapshot | null> => {
  return analyticsService.getLatestAnalytics();
};

// Re-export DB row types so consumers can import row shapes from one place.
export type { DbUser, DbUserRole };