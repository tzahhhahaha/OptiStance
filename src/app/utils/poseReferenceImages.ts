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
}

/**
 * Map pose slug -> reference image, ignoring rows that cannot contribute one.
 *
 * Blank strings are treated as "no image" rather than as an image URL, because
 * clearing the field in the admin form stores `''` or null rather than
 * deleting the column.
 */
function imageByPoseKey(stunts: PoseImageSource[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const stunt of stunts) {
    const key = stunt.pose_key?.trim();
    const url = stunt.reference_image_url?.trim();
    if (!key || !url) continue;
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
