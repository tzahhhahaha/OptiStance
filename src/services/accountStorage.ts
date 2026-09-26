import type { Pose, PracticeSession } from '../app/types';

/**
 * Per-account scoping for locally cached app data.
 *
 * The problem this solves
 *   Practice history and pose mastery were cached under fixed localStorage keys
 *   ("optistance_sessions", "optistance_poses"). Those keys were not tied to any
 *   account, and nothing cleared them on sign-out, so the next person to sign in
 *   on the same device inherited the previous account's data. On a shared phone
 *   that is a privacy leak, and it reached the database too: handleAuthSuccess
 *   re-queued the whole cached history under the newly authenticated user, so a
 *   guest's or an unsynced session could be written into someone else's record.
 *
 * The approach
 *   Keys are namespaced per user id, so one account can never read another's
 *   cache. The server remains the source of truth for practice history (see
 *   fetchServerPracticeSessions); this cache exists so the app still works
 *   offline and opens instantly.
 *
 * What is deliberately NOT scoped
 *   - optistance_settings: device preferences (theme, language, camera facing).
 *     These are about the handset, not the person, so following an account onto
 *     a new device would be wrong.
 *   - optistance_pending_sessions: the queue is global on purpose. Each entry
 *     records the userId it was captured under, so a session taken offline as one
 *     athlete still uploads as that athlete even if somebody else signs in before
 *     the device reconnects.
 */

const SESSIONS_KEY = 'optistance_sessions';
const POSES_KEY = 'optistance_poses';
const SYNCED_KEY = 'optistance_synced_sessions';

/** The sentinel scope used when nobody is signed in. */
const GUEST_SCOPE = 'guest';

/** Resolve the scope segment for a user id, falling back to the guest scope. */
export const accountScope = (userId?: string | null): string =>
  userId && userId.length > 0 ? userId : GUEST_SCOPE;

/**
 * Build the localStorage key for a piece of per-account data.
 *
 * This is the single place the namespacing is decided. Every read and write of
 * account-scoped data must go through here, otherwise a key drifts back to being
 * global and the leak returns.
 */
export const scopedKey = (base: string, userId?: string | null): string =>
  `${base}:${accountScope(userId)}`;

const readJson = <T,>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    // Corrupt or unreadable cache: treat as absent so the caller falls back to
    // its default rather than crashing on every launch.
    return null;
  }
};

const writeJson = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded (a long history of sessions, or private browsing). The app
    // still works from memory and the server copy is unaffected.
  }
};

/**
 * Read an account-scoped list, falling back to the pre-namespacing key.
 *
 * The fallback is what makes the upgrade seamless: on the first launch after
 * this change the data still lives under the old global key, and this hands it
 * back rather than making the athlete look like they lost their history.
 */
const readScopedList = <T,>(base: string, userId: string | null | undefined, fallback: T[]): T[] => {
  const scoped = readJson<T[]>(scopedKey(base, userId));
  if (scoped !== null) return scoped;
  return readJson<T[]>(base) ?? fallback;
};

export const readAccountSessions = (userId: string | null | undefined): PracticeSession[] =>
  readScopedList<PracticeSession>(SESSIONS_KEY, userId, []);

export const writeAccountSessions = (userId: string | null | undefined, sessions: PracticeSession[]) =>
  writeJson(scopedKey(SESSIONS_KEY, userId), sessions);

export const readAccountPoses = (userId: string | null | undefined): Pose[] =>
  readScopedList<Pose>(POSES_KEY, userId, []);

export const writeAccountPoses = (userId: string | null | undefined, poses: Pose[]) =>
  writeJson(scopedKey(POSES_KEY, userId), poses);

export const readAccountSyncedIds = (userId: string | null | undefined): Set<string> => {
  const ids = readJson<string[]>(scopedKey(SYNCED_KEY, userId));
  return new Set(ids ?? []);
};

export const writeAccountSyncedIds = (userId: string | null | undefined, ids: Set<string>) =>
  writeJson(scopedKey(SYNCED_KEY, userId), [...ids]);

/**
 * Move pre-namespacing data into the scope of whoever is using the app now.
 *
 * Runs once: the legacy keys are removed afterwards, so there is no way to run it
 * twice and no marker to get out of sync. The data is attributed to the currently
 * signed-in account (or the guest scope when nobody is signed in), which is the
 * only attribution available — the old keys never recorded who created them.
 *
 * An existing scoped value is never overwritten, so re-running against a
 * populated account cannot destroy newer data.
 */
export const migrateLegacyAccountData = (userId: string | null | undefined): string[] => {
  const migrated: string[] = [];

  for (const base of [SESSIONS_KEY, POSES_KEY]) {
    const legacy = readJson<unknown[]>(base);
    if (legacy === null) continue;

    const target = scopedKey(base, userId);
    if (localStorage.getItem(target) === null) {
      writeJson(target, legacy);
      migrated.push(base);
    }
    localStorage.removeItem(base);
  }

  return migrated;
};

/**
 * Forget every cached trace of an account from this device.
 *
 * Only used on explicit sign-out of the guest scope, where continuing to show the
 * previous account's practice history would be the leak this module exists to
 * prevent.
 */
export const clearAccountData = (userId: string | null | undefined) => {
  localStorage.removeItem(scopedKey(SESSIONS_KEY, userId));
  localStorage.removeItem(scopedKey(POSES_KEY, userId));
};
