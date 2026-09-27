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
