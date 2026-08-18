// Database types for Supabase integration

export type UserRole = 'athlete' | 'coach' | 'admin';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface AthleteProfile {
  id: string;
  user_id: string;
  total_sessions: number;
  total_minutes: number;
  overall_accuracy: number;
  mastered_stunts: string[];
  achievement_badges: string[];
  created_at: string;
  updated_at: string;
}

export type StuntCategory = 'pom_motion' | 'jump' | 'tumbling' | 'stunt' | 'liberty' | 'other';
export type DifficultyTier = 'beginner' | 'intermediate' | 'advanced';

export interface Stunt {
  id: string;
  name: string;
  description?: string;
  category: StuntCategory;
  difficulty_tier: DifficultyTier;
  coaching_cues?: string;
  common_mistakes?: string;
  reference_image_url?: string;
  reference_video_url?: string;
  target_points: number;
  mastery_threshold: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface JointAngleStandard {
  id: string;
  stunt_id: string;
  joint_name: string;
  target_angle: number;
  tolerance_min: number;
  tolerance_max: number;
  unit: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface PracticeSession {
  id: string;
  user_id: string;
  stunt_id: string;
  session_date: string;
  duration_minutes?: number;
  overall_accuracy?: number;
  icu_compliance_grade?: number;
  session_notes?: string;
  video_url?: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface JointCorrection {
  id: string;
  session_id: string;
  joint_name: string;
  detected_angle?: number;
  target_angle?: number;
  error_degrees?: number;
  correction_note?: string;
  frame_timestamp?: number;
  created_at: string;
}

export type SupportTicketStatus = 'open' | 'in_progress' | 'resolved';
export type TicketPriority = 'low' | 'normal' | 'high';

export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  description: string;
  status: SupportTicketStatus;
  priority: TicketPriority;
  created_at: string;
  updated_at: string;
}

export interface TicketReply {
  id: string;
  ticket_id: string;
  admin_id: string;
  message: string;
  created_at: string;
}

export type MediaType = 'image' | 'video' | 'audio';

export interface MediaUpload {
  id: string;
  user_id: string;
  session_id?: string;
  file_path: string;
  file_size_bytes?: number;
  media_type: MediaType;
  uploaded_at: string;
}

export interface AnalyticsSnapshot {
  id: string;
  date: string;
  active_users: number;
  total_sessions: number;
  average_accuracy: number;
  squad_compliance_rate: number;
  created_at: string;
}
