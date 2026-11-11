import { supabase } from './supabaseService';
import {
  userService,
  stuntService,
  sessionService,
  analyticsService,
  ticketService,
} from './supabaseService';
import type { StuntInsert, SessionWithRelations } from './supabaseService';
import type { VerificationStatus } from '@/app/types';
import type { PracticeSession } from '@/app/types';
import type {
  Stunt,
  User as DbUser,
  UserRole as DbUserRole,
  AnalyticsSnapshot,
  SupportTicket,
  TicketReply,
  SupportTicketStatus,
} from '@/types/supabase';

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
  /**
   * Whether the account is still active. Deactivating is a soft delete
   * (`is_active = false`), so this is the only way to tell a removed athlete
   * from an active one — it must be carried through, or every row in the admin
   * console reads as "Active".
   */
  isActive: boolean;
  lastSeenAt?: string | null;
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
  is_active?: boolean | null;
  last_seen_at?: string | null;
}): User => ({
  id: row.id,
  fullName: row.full_name,
  email: row.email,
  role: row.role === 'admin' ? 'SystemManager' : 'Athlete',
  createdAt: row.created_at ?? '',
  emailVerified: true,
  isVerified: Boolean(row.is_verified),
  verificationStatus: row.verification_status ?? (row.is_verified ? 'verified' : 'unverified'),
  // Absent column (older rows) is treated as active; only an explicit false
  // marks a deactivated account.
  isActive: row.is_active !== false,
  ...(row.last_seen_at !== undefined ? { lastSeenAt: row.last_seen_at } : {}),
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
  await deleteUserPermanently(userId);
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
    // When "Confirm email" is enabled in Supabase, signing up with an already
    // registered email returns a fake user with an empty identities array instead
    // of an error. Detect this so we don't pretend a new account was created.
    const identities = (data.user as { identities?: unknown[] }).identities;
    if (Array.isArray(identities) && identities.length === 0) {
      throw new Error('User already registered');
    }

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

    const createdUser: User = {
      id: userId,
      fullName: fullName.trim(),
      email: cleanEmail,
      role: 'Athlete',
      createdAt: new Date().toISOString(),
      // No session === Supabase still wants the email confirmed.
      emailVerified: !requiresEmailConfirmation,
      // New accounts start unverified until an admin flips is_verified.
      isVerified: false,
      isActive: true,
    };

    // Plaintext password is deliberately NOT stored in sessionStorage for security
    broadcastRegisteredAthlete(createdUser);

    return {
      user: createdUser,
      requiresEmailConfirmation,
    };
  }
  throw new Error('Sign up failed.');
};

/**
 * Check whether a pending email confirmation has completed on Supabase's server
 * (even when the user clicked the confirmation link inside an email app's
 * separate browser or hit a `localhost` redirect error on another device), and
 * establish the live authenticated session in the current browser tab.
 */
export const checkAndCompleteEmailConfirmation = async (
  email?: string,
  manualPassword?: string
): Promise<{
  confirmed: boolean;
  user?: User;
  reason?: 'not_confirmed_yet' | 'needs_password' | 'invalid_credentials' | 'error';
  message?: string;
}> => {
  try {
    // 1. Check if the current tab already has a confirmed session
    const existingSession = await getAuthSessionQuietly();
    if (existingSession?.user?.email_confirmed_at) {
      try {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem('optistance_pending_email_confirm');
        }
      } catch {
        // ignore
      }
      const current = await getCurrentUser();
      if (current) {
        return { confirmed: true, user: { ...current, emailVerified: true } };
      }
      return {
        confirmed: true,
        user: {
          id: existingSession.user.id,
          fullName:
            (existingSession.user.user_metadata?.full_name as string | undefined) ||
            existingSession.user.email ||
            'Athlete',
          email: existingSession.user.email ?? email ?? '',
          role: 'Athlete',
          createdAt: existingSession.user.created_at ?? new Date().toISOString(),
          emailVerified: true,
          isVerified: false,
          isActive: true,
        },
      };
    }

    // 2. Otherwise, check if we have pending signup credentials (or manualPassword)
    // to sign in and establish the session in this browser tab now that the email
    // link was clicked.
    const targetEmail = email?.trim() ?? '';
    const targetPassword = manualPassword ?? '';

    if (!targetEmail || !targetPassword) {
      return { confirmed: false, reason: 'needs_password' };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: targetEmail,
      password: targetPassword,
    });

    if (error) {
      const lower = (error.message || '').toLowerCase();
      if (lower.includes('email not confirmed') || lower.includes('not confirmed')) {
        return { confirmed: false, reason: 'not_confirmed_yet', message: error.message };
      }
      if (lower.includes('invalid login credentials')) {
        return { confirmed: false, reason: 'invalid_credentials', message: error.message };
      }
      return { confirmed: false, reason: 'error', message: error.message };
    }

    if (data?.user) {
      try {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem('optistance_pending_email_confirm');
        }
      } catch {
        // ignore
      }

      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      const resolvedUser: User = profile
        ? { ...mapProfileRow(profile), emailVerified: true }
        : {
            id: data.user.id,
            fullName:
              (data.user.user_metadata?.full_name as string | undefined) ||
              data.user.email ||
              'Athlete',
            email: data.user.email ?? targetEmail,
            role: 'Athlete',
            createdAt: data.user.created_at ?? new Date().toISOString(),
            emailVerified: true,
            isVerified: false,
            isActive: true,
          };

      return { confirmed: true, user: resolvedUser };
    }

    return { confirmed: false, reason: 'not_confirmed_yet' };
  } catch (err) {
    return {
      confirmed: false,
      reason: 'error',
      message: err instanceof Error ? err.message : 'Unable to check confirmation status.',
    };
  }
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

