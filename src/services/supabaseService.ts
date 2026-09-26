import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  User as DbUser,
  AthleteProfile,
  Stunt,
  JointAngleStandard,
  PracticeSession,
  JointCorrection,
  SupportTicket,
  TicketReply,
  MediaUpload,
  AnalyticsSnapshot,
  UserRole,
} from '@/types/supabase';

// ============================================================
// Client bootstrap
// ============================================================
//
// This module is the ONLY place the Supabase client is created and the only
// place raw queries touch the database. Everything else in the app goes
// through the typed services below (or the auth helpers in supabaseApi.ts).

const envUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Whether the app has valid Supabase credentials to talk to the database. */
export const isSupabaseConfigured = Boolean(envUrl && envKey);

if (!isSupabaseConfigured) {
  console.warn(
    '[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are missing. ' +
      'Accounts, cloud sync and admin panels will be unavailable until they are set in .env.local.'
  );
}

/**
 * A fail-fast placeholder used when Supabase is not configured. Every access
 * throws a descriptive error instead of a confusing network/`undefined` error,
 * so misconfiguration surfaces immediately (and only when a DB feature is
 * actually used – normal flow is gated by `isSupabaseConfigured`).
 */
const createUnconfiguredClient = (): SupabaseClient => {
  const throwError = (): never => {
    throw new Error(
      'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local ' +
        'to enable authentication and database sync.'
    );
  };
  const makeProxy = (): object =>
    new Proxy(
      {},
      {
        get: (_target, prop) => {
          // Keep `auth.*` nested so `supabase.auth.signInWithPassword(...)`
          // still throws the descriptive error rather than "not a function".
          if (prop === 'auth') return makeProxy();
          return () => {
            throwError();
          };
        },
      }
    );
  return makeProxy() as unknown as SupabaseClient;
};

