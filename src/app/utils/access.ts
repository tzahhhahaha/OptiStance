import { Pose } from '../types';

/** Intermediate and Advanced poses require a verified athlete account. */
export const isPoseLocked = (pose: Pose, isVerified: boolean): boolean =>
  !isVerified && pose.difficulty !== 'Beginner';

/** Poses intentionally omitted from every athlete-facing surface. */
export const isPoseHidden = (pose: Pose): boolean =>
  pose.id.toLowerCase() === 'toe-touch' || pose.name.trim().toLowerCase() === 'toe touch';

/**
 * Poses shown to the current account. Guests can browse the full library, while
 * unverified accounts see Beginner poses; practice locks remain separate.
 */
export const visiblePosesFor = (
  poses: Pose[],
  isVerified: boolean,
  isGuest = false
): Pose[] =>
  (isVerified || isGuest ? poses : poses.filter((p) => p.difficulty === 'Beginner'))
    .filter((pose) => !isPoseHidden(pose));