// Shared real-time presence state so `trackAthletePresence` (mounted in App.tsx)
// and `subscribeToOnlineAthletes` (mounted in DarkAdminUsers / DarkAdminAnalytics)
// never collide on the `'online-athletes'` channel topic or tear each other down
// when switching admin tabs.
export interface PresenceProfileMeta {
  fullName?: string;
  email?: string;
  role?: UserRole;
  createdAt?: string;
  isVerified?: boolean;
}

interface PresencePayload extends PresenceProfileMeta {
  userId?: string;
  onlineAt?: string;
}

let sharedPresenceChannel: ReturnType<typeof supabase.channel> | null = null;
let sharedPresenceSubscribed = false;
let activeTrackedUserId: string | null = null;
let activeTrackedProfileMeta: PresenceProfileMeta | undefined = undefined;
let latestOnlineUserIds: string[] = [];
const broadcastedAthletesById = new Map<string, User>();
const presenceSubscribers = new Set<(onlineUserIds: string[]) => void>();
const presenceProfileSubscribers = new Set<(profiles: User[]) => void>();
const rosterChangeSubscribers = new Set<() => void>();

const readOnlineIdsFromChannel = (
  channel: ReturnType<typeof supabase.channel> | null
): string[] => {
  if (!channel || typeof channel.presenceState !== 'function') {
    return latestOnlineUserIds;
  }
  try {
    const state = channel.presenceState();
    const userIds: string[] = [];
    for (const presences of Object.values(state)) {
      for (const p of presences as PresencePayload[]) {
        if (p?.userId && !userIds.includes(p.userId)) {
          userIds.push(p.userId);
        }
      }
    }
    latestOnlineUserIds = userIds;
    return userIds;
  } catch {
    return latestOnlineUserIds;
  }
};

const readOnlineProfilesFromChannel = (
  channel: ReturnType<typeof supabase.channel> | null
): User[] => {
  const byId = new Map<string, User>();
  for (const [id, user] of broadcastedAthletesById.entries()) {
    byId.set(id, user);
  }
  if (channel && typeof channel.presenceState === 'function') {
    try {
      const state = channel.presenceState();
      for (const presences of Object.values(state)) {
        for (const p of presences as PresencePayload[]) {
          if (p?.userId && (p.email || p.fullName)) {
            byId.set(p.userId, {
              id: p.userId,
              fullName: p.fullName || p.email || 'Athlete',
              email: p.email || '',
              role: p.role === 'SystemManager' ? 'SystemManager' : 'Athlete',
              createdAt: p.createdAt || p.onlineAt || new Date().toISOString(),
              emailVerified: true,
              isVerified: Boolean(p.isVerified),
              verificationStatus: p.isVerified ? 'verified' : 'unverified',
              isActive: true,
            });
          }
        }
      }
    } catch {
      // ignore presence parse error
    }
  }
  return [...byId.values()];
};

const persistAthleteLastSeen = () => {
  void supabase.rpc('touch_last_seen').then(({ error }) => {
    if (error) {
      console.warn('[supabaseApi] Could not update last-seen timestamp:', error.message);
    }
  }, (error: unknown) => {
    console.warn('[supabaseApi] Could not update last-seen timestamp:', error);
  });
};

const notifyPresenceSubscribers = () => {
  const ids = readOnlineIdsFromChannel(sharedPresenceChannel);
  for (const listener of presenceSubscribers) {
    try {
      listener(ids);
    } catch {
      // ignore subscriber callback error
    }
  }
  if (presenceProfileSubscribers.size > 0) {
    const profiles = readOnlineProfilesFromChannel(sharedPresenceChannel);
    for (const listener of presenceProfileSubscribers) {
      try {
        listener(profiles);
      } catch {
        // ignore subscriber callback error
      }
    }
  }
};

const notifyRosterChangeSubscribers = () => {
  for (const listener of rosterChangeSubscribers) {
    try {
      listener();
    } catch {
      // ignore subscriber callback error
    }
  }
};

const pushTrackedPresence = () => {
  if (
    !sharedPresenceChannel ||
    !sharedPresenceSubscribed ||
    !activeTrackedUserId ||
    typeof sharedPresenceChannel.track !== 'function'
  ) {
    return;
  }
  try {
    persistAthleteLastSeen();
    const payload: Record<string, unknown> = {
      userId: activeTrackedUserId,
      onlineAt: new Date().toISOString(),
    };
    if (activeTrackedProfileMeta) {
      if (activeTrackedProfileMeta.fullName) payload.fullName = activeTrackedProfileMeta.fullName;
      // Note: athlete email is deliberately excluded from public presence payloads to prevent unauthenticated PII leakage
      if (activeTrackedProfileMeta.role) payload.role = activeTrackedProfileMeta.role;
      if (activeTrackedProfileMeta.createdAt) payload.createdAt = activeTrackedProfileMeta.createdAt;
      if (typeof activeTrackedProfileMeta.isVerified === 'boolean') {
        payload.isVerified = activeTrackedProfileMeta.isVerified;
      }
    }
    void sharedPresenceChannel.track(payload);
  } catch {
    // ignore track error
  }
};

