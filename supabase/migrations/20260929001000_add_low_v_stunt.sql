-- ============================================================================
-- Migration: Add Low V pose to stunts library and joint angle standards
-- ============================================================================

-- 1. Insert or update Low V in stunts table
INSERT INTO public.stunts (
  pose_key,
  name,
  category,
  difficulty_tier,
  reference_image_url,
  coaching_cues,
  common_mistakes,
  target_points,
  mastery_threshold,
  is_archived
)
VALUES (
  'low-v',
  'Low V',
  'pom_motion',
  'beginner',
  '/poses/low-v.jpg',
  'Arms extended downward in an inverted V shape at roughly 45° from the body. Maintain locked elbows, tight wrists with thumbs facing forward, and an upright core.',
  'Bending wrists backward (broken wrists); Soft or bent elbows; Shoulders creeping up to ears; Holding arms too close to hips or too wide.',
  100,
  80.0,
  false
)
ON CONFLICT (name) DO UPDATE
   SET pose_key = EXCLUDED.pose_key,
       category = EXCLUDED.category,
       difficulty_tier = EXCLUDED.difficulty_tier,
       reference_image_url = COALESCE(public.stunts.reference_image_url, EXCLUDED.reference_image_url),
       coaching_cues = EXCLUDED.coaching_cues,
       common_mistakes = EXCLUDED.common_mistakes,
       target_points = EXCLUDED.target_points,
       mastery_threshold = EXCLUDED.mastery_threshold,
       is_archived = false;

-- 2. Add Joint Angle Standards for Low V (ICU Compliance rubric)
INSERT INTO public.joint_angle_standards (
  stunt_id,
  joint_name,
  target_angle,
  tolerance_min,
  tolerance_max,
  unit,
  description
)
SELECT
  id,
  'shoulder_depression_adduction',
  45,
  35,
  55,
  'degrees',
  'Arms extended downward at 45° from coronal midline'
FROM public.stunts WHERE pose_key = 'low-v' OR name = 'Low V'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.joint_angle_standards (
  stunt_id,
  joint_name,
  target_angle,
  tolerance_min,
  tolerance_max,
  unit,
  description
)
SELECT
  id,
  'elbow_extension',
  180,
  175,
  180,
  'degrees',
  'Elbows locked straight in full extension'
FROM public.stunts WHERE pose_key = 'low-v' OR name = 'Low V'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.joint_angle_standards (
  stunt_id,
  joint_name,
  target_angle,
  tolerance_min,
  tolerance_max,
  unit,
  description
)
SELECT
  id,
  'wrist_neutral',
  0,
  -10,
  10,
  'degrees',
  'Wrists aligned straight with forearm with thumb facing forward'
FROM public.stunts WHERE pose_key = 'low-v' OR name = 'Low V'
LIMIT 1
ON CONFLICT DO NOTHING;
