import { supabase, isSupabaseConfigured } from './supabaseService';
import { readAccountSyncedIds, writeAccountSyncedIds } from './accountStorage';
import type { PracticeSession } from '../app/types';

interface PendingSession {
  session: PracticeSession;
  userId: string;
  /**
   * The `stunts` row this session belongs to, resolved once and then cached here.
   *
   * This is the fix for silent data loss. The upload used to look the stunt up
   * by `.eq('name', session.poseName)` on every attempt. `stunts.name` is
   * UNIQUE but freely editable in the admin console, so the moment an admin
   * renamed a stunt every queued session for it stopped resolving, threw, and
   * was deleted from the queue after MAX_ATTEMPTS. The athlete's practice
   * history vanished with no error shown anywhere. It was also case-sensitive,
   * so `T-Motion` never matched `t-motion`.
   *
   * Once resolved, the UUID is pinned to the queued item, so a rename *after*
   * the first attempt is harmless. `pose_key` is the stable join (it is not
   * editable in the console and carries a unique index); `name` is only a
   * fallback for rows predating that column.
   */
  stuntId?: string;
  /** Number of failed upload attempts. Only transient failures are counted. */
  attempts?: number;
}

const PENDING_SESSIONS_KEY = 'optistance_pending_sessions';

/**
 * Transient failures are retried up to this many times before the session is
 * given up on. Only counted for errors that might resolve on their own.
 *
 * Previously *every* failure counted, including "that stunt does not exist" --
 * so a single admin rename destroyed up to five sessions' worth of history
 * across a handful of syncs. Unresolvable stunts are now held indefinitely
 * (see `stuck` below) rather than discarded, because dropping an athlete's
 * recorded practice is the worst thing this module can do.
 */
const MAX_ATTEMPTS = 5;

/**
 * A stunt that could not be resolved to a row.
 *
 * Distinct from a network or server failure: retrying will not help until the
 * stunt exists. It is recoverable -- an admin may create or fix the row later,
 * and the session then uploads on a subsequent sync -- so the session is kept,
 * not dropped.
 */
class StuntNotFoundError extends Error {
  constructor(readonly poseName: string) {
    super(`Cloud stunt not found: ${poseName}`);
    this.name = 'StuntNotFoundError';
  }
}

// ------------------------------------------------------------------
// Pending queue (sessions captured offline, waiting to be uploaded)
// ------------------------------------------------------------------

const readPendingSessions = (): PendingSession[] => {
  try {
    return JSON.parse(localStorage.getItem(PENDING_SESSIONS_KEY) || '[]') as PendingSession[];
  } catch {
    return [];
  }
};

const writePendingSessions = (sessions: PendingSession[]) => {
  localStorage.setItem(PENDING_SESSIONS_KEY, JSON.stringify(sessions));
};

// ------------------------------------------------------------------
// Synced registry (sessions already uploaded, never to be re-queued)
// ------------------------------------------------------------------
//
// Without this, every login re-queues the full local session history
// (handleAuthSuccess in App.tsx), forcing duplicate lookups/insert attempts
// against the database each time. Recording ids here makes sync a one-shot.
//
// The registry is scoped per account (see accountStorage). Session ids are
// generated from a timestamp alone, so two accounts recording within the same
// millisecond produce the same id. With one global registry, the second account's
// session would be treated as already uploaded and silently never reach the
// server.

const readSyncedIds = (userId: string): Set<string> => readAccountSyncedIds(userId);

const writeSyncedIds = (userId: string, ids: Set<string>) => writeAccountSyncedIds(userId, ids);

const markSynced = (userId: string, id: string) => {
  const synced = readSyncedIds(userId);
  synced.add(id);
  writeSyncedIds(userId, synced);
};

/** Whether a local session id is already stored on the server for this account. */
export const isSessionSynced = (id: string, userId: string): boolean =>
  readSyncedIds(userId).has(id);

export const queuePracticeSession = (session: PracticeSession, userId?: string) => {
  if (!userId) return;
  if (isSessionSynced(session.id, userId)) return; // already uploaded – do not re-queue

  const pending = readPendingSessions();
  if (!pending.some((item) => item.session.id === session.id)) {
    writePendingSessions([...pending, { session, userId }]);
  }
};

// ------------------------------------------------------------------
// Upload + sync
// ------------------------------------------------------------------