export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(envUrl!, envKey!, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : createUnconfiguredClient();

// ============================================================
// Helpers
// ============================================================

/** Log + rethrow the error. Returns `data` on success. */
function unwrap<T>(data: unknown, error: unknown, context: string): T {
  if (error) {
    console.error(`[supabase] ${context}:`, error);
    throw error;
  }
  return data as T;
}

/** Convenience for "0 or 1 row" reads: null when the row does not exist. */
async function fetchMaybeSingle<T>(table: string, column: string, value: string, context: string): Promise<T | null> {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq(column, value)
    .maybeSingle();
  return unwrap<T | null>(data, error, context);
}

/**
 * Practice sessions joined with the author + stunt for admin dashboards.
 * The joined relations are nullable because FK targets may be missing/soft-deleted.
 */
export type SessionWithRelations = PracticeSession & {
  users?: { full_name: string | null; email: string | null } | null;
  stunts?: { name: string | null; category: string | null } | null;
};

/** Fields required to create a stunt (the rest have sensible DB defaults). */
export type StuntInsert = Partial<Omit<Stunt, 'id' | 'created_at' | 'updated_at'>> & Pick<Stunt, 'name' | 'category'>;

/** Shape of the `get_stunt_difficulty_insights` RPC rows. */
export type StuntDifficultyInsight = {
  difficulty_tier?: string | null;
  average_accuracy?: number | null;
  total_sessions?: number | null;
  [key: string]: unknown;
};

// ============================================================
// USER MANAGEMENT
// ============================================================

export const userService = {
  async getUser(userId: string): Promise<DbUser | null> {
    return fetchMaybeSingle<DbUser>('users', 'id', userId, 'fetch user');
  },

  async getProfileByEmail(email: string): Promise<DbUser | null> {
    const { data, error } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
    return unwrap<DbUser | null>(data, error, 'fetch user by email');
  },

  async getAllUsers(): Promise<DbUser[]> {
    const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    return unwrap<DbUser[]>(data ?? [], error, 'fetch users');
  },

  async updateUserRole(userId: string, role: UserRole): Promise<void> {
    const { error } = await supabase.from('users').update({ role }).eq('id', userId);
    unwrap(null, error, `update role of user ${userId}`);
  },

  /** Soft-delete: flips `is_active` to false (rows are never hard-deleted). */
  async deleteUser(userId: string): Promise<void> {
    const { error } = await supabase.from('users').update({ is_active: false }).eq('id', userId);
    unwrap(null, error, `deactivate user ${userId}`);
  },

  async getAthleteProfile(userId: string): Promise<AthleteProfile | null> {
    return fetchMaybeSingle<AthleteProfile>('athlete_profiles', 'user_id', userId, 'fetch athlete profile');
  },

  async updateAthleteProfile(userId: string, updates: Partial<AthleteProfile>): Promise<void> {
    const { error } = await supabase.from('athlete_profiles').update(updates).eq('user_id', userId);
    unwrap(null, error, `update athlete profile ${userId}`);
  },
};

// ============================================================
// STUNT MANAGEMENT
// ============================================================

export const stuntService = {
  async getAllStunts(): Promise<Stunt[]> {
    const { data, error } = await supabase
      .from('stunts')
      .select('*')
      .eq('is_archived', false)
      .order('created_at', { ascending: false });
    return unwrap<Stunt[]>(data ?? [], error, 'fetch stunts');
  },

  async getStunt(stuntId: string): Promise<Stunt | null> {
    return fetchMaybeSingle<Stunt>('stunts', 'id', stuntId, 'fetch stunt');
  },

  async getStuntByName(name: string): Promise<Stunt | null> {
    const { data, error } = await supabase.from('stunts').select('id').eq('name', name).maybeSingle();
    return unwrap<Stunt | null>(data, error, `fetch stunt by name "${name}"`);
  },

  async createStunt(stunt: StuntInsert): Promise<Stunt> {
    const { data, error } = await supabase.from('stunts').insert([stunt]).select().single();
    return unwrap<Stunt>(data, error, 'create stunt');
  },

  async updateStunt(stuntId: string, updates: Partial<Stunt>): Promise<void> {
    const { error } = await supabase
      .from('stunts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', stuntId);
    unwrap(null, error, `update stunt ${stuntId}`);
  },

  /** Soft-delete from the app-facing library (keeps historical session links). */
  async archiveStunt(stuntId: string): Promise<void> {
    await this.updateStunt(stuntId, { is_archived: true });
  },

  /** Hard-delete – only safe for stunts with no historical sessions. */
  async deleteStunt(stuntId: string): Promise<void> {
    const { error } = await supabase.from('stunts').delete().eq('id', stuntId);
    unwrap(null, error, `delete stunt ${stuntId}`);
  },
};

// ============================================================
// JOINT ANGLE STANDARDS (ICU Calibration)
// ============================================================

export const jointAngleService = {
  async getStuntJointAngles(stuntId: string): Promise<JointAngleStandard[]> {
    const { data, error } = await supabase
      .from('joint_angle_standards')
      .select('*')
      .eq('stunt_id', stuntId)
      .order('created_at', { ascending: false });
    return unwrap<JointAngleStandard[]>(data ?? [], error, 'fetch joint angles');
  },

  async createJointAngle(
    angle: Omit<JointAngleStandard, 'id' | 'created_at' | 'updated_at'>
  ): Promise<JointAngleStandard> {
    const { data, error } = await supabase.from('joint_angle_standards').insert([angle]).select().single();
    return unwrap<JointAngleStandard>(data, error, 'create joint angle');
  },

  async updateJointAngle(angleId: string, updates: Partial<JointAngleStandard>): Promise<void> {
    const { error } = await supabase
      .from('joint_angle_standards')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', angleId);
    unwrap(null, error, `update joint angle ${angleId}`);
  },

  async deleteJointAngle(angleId: string): Promise<void> {
    const { error } = await supabase.from('joint_angle_standards').delete().eq('id', angleId);
    unwrap(null, error, `delete joint angle ${angleId}`);
  },
};

// ============================================================
// PRACTICE SESSIONS & TELEMETRY
// ============================================================

export const sessionService = {
  async getAthleteSessionHistory(userId: string): Promise<PracticeSession[]> {
    const { data, error } = await supabase
      .from('practice_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('session_date', { ascending: false });
    return unwrap<PracticeSession[]>(data ?? [], error, 'fetch sessions');
  },

  async getAllSessions(): Promise<SessionWithRelations[]> {
    const { data, error } = await supabase
      .from('practice_sessions')
      .select('*, users:user_id(full_name, email), stunts:stunt_id(name, category)')
      .order('session_date', { ascending: false });
    return unwrap<SessionWithRelations[]>(data ?? [], error, 'fetch all sessions');
  },

  async createSession(
    session: Omit<PracticeSession, 'id' | 'created_at' | 'updated_at'>
  ): Promise<PracticeSession> {
    const { data, error } = await supabase.from('practice_sessions').insert([session]).select().single();
    return unwrap<PracticeSession>(data, error, 'create session');
  },

  async updateSession(sessionId: string, updates: Partial<PracticeSession>): Promise<void> {
    const { error } = await supabase
      .from('practice_sessions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', sessionId);
    unwrap(null, error, `update session ${sessionId}`);
  },

  async getSessionCorrections(sessionId: string): Promise<JointCorrection[]> {
    const { data, error } = await supabase
      .from('joint_corrections')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });
    return unwrap<JointCorrection[]>(data ?? [], error, 'fetch corrections');
  },

  async addJointCorrection(correction: Omit<JointCorrection, 'id' | 'created_at'>): Promise<JointCorrection> {
    const { data, error } = await supabase.from('joint_corrections').insert([correction]).select().single();
    return unwrap<JointCorrection>(data, error, 'add correction');
  },
};

