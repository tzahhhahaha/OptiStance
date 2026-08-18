-- Seed data for Supabase

-- Sample Stunts
INSERT INTO stunts (name, category, difficulty_tier, description, coaching_cues, target_points, mastery_threshold) VALUES
('Liberty', 'stunt', 'advanced', 'A vertical stunt where the top person is held by one flyer and a base, with one leg extended and arms in specific positions', 'Keep your chest up, lock your base leg, and point through your toes', 100, 85.0),
('Scorpion', 'stunt', 'advanced', 'A flexibility-based stunt where the cheerleader is in a vertical position with one leg folded back toward the head', 'Core engagement, pointed toes, and full body extension required', 100, 85.0),
('T-Motion', 'pom_motion', 'intermediate', 'A pom motion where arms form a T shape, typically executed with sharp, clean arm movement', 'Crisp arm positions, locked elbows, and synchronized motion', 80, 80.0),
('High V', 'pom_motion', 'beginner', 'A fundamental arm position with both arms extended above the head in a V shape', 'Locked arms, shoulders relaxed, and proper hand positions', 60, 75.0),
('Heel Stretch', 'stunt', 'advanced', 'A vertical stunt where the flyer''s heel is held by the base, creating an elegant line from head to toe', 'Pointed toe extension, body alignment, and core strength', 95, 85.0),
('Full Down', 'tumbling', 'advanced', 'A tumbling skill involving a full twist while airborne', 'Height off floor, rotation speed, and landing control', 100, 85.0),
('Pike Jump', 'jump', 'intermediate', 'A jump where the athlete brings their knees up to the chest with pointed toes extended forward', 'Height, leg position, and landing form', 80, 80.0),
('Basket Toss', 'stunt', 'advanced', 'A toss where flyers throw the top person into the air, who performs tricks before landing in a cradle', 'Timing synchronization, height, and catching form', 100, 85.0);

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

-- Create sample admin and athlete users (if not using auth signup)
-- Note: In production, users are created through Supabase Auth
-- Uncomment and modify if you want to seed users manually

-- INSERT INTO users (email, full_name, role, is_active) VALUES
-- ('admin@optistances.com', 'Admin Coach', 'admin', true),
-- ('coach@optistances.com', 'Assistant Coach', 'coach', true),
-- ('athlete1@optistances.com', 'Sample Athlete 1', 'athlete', true),
-- ('athlete2@optistances.com', 'Sample Athlete 2', 'athlete', true);

-- Create athlete profiles for new athletes
-- INSERT INTO athlete_profiles (user_id, total_sessions, total_minutes, overall_accuracy)
-- SELECT id, 0, 0, 0 FROM users WHERE role = 'athlete' AND NOT EXISTS (SELECT 1 FROM athlete_profiles WHERE user_id = users.id);

-- Create sample analytics data
INSERT INTO analytics_snapshots (date, active_users, total_sessions, average_accuracy, squad_compliance_rate) VALUES
(CURRENT_DATE, 0, 0, 0.0, 0.0);
