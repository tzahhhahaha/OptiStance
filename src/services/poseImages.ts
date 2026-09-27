import { supabase } from './supabaseService';

/**
 * Upload and lifecycle management for pose reference images.
 *
 * Images live in the public-read `pose-images` bucket created by
 * `supabase/migrations/20260927006000_pose_images.sql`. Only admins may write
 * (enforced by RLS), but anyone may read, because the pose library is shown to
 * guests who have no authenticated Supabase session.
 *
 * The database only ever stores the resulting URL, in
 * `stunts.reference_image_url`.
 */

export const POSE_IMAGE_BUCKET = 'pose-images';

/** Mirrors the bucket's `file_size_limit`, so the client rejects early. */
export const MAX_POSE_IMAGE_BYTES = 5 * 1024 * 1024;

/** Mirrors the bucket's `allowed_mime_types`. */
export const POSE_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

/**
 * Rejects anything the bucket would reject, with a message the admin form can
 * show verbatim. Storage enforces the same limits, so this is about a clear
 * error rather than about safety.
 */
export function validatePoseImage(file: File): string | null {
  if (!POSE_IMAGE_MIME_TYPES.includes(file.type as (typeof POSE_IMAGE_MIME_TYPES)[number])) {
    return 'Choose a JPG, PNG, WebP or GIF image.';
  }
  if (file.size > MAX_POSE_IMAGE_BYTES) {
    const mb = (MAX_POSE_IMAGE_BYTES / (1024 * 1024)).toFixed(0);
    return `Image must be smaller than ${mb} MB.`;
  }
  if (file.size === 0) {
    return 'That file is empty.';
  }
  return null;
}

/**
 * Object path for a pose image. The slug keeps the bucket browsable, and the
 * random suffix means re-uploading the same pose never overwrites in place --
 * which matters because browsers cache the previous URL aggressively.
 */
function objectPath(slug: string, file: File): string {
  const safeSlug = slug.replace(/[^a-z0-9-]/gi, '-').toLowerCase() || 'pose';
  const ext = EXTENSION_BY_MIME[file.type] ?? 'png';
  const unique = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return `${safeSlug}-${unique}.${ext}`;
}

/** True when a URL points at an object in our bucket, and so may be deleted. */
export function isManagedPoseImage(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes(`/storage/v1/object/public/${POSE_IMAGE_BUCKET}/`);
}

/**
 * Uploads an image and returns its public URL.
 *
 * The slug is the stunt's `pose_key` when it maps to a library pose, otherwise
 * the stunt's id, so every upload lands under a recognisable name.
 */
export async function uploadPoseImage(file: File, slug: string): Promise<string> {
  const invalid = validatePoseImage(file);
  if (invalid) throw new Error(invalid);

  const path = objectPath(slug, file);
  const { error } = await supabase.storage
    .from(POSE_IMAGE_BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: '3600', upsert: false });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabase.storage.from(POSE_IMAGE_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) throw new Error('Upload succeeded but no public URL was returned.');

  return data.publicUrl;
}

/**
 * Best-effort removal of a previously uploaded object.
 *
 * Called after a replacement has been saved. Failures are swallowed on purpose:
 * the row is already pointing at the new image, so a leftover object is an
 * orphan worth cleaning up later, not a reason to fail the admin's save.
 */
export async function deletePoseImage(url: string | null | undefined): Promise<void> {
  if (!isManagedPoseImage(url)) return;

  const marker = `/storage/v1/object/public/${POSE_IMAGE_BUCKET}/`;
  const path = decodeURIComponent((url as string).split(marker)[1] ?? '');
  if (!path) return;

  const { error } = await supabase.storage.from(POSE_IMAGE_BUCKET).remove([path]);
  if (error) console.warn('[poseImages] Could not remove the previous image:', error.message);
}
