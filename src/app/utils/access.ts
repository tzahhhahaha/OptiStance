import { Pose } from '../types';

/**
 * A pose is locked when the athlete is not verified AND the pose is not a
 * beginner-level pose. Beginners stay free; Intermediate + Advanced require
 * `is_verified = true` on the user's profile row.
 */
export const isPoseLocked = (pose: Pose, isVerified: boolean): boolean =>
  !isVerified && pose.difficulty !== 'Beginner';

/** Poses a user is allowed to see (verified users see everything). */
export const visiblePosesFor = (poses: Pose[], isVerified: boolean): Pose[] =>
  isVerified ? poses : poses.filter((p) => p.difficulty === 'Beginner');