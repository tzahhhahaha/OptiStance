BEGIN;

INSERT INTO users (full_name, email, password_hash, role)
VALUES (
  'System Manager',
  'admin@optistance.com',
  '$2b$10$JQb3tMZKx5CI0h63y1v5WOB0mD2r6nTz1D6W3fO/fpJZ5mJy8YjQW',
  'SystemManager'
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO motions (motion_name, min_shoulder_angle, max_shoulder_angle, min_elbow_angle, max_elbow_angle, description)
VALUES
  ('High V', 110, 160, 120, 180, 'Arms lifted into a strong high V with relaxed shoulders.'),
  ('Low V', 90, 140, 100, 170, 'Arms open into a lower, more grounded V shape.'),
  ('T-Motion', 130, 180, 140, 180, 'Arms form a straight horizontal line at shoulder height.')
ON CONFLICT (motion_name) DO NOTHING;

COMMIT;
 