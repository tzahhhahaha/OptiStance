import type { SessionLike } from './athleteStats';

export interface AccountLike {
  id: string;
  isActive: boolean;
  isVerified: boolean;
}

export interface RosterSummary {
  /** Accounts in the `users` table, active and deactivated. */
  totalAccounts: number;
  /** Accounts with `is_active = true`. */
  activeAthletes: number;
  /** Accounts holding full pose access. */
  withFullAccess: number;
  /** Accounts limited to Beginner poses (including revoked). */
  basicAccess: number;
  /** Mean sessions per active account, one decimal. 0 when nobody is active. */
  avgSessionsPerAthlete: number;
}

export interface SessionTotals {
  total: number;
  /** Sessions whose `session_date` falls on the given local day. */
  today: number;
  /** Mean of the sessions that recorded a score, or null when none did. */
  avgAccuracy: number | null;
  /** Accounts that have never recorded a session. */
  athletesNeverTrained: number;
}

export interface DailyBucket {
  /** `YYYY-MM-DD` in local time. */
  day: string;
  count: number;
  /** Mean score for that day, or null when nothing was scored. */
  avgAccuracy: number | null;
}

/** Local-time `YYYY-MM-DD` for a date. Not UTC — "sessions today" is the user's day. */
export const localDayKey = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
};

/** Session counts and accuracy across the whole platform. */
export const summariseSessions = (
  sessions: readonly SessionLike[],
  accounts: readonly AccountLike[],
  now: Date = new Date()
): SessionTotals => {
  const today = localDayKey(now);
  let scored = 0;
  let scoreSum = 0;

  for (const session of sessions) {
    if (typeof session.overall_accuracy === 'number') {
      scoreSum += session.overall_accuracy;
      scored += 1;
    }
  }

  const activeIds = new Set(accounts.filter((a) => a.isActive).map((a) => a.id));
  const trainedActive = new Set(
    sessions.filter((s) => activeIds.has(s.user_id)).map((s) => s.user_id)
  );
  let neverTrained = 0;
  for (const id of activeIds) {
    if (!trainedActive.has(id)) neverTrained += 1;
  }

  return {
    total: sessions.length,
    today: sessions.filter((s) => localDayKey(s.session_date) === today).length,
    avgAccuracy: scored > 0 ? Math.round(scoreSum / scored) : null,
    athletesNeverTrained: neverTrained,
  };
};

/** Roster-level counts, plus sessions per active account. */
export const summariseRoster = (
  accounts: readonly AccountLike[],
  sessions: readonly SessionLike[]
): RosterSummary => {
  const activeAthletes = accounts.filter((a) => a.isActive).length;
  const withFullAccess = accounts.filter((a) => a.isVerified).length;

  return {
    totalAccounts: accounts.length,
    activeAthletes,
    withFullAccess,
    basicAccess: accounts.length - withFullAccess,
    avgSessionsPerAthlete:
      activeAthletes === 0
        ? 0
        : Math.round((sessions.length / activeAthletes) * 10) / 10,
  };
};

/**
 * Session volume and mean accuracy for the last `days` local days, oldest
 * first, including days with no activity so the axis is continuous.
 */
export const bucketSessionsByDay = (
  sessions: readonly SessionLike[],
  days: number,
  now: Date = new Date()
): DailyBucket[] => {
  const buckets = new Map<string, { count: number; sum: number; scored: number }>();
  const keys: string[] = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(now);
    date.setDate(date.getDate() - offset);
    const key = localDayKey(date);
    keys.push(key);
    buckets.set(key, { count: 0, sum: 0, scored: 0 });
  }

  for (const session of sessions) {
    const key = localDayKey(session.session_date);
    const bucket = buckets.get(key);
    if (!bucket) continue; // older than the window
    bucket.count += 1;
    if (typeof session.overall_accuracy === 'number') {
      bucket.sum += session.overall_accuracy;
      bucket.scored += 1;
    }
  }

  return keys.map((day) => {
    const bucket = buckets.get(day)!;
    return {
      day,
      count: bucket.count,
      avgAccuracy: bucket.scored > 0 ? Math.round(bucket.sum / bucket.scored) : null,
    };
  });
};