const ensureSharedPresenceChannel = () => {
  if (sharedPresenceChannel) return sharedPresenceChannel;
  const channel = supabase.channel('online-athletes');
  sharedPresenceChannel = channel;
  sharedPresenceSubscribed = false;

  channel
    .on('presence', { event: 'sync' }, () => {
      notifyPresenceSubscribers();
    })
    .on('presence', { event: 'join' }, () => {
      notifyPresenceSubscribers();
    })
    .on('presence', { event: 'leave' }, () => {
      notifyPresenceSubscribers();
    })
    .on('broadcast', { event: 'athlete-registered' }, (msg: { payload?: User }) => {
      if (msg?.payload?.id) {
        broadcastedAthletesById.set(msg.payload.id, msg.payload);
        notifyPresenceSubscribers();
        notifyRosterChangeSubscribers();
      }
    })
    .on('broadcast', { event: 'athlete-deleted' }, (msg: { payload?: { userId?: string } }) => {
      if (msg?.payload?.userId) {
        broadcastedAthletesById.delete(msg.payload.userId);
        notifyPresenceSubscribers();
        notifyRosterChangeSubscribers();
      }
    })
    .subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        sharedPresenceSubscribed = true;
        pushTrackedPresence();
        notifyPresenceSubscribers();
      }
    });

  return channel;
};

const broadcastRegisteredAthlete = (user: User) => {
  try {
    broadcastedAthletesById.set(user.id, user);
    notifyPresenceSubscribers();
    notifyRosterChangeSubscribers();
    const channel = sharedPresenceChannel;
    if (channel && sharedPresenceSubscribed && typeof channel.send === 'function') {
      void channel.send({
        type: 'broadcast',
        event: 'athlete-registered',
        payload: user,
      });
    }
  } catch {
    // ignore broadcast error
  }
};

const broadcastDeletedAthlete = (userId: string) => {
  try {
    broadcastedAthletesById.delete(userId);
    notifyPresenceSubscribers();
    notifyRosterChangeSubscribers();
    const channel = sharedPresenceChannel;
    if (channel && sharedPresenceSubscribed && typeof channel.send === 'function') {
      void channel.send({
        type: 'broadcast',
        event: 'athlete-deleted',
        payload: { userId },
      });
    }
  } catch {
    // ignore broadcast error
  }
};

const cleanupSharedPresenceChannelIfIdle = () => {
  if (
    activeTrackedUserId !== null ||
    presenceSubscribers.size > 0 ||
    presenceProfileSubscribers.size > 0 ||
    rosterChangeSubscribers.size > 0
  ) {
    return;
  }
  const channel = sharedPresenceChannel;
  sharedPresenceChannel = null;
  sharedPresenceSubscribed = false;
  latestOnlineUserIds = [];
  if (channel) {
    try {
      void supabase.removeChannel(channel);
    } catch {
      // ignore cleanup error
    }
  }
};

/**
 * Track an active athlete's online presence in the real-time presence channel.
 */
export const trackAthletePresence = (
  userId: string,
  profileMeta?: PresenceProfileMeta
): (() => void) => {
  if (!userId) return () => {};

  try {
    activeTrackedUserId = userId;
    activeTrackedProfileMeta = profileMeta;
    ensureSharedPresenceChannel();
    pushTrackedPresence();
    const lastSeenHeartbeat = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState !== 'hidden') {
        persistAthleteLastSeen();
      }
    }, 60_000);

    const handleVisibilityOrOnline = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        persistAthleteLastSeen();
        try {
          if (sharedPresenceChannel && typeof sharedPresenceChannel.untrack === 'function') {
            void sharedPresenceChannel.untrack();
          }
        } catch {
          // ignore untrack error
        }
      } else {
        pushTrackedPresence();
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityOrOnline);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('online', pushTrackedPresence);
    }

    return () => {
      clearInterval(lastSeenHeartbeat);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityOrOnline);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', pushTrackedPresence);
      }
      try {
        if (activeTrackedUserId === userId) {
          persistAthleteLastSeen();
          activeTrackedUserId = null;
          activeTrackedProfileMeta = undefined;
          if (sharedPresenceChannel && typeof sharedPresenceChannel.untrack === 'function') {
            void sharedPresenceChannel.untrack();
          }
        }
        cleanupSharedPresenceChannelIfIdle();
      } catch {
        // ignore cleanup error
      }
    };
  } catch {
    return () => {};
  }
};

/**
 * Subscribe to the online presence channel to see which athletes are currently online.
 */
export const subscribeToOnlineAthletes = (
  onSync: (onlineUserIds: string[]) => void
): (() => void) => {
  try {
    presenceSubscribers.add(onSync);
    const channel = ensureSharedPresenceChannel();
    // Immediately emit current known online athletes so tab switches between
    // Athletes and Analytics render live online status without waiting for a new
    // network event.
    onSync(readOnlineIdsFromChannel(channel));

    return () => {
      try {
        presenceSubscribers.delete(onSync);
        cleanupSharedPresenceChannelIfIdle();
      } catch {
        // ignore cleanup error
      }
    };
  } catch {
    return () => {};
  }
};

/**
 * Subscribe to live athlete profile metadata shared over the presence/broadcast
 * channel so newly registered accounts on other devices appear immediately in
 * the admin roster even before their email is confirmed or synced.
 */
export const subscribeToOnlineAthleteProfiles = (
  onSync: (profiles: User[]) => void
): (() => void) => {
  try {
    presenceProfileSubscribers.add(onSync);
    const channel = ensureSharedPresenceChannel();
    onSync(readOnlineProfilesFromChannel(channel));

    return () => {
      try {
        presenceProfileSubscribers.delete(onSync);
        cleanupSharedPresenceChannelIfIdle();
      } catch {
        // ignore cleanup error
      }
    };
  } catch {
    return () => {};
  }
};

/**
 * Subscribe to real-time changes on `public.users` (INSERT, UPDATE, DELETE) and
 * cross-device registration broadcasts so the Admin Athletes table updates
 * immediately when an account is created on another device.
 */
