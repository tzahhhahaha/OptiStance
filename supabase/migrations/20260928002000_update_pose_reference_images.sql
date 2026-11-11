-- ============================================================================
-- Migration: Update Stunts to use local bundled reference images
--
-- Ensures all 7 library poses point to local generated cheerleading assets
-- (/poses/<id>.jpg) whenever their current URL is null, empty, or pointing
-- to legacy/expired Googleusercontent URLs.
-- ============================================================================

UPDATE public.stunts
   SET reference_image_url = '/poses/t-motion.jpg'
 WHERE (pose_key = 't-motion' OR name ILIKE '%t-motion%')
   AND (reference_image_url IS NULL OR reference_image_url = '' OR reference_image_url LIKE '%googleusercontent.com%');

UPDATE public.stunts
   SET reference_image_url = '/poses/high-v.jpg'
 WHERE (pose_key = 'high-v' OR name ILIKE '%high v%')
   AND (reference_image_url IS NULL OR reference_image_url = '' OR reference_image_url LIKE '%googleusercontent.com%');

UPDATE public.stunts
   SET reference_image_url = '/poses/half-t.jpg'
 WHERE (pose_key = 'half-t' OR name ILIKE '%half-t%')
   AND (reference_image_url IS NULL OR reference_image_url = '' OR reference_image_url LIKE '%googleusercontent.com%');

UPDATE public.stunts
   SET reference_image_url = '/poses/liberty.jpg'
 WHERE (pose_key = 'liberty' OR name ILIKE '%liberty%')
   AND (reference_image_url IS NULL OR reference_image_url = '' OR reference_image_url LIKE '%googleusercontent.com%');

UPDATE public.stunts
   SET reference_image_url = '/poses/toe-touch.jpg'
 WHERE (pose_key = 'toe-touch' OR name ILIKE '%toe touch%')
   AND (reference_image_url IS NULL OR reference_image_url = '' OR reference_image_url LIKE '%googleusercontent.com%');

UPDATE public.stunts
   SET reference_image_url = '/poses/arabesque.jpg'
 WHERE (pose_key = 'arabesque' OR name ILIKE '%arabesque%')
   AND (reference_image_url IS NULL OR reference_image_url = '' OR reference_image_url LIKE '%googleusercontent.com%');

UPDATE public.stunts
   SET reference_image_url = '/poses/heel-stretch.jpg'
 WHERE (pose_key = 'heel-stretch' OR name ILIKE '%heel stretch%')
   AND (reference_image_url IS NULL OR reference_image_url = '' OR reference_image_url LIKE '%googleusercontent.com%');

UPDATE public.stunts
   SET reference_image_url = '/poses/scorpion.jpg'
 WHERE (pose_key = 'scorpion' OR name ILIKE '%scorpion%')
   AND (reference_image_url IS NULL OR reference_image_url = '' OR reference_image_url LIKE '%googleusercontent.com%');

-- Insert Scorpion if it does not exist in the database yet
INSERT INTO public.stunts (pose_key, name, category, difficulty_tier, reference_image_url, coaching_cues)
VALUES ('scorpion', 'Scorpion', 'stunt', 'advanced', '/poses/scorpion.jpg', 'An elite flyer flexibility stunt position. Balance on locked standing leg, reach backward overhead to grip the back foot, pull into high vertical arch.')
ON CONFLICT (name) DO UPDATE
   SET pose_key = EXCLUDED.pose_key,
       reference_image_url = COALESCE(public.stunts.reference_image_url, EXCLUDED.reference_image_url);