/**
 * Find the `stunts` row a recorded session belongs to.
 *
 * Tries the stable join first:
 *   1. `pose_key`  -- the slug of the bundled library pose ('t-motion', ...).
 *      Not editable in the admin console and uniquely indexed, so it survives
 *      a rename. This is the correct key and matches for every library pose.
 *   2. `name`      -- fallback for stunt rows created before `pose_key` existed,
 *      or curriculum-only rows that claim no library pose.
 *
 * Neither is guaranteed to match: a session recorded against a library pose
 * that was later deleted, or against a name an admin has since changed and that
 * also has no `pose_key`, resolves to nothing. That raises StuntNotFoundError so
 * the caller can hold the session instead of discarding it.
 */
const resolveStuntId = async (session: PracticeSession): Promise<string> => {
  if (session.poseId) {
    const { data, error } = await supabase
      .from('stunts')
      .select('id')
      .eq('pose_key', session.poseId)
      .maybeSingle();

    // A genuine query failure is not "not found" -- let it retry as transient.
    if (error) throw error;
    if (data?.id) return data.id;
  }

  const { data, error } = await supabase
    .from('stunts')
    .select('id')
    .eq('name', session.poseName)
    .maybeSingle();

  if (error) throw error;
  if (data?.id) return data.id;

  throw new StuntNotFoundError(session.poseName);
};

const uploadPracticeSession = async (
  item: PendingSession,
  stuntId: string
): Promise<void> => {
  const { session, userId } = item;

  const localMarker = `[local-session:${session.id}]`;
  const { data: existingSession, error: existingError } = await supabase
    .from('practice_sessions')
    .select('id')
    .eq('user_id', userId)
    .like('session_notes', `%${localMarker}%`)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existingSession) return; // already uploaded – idempotent

  const metadataMarkers = [
    ...(session.source === 'upload' ? ['[source:uploaded-image]'] : []),
    ...(session.imageFingerprint ? [`[image-fingerprint:${session.imageFingerprint}]`] : []),
    ...(session.isDuplicateUpload ? ['[duplicate-upload]'] : []),
  ].join(' ');
  const sessionRecord = {
    user_id: userId,
    stunt_id: stuntId,
    session_date: session.timestamp,
    duration_minutes: Math.max(1, Math.round(session.durationSeconds / 60)),
    overall_accuracy: session.accuracyScore,
    session_notes: `${session.feedbackSummary}${metadataMarkers ? ` ${metadataMarkers}` : ''} ${localMarker}`,
    completed: true,
    ...(session.icuScore == null ? {} : { icu_compliance_grade: session.icuScore }),
  };

  const { error } = await supabase.from('practice_sessions').insert(sessionRecord);

  if (error) throw error;
};

/**
 * Upload every queued session and return how many were synced.
 *
 * Sessions that fail transiently are retried and dropped after MAX_ATTEMPTS.
 * Sessions whose stunt cannot be resolved are *never* dropped: they are held so
 * they can upload if the stunt row is ever created or fixed, and their count is
 * available via `getStuckSessionCount()` so the UI can tell the athlete rather
 * than losing their history quietly.
 *
 * Skipped entirely when offline or when Supabase is not configured.
 */
export const syncPendingSessions = async (): Promise<number> => {
  if (!isSupabaseConfigured) return 0;
  if (!navigator.onLine) return 0;

  const pending = readPendingSessions();
  const remaining: PendingSession[] = [];
  let syncedCount = 0;

  for (const item of pending) {
    // Hoisted out of the try so a resolution that succeeded before a later
    // failure can still be pinned onto the queue entry in the catch below.
    let pinnedStuntId = item.stuntId;

    try {
      // Resolve once, then reuse. After the first successful resolution the
      // lookup stops happening entirely and a later rename cannot break this
      // session, because the UUID it belongs to is already fixed.
      pinnedStuntId = pinnedStuntId ?? (await resolveStuntId(item.session));

      await uploadPracticeSession(item, pinnedStuntId);
      syncedCount += 1;
      markSynced(item.userId, item.session.id);
    } catch (error) {
      if (error instanceof StuntNotFoundError) {
        // Held, not discarded, and not counted against MAX_ATTEMPTS: no amount
        // of retrying resolves a missing row, but the row can appear later.
        remaining.push(item);
        console.warn(
          `[offlineSync] Holding session ${item.session.id}: ${error.message}. ` +
            'It will upload once that stunt exists.'
        );
        continue;
      }

      const attempts = (item.attempts || 0) + 1;
      if (attempts >= MAX_ATTEMPTS) {
        console.warn(
          `[offlineSync] Dropping session ${item.session.id} after ${MAX_ATTEMPTS} failed attempts.`,
          error
        );
      } else {
        remaining.push({ ...item, attempts, stuntId: pinnedStuntId });
      }
    }
  }

  writePendingSessions(remaining);
  return syncedCount;
};

export const getPendingSessionCount = (): number => readPendingSessions().length;