export const subscribeToUsersChanges = (onChange: () => void): (() => void) => {
  try {
    rosterChangeSubscribers.add(onChange);
    ensureSharedPresenceChannel();

    const dbChannel = supabase
      .channel('admin-users-roster-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        () => {
          onChange();
        }
      )
      .subscribe();

    return () => {
      try {
        rosterChangeSubscribers.delete(onChange);
        cleanupSharedPresenceChannelIfIdle();
        void supabase.removeChannel(dbChannel);
      } catch {
        // ignore cleanup error
      }
    };
  } catch {
    return () => {};
  }
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
 * Read this account's practice history from the server.
 *
 * The sync path has always written sessions to practice_sessions, but nothing ever
 * read them back, so history was stranded on whichever device recorded it. This
 * makes the table the source of truth, with the local cache as an offline copy.
 *
 * Identity across the two copies
 *   The sync path stamps every row's session_notes with a
 *   "[local-session:<id>]" marker, which is the only stable link between a local
 *   PracticeSession and its uploaded row. Rows without the marker get a stable
 *   id derived from the row uuid, so a merge can never duplicate them.
 *
 * RLS scopes this to the caller: practice_sessions only permits reading your own
 * rows, so passing someone else's id returns nothing rather than their history.
 */
export const fetchServerPracticeSessions = async (userId: string): Promise<PracticeSession[]> => {
  const { data, error } = await supabase
    .from('practice_sessions')
    .select('id, session_date, duration_minutes, overall_accuracy, icu_compliance_grade, session_notes, stunts(name)')
    .eq('user_id', userId)
    .order('session_date', { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const notes: string = row.session_notes ?? '';
    const marker = notes.match(/\[local-session:([^\]]+)\]/);
    const isUploadedImage = /\[source:uploaded-image\]/.test(notes);
    const fingerprint = notes.match(/\[image-fingerprint:([\da-f]{16})\]/i)?.[1];
    const isDuplicateUpload = /\[duplicate-upload\]/.test(notes);
    const stuntName =
      (Array.isArray(row.stunts) ? row.stunts[0]?.name : (row.stunts as { name?: string } | null)?.name) ??
      'Unknown Pose';

    return {
      // Prefer the original local id so the two copies merge into one entry.
      id: marker ? marker[1] : `srv-${row.id}`,
      poseId: '',
      poseName: isUploadedImage ? 'Uploaded Image' : stuntName,
      ...(isUploadedImage ? { source: 'upload' as const } : {}),
      ...(fingerprint ? { imageFingerprint: fingerprint } : {}),
      ...(isDuplicateUpload ? { isDuplicateUpload: true } : {}),
      timestamp: row.session_date ?? new Date(0).toISOString(),
      accuracyScore: Math.round(row.overall_accuracy ?? 0),
      durationSeconds: Math.max(1, Math.round((row.duration_minutes ?? 1) * 60)),
      corrections: [],
      ...(row.icu_compliance_grade == null
        ? {}
        : { icuScore: Math.round(row.icu_compliance_grade) }),
      // The marker is upload bookkeeping, not feedback the athlete should read.
      feedbackSummary: notes
        .replace(/\s*\[local-session:[^\]]+\]\s*$/, '')
        .replace(/\s*\[source:uploaded-image\]/, '')
        .replace(/\s*\[image-fingerprint:[\da-f]{16}\]/i, '')
        .replace(/\s*\[duplicate-upload\]/, '')
        .trim(),
    } satisfies PracticeSession;
  });
};

/**
 * Combine the server's copy of the history with the device cache.
 *
 * Local entries win on conflict: the local copy carries detail the table has no
 * column for (per-joint corrections and measured angles), so preferring the
 * server row would silently discard it. Server-only entries are added, which is
 * what makes history follow the account across devices.
 */
export const mergePracticeSessions = (
  local: PracticeSession[],
  remote: PracticeSession[]
): PracticeSession[] => {
  const byId = new Map<string, PracticeSession>();
  for (const session of remote) byId.set(session.id, session);
  for (const session of local) byId.set(session.id, session);

  return [...byId.values()].sort((a, b) => {
    const at = Date.parse(a.timestamp);
    const bt = Date.parse(b.timestamp);
    // Unparseable timestamps sort last rather than poisoning the comparator with
    // NaN, which would make the whole sort order arbitrary.
    if (Number.isNaN(at) && Number.isNaN(bt)) return 0;
    if (Number.isNaN(at)) return 1;
    if (Number.isNaN(bt)) return -1;
    return bt - at;
  });
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
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('You appear to be offline. Please connect to the internet to send a support ticket.');
  }

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
  broadcastSupportDeskChange();
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
  const [rows, bridge] = await Promise.all([
    userService.getAllUsers(),
    fetchSupportTicketBridgeRows(),
  ]);
  return rows
    .filter((row) => !bridge.deletedUserIds.has(row.id))
    .map(mapProfileRow);
};

/**
 * Permanently erase a user account and all of its associated records
 * (`auth.users`, `public.users`, `athlete_profiles`, `practice_sessions`,
 * `joint_corrections`, `support_tickets`, `ticket_replies`, `media_uploads`).
 *
 * 1. Calls `userService.deleteUser(userId)` which invokes the `SECURITY DEFINER`
 *    `public.delete_user_account(p_user_id)` RPC and falls back to direct
 *    `DELETE FROM public.users`.
 * 2. Best-effort direct cleanup of child tables in case the RPC has not been
 *    installed yet.
 * 3. If the `public.users` row still exists (because the SQL migration has not
 *    yet been executed in the Supabase SQL Editor), writes a `__user_deleted__`
 *    tombstone row so the deleted user and their records are immediately hidden
 *    across all Admin and user devices.
 * 4. Broadcasts `'athlete-deleted'` on the Realtime channel for instant UI sync.
 */
