import type { UserProfile } from '../types';

/**
 * Roles that grant access to the admin console. The value is owned by the
 * database (`users.role`); treat it as read-only everywhere in the client.
 */
const SYSTEM_MANAGER_ROLES = new Set(['admin', 'SystemManager']);

/** True when the account is an administrator. The only safe way to ask. */
export const isSystemManager = (user: Pick<UserProfile, 'role'> | null | undefined): boolean =>
  !!user && SYSTEM_MANAGER_ROLES.has(user.role);

/**
 * The line of text to show under an athlete's name.
 *
 * `role` is a system value ("SystemManager" / "Cheer Athlete"), so showing it
 * raw leaks either admin jargon or a generic label. Prefer the athlete's own
 * chosen cheer position, and only fall back to the role when they haven't set
 * one.
 */
export const displayRoleLabel = (
  user: Pick<UserProfile, 'role' | 'specialty'> | null | undefined
): string => {
  if (!user) return 'Cheer Athlete';
  const specialty = user.specialty?.trim();
  if (specialty) return specialty;
  return isSystemManager(user) ? 'System Manager' : 'Cheer Athlete';
};

export interface AthleteSkillLevel {
  level: number;
  label: string;
  badgeClass: string;
  description: string;
}

/**
 * Calculates athlete skill tier progression based on audited mastery standards:
 * - Level 1 (Novice): Default foundation
 * - Level 2 (Intermediate): 3+ poses with >= 75% accuracy
 * - Level 3 (Advanced): 6+ poses with >= 85% accuracy
 */
export const calculateSkillLevel = (
  poses: Array<{ masteryPercentage?: number }>,
  sessions: Array<{ accuracyScore: number }>
): AthleteSkillLevel => {
  const masteredCount = poses.filter((p) => (p.masteryPercentage ?? 0) >= 80).length;
  const avgAccuracy = sessions.length
    ? Math.round(sessions.reduce((acc, curr) => acc + curr.accuracyScore, 0) / sessions.length)
    : 0;

  if (masteredCount >= 6 && avgAccuracy >= 85) {
    return {
      level: 3,
      label: 'Level 3 · Advanced',
      badgeClass: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
      description: 'Mastered 6+ poses with 85%+ precision'
    };
  }

  if (masteredCount >= 3 && avgAccuracy >= 75) {
    return {
      level: 2,
      label: 'Level 2 · Intermediate',
      badgeClass: 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300',
      description: 'Mastered 3+ poses with 75%+ precision'
    };
  }

  return {
    level: 1,
    label: 'Level 1 · Novice',
    badgeClass: 'bg-zinc-700/30 border-zinc-600/40 text-zinc-300',
    description: 'Foundational cheer motion & stunt training'
  };
};
