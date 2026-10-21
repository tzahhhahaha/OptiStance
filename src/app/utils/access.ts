import { Pose } from '../types';

/**
 * A pose is locked when:
 * 1) It has been explicitly locked by coach/admin (`pose.isLocked === true`),
 *    making it temporarily unavailable for practice, OR
 * 2) The athlete is not verified AND the pose is not a beginner-level pose.
 *    Beginners stay free; Intermediate + Advanced require `is_verified = true`
 *    on the user's profile row.
 *
 * Administrators are exempt: all poses remain unlocked and accessible to admins
 * so they can review, calibrate, and practice any stunt without restrictions.
 */
export const isPoseLocked = (pose: Pose, isVerified: boolean, isAdmin = false): boolean => {
  if (isAdmin) return false;
  return Boolean(pose.isLocked) || (!isVerified && pose.difficulty !== 'Beginner');
};

/** Poses a user is allowed to see (verified users and admins see everything). */
export const visiblePosesFor = (poses: Pose[], isVerified: boolean, isAdmin = false): Pose[] =>
  isAdmin || isVerified ? poses : poses.filter((p) => p.difficulty === 'Beginner');