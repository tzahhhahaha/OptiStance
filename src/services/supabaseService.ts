import { createClient } from '@supabase/supabase-js';
import type {
  User,
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

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================
// USER MANAGEMENT
// ============================================

export const userService = {
  async getUser(userId: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) console.error('Error fetching user:', error);
    return data;
  },

  async getAllUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) console.error('Error fetching users:', error);
    return data || [];
  },

  async updateUserRole(userId: string, role: UserRole): Promise<boolean> {
    const { error } = await supabase
      .from('users')
      .update({ role })
      .eq('id', userId);
    if (error) console.error('Error updating user role:', error);
    return !error;
  },

  async deleteUser(userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('users')
      .update({ is_active: false })
      .eq('id', userId);
    if (error) console.error('Error deleting user:', error);
    return !error;
  },

  async getAthleteProfile(userId: string): Promise<AthleteProfile | null> {
    const { data, error } = await supabase
      .from('athlete_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error) console.error('Error fetching athlete profile:', error);
    return data;
  },

  async updateAthleteProfile(userId: string, updates: Partial<AthleteProfile>): Promise<boolean> {
    const { error } = await supabase
      .from('athlete_profiles')
      .update(updates)
      .eq('user_id', userId);
    if (error) console.error('Error updating athlete profile:', error);
    return !error;
  },
};

// ============================================
// STUNT MANAGEMENT
// ============================================

export const stuntService = {
  async getAllStunts(): Promise<Stunt[]> {
    const { data, error } = await supabase
      .from('stunts')
      .select('*')
      .eq('is_archived', false)
      .order('created_at', { ascending: false });
    if (error) console.error('Error fetching stunts:', error);
    return data || [];
  },

  async getStunt(stuntId: string): Promise<Stunt | null> {
    const { data, error } = await supabase
      .from('stunts')
      .select('*')
      .eq('id', stuntId)
      .single();
    if (error) console.error('Error fetching stunt:', error);
    return data;
  },

  async createStunt(stunt: Omit<Stunt, 'id' | 'created_at' | 'updated_at'>): Promise<Stunt | null> {
    const { data, error } = await supabase
      .from('stunts')
      .insert([stunt])
      .select()
      .single();
    if (error) console.error('Error creating stunt:', error);
    return data;
  },

  async updateStunt(stuntId: string, updates: Partial<Stunt>): Promise<boolean> {
    const { error } = await supabase
      .from('stunts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', stuntId);
    if (error) console.error('Error updating stunt:', error);
    return !error;
  },

  async archiveStunt(stuntId: string): Promise<boolean> {
    return stuntService.updateStunt(stuntId, { is_archived: true });
  },

  async deleteStunt(stuntId: string): Promise<boolean> {
    const { error } = await supabase
      .from('stunts')
      .delete()
      .eq('id', stuntId);
    if (error) console.error('Error deleting stunt:', error);
    return !error;
  },
};

// ============================================
// JOINT ANGLE STANDARDS (ICU Calibration)
// ============================================

export const jointAngleService = {
  async getStuntJointAngles(stuntId: string): Promise<JointAngleStandard[]> {
    const { data, error } = await supabase
      .from('joint_angle_standards')
      .select('*')
      .eq('stunt_id', stuntId)
      .order('created_at', { ascending: false });
    if (error) console.error('Error fetching joint angles:', error);
    return data || [];
  },

  async createJointAngle(angle: Omit<JointAngleStandard, 'id' | 'created_at' | 'updated_at'>): Promise<JointAngleStandard | null> {
    const { data, error } = await supabase
      .from('joint_angle_standards')
      .insert([angle])
      .select()
      .single();
    if (error) console.error('Error creating joint angle:', error);
    return data;
  },

  async updateJointAngle(angleId: string, updates: Partial<JointAngleStandard>): Promise<boolean> {
    const { error } = await supabase
      .from('joint_angle_standards')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', angleId);
    if (error) console.error('Error updating joint angle:', error);
    return !error;
  },

  async deleteJointAngle(angleId: string): Promise<boolean> {
    const { error } = await supabase
      .from('joint_angle_standards')
      .delete()
      .eq('id', angleId);
    if (error) console.error('Error deleting joint angle:', error);
    return !error;
  },
};

// ============================================
// PRACTICE SESSIONS & TELEMETRY
// ============================================

