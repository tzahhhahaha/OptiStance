-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Note: pgvector extension removed - not available in this Supabase project
-- and not required by the schema (no vector columns used)

-- Users table (with role-based access)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT DEFAULT 'athlete' CHECK (role IN ('athlete', 'admin')),
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN NOT NULL DEFAULT false
);

-- Athlete profiles (extended user info)
CREATE TABLE IF NOT EXISTS athlete_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  total_sessions INT DEFAULT 0,
  total_minutes INT DEFAULT 0,
  overall_accuracy FLOAT DEFAULT 0,
  mastered_stunts TEXT[] DEFAULT '{}',
  achievement_badges TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stunts/Poses library
CREATE TABLE IF NOT EXISTS stunts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('pom_motion', 'jump', 'tumbling', 'stunt', 'liberty', 'other')),
  difficulty_tier TEXT DEFAULT 'beginner' CHECK (difficulty_tier IN ('beginner', 'intermediate', 'advanced')),
  coaching_cues TEXT,
  common_mistakes TEXT,
  reference_image_url TEXT,
  reference_video_url TEXT,
  target_points INT DEFAULT 100,
  mastery_threshold FLOAT DEFAULT 80.0,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Joint angle standards (ICU compliance)
CREATE TABLE IF NOT EXISTS joint_angle_standards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stunt_id UUID NOT NULL REFERENCES stunts(id) ON DELETE CASCADE,
  joint_name TEXT NOT NULL,
  target_angle FLOAT NOT NULL,
  tolerance_min FLOAT NOT NULL,
  tolerance_max FLOAT NOT NULL,
  unit TEXT DEFAULT 'degrees',
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Practice sessions
CREATE TABLE IF NOT EXISTS practice_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stunt_id UUID NOT NULL REFERENCES stunts(id),
  session_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  duration_minutes INT,
  overall_accuracy FLOAT,
  icu_compliance_grade FLOAT CHECK (icu_compliance_grade >= 1.0 AND icu_compliance_grade <= 10.0),
  session_notes TEXT,
  video_url TEXT,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Joint error diagnostics (per session)
CREATE TABLE IF NOT EXISTS joint_corrections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
  joint_name TEXT NOT NULL,
  detected_angle FLOAT,
  target_angle FLOAT,
  error_degrees FLOAT,
  correction_note TEXT,
  frame_timestamp INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Support tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Support ticket replies
CREATE TABLE IF NOT EXISTS ticket_replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES users(id),
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Media/storage logs
CREATE TABLE IF NOT EXISTS media_uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES practice_sessions(id) ON DELETE SET NULL,
  file_path TEXT NOT NULL,
  file_size_bytes INT,
  media_type TEXT CHECK (media_type IN ('image', 'video', 'audio')),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Analytics snapshots (for performance tracking)
CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE DEFAULT CURRENT_DATE,
  active_users INT,
  total_sessions INT,
  average_accuracy FLOAT,
  squad_compliance_rate FLOAT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Row-Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- For live verification gating the app subscribes to users UPDATEs; that
-- requires REPLICA IDENTITY FULL so updated values (e.g. is_verified) are
-- included in the realtime payload. Applied by supabase/add_verification.sql.
-- ALTER TABLE users REPLICA IDENTITY FULL;
ALTER TABLE athlete_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stunts ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE joint_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_uploads ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

-- Users can view all user profiles (for leaderboards, coach views, etc.)
CREATE POLICY "Users can view all user profiles" ON users
  FOR SELECT TO authenticated USING (true);

-- Admins can view all users
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::uuid AND role = 'admin'
    )
  );

-- Stunts library visible to all authenticated users
CREATE POLICY "Authenticated users can view stunts" ON stunts
  FOR SELECT TO authenticated USING (true);

-- Joint angle standards visible to all authenticated users
CREATE POLICY "Authenticated users can view joint angle standards" ON joint_angle_standards
  FOR SELECT TO authenticated USING (true);

-- Athletes can view their own profile
CREATE POLICY "Athletes can view own profile" ON athlete_profiles
  FOR SELECT TO authenticated USING (user_id = auth.uid()::uuid);

-- Admins can view all athlete profiles
CREATE POLICY "Admins can view all athlete profiles" ON athlete_profiles
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::uuid AND role = 'admin'
    )
  );

-- Session owners can view their joint corrections
CREATE POLICY "Session owners can view joint corrections" ON joint_corrections
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM practice_sessions
      WHERE practice_sessions.id = joint_corrections.session_id
        AND practice_sessions.user_id = auth.uid()::uuid
    )
  );

-- Admins can view all joint corrections
CREATE POLICY "Admins can view all joint corrections" ON joint_corrections
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::uuid AND role = 'admin'
    )
  );

-- Ticket owners can view replies
CREATE POLICY "Ticket owners can view replies" ON ticket_replies
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE support_tickets.id = ticket_replies.ticket_id
        AND support_tickets.user_id = auth.uid()::uuid
    )
  );

-- Admins can view all ticket replies
CREATE POLICY "Admins can view all ticket replies" ON ticket_replies
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::uuid AND role = 'admin'
    )
  );

-- Users can view their own media
CREATE POLICY "Users can view own media" ON media_uploads
  FOR SELECT TO authenticated USING (user_id = auth.uid()::uuid);

-- Admins can view all media
CREATE POLICY "Admins can view all media" ON media_uploads
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::uuid AND role = 'admin'
    )
  );

-- Analytics visible to all authenticated users
CREATE POLICY "Authenticated users can view analytics" ON analytics_snapshots
  FOR SELECT TO authenticated USING (true);

-- Athletes can view their own sessions
CREATE POLICY "Athletes view own sessions" ON practice_sessions
  FOR SELECT USING (user_id = auth.uid()::uuid);

-- Admins can view all sessions
CREATE POLICY "Admins view all sessions" ON practice_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::uuid AND role = 'admin'
    )
  );

-- Athletes can create their own sessions
CREATE POLICY "Athletes create own sessions" ON practice_sessions
  FOR INSERT WITH CHECK (user_id = auth.uid()::uuid);

-- Athletes can view their own tickets
CREATE POLICY "Athletes view own tickets" ON support_tickets
  FOR SELECT USING (user_id = auth.uid()::uuid);

-- Admins can view all tickets
CREATE POLICY "Admins view all tickets" ON support_tickets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::uuid AND role = 'admin'
    )
  );

-- Indexes for performance
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_practice_sessions_user_id ON practice_sessions(user_id);
CREATE INDEX idx_practice_sessions_stunt_id ON practice_sessions(stunt_id);
CREATE INDEX idx_practice_sessions_date ON practice_sessions(session_date);
CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_media_uploads_user_id ON media_uploads(user_id);
CREATE INDEX idx_media_uploads_session_id ON media_uploads(session_id);