const deleteUserPermanently = async (userId: string): Promise<void> => {
  try {
    await userService.deleteUser(userId);
  } catch (err) {
    console.warn('[supabaseApi] deleteUser service call warning:', err);
  }

  // Best-effort direct table cleanup in case the RPC is not yet installed
  const childTables: Array<{ table: string; col: string }> = [
    { table: 'support_tickets', col: 'user_id' },
    { table: 'practice_sessions', col: 'user_id' },
    { table: 'media_uploads', col: 'user_id' },
    { table: 'athlete_profiles', col: 'user_id' },
    { table: 'users', col: 'id' },
  ];
  for (const { table, col } of childTables) {
    try {
      const tbl = supabase.from(table) as unknown as {
        delete?: () => { eq: (c: string, v: string) => Promise<unknown> };
      };
      if (typeof tbl.delete === 'function') {
        await tbl.delete().eq(col, userId);
      }
    } catch {
      // Ignore individual table RLS errors if migration hasn't been run yet
    }
  }

  // Deletion is executed via the delete_user_account RPC and direct table cascades.
  // Bridge tombstone row insertion in support_tickets has been removed for security.
  await broadcastDeletedAthlete(userId);
};

export const supabaseDeleteUser = async (userId: string): Promise<void> => {
  await deleteUserPermanently(userId);
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

export const supabaseArchiveStunt = async (stuntId: string): Promise<void> => {
  await stuntService.archiveStunt(stuntId);
};

export const supabaseGetArchivedStunts = async (): Promise<Stunt[]> => {
  return stuntService.getArchivedStunts();
};

export const supabaseRestoreStunt = async (stuntId: string): Promise<void> => {
  await stuntService.restoreStunt(stuntId);
};

export const supabasePermanentlyDeleteStunt = async (stuntId: string): Promise<void> => {
  await stuntService.deleteStunt(stuntId);
};

export const supabaseGetSessions = async (): Promise<SessionWithRelations[]> => {
  const [sessions, bridge] = await Promise.all([
    sessionService.getAllSessions(),
    fetchSupportTicketBridgeRows(),
  ]);
  return sessions.filter((s) => !bridge.deletedUserIds.has(s.user_id));
};

export const supabaseGetAnalytics = async (): Promise<AnalyticsSnapshot | null> => {
  return analyticsService.getLatestAnalytics();
};

export type SupportTicketWithUser = SupportTicket & {
  users?: { full_name: string | null; email: string | null } | null;
};

export type AthleteTicketWithReplies = SupportTicket & {
  replies: TicketReply[];
};

// ============================================================
// Support Tickets & Replies (100% Supabase Database Online-Only)
// ============================================================
//
// All support ticket writes (creating tickets, updating status, and adding
// Support Desk / athlete replies) go strictly to the remote Supabase PostgreSQL database and
// require an active internet connection.
//
// If `20261027000000_admin_ticket_replies_and_status.sql` has not yet been
// executed in the Supabase SQL Editor (so `ticket_replies` INSERT or
// `support_tickets` UPDATE is blocked by the baseline schema.sql policies),
// replies and status updates are stored in `public.joint_angle_standards`
// (which already has `public.is_admin()` write policies and `authenticated`
// read policies in the remote database) so everything stays 100% in Supabase.

const DB_REPLY_PREFIX = '__ticket_reply__:';
const DB_STATUS_PREFIX = '__ticket_status__:';
const DB_DELETED_PREFIX = '__ticket_deleted__:';
const DB_REPLY_DELETED_PREFIX = '__ticket_reply_deleted__:';
const DB_USER_DELETED_PREFIX = '__user_deleted__:';

/**
 * Whether a reply in a ticket thread was written by the athlete who owns the
 * ticket (true) or by the Support Desk (false). `ticket_replies.admin_id`
 * stores whoever sent the message, so comparing it to the ticket owner tells
 * the two sides apart.
 */
export const isAthleteReply = (reply: TicketReply, ticketOwnerId: string): boolean =>
  Boolean(reply.admin_id) && reply.admin_id === ticketOwnerId;

// ------------------------------------------------------------
// Support Desk real-time sync
// ------------------------------------------------------------
// One shared channel listens to `postgres_changes` on support_tickets and
// ticket_replies (requires the tables to be in the `supabase_realtime`
// publication — see 20261027000000_admin_ticket_replies_and_status.sql) plus
// a broadcast event, so the Admin inbox and the Athlete's "My Support Tickets"
// refresh the instant either side sends a reply or changes a status.

const SUPPORT_DESK_EVENT = 'support-ticket-updated';
let supportDeskChannel: ReturnType<typeof supabase.channel> | null = null;
let supportDeskSubscribed = false;
const supportDeskSubscribers = new Set<() => void>();
let supportDeskNotifyTimer: ReturnType<typeof setTimeout> | null = null;

const notifySupportDeskSubscribers = () => {
  // Debounce: a single reply can trigger several row events at once.
  if (supportDeskNotifyTimer) clearTimeout(supportDeskNotifyTimer);
  supportDeskNotifyTimer = setTimeout(() => {
    supportDeskNotifyTimer = null;
    for (const listener of supportDeskSubscribers) {
      try {
        listener();
      } catch {
        // ignore subscriber callback error
      }
    }
  }, 300);
};

const ensureSupportDeskChannel = () => {
  if (supportDeskChannel) return supportDeskChannel;
  const channel = supabase.channel('support-desk');
  supportDeskChannel = channel;
  supportDeskSubscribed = false;
  channel
    .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () =>
      notifySupportDeskSubscribers()
    )
    .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_replies' }, () =>
      notifySupportDeskSubscribers()
    )
    .on('broadcast', { event: SUPPORT_DESK_EVENT }, () => notifySupportDeskSubscribers())
    .subscribe((status: string) => {
      supportDeskSubscribed = status === 'SUBSCRIBED';
    });
  return channel;
};

