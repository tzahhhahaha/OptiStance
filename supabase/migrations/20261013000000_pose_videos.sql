-- ============================================================================
-- Pose videos: admin-uploadable MP4/WebM video storage bucket for pose tutorials
--
-- Allows administrators to upload 50MB direct video files to Supabase Storage
-- alongside YouTube links. Publicly readable for athletes and guests.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pose-videos',
  'pose-videos',
  true,
  52428800, -- 50 MB
  ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg']
)
ON CONFLICT (id) DO UPDATE
  SET public              = EXCLUDED.public,
      file_size_limit     = EXCLUDED.file_size_limit,
      allowed_mime_types  = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Pose videos are publicly readable" ON storage.objects;

CREATE POLICY "Pose videos are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'pose-videos');

DROP POLICY IF EXISTS "Admins can upload pose videos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update pose videos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete pose videos" ON storage.objects;

CREATE POLICY "Admins can upload pose videos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'pose-videos' AND public.is_admin());

CREATE POLICY "Admins can update pose videos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'pose-videos' AND public.is_admin())
  WITH CHECK (bucket_id = 'pose-videos' AND public.is_admin());

CREATE POLICY "Admins can delete pose videos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'pose-videos' AND public.is_admin());
