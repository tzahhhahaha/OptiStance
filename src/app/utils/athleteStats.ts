import type { PracticeSession } from '../../types/supabase';

export interface AthleteAggregate {
  /** Total practice sessions recorded. */
  sessions: number;
  /**
   * Mean of `overall_accuracy` over the sessions that actually recorded one.
   * `null` when no session carried a score — the UI must be able to say
   * "not scored" rather than render a confident 0%.
   */
  avgAccuracy: number | null;
  /** Most recent session date, ISO. `null` when the athlete has never trained. */
  lastSessionAt: string | null;
}

/** Anything that can stand in for a `practice_sessions` row. */
export interface SessionLike {
  user_id: string;
  overall_accuracy?: number | null;
  session_date: string;
}

/**
 * Roll `practice_sessions` up per athlete.
 *
 * The admin console used to hardcode `sessions: 0, avgAccuracy: 0` for every
 * row, which made an empty database look like a real report. These are the real
 * numbers, with `avgAccuracy` left null when there is nothing to average so
 * callers can render an honest empty state instead of a fake zero.
 */
export const aggregateSessionsByAthlete = (
  sessions: readonly SessionLike[]
): Map<string, AthleteAggregate> => {
  const totals = new Map<string, { count: number; sum: number; scored: number; last: string }>();

  for (const session of sessions) {
    const entry = totals.get(session.user_id) ?? { count: 0, sum: 0, scored: 0, last: '' };
    entry.count += 1;

    if (typeof session.overall_accuracy === 'number') {
      entry.sum += session.overall_accuracy;
      entry.scored += 1;
    }

    // session_date is ISO from the database, so string ordering is chronological.
    if (session.session_date > entry.last) entry.last = session.session_date;

    totals.set(session.user_id, entry);
  }

  const result = new Map<string, AthleteAggregate>();
  for (const [userId, entry] of totals) {
    result.set(userId, {
      sessions: entry.count,
      avgAccuracy: entry.scored > 0 ? Math.round(entry.sum / entry.scored) : null,
      lastSessionAt: entry.last || null,
    });
  }
  return result;
};

/** Rounded 0-100, or null when there is nothing to average. */
export const overallAccuracyOf = (sessions: readonly PracticeSession[]): number | null => {
  const scored = sessions.filter(
    (s): s is PracticeSession & { overall_accuracy: number } => typeof s.overall_accuracy === 'number'
  );
  if (scored.length === 0) return null;
  return Math.round(scored.reduce((sum, s) => sum + s.overall_accuracy, 0) / scored.length);
};