const broadcastSupportDeskChange = () => {
  try {
    const channel = supportDeskChannel;
    if (channel && supportDeskSubscribed && typeof channel.send === 'function') {
      void channel.send({
        type: 'broadcast',
        event: SUPPORT_DESK_EVENT,
        payload: { at: new Date().toISOString() },
      });
    }
  } catch {
    // ignore broadcast error
  }
};

/**
 * Subscribe to live Support Desk changes (new tickets, replies from either
 * side, status updates, deletions). Returns an unsubscribe function.
 */
export const subscribeToSupportTickets = (onChange: () => void): (() => void) => {
  supportDeskSubscribers.add(onChange);
  try {
    ensureSupportDeskChannel();
  } catch {
    // Supabase not configured / realtime unavailable — manual refresh still works
  }
  return () => {
    supportDeskSubscribers.delete(onChange);
    if (supportDeskSubscribers.size === 0 && supportDeskChannel) {
      const channel = supportDeskChannel;
      supportDeskChannel = null;
      supportDeskSubscribed = false;
      void supabase.removeChannel(channel);
    }
  };
};

/**
 * Normalize Postgres `TIMESTAMP` (without time zone) strings into explicit UTC
 * ISO-8601 strings (`...Z`) so JavaScript converts them accurately to the
 * user's local timezone instead of showing an offset (e.g. 8h behind in UTC+8).
 */
export const normalizeUtcIso = (raw?: string | null): string => {
  if (!raw) return new Date().toISOString();
  const trimmed = raw.trim();
  if (!trimmed) return new Date().toISOString();
  const hasTz = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(trimmed);
  return hasTz ? trimmed : `${trimmed.replace(' ', 'T')}Z`;
};

const isBridgeMetaTicket = (subject: string): boolean =>
  subject.startsWith(DB_REPLY_PREFIX) ||
  subject.startsWith(DB_STATUS_PREFIX) ||
  subject.startsWith(DB_DELETED_PREFIX) ||
  subject.startsWith(DB_REPLY_DELETED_PREFIX) ||
  subject.startsWith(DB_USER_DELETED_PREFIX);

const parseSupportTicketBridgeRows = (
  rows: SupportTicket[]
): {
  repliesByTicketId: Record<string, TicketReply[]>;
  statusByTicketId: Record<string, { status: SupportTicketStatus; updated_at: string }>;
  deletedTicketIds: Set<string>;
  deletedReplyIds: Set<string>;
  deletedUserIds: Set<string>;
} => {
  const repliesByTicketId: Record<string, TicketReply[]> = {};
  const statusByTicketId: Record<string, { status: SupportTicketStatus; updated_at: string }> = {};
  const deletedTicketIds = new Set<string>();
  const deletedReplyIds = new Set<string>();
  const deletedUserIds = new Set<string>();

  // Process oldest to newest so latest status wins and replies are chronological
  const chronological = [...rows].sort(
    (a, b) => Date.parse(normalizeUtcIso(a.created_at)) - Date.parse(normalizeUtcIso(b.created_at))
  );

  for (const row of chronological) {
    const subj = row.subject ?? '';
    if (subj.startsWith(DB_DELETED_PREFIX)) {
      const ticketId = subj.slice(DB_DELETED_PREFIX.length);
      if (ticketId) deletedTicketIds.add(ticketId);
    } else if (subj.startsWith(DB_REPLY_DELETED_PREFIX)) {
      const replyId = subj.slice(DB_REPLY_DELETED_PREFIX.length);
      if (replyId) deletedReplyIds.add(replyId);
    } else if (subj.startsWith(DB_USER_DELETED_PREFIX)) {
      const deletedUid = subj.slice(DB_USER_DELETED_PREFIX.length);
      if (deletedUid) deletedUserIds.add(deletedUid);
    } else if (subj.startsWith(DB_REPLY_PREFIX) && row.description) {
      const ticketId = subj.slice(DB_REPLY_PREFIX.length);
      try {
        const parsed = JSON.parse(row.description) as TicketReply;
        if (!repliesByTicketId[ticketId]) repliesByTicketId[ticketId] = [];
        repliesByTicketId[ticketId].push({
          // Use the support_tickets row UUID as the canonical ID so deleting by ID matches
          id: row.id,
          ticket_id: ticketId,
          admin_id: parsed.admin_id || row.user_id,
          message: parsed.message,
          created_at: normalizeUtcIso(parsed.created_at || row.created_at),
        });
      } catch {
        // Ignore malformed bridge row
      }
    } else if (subj.startsWith(DB_STATUS_PREFIX) && row.description) {
      const ticketId = subj.slice(DB_STATUS_PREFIX.length);
      try {
        const parsed = JSON.parse(row.description) as {
          status: SupportTicketStatus;
          updated_at: string;
        };
        const normalizedUpdated = normalizeUtcIso(parsed.updated_at || row.created_at);
        const prev = statusByTicketId[ticketId];
        if (!prev || Date.parse(normalizedUpdated) >= Date.parse(prev.updated_at)) {
          statusByTicketId[ticketId] = {
            status: parsed.status,
            updated_at: normalizedUpdated,
          };
        }
      } catch {
        // Ignore malformed bridge row
      }
    }
  }

  return { repliesByTicketId, statusByTicketId, deletedTicketIds, deletedReplyIds, deletedUserIds };
};