/** Short weekday label for a `YYYY-MM-DD` key, e.g. "Mon". */
export const weekdayLabel = (day: string): string => {
  const parsed = new Date(`${day}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? day
    : parsed.toLocaleDateString(undefined, { weekday: 'short' });
};

/** True when every bucket is empty, so the caller can hide the chart entirely. */
export const isEmptySeries = (buckets: readonly DailyBucket[]): boolean =>
  buckets.every((b) => b.count === 0);

// ============================================================
// Period filtering
// ============================================================

export type PeriodKey = 'today' | 'week' | 'month' | 'all';

/** First local day included in a period, or null for "all time". */
export const periodStartDay = (period: PeriodKey, now: Date = new Date()): string | null => {
  switch (period) {
    case 'today':
      return localDayKey(now);
    case 'week': {
      // Rolling 7 days, including today — matches the dashboard chart.
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      return localDayKey(start);
    }
    case 'month':
      return localDayKey(new Date(now.getFullYear(), now.getMonth(), 1));
    case 'all':
      return null;
  }
};

/** Human label for a period key. */
export const PERIOD_LABELS: Record<PeriodKey, string> = {
  today: 'Today',
  week: 'Last 7 days',
  month: 'This month',
  all: 'All time',
};

/**
 * Restrict sessions to a period. `session_date` is an ISO timestamp, so
 * comparing its local-day key against the period start is chronological.
 *
 * Generic so the caller's richer row type (e.g. one carrying `stunt_id`)
 * survives the filter instead of collapsing to the base shape.
 */
export const sessionsInPeriod = <T extends SessionLike>(
  sessions: readonly T[],
  period: PeriodKey,
  now: Date = new Date()
): T[] => {
  const start = periodStartDay(period, now);
  if (start === null) return [...sessions];
  return sessions.filter((s) => localDayKey(s.session_date) >= start);
};

// ============================================================
// Rollups
// ============================================================

export interface StuntSessionLike extends SessionLike {
  stunt_id: string;
}

export interface StuntRollup {
  stuntId: string;
  attempts: number;
  /** Mean score, or null when no attempt recorded one. */
  avgAccuracy: number | null;
  /**
   * Share of scored attempts that reached the app's own mastery threshold,
   * 0-100, or null when nothing was scored. Using the same threshold the
   * athlete sees on their own profile keeps the two figures consistent.
   */
  masteryRate: number | null;
}

/**
 * Attempt counts and accuracy per stunt, busiest first.
 *
 * "Top Stunts by Attempts" used to be a literal string reading
 * "No stunt attempt data available" inside an otherwise populated card, which
 * looked like a broken panel rather than an empty one.
 */
export const rollUpByStunt = (
  sessions: readonly StuntSessionLike[],
  masteryThreshold: number
): StuntRollup[] => {
  const totals = new Map<
    string,
    { count: number; sum: number; scored: number; mastered: number }
  >();

  for (const session of sessions) {
    const entry = totals.get(session.stunt_id) ?? {
      count: 0,
      sum: 0,
      scored: 0,
      mastered: 0,
    };
    entry.count += 1;
    if (typeof session.overall_accuracy === 'number') {
      entry.sum += session.overall_accuracy;
      entry.scored += 1;
      if (session.overall_accuracy >= masteryThreshold) entry.mastered += 1;
    }
    totals.set(session.stunt_id, entry);
  }

  return [...totals.entries()]
    .map(([stuntId, entry]) => ({
      stuntId,
      attempts: entry.count,
      avgAccuracy: entry.scored > 0 ? Math.round(entry.sum / entry.scored) : null,
      masteryRate:
        entry.scored > 0 ? Math.round((entry.mastered / entry.scored) * 100) : null,
    }))
    .sort(
      (a, b) =>
        b.attempts - a.attempts || (b.avgAccuracy ?? -1) - (a.avgAccuracy ?? -1)
    );
};

export interface RankableAccount {
  id: string;
  name: string;
  isActive: boolean;
}

export interface AthleteRank {
  id: string;
  name: string;
  sessions: number;
  avgAccuracy: number | null;
  lastSessionAt: string | null;
  isActive: boolean;
}

/** Per-athlete leaderboard, most sessions first. Accounts with none are included. */
export const rankAthletes = (
  sessions: readonly SessionLike[],
  accounts: readonly RankableAccount[],
  limit = 10
): AthleteRank[] => {
  const totals = new Map<
    string,
    { count: number; sum: number; scored: number; last: string }
  >();

  for (const session of sessions) {
    const entry = totals.get(session.user_id) ?? { count: 0, sum: 0, scored: 0, last: '' };
    entry.count += 1;
    if (typeof session.overall_accuracy === 'number') {
      entry.sum += session.overall_accuracy;
      entry.scored += 1;
    }
    if (session.session_date > entry.last) entry.last = session.session_date;
    totals.set(session.user_id, entry);
  }

  return accounts
    .map((account) => {
      const entry = totals.get(account.id);
      return {
        id: account.id,
        name: account.name,
        sessions: entry?.count ?? 0,
        avgAccuracy:
          entry && entry.scored > 0 ? Math.round(entry.sum / entry.scored) : null,
        lastSessionAt: entry?.last || null,
        isActive: account.isActive,
      };
    })
    .sort(
      (a, b) =>
        b.sessions - a.sessions ||
        (b.avgAccuracy ?? -1) - (a.avgAccuracy ?? -1) ||
        a.name.localeCompare(b.name)
    )
    .slice(0, limit);
};

export interface ComplianceSessionLike extends SessionLike {
  icu_compliance_grade?: number | null;
}

/**
 * Mean `icu_compliance_grade` over the sessions that recorded one, or null.
 * The column is nullable, so an empty value means "not graded", not zero.
 */
export const meanComplianceGrade = (
  sessions: readonly ComplianceSessionLike[]
): number | null => {
  const graded = sessions.filter(
    (s): s is ComplianceSessionLike & { icu_compliance_grade: number } =>
      typeof s.icu_compliance_grade === 'number'
  );
  if (graded.length === 0) return null;
  return Math.round(graded.reduce((sum, s) => sum + s.icu_compliance_grade, 0) / graded.length);
};

/** Distinct accounts with at least one session in the window. */
export const activeUserCount = (sessions: readonly SessionLike[]): number =>
  new Set(sessions.map((s) => s.user_id)).size;
