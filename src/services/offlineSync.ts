import { supabase } from './supabaseService';
import { PracticeSession } from '../app/types';

interface PendingSession {
  session: PracticeSession;
  userId: string;
}

const PENDING_SESSIONS_KEY = 'optistance_pending_sessions';

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

export const queuePracticeSession = (session: PracticeSession, userId?: string) => {
  if (!userId) return;

  const pending = readPendingSessions();
  if (!pending.some((item) => item.session.id === session.id)) {
    writePendingSessions([...pending, { session, userId }]);
  }
};

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
  if (existingSession) return;

  const { error } = await supabase.from('practice_sessions').insert({
    user_id: userId,
    stunt_id: stunt.id,
    session_date: session.timestamp,
    duration_minutes: Math.max(1, Math.round(session.durationSeconds / 60)),
    overall_accuracy: session.accuracyScore,
    icu_compliance_grade: Math.min(10, Math.max(1, session.icuScore)),
    session_notes: `${session.feedbackSummary} ${localMarker}`,
    completed: true,
  });

  if (error) throw error;
};

export const syncPendingSessions = async (): Promise<number> => {
  if (!navigator.onLine) return 0;

  const pending = readPendingSessions();
  const remaining: PendingSession[] = [];
  let syncedCount = 0;

  for (const item of pending) {
    try {
      await uploadPracticeSession(item);
      syncedCount += 1;
    } catch {
      remaining.push(item);
    }
  }

  writePendingSessions(remaining);
  return syncedCount;
};

export const getPendingSessionCount = () => readPendingSessions().length;
