import { Pose } from '../types';

/**
 * Overlay admin-managed reference images onto the bundled pose library.
 *
 * The pose library is static app data (src/app/data/poses.ts) that ships inside
 * the JS bundle, while an admin edits stunts in the Supabase `stunts` table.
 * Nothing joins the two, so an image uploaded in the admin console would never
 * reach the athlete. `stunts.pose_key` carries the library pose's slug, which
 * is what makes the join possible.
 */

/** The only fields needed to resolve an image, so callers can pass full rows. */
export interface PoseImageSource {
  pose_key?: string | null;
  reference_image_url?: string | null;
  reference_video_url?: string | null;
}

/** Check if a URL points to the expired temporary Google URLs seeded in early builds. */
export const isLegacyGoogleUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  return url.includes('lh3.googleusercontent.com') || url.includes('googleusercontent.com/aida');
};

/**
 * Known bundled images for library poses in /public/poses/*.
 * Serves as the zero-network fallback for the athlete gallery and the admin syllabus.
 */
export const BUNDLED_POSE_IMAGES: Record<string, string> = {
  't-motion': '/poses/t-motion.jpg',
  'high-v': '/poses/high-v.jpg',
  'low-v': '/poses/low-v.jpg',
  'half-t': '/poses/half-t.jpg',
  'liberty': '/poses/liberty.jpg',
  'toe-touch': '/poses/toe-touch.jpg',
  'arabesque': '/poses/arabesque.jpg',
  'heel-stretch': '/poses/heel-stretch.jpg',
  'scorpion': '/poses/scorpion.jpg',
};

const slugifyKey = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * Resolve the local bundled image asset for a stunt based on its pose key or name.
 */
export function getBundledPoseImage(poseKey?: string | null, name?: string | null): string | undefined {
  if (poseKey) {
    const pk = slugifyKey(poseKey);
    if (BUNDLED_POSE_IMAGES[pk]) return BUNDLED_POSE_IMAGES[pk];
  }
  if (name) {
    const slug = slugifyKey(name);
    if (BUNDLED_POSE_IMAGES[slug]) return BUNDLED_POSE_IMAGES[slug];
  }
  return undefined;
}

/**
 * Map pose slug -> reference image, ignoring rows that cannot contribute one
 * and ignoring legacy expired Google URLs that fail in production.
 */
function imageByPoseKey(stunts: PoseImageSource[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const stunt of stunts) {
    const key = stunt.pose_key?.trim();
    const url = stunt.reference_image_url?.trim();
    if (!key || !url) continue;
    // Skip expired seed URLs that fail to load
    if (isLegacyGoogleUrl(url)) continue;
    map.set(key, url);
  }
  return map;
}

/**
 * Returns `poses` with each pose's `imageUrl` replaced by the admin-uploaded
 * image where one exists.
 *
 * A pose with no admin image keeps its bundled `imageUrl`. That fallback is what
 * makes the library safe for guests and offline use: the stunts query is
 * authenticated-only and can fail or return nothing, and the library must still
 * show a picture.
 *
 * The input array is never mutated, and poses are only copied when their image
 * actually changes, so the result is referentially stable when nothing moved.
 */
export function applyAdminPoseImages(poses: Pose[], stunts: PoseImageSource[]): Pose[] {
  if (stunts.length === 0) return poses;

  const byKey = imageByPoseKey(stunts);
  if (byKey.size === 0) return poses;

  let changed = false;
  const next = poses.map((pose) => {
    const url = byKey.get(pose.id);
    if (!url || url === pose.imageUrl) return pose;
    changed = true;
    return { ...pose, imageUrl: url };
  });

  return changed ? next : poses;
}

/**
 * Overlay admin-managed tutorial videos onto the bundled pose library.
 * Poses without an admin video retain any video URL bundled with the app.
 */
export function applyAdminPoseVideos(poses: Pose[], stunts: PoseImageSource[]): Pose[] {
  if (stunts.length === 0) return poses;

  const videosByKey = new Map<string, string>();
  for (const stunt of stunts) {
    const key = stunt.pose_key?.trim();
    const url = stunt.reference_video_url?.trim();
    if (key && url) videosByKey.set(key, url);
  }
  if (videosByKey.size === 0) return poses;

  let changed = false;
  const next = poses.map((pose) => {
    const videoUrl = videosByKey.get(pose.id);
    if (!videoUrl || videoUrl === pose.videoUrl) return pose;
    changed = true;
    return { ...pose, videoUrl };
  });

  return changed ? next : poses;
}
