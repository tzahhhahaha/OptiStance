import { supabase, isSupabaseConfigured } from './supabaseService';
import type { PracticeSession } from '../app/types';

interface PendingSession {
  session: PracticeSession;
  userId: string;
  /** Number of failed upload attempts; sessions are dropped after MAX_ATTEMPTS. */
  attempts?: number;
}

const PENDING_SESSIONS_KEY = 'optistance_pending_sessions';
const SYNCED_SESSIONS_KEY = 'optistance_synced_sessions';
const MAX_ATTEMPTS = 5;

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

const readSyncedIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(SYNCED_SESSIONS_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
};

const writeSyncedIds = (ids: Set<string>) => {
  localStorage.setItem(SYNCED_SESSIONS_KEY, JSON.stringify([...ids]));
};

const markSynced = (id: string) => {
  const synced = readSyncedIds();
  synced.add(id);
  writeSyncedIds(synced);
};

/** Whether a local session id is already stored on the server. */
export const isSessionSynced = (id: string): boolean => readSyncedIds().has(id);

export const queuePracticeSession = (session: PracticeSession, userId?: string) => {
  if (!userId) return;
  if (isSessionSynced(session.id)) return; // already uploaded – do not re-queue

  const pending = readPendingSessions();
  if (!pending.some((item) => item.session.id === session.id)) {
    writePendingSessions([...pending, { session, userId }]);
  }
};

// ------------------------------------------------------------------
// Upload + sync
// ------------------------------------------------------------------

const uploadPracticeSession = async ({ session, userId }: PendingSession) => {
  const { data: stunt, error: stuntError } = await supabase
    .from('stunts')
    .select('id')
    .eq('name', session.poseName)
    .maybeSingle();

  if (stuntError || !stunt) {
    throw stuntError || new Error(`Cloud stunt not found: ${session.poseName}`);
  }

  const localMarker = `[local-session:${session.id}]`;
  const { data: existingSession, error: existingError } = await supabase
    .from('practice_sessions')
    .select('id')
    .eq('user_id', userId)
    .eq('session_notes', `${session.feedbackSummary} ${localMarker}`)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existingSession) return; // already uploaded – idempotent

  const sessionRecord = {
    user_id: userId,
    stunt_id: stunt.id,
    session_date: session.timestamp,
    duration_minutes: Math.max(1, Math.round(session.durationSeconds / 60)),
    overall_accuracy: session.accuracyScore,
    session_notes: `${session.feedbackSummary} ${localMarker}`,
    completed: true,
    ...(session.icuScore == null ? {} : { icu_compliance_grade: session.icuScore }),
  };

  const { error } = await supabase.from('practice_sessions').insert(sessionRecord);

  if (error) throw error;
};

/**
 * Upload every queued session and return how many were synced. Sessions that
 * fail are kept in the queue and dropped after MAX_ATTEMPTS. Skipped entirely
 * when offline or when Supabase is not configured.
 */
export const syncPendingSessions = async (): Promise<number> => {
  if (!isSupabaseConfigured) return 0;
  if (!navigator.onLine) return 0;

  const pending = readPendingSessions();
  const remaining: PendingSession[] = [];
  let syncedCount = 0;

  for (const item of pending) {
    try {
      await uploadPracticeSession(item);
      syncedCount += 1;
      markSynced(item.session.id);
    } catch {
      const attempts = (item.attempts || 0) + 1;
      if (attempts >= MAX_ATTEMPTS) {
        // Give up on sessions that can never sync (e.g. a stunt name that the
        // backend doesn't know) instead of re-queuing them forever.
        console.warn(
          `[offlineSync] Dropping session ${item.session.id} after ${MAX_ATTEMPTS} failed attempts.`
        );
      } else {
        remaining.push({ ...item, attempts });
      }
    }
  }

  writePendingSessions(remaining);
  return syncedCount;
};

export const getPendingSessionCount = () => readPendingSessions().length;