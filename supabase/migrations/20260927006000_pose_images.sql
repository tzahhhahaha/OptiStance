-- ============================================================================
-- Pose images: admin-uploadable reference pictures for the pose library
--
-- The stunts table already carried a `reference_image_url` column, but nothing
-- ever wrote to it or read it, and the admin console showed a hard-coded '📸'
-- placeholder instead of an image. This migration makes the column real:
--
--   1. `pose_key`   - joins a stunt row to the bundled pose library. The app's
--                      poses are static data (src/app/data/poses.ts) keyed by
--                      slug ('t-motion', 'half-t', ...), while stunts are keyed
--                      by UUID, so the slug is stored alongside the row and used
--                      as the join. Stunts with no pose_key are curriculum-only
--                      rows that do not appear in the library.
--   2. Write policies - stunts only had a SELECT policy, so the admin console's
--                      existing "Add Stunt" / "Edit Stunt" / "Delete Stunt"
--                      actions were rejected by RLS. These grant admins write
--                      access via the existing public.is_admin() helper.
--   3. Storage      - a public-read `pose-images` bucket plus admin-only write
--                      policies.
--   4. Seed         - every pose in the library gets a matching stunt row and
--                      its current reference image, so all 7 poses are editable
--                      from the admin console on day one.
--
-- The bucket is public-read because pose reference images are shown to
-- unauthenticated guests, who are not covered by the stunts SELECT policy.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Join key from stunts to the bundled pose library
-- ---------------------------------------------------------------------------
ALTER TABLE public.stunts
  ADD COLUMN IF NOT EXISTS pose_key TEXT;

-- Partial unique index: many stunts may have no pose_key, but two stunts may
-- never claim the same library pose.
CREATE UNIQUE INDEX IF NOT EXISTS idx_stunts_pose_key
  ON public.stunts (pose_key)
  WHERE pose_key IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Admin write access to stunts
--
-- Only "Authenticated users can view stunts" (SELECT) existed, so the admin
-- content console could read the syllabus but never write to it.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can insert stunts" ON public.stunts;
DROP POLICY IF EXISTS "Admins can update stunts" ON public.stunts;
DROP POLICY IF EXISTS "Admins can delete stunts" ON public.stunts;

CREATE POLICY "Admins can insert stunts"
  ON public.stunts FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update stunts"
  ON public.stunts FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- The admin console archives rather than deletes, but the row still has to be
-- removable, and cascading cleanup of storage objects is done by the app.
CREATE POLICY "Admins can delete stunts"
  ON public.stunts FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- 3. Storage bucket for pose reference images
--
-- 5 MB cap and an image-only MIME allowlist, enforced by the bucket itself so
-- an oversized or unexpected file type is rejected at the storage layer rather
-- than relying on the client to check.
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pose-images',
  'pose-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
  SET public              = EXCLUDED.public,
      file_size_limit     = EXCLUDED.file_size_limit,
      allowed_mime_types  = EXCLUDED.allowed_mime_types;

-- Reference images are shown to guests, who have no authenticated session and
-- so cannot pass the stunts SELECT policy.
DROP POLICY IF EXISTS "Pose images are publicly readable" ON storage.objects;

CREATE POLICY "Pose images are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'pose-images');

DROP POLICY IF EXISTS "Admins can upload pose images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update pose images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete pose images" ON storage.objects;

CREATE POLICY "Admins can upload pose images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'pose-images' AND public.is_admin());

CREATE POLICY "Admins can update pose images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'pose-images' AND public.is_admin())
  WITH CHECK (bucket_id = 'pose-images' AND public.is_admin());

CREATE POLICY "Admins can delete pose images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'pose-images' AND public.is_admin());

-- ---------------------------------------------------------------------------
-- 4. Seed every library pose
--
-- Four of these (T-Motion, High V, Liberty, Heel Stretch) already exist from
-- seed.sql; the upsert fills in their pose_key and reference image. The other
-- three (Half-T, Toe Touch, Arabesque) ship only in the bundled pose data, so
-- rows are inserted for them and they become manageable from the console.
--
-- The image URLs are the ones already compiled into the app. They point at
-- externally hosted Google image URLs, which is why re-uploading through the
-- console is preferable long-term - but every pose starts out with a working
-- picture an admin can replace.
-- ---------------------------------------------------------------------------
INSERT INTO public.stunts
  (pose_key, name, category, difficulty_tier, reference_image_url)