// ============================================================
// SUPPORT TICKETS & HELP DESK
// ============================================================

export const ticketService = {
  async getAthleteTickets(userId: string): Promise<SupportTicket[]> {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return unwrap<SupportTicket[]>(data ?? [], error, 'fetch tickets');
  },

  async getAllTickets(): Promise<
    Array<SupportTicket & { users?: { full_name: string | null; email: string | null } | null }>
  > {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*, users:user_id(full_name, email)')
      .order('created_at', { ascending: false });
    return unwrap(data ?? [], error, 'fetch all tickets');
  },

  async createTicket(
    ticket: Omit<SupportTicket, 'id' | 'created_at' | 'updated_at'>
  ): Promise<SupportTicket> {
    const { data, error } = await supabase.from('support_tickets').insert([ticket]).select().single();
    return unwrap<SupportTicket>(data, error, 'create ticket');
  },

  async updateTicketStatus(ticketId: string, status: SupportTicket['status']): Promise<void> {
    const { error } = await supabase
      .from('support_tickets')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', ticketId);
    unwrap(null, error, `update ticket status ${ticketId}`);
  },

  async addReply(reply: Omit<TicketReply, 'id' | 'created_at'>): Promise<TicketReply> {
    const { data, error } = await supabase.from('ticket_replies').insert([reply]).select().single();
    return unwrap<TicketReply>(data, error, 'add reply');
  },

  async getTicketReplies(ticketId: string): Promise<TicketReply[]> {
    const { data, error } = await supabase
      .from('ticket_replies')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });
    return unwrap<TicketReply[]>(data ?? [], error, 'fetch replies');
  },
};

// ============================================================
// MEDIA MANAGEMENT
// ============================================================

export const mediaService = {
  async getSessionMedia(sessionId: string): Promise<MediaUpload[]> {
    const { data, error } = await supabase
      .from('media_uploads')
      .select('*')
      .eq('session_id', sessionId)
      .order('uploaded_at', { ascending: false });
    return unwrap<MediaUpload[]>(data ?? [], error, 'fetch media');
  },

  async getUserMedia(userId: string): Promise<MediaUpload[]> {
    const { data, error } = await supabase
      .from('media_uploads')
      .select('*')
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false });
    return unwrap<MediaUpload[]>(data ?? [], error, 'fetch user media');
  },

  async uploadMedia(media: Omit<MediaUpload, 'id' | 'uploaded_at'>): Promise<MediaUpload> {
    const { data, error } = await supabase.from('media_uploads').insert([media]).select().single();
    return unwrap<MediaUpload>(data, error, 'upload media');
  },

  async deleteMedia(mediaId: string): Promise<void> {
    const { error } = await supabase.from('media_uploads').delete().eq('id', mediaId);
    unwrap(null, error, `delete media ${mediaId}`);
  },

  /**
   * Total bytes stored across all media uploads. Prefers the server-side
   * aggregate RPC (constant round-trips regardless of row count) and falls back
   * to a client-side sum if the RPC is not deployed yet.
   */
  async getTotalStorageUsage(): Promise<number> {
    const rpcResult = await supabase.rpc('get_total_storage_usage');
    if (!rpcResult.error && typeof rpcResult.data === 'number') {
      return rpcResult.data;
    }

    const { data, error } = await supabase.from('media_uploads').select('file_size_bytes');
    unwrap(null, error, 'fetch storage usage');
    return (data ?? []).reduce((sum, row) => sum + (row.file_size_bytes ?? 0), 0);
  },
};

// ============================================================
// ANALYTICS
// ============================================================

export const analyticsService = {
  /** Latest snapshot, or null when none has been generated yet. */
  async getLatestAnalytics(): Promise<AnalyticsSnapshot | null> {
    const { data, error } = await supabase
      .from('analytics_snapshots')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return unwrap<AnalyticsSnapshot | null>(data, error, 'fetch analytics');
  },

  async getAnalyticsHistory(days: number = 30): Promise<AnalyticsSnapshot[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('analytics_snapshots')
      .select('*')
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: false });
    return unwrap<AnalyticsSnapshot[]>(data ?? [], error, 'fetch analytics history');
  },

  async getStuntDifficultiesInsights(): Promise<StuntDifficultyInsight[]> {
    const { data, error } = await supabase.rpc('get_stunt_difficulty_insights');
    return unwrap<StuntDifficultyInsight[]>(data ?? [], error, 'fetch insights');
  },
};

export default supabase;