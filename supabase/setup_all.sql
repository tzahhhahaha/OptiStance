-- ============================================================================
-- OptiStance Complete Supabase Setup
-- Run this ENTIRE script in Supabase Dashboard → SQL Editor
-- This creates tables, seeds data, and applies RLS policies
-- ============================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Note: pgvector extension removed - not available in this Supabase project
-- and not required by the schema (no vector columns used)

-- ============================================================================
-- 1. CREATE TABLES
-- ============================================================================

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
  is_active BOOLEAN DEFAULT true
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

-- ============================================================================
-- 2. SEED DATA
-- ============================================================================

-- Sample Stunts
INSERT INTO stunts (name, category, difficulty_tier, description, coaching_cues, target_points, mastery_threshold) VALUES
('Liberty', 'stunt', 'advanced', 'A vertical stunt where the top person is held by one flyer and a base, with one leg extended and arms in specific positions', 'Keep your chest up, lock your base leg, and point through your toes', 100, 85.0),
('Scorpion', 'stunt', 'advanced', 'A flexibility-based stunt where the cheerleader is in a vertical position with one leg folded back toward the head', 'Core engagement, pointed toes, and full body extension required', 100, 85.0),
('T-Motion', 'pom_motion', 'intermediate', 'A pom motion where arms form a T shape, typically executed with sharp, clean arm movement', 'Crisp arm positions, locked elbows, and synchronized motion', 80, 80.0),
('High V', 'pom_motion', 'beginner', 'A fundamental arm position with both arms extended above the head in a V shape', 'Locked arms, shoulders relaxed, and proper hand positions', 60, 75.0),
('Heel Stretch', 'stunt', 'advanced', 'A vertical stunt where the flyer''s heel is held by the base, creating an elegant line from head to toe', 'Pointed toe extension, body alignment, and core strength', 95, 85.0),
('Full Down', 'tumbling', 'advanced', 'A tumbling skill involving a full twist while airborne', 'Height off floor, rotation speed, and landing control', 100, 85.0),
('Pike Jump', 'jump', 'intermediate', 'A jump where the athlete brings their knees up to the chest with pointed toes extended forward', 'Height, leg position, and landing form', 80, 80.0),
('Basket Toss', 'stunt', 'advanced', 'A toss where flyers throw the top person into the air, who performs tricks before landing in a cradle', 'Timing synchronization, height, and catching form', 100, 85.0)
ON CONFLICT (name) DO NOTHING;

-- Sample Joint Angle Standards (for Liberty)
INSERT INTO joint_angle_standards (stunt_id, joint_name, target_angle, tolerance_min, tolerance_max, description) 
SELECT id, 'knee_extension', 180, 170, 180, 'Standing leg knee should be fully extended'
FROM stunts WHERE name = 'Liberty'
LIMIT 1;

INSERT INTO joint_angle_standards (stunt_id, joint_name, target_angle, tolerance_min, tolerance_max, description) 
SELECT id, 'hip_abduction', 45, 35, 55, 'Extended leg hip abduction angle'
FROM stunts WHERE name = 'Liberty'
LIMIT 1;

INSERT INTO joint_angle_standards (stunt_id, joint_name, target_angle, tolerance_min, tolerance_max, description) 
SELECT id, 'ankle_extension', 180, 170, 180, 'Extended leg ankle should be pointed'
FROM stunts WHERE name = 'Liberty'
LIMIT 1;

-- Sample Joint Angle Standards (for High V)
INSERT INTO joint_angle_standards (stunt_id, joint_name, target_angle, tolerance_min, tolerance_max, description) 
SELECT id, 'shoulder_flexion', 180, 170, 180, 'Arms fully extended overhead'
FROM stunts WHERE name = 'High V'
LIMIT 1;

INSERT INTO joint_angle_standards (stunt_id, joint_name, target_angle, tolerance_min, tolerance_max, description) 
SELECT id, 'elbow_extension', 180, 175, 180, 'Elbows locked in extended position'
FROM stunts WHERE name = 'High V'
LIMIT 1;

INSERT INTO joint_angle_standards (stunt_id, joint_name, target_angle, tolerance_min, tolerance_max, description) 
SELECT id, 'wrist_neutral', 0, -10, 10, 'Wrist in neutral position'
FROM stunts WHERE name = 'High V'
LIMIT 1;

-- Create sample analytics data
INSERT INTO analytics_snapshots (date, active_users, total_sessions, average_accuracy, squad_compliance_rate) VALUES
(CURRENT_DATE, 0, 0, 0.0, 0.0);

-- ============================================================================
-- 3. ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE athlete_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stunts ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE joint_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_uploads ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can view all user profiles" ON users
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::uuid AND role = 'admin'
    )
  );

-- Stunts policies (visible to all authenticated users)
CREATE POLICY "Authenticated users can view stunts" ON stunts
  FOR SELECT TO authenticated USING (true);

-- Joint angle standards policies
CREATE POLICY "Authenticated users can view joint angle standards" ON joint_angle_standards
  FOR SELECT TO authenticated USING (true);

-- Athlete profiles policies
CREATE POLICY "Athletes can view own profile" ON athlete_profiles
  FOR SELECT TO authenticated USING (user_id = auth.uid()::uuid);

CREATE POLICY "Admins can view all athlete profiles" ON athlete_profiles
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::uuid AND role = 'admin'
    )
  );

-- Practice sessions policies
CREATE POLICY "Athletes view own sessions" ON practice_sessions
  FOR SELECT USING (user_id = auth.uid()::uuid);

CREATE POLICY "Admins view all sessions" ON practice_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::uuid AND role = 'admin'
    )
  );

CREATE POLICY "Athletes create own sessions" ON practice_sessions
  FOR INSERT WITH CHECK (user_id = auth.uid()::uuid);

-- Joint corrections policies
CREATE POLICY "Session owners can view joint corrections" ON joint_corrections
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM practice_sessions
      WHERE practice_sessions.id = joint_corrections.session_id
        AND practice_sessions.user_id = auth.uid()::uuid
    )
  );

CREATE POLICY "Admins can view all joint corrections" ON joint_corrections
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::uuid AND role = 'admin'
    )
  );

-- Support tickets policies
CREATE POLICY "Athletes view own tickets" ON support_tickets
  FOR SELECT USING (user_id = auth.uid()::uuid);

CREATE POLICY "Admins view all tickets" ON support_tickets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::uuid AND role = 'admin'
    )
  );

-- Ticket replies policies
CREATE POLICY "Ticket owners can view replies" ON ticket_replies
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE support_tickets.id = ticket_replies.ticket_id
        AND support_tickets.user_id = auth.uid()::uuid
    )
  );

CREATE POLICY "Admins can view all ticket replies" ON ticket_replies
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::uuid AND role = 'admin'
    )
  );

-- Media uploads policies
CREATE POLICY "Users can view own media" ON media_uploads
  FOR SELECT TO authenticated USING (user_id = auth.uid()::uuid);

CREATE POLICY "Admins can view all media" ON media_uploads
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::uuid AND role = 'admin'
    )
  );

-- Analytics policies
CREATE POLICY "Authenticated users can view analytics" ON analytics_snapshots
  FOR SELECT TO authenticated USING (true);

-- ============================================================================
-- 4. INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_user_id ON practice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_stunt_id ON practice_sessions(stunt_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_date ON practice_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_media_uploads_user_id ON media_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_media_uploads_session_id ON media_uploads(session_id);

-- ============================================================================
-- 5. VERIFICATION
-- ============================================================================

SELECT '✅ Tables created successfully' AS status;
SELECT COUNT(*) AS stunt_count FROM stunts;
SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;