const fetchSupportTicketBridgeRows = async (): Promise<{
  repliesByTicketId: Record<string, TicketReply[]>;
  statusByTicketId: Record<string, { status: SupportTicketStatus; updated_at: string }>;
  deletedTicketIds: Set<string>;
  deletedReplyIds: Set<string>;
  deletedUserIds: Set<string>;
}> => {
  try {
    const query = supabase.from('support_tickets').select('*') as unknown as {
      or?: (filter: string) => {
        order: (col: string, opts: { ascending: boolean }) => Promise<{ data: unknown; error: unknown }>;
      };
    };
    if (typeof query.or !== 'function') {
      return {
        repliesByTicketId: {},
        statusByTicketId: {},
        deletedTicketIds: new Set(),
        deletedReplyIds: new Set(),
        deletedUserIds: new Set(),
      };
    }
    const { data, error } = await query
      .or(
        `subject.like.${DB_REPLY_PREFIX}%,subject.like.${DB_STATUS_PREFIX}%,subject.like.${DB_DELETED_PREFIX}%,subject.like.${DB_REPLY_DELETED_PREFIX}%,subject.like.${DB_USER_DELETED_PREFIX}%`
      )
      .order('created_at', { ascending: true });

    if (error || !data) {
      return {
        repliesByTicketId: {},
        statusByTicketId: {},
        deletedTicketIds: new Set(),
        deletedReplyIds: new Set(),
        deletedUserIds: new Set(),
      };
    }
    return parseSupportTicketBridgeRows(data as SupportTicket[]);
  } catch {
    return {
      repliesByTicketId: {},
      statusByTicketId: {},
      deletedTicketIds: new Set(),
      deletedReplyIds: new Set(),
      deletedUserIds: new Set(),
    };
  }
};

const mergeTicketReplies = (
  dbReplies: TicketReply[],
  bridgeReplies: TicketReply[],
  deletedReplyIds: Set<string>
): TicketReply[] => {
  const byId = new Map<string, TicketReply>();
  for (const r of dbReplies) {
    if (!deletedReplyIds.has(r.id)) {
      byId.set(r.id, { ...r, created_at: normalizeUtcIso(r.created_at) });
    }
  }
  for (const r of bridgeReplies) {
    if (deletedReplyIds.has(r.id)) continue;
    const rCreated = normalizeUtcIso(r.created_at);
    const duplicate = dbReplies.some(
      (d) =>
        d.message === r.message &&
        Math.abs(Date.parse(normalizeUtcIso(d.created_at)) - Date.parse(rCreated)) < 5000
    );
    if (!duplicate) byId.set(r.id, { ...r, created_at: rCreated });
  }
  return [...byId.values()].sort(
    (a, b) => Date.parse(a.created_at) - Date.parse(b.created_at)
  );
};

export const supabaseGetMyTickets = async (): Promise<AthleteTicketWithReplies[]> => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('You appear to be offline. Connect to the internet to view support tickets.');
  }
  const session = await getAuthSessionQuietly();
  if (!session) return [];
  const [allOwnRows, bridge] = await Promise.all([
    ticketService.getAthleteTickets(session.user.id),
    fetchSupportTicketBridgeRows(),
  ]);

  if (bridge.deletedUserIds.has(session.user.id)) return [];

  const activeTickets = allOwnRows.filter(
    (t) => !isBridgeMetaTicket(t.subject) && !bridge.deletedTicketIds.has(t.id)
  );

  const withReplies = await Promise.all(
    activeTickets.map(async (t) => {
      const dbReplies = await ticketService.getTicketReplies(t.id).catch(() => []);
      const bridgeReplies = bridge.repliesByTicketId[t.id] ?? [];
      const statusOverride = bridge.statusByTicketId[t.id];
      const createdAt = normalizeUtcIso(t.created_at);
      const updatedAt = normalizeUtcIso(t.updated_at);
      return {
        ...t,
        created_at: createdAt,
        updated_at: updatedAt,
        ...(statusOverride && Date.parse(statusOverride.updated_at) >= Date.parse(updatedAt)
          ? { status: statusOverride.status, updated_at: statusOverride.updated_at }
          : {}),
        replies: mergeTicketReplies(dbReplies, bridgeReplies, bridge.deletedReplyIds),
      };
    })
  );
  return withReplies;
};

export const supabaseGetAllTickets = async (): Promise<SupportTicketWithUser[]> => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('You appear to be offline. Connect to the internet to load support tickets.');
  }
  const rows = await ticketService.getAllTickets();
  const bridge = parseSupportTicketBridgeRows(rows);
  return rows
    .filter(
      (t) =>
        !isBridgeMetaTicket(t.subject) &&
        !bridge.deletedTicketIds.has(t.id) &&
        !bridge.deletedUserIds.has(t.user_id)
    )
    .map((t) => {
      const createdAt = normalizeUtcIso(t.created_at);
      const updatedAt = normalizeUtcIso(t.updated_at);
      const statusOverride = bridge.statusByTicketId[t.id];
      if (statusOverride && Date.parse(statusOverride.updated_at) >= Date.parse(updatedAt)) {
        return {
          ...t,
          created_at: createdAt,
          status: statusOverride.status,
          updated_at: statusOverride.updated_at,
        };
      }
      return { ...t, created_at: createdAt, updated_at: updatedAt };
    });
};

/**
 * Count of open / unanswered support tickets for the Admin sidebar badge.
 */
export const supabaseGetOpenTicketsCount = async (): Promise<number> => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 0;
  }
  try {
    const rows = await supabaseGetAllTickets();
    return rows.filter((t) => t.status === 'open').length;
  } catch {
    return 0;
  }
};