VALUES
  ('t-motion', 'T-Motion', 'pom_motion', 'beginner', 'https://lh3.googleusercontent.com/aida/AP1WRLtdvgNi1ZVZHfMBMys_LSZk_v9lssaxwkN3vuvkrR4RjY9k-C7Vw-LBKyLxzFWVX_EoBpM4T5mHYETOF_Kx0N85PQ-R8o9Um6-v99g31U7UWJbGNmKc3IZPwlQSnsS3PzcQ156VXIHE-RQn-5G7Ag5P0ciqtC7gX8MFC47OlE3fPcTdfC5En_tFQaiDNIIbztEGAouXzvHxBDnSWofuqoVj430gFEHu2hLj0QaumpFCXFMhDvwE7JszMQ'),
  ('high-v', 'High V', 'pom_motion', 'beginner', 'https://lh3.googleusercontent.com/aida/AP1WRLtLDIqveNFWJolAhMnHzrJdPTZtXjFkp3UHwarqlyTUlY1yDHFFvJtI5RoTB-U3U3ZaQ8xQnS9myaoG5wh7VMBC4WsSMKD3ZSsVg0PYmjGYUzutFe7XsEz8wL5hVndgW7w6e4iwVoV8ZY2jLlDJUXk19rVYu2MoYtaNtiG6es6nb7Zfp0qNwuhGLt_0R4CeDD1YG0Y6XE3C2eww_k0NWbsZvdLzeLgb2xXGO7sDmIsVmk_Ikft411my1A'),
  ('half-t', 'Half-T', 'pom_motion', 'beginner', 'https://lh3.googleusercontent.com/aida/AP1WRLubIdCuB_p61rpv-9NS9WA14073gjJVQV8kyjCnynlHPQ_V5txECaKmp3kuGFpD2eJY9NwRT2AsEMGcnv4mT_xQH0u0VVlTP60qDm8eb2AdoNtrU0EMtORsIZuXfVyvOVp8Qi5IzZBRXbTQJTsTO4Bd_iYLotkIcARXRZlbulzuKDFUFS2mtPIYAfLqiBf2QB7dCPhzLeWOmMPN-omA8w1tWvLM2ilwA4hMOzt1ZHAfrzKzL6yJe5DXA6g'),
  ('liberty', 'Liberty', 'stunt', 'intermediate', 'https://lh3.googleusercontent.com/aida-public/AB6AXuCUcl56_A7zfok-a9F75sAwf6ISLbllV6eTPFBZR_VP7xn8MYh6GmHudSm2Vwcabvgtgvef2iAs7eMfiigTQDsuzSyYMMU-Eaaxp5TOj-UeCii2ig7C_FIXi_J7DbZRgCQdGkMDAn83oM3zY_XxVkyc_vK19_mQhRdOj8gLv44dKv8ZRQh_RYg01qB1SDhhYz1V4cb5FcljezfrudsLepB51YCAVCJXFXXytEspfOm1rZBkrTBULute'),
  ('toe-touch', 'Toe Touch', 'jump', 'advanced', 'https://lh3.googleusercontent.com/aida-public/AB6AXuC4f4-XM04Nh_vtE89eqzbrorhjaX2Of8IOIPRBqRUWItNidDhk_5ySyd8CLuRZOGft2AY6oKLlvw52sEg1P3Q3qEI76kWVqDW14mNKyogfJqhVMX4KJc5l_srPDGx9VZ8A92AF-Tzk_rHez4QU8V7bbh4TZiAdiOep8_gCOyMq2ntW7omLlBONO-n_pg4eOHq9eXxSUmeMjOe5I3czHVCYXocTUPvObdxZgFrpSg90WCcSbByppoi5'),
  ('arabesque', 'Arabesque', 'stunt', 'intermediate', 'https://lh3.googleusercontent.com/aida/AP1WRLtdvgNi1ZVZHfMBMys_LSZk_v9lssaxwkN3vuvkrR4RjY9k-C7Vw-LBKyLxzFWVX_EoBpM4T5mHYETOF_Kx0N85PQ-R8o9Um6-v99g31U7UWJbGNmKc3IZPwlQSnsS3PzcQ156VXIHE-RQn-5G7Ag5P0ciqtC7gX8MFC47OlE3fPcTdfC5En_tFQaiDNIIbztEGAouXzvHxBDnSWofuqoVj430gFEHu2hLj0QaumpFCXFMhDvwE7JszMQ'),
  ('heel-stretch', 'Heel Stretch', 'stunt', 'advanced', 'https://lh3.googleusercontent.com/aida/AP1WRLtLDIqveNFWJolAhMnHzrJdPTZtXjFkp3UHwarqlyTUlY1yDHFFvJtI5RoTB-U3U3ZaQ8xQnS9myaoG5wh7VMBC4WsSMKD3ZSsVg0PYmjGYUzutFe7XsEz8wL5hVndgW7w6e4iwVoV8ZY2jLlDJUXk19rVYu2MoYtaNtiG6es6nb7Zfp0qNwuhGLt_0R4CeDD1YG0Y6XE3C2eww_k0NWbsZvdLzeLgb2xXGO7sDmIsVmk_Ikft411my1A')

ON CONFLICT (name) DO UPDATE
  SET pose_key             = EXCLUDED.pose_key,
      category             = EXCLUDED.category,
      difficulty_tier      = EXCLUDED.difficulty_tier,
      reference_image_url  = COALESCE(public.stunts.reference_image_url, EXCLUDED.reference_image_url),
      updated_at           = CURRENT_TIMESTAMP;

-- ---------------------------------------------------------------------------
-- Verify: every pose in the bundled library now resolves to a stunt row
-- ---------------------------------------------------------------------------
SELECT pose_key, name, category, difficulty_tier,
       CASE WHEN reference_image_url IS NULL THEN 'no image' ELSE 'ok' END AS image
  FROM public.stunts
 WHERE pose_key IS NOT NULL
 ORDER BY pose_key;