export const sessionService = {
  async getAthleteSessionHistory(userId: string): Promise<PracticeSession[]> {
    const { data, error } = await supabase
      .from('practice_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('session_date', { ascending: false });
    if (error) console.error('Error fetching sessions:', error);
    return data || [];
  },

  async getAllSessions(): Promise<PracticeSession[]> {
    const { data, error } = await supabase
      .from('practice_sessions')
      .select(`
        *,
        users:user_id(full_name, email),
        stunts:stunt_id(name, category)
      `)
      .order('session_date', { ascending: false });
    if (error) console.error('Error fetching all sessions:', error);
    return data || [];
  },

  async createSession(session: Omit<PracticeSession, 'id' | 'created_at' | 'updated_at'>): Promise<PracticeSession | null> {
    const { data, error } = await supabase
      .from('practice_sessions')
      .insert([session])
      .select()
      .single();
    if (error) console.error('Error creating session:', error);
    return data;
  },

  async updateSession(sessionId: string, updates: Partial<PracticeSession>): Promise<boolean> {
    const { error } = await supabase
      .from('practice_sessions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', sessionId);
    if (error) console.error('Error updating session:', error);
    return !error;
  },

  async getSessionCorrections(sessionId: string): Promise<JointCorrection[]> {
    const { data, error } = await supabase
      .from('joint_corrections')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });
    if (error) console.error('Error fetching corrections:', error);
    return data || [];
  },

  async addJointCorrection(correction: Omit<JointCorrection, 'id' | 'created_at'>): Promise<JointCorrection | null> {
    const { data, error } = await supabase
      .from('joint_corrections')
      .insert([correction])
      .select()
      .single();
    if (error) console.error('Error adding correction:', error);
    return data;
  },
};

// ============================================
// SUPPORT TICKETS & HELP DESK
// ============================================

export const ticketService = {
  async getAthleteTickets(userId: string): Promise<SupportTicket[]> {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) console.error('Error fetching tickets:', error);
    return data || [];
  },

  async getAllTickets(): Promise<SupportTicket[]> {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*, users:user_id(full_name, email)')
      .order('created_at', { ascending: false });
    if (error) console.error('Error fetching all tickets:', error);
    return data || [];
  },

  async createTicket(ticket: Omit<SupportTicket, 'id' | 'created_at' | 'updated_at'>): Promise<SupportTicket | null> {
    const { data, error } = await supabase
      .from('support_tickets')
      .insert([ticket])
      .select()
      .single();
    if (error) console.error('Error creating ticket:', error);
    return data;
  },

  async updateTicketStatus(ticketId: string, status: SupportTicket['status']): Promise<boolean> {
    const { error } = await supabase
      .from('support_tickets')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', ticketId);
    if (error) console.error('Error updating ticket status:', error);
    return !error;
  },

  async addReply(reply: Omit<TicketReply, 'id' | 'created_at'>): Promise<TicketReply | null> {
    const { data, error } = await supabase
      .from('ticket_replies')
      .insert([reply])
      .select()
      .single();
    if (error) console.error('Error adding reply:', error);
    return data;
  },

  async getTicketReplies(ticketId: string): Promise<TicketReply[]> {
    const { data, error } = await supabase
      .from('ticket_replies')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });
    if (error) console.error('Error fetching replies:', error);
    return data || [];
  },
};

// ============================================
// MEDIA MANAGEMENT
// ============================================

export const mediaService = {
  async getSessionMedia(sessionId: string): Promise<MediaUpload[]> {
    const { data, error } = await supabase
      .from('media_uploads')
      .select('*')
      .eq('session_id', sessionId)
      .order('uploaded_at', { ascending: false });
    if (error) console.error('Error fetching media:', error);
    return data || [];
  },

  async getUserMedia(userId: string): Promise<MediaUpload[]> {
    const { data, error } = await supabase
      .from('media_uploads')
      .select('*')
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false });
    if (error) console.error('Error fetching user media:', error);
    return data || [];
  },

  async uploadMedia(media: Omit<MediaUpload, 'id' | 'uploaded_at'>): Promise<MediaUpload | null> {
    const { data, error } = await supabase
      .from('media_uploads')
      .insert([media])
      .select()
      .single();
    if (error) console.error('Error uploading media:', error);
    return data;
  },

  async deleteMedia(mediaId: string): Promise<boolean> {
    const { error } = await supabase
      .from('media_uploads')
      .delete()
      .eq('id', mediaId);
    if (error) console.error('Error deleting media:', error);
    return !error;
  },

  async getTotalStorageUsage(): Promise<number> {
    const { data, error } = await supabase
      .from('media_uploads')
      .select('file_size_bytes');
    if (error) console.error('Error fetching storage usage:', error);
    return (data || []).reduce((sum, item) => sum + (item.file_size_bytes || 0), 0);
  },
};

// ============================================
// ANALYTICS
// ============================================

export const analyticsService = {
  async getLatestAnalytics(): Promise<AnalyticsSnapshot | null> {
    const { data, error } = await supabase
      .from('analytics_snapshots')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    if (error) console.error('Error fetching analytics:', error);
    return data;
  },

  async getAnalyticsHistory(days: number = 30): Promise<AnalyticsSnapshot[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('analytics_snapshots')
      .select('*')
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: false });
    if (error) console.error('Error fetching analytics history:', error);
    return data || [];
  },

  async getStuntDifficultiesInsights(): Promise<any[]> {
    const { data, error } = await supabase
      .rpc('get_stunt_difficulty_insights');
    if (error) console.error('Error fetching insights:', error);
    return data || [];
  },
};

export default supabase;