export const supabaseUpdateTicketStatus = async (
  ticketId: string,
  status: SupportTicketStatus
): Promise<void> => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('You appear to be offline. Please connect to the internet to update ticket status.');
  }

  const session = await getAuthSessionQuietly();
  if (!session) {
    throw new Error('You need to be signed in to the Support Desk to update ticket status.');
  }

  // 1. Preferred: SECURITY DEFINER RPC (installed by the Support Desk migration)
  const { error: rpcErr } = await supabase.rpc('update_support_ticket_status', {
    p_ticket_id: ticketId,
    p_status: status,
  });
  if (!rpcErr) {
    broadcastSupportDeskChange();
    return;
  }

  // 2. Direct table update (works when the admin UPDATE policy exists)
  const updatedAt = new Date().toISOString();
  const { data: updatedRows, error: updateErr } = await supabase
    .from('support_tickets')
    .update({ status, updated_at: updatedAt })
    .eq('id', ticketId)
    .select('id');

  if (!updateErr && updatedRows && updatedRows.length > 0) {
    broadcastSupportDeskChange();
    return;
  }

  if (updateErr) {
    throw new Error(updateErr.message || 'Could not update ticket status.');
  }
  broadcastSupportDeskChange();
};

export const supabaseGetTicketReplies = async (ticketId: string): Promise<TicketReply[]> => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('You appear to be offline. Connect to the internet to load ticket replies.');
  }
  const [dbReplies, bridge] = await Promise.all([
    ticketService.getTicketReplies(ticketId).catch(() => []),
    fetchSupportTicketBridgeRows(),
  ]);
  const bridgeReplies = bridge.repliesByTicketId[ticketId] ?? [];
  return mergeTicketReplies(dbReplies, bridgeReplies, bridge.deletedReplyIds);
};

export const supabaseDeleteTicketReply = async (replyId: string): Promise<void> => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('You appear to be offline. Please connect to the internet to delete a reply.');
  }

  const session = await getAuthSessionQuietly();
  if (!session) {
    throw new Error('You need to be signed in to the Support Desk to delete a reply.');
  }

  // 1. Try deleting from ticket_replies and support_tickets directly
  const [trRes, stRes] = await Promise.all([
    supabase.from('ticket_replies').delete().eq('id', replyId).select('id'),
    supabase.from('support_tickets').delete().eq('id', replyId).select('id'),
  ]);

  if (
    (!trRes.error && trRes.data && trRes.data.length > 0) ||
    (!stRes.error && stRes.data && stRes.data.length > 0)
  ) {
    broadcastSupportDeskChange();
    return;
  }

  if (trRes.error && stRes.error) {
    throw new Error(trRes.error.message || stRes.error.message || 'Could not delete reply.');
  }
  broadcastSupportDeskChange();
};

/**
 * Post a message in a ticket thread. Used by BOTH sides:
 *  - the Support Desk (admin) replying to an athlete, and
 *  - the athlete replying back on their own ticket.
 * `ticket_replies.admin_id` stores whoever sent the message (see
 * `isAthleteReply`).
 */
export const supabaseAddTicketReply = async (
  ticketId: string,
  message: string
): Promise<TicketReply> => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('You appear to be offline. Please connect to the internet to send a reply.');
  }

  const session = await getAuthSessionQuietly();
  if (!session) {
    throw new Error('You need to be signed in to reply to a ticket.');
  }
  const cleanMessage = message.trim();
  if (!cleanMessage) {
    throw new Error('Please enter a reply message.');
  }

  // 1. Preferred: SECURITY DEFINER RPC (works for admin and ticket owner)
  try {
    const { data: rpcRow, error: rpcErr } = await supabase.rpc('add_support_ticket_reply', {
      p_ticket_id: ticketId,
      p_message: cleanMessage,
    });
    const row = (Array.isArray(rpcRow) ? rpcRow[0] : rpcRow) as TicketReply | null;
    if (!rpcErr && row?.id) {
      broadcastSupportDeskChange();
      return { ...row, created_at: normalizeUtcIso(row.created_at) };
    }
  } catch {
    // RPC not installed yet — fall through
  }

  // 2. Direct insert into ticket_replies (needs the INSERT policy)
  const added = await ticketService.addReply({
    ticket_id: ticketId,
    admin_id: session.user.id,
    message: cleanMessage,
  });
  broadcastSupportDeskChange();
  return { ...added, created_at: normalizeUtcIso(added.created_at) };
};

export const supabaseDeleteTicket = async (ticketId: string): Promise<void> => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('You appear to be offline. Please connect to the internet to delete a conversation.');
  }

  const session = await getAuthSessionQuietly();
  if (!session) {
    throw new Error('You need to be signed in to the Support Desk to delete a conversation.');
  }

  // 1. Delete the ticket + any bridge rows from support_tickets if DELETE policy is active
  await supabase
    .from('support_tickets')
    .delete()
    .in('subject', [`${DB_REPLY_PREFIX}${ticketId}`, `${DB_STATUS_PREFIX}${ticketId}`]);

  const { data: deletedRows, error: deleteErr } = await supabase
    .from('support_tickets')
    .delete()
    .eq('id', ticketId)
    .select('id');

  if (!deleteErr && deletedRows && deletedRows.length > 0) {
    broadcastSupportDeskChange();
    return;
  }

  if (deleteErr) {
    throw new Error(deleteErr.message || 'Could not delete conversation.');
  }
  broadcastSupportDeskChange();
};

// Re-export DB row types so consumers can import row shapes from one place.
export type { DbUser, DbUserRole, SupportTicket, TicketReply, SupportTicketStatus };