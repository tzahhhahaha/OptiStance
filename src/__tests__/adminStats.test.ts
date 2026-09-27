import { describe, it, expect } from 'vitest';
import {
  activeUserCount,
  bucketSessionsByDay,
  isEmptySeries,
  localDayKey,
  meanComplianceGrade,
  periodStartDay,
  rankAthletes,
  rollUpByStunt,
  sessionsInPeriod,
  summariseRoster,
  summariseSessions,
  weekdayLabel,
} from '../app/utils/adminStats';
import { aggregateSessionsByAthlete } from '../app/utils/athleteStats';
import { MASTERY_THRESHOLD } from '../app/types';

/** Fixed clock so "today" never depends on when the suite runs. */
const NOW = new Date(2026, 8, 27, 14, 30); // 27 Sep 2026, local
const iso = (day: number, hour = 10) =>
  new Date(2026, 8, day, hour, 0, 0).toISOString();

const session = (
  user_id: string,
  day: number,
  extra: Partial<{ overall_accuracy: number | null; icu_compliance_grade: number | null; stunt_id: string }> = {}
) => ({
  user_id,
  session_date: iso(day),
  overall_accuracy: extra.overall_accuracy ?? null,
  icu_compliance_grade: extra.icu_compliance_grade ?? null,
  stunt_id: extra.stunt_id ?? 'pose-1',
});

describe('localDayKey', () => {
  it('formats a Date as YYYY-MM-DD in local time', () => {
    expect(localDayKey(NOW)).toBe('2026-09-27');
  });

  it('accepts an ISO string and still reads it as local time', () => {
    // A UTC timestamp late in the day would roll over to the next local day.
    expect(localDayKey(new Date(2026, 8, 27, 23, 30).toISOString())).toBe('2026-09-27');
  });
});

describe('summariseSessions', () => {
  const accounts = [
    { id: 'a', isActive: true, isVerified: true },
    { id: 'b', isActive: true, isVerified: false },
    { id: 'c', isActive: false, isVerified: false },
  ];

  it('returns null average accuracy when nothing was scored', () => {
    // The whole point of the null: a platform with no scores has no average,
    // and rendering 0% would read as "every attempt failed".
    const totals = summariseSessions([session('a', 27), session('b', 27)], accounts, NOW);
    expect(totals.avgAccuracy).toBeNull();
    expect(totals.total).toBe(2);
  });

  it('averages only the sessions that carry a score', () => {
    const totals = summariseSessions(
      [
        session('a', 27, { overall_accuracy: 90 }),
        session('a', 27, { overall_accuracy: 70 }),
        session('a', 27, { overall_accuracy: null }),
      ],
      accounts,
      NOW
    );
    // 90 and 70, not 160/3.
    expect(totals.avgAccuracy).toBe(80);
    expect(totals.total).toBe(3);
  });

  it('counts sessions recorded on the given local day only', () => {
    const totals = summariseSessions(
      [session('a', 27, 0 as never), session('a', 26), session('b', 25)],
      accounts,
      NOW
    );
    expect(totals.today).toBe(1);
  });

  it('counts only active accounts that have never trained', () => {
    // a and b have trained; c is deactivated so it is not "never trained".
    const totals = summariseSessions([session('a', 26), session('b', 26)], accounts, NOW);
    expect(totals.athletesNeverTrained).toBe(0);

    const fresh = [...accounts, { id: 'd', isActive: true, isVerified: false }];
    expect(summariseSessions([session('a', 26)], fresh, NOW).athletesNeverTrained).toBe(2);
  });
});

describe('summariseRoster', () => {
  const accounts = [
    { id: 'a', isActive: true, isVerified: true },
    { id: 'b', isActive: true, isVerified: false },
    { id: 'c', isActive: false, isVerified: false },
  ];

  it('splits the roster by activation and pose access', () => {
    const roster = summariseRoster(accounts, []);
    expect(roster.totalAccounts).toBe(3);
    expect(roster.activeAthletes).toBe(2);
    expect(roster.withFullAccess).toBe(1);
    expect(roster.basicAccess).toBe(2);
  });

  it('divides sessions by active athletes, to one decimal', () => {
    const sessions = [session('a', 26), session('a', 26), session('b', 26)];
    expect(summariseRoster(accounts, sessions).avgSessionsPerAthlete).toBe(1.5);
  });

  it('reports zero, not NaN, when nobody is active', () => {
    const allDeactivated = accounts.map((a) => ({ ...a, isActive: false }));
    expect(summariseRoster(allDeactivated, [session('a', 26)]).avgSessionsPerAthlete).toBe(0);
  });
});

describe('bucketSessionsByDay', () => {
  it('returns one bucket per day, oldest first, including empty days', () => {
    const buckets = bucketSessionsByDay([session('a', 27)], 7, NOW);
    expect(buckets).toHaveLength(7);
    expect(buckets[6].day).toBe('2026-09-27');
    expect(buckets[0].day).toBe('2026-09-21');
    expect(buckets[6].count).toBe(1);
    expect(buckets[0].count).toBe(0);
  });

  it('ignores sessions older than the window', () => {
    const buckets = bucketSessionsByDay([session('a', 1)], 7, NOW);
    expect(buckets.every((b) => b.count === 0)).toBe(true);
  });

  it('averages accuracy per day and leaves unscored days null', () => {
    const buckets = bucketSessionsByDay(
      [
        session('a', 27, { overall_accuracy: 100 }),
        session('b', 27, { overall_accuracy: 60 }),
        session('a', 26),
      ],
      7,
      NOW
    );
    expect(buckets[6].avgAccuracy).toBe(80);
    expect(buckets[6].count).toBe(2);
    // Recorded but never scored: a count with no average, not an average of 0.
    expect(buckets[5].count).toBe(1);
    expect(buckets[5].avgAccuracy).toBeNull();
  });

  it('detects a series with no activity at all', () => {
    expect(isEmptySeries(bucketSessionsByDay([], 7, NOW))).toBe(true);
    expect(isEmptySeries(bucketSessionsByDay([session('a', 27)], 7, NOW))).toBe(false);
  });
});

describe('periodStartDay', () => {
  it('returns today for the single-day period', () => {
    expect(periodStartDay('today', NOW)).toBe('2026-09-27');
  });

  it('returns a rolling seven days for the week period', () => {
    expect(periodStartDay('week', NOW)).toBe('2026-09-21');
  });

  it('returns the first of the month for the month period', () => {
    expect(periodStartDay('month', NOW)).toBe('2026-09-01');
  });

  it('returns null for all time, meaning no lower bound', () => {
    expect(periodStartDay('all', NOW)).toBeNull();
  });
});

describe('sessionsInPeriod', () => {
  // 10 Aug, then three days in September.
  const august = new Date(2026, 7, 10, 10, 0, 0).toISOString();
  const sessions = [
    { user_id: 'a', session_date: august },
    ...[10, 20, 27].map((day) => session('a', day)),
  ];

  it('keeps only sessions on or after the period start', () => {
    expect(sessionsInPeriod(sessions, 'today', NOW)).toHaveLength(1);
    expect(sessionsInPeriod(sessions, 'week', NOW)).toHaveLength(1);
    // Month starts 1 Sep, so the August session drops out.
    expect(sessionsInPeriod(sessions, 'month', NOW)).toHaveLength(3);
  });

  it('keeps everything for all time', () => {
    expect(sessionsInPeriod(sessions, 'all', NOW)).toHaveLength(4);
  });

  it('preserves extra row fields so callers can still group by stunt', () => {
    const [kept] = sessionsInPeriod(
      [session('a', 27, { stunt_id: 'pose-9' })],
      'today',
      NOW
    );
    expect(kept.stunt_id).toBe('pose-9');
  });
});

describe('rollUpByStunt', () => {
  it('counts attempts per stunt and orders by volume', () => {
    const rollup = rollUpByStunt(
      [
        session('a', 27, { stunt_id: 'rare' }),
        session('a', 27, { stunt_id: 'common' }),
        session('b', 27, { stunt_id: 'common' }),
      ],
      MASTERY_THRESHOLD
    );
    expect(rollup[0]).toMatchObject({ stuntId: 'common', attempts: 2 });
    expect(rollup[1]).toMatchObject({ stuntId: 'rare', attempts: 1 });
  });

  it('reports a null mastery rate when no attempt was scored', () => {
    const [rollup] = rollUpByStunt([session('a', 27, { stunt_id: 'p' })], MASTERY_THRESHOLD);
    // Not 0: nothing has been measured yet.
    expect(rollup.masteryRate).toBeNull();
    expect(rollup.avgAccuracy).toBeNull();
  });

  it('computes mastery from attempts that reached the app threshold', () => {
    const [rollup] = rollUpByStunt(
      [
        session('a', 27, { stunt_id: 'p', overall_accuracy: MASTERY_THRESHOLD }),
        session('a', 27, { stunt_id: 'p', overall_accuracy: MASTERY_THRESHOLD - 1 }),
        session('a', 27, { stunt_id: 'p', overall_accuracy: 50 }),
        session('a', 27, { stunt_id: 'p', overall_accuracy: null }),
      ],
      MASTERY_THRESHOLD
    );
    // 1 of 3 scored attempts. The unscored attempt is not counted either way.
    expect(rollup.masteryRate).toBe(33);
    expect(rollup.attempts).toBe(4);
  });
});

describe('rankAthletes', () => {
  const accounts = [
    { id: 'a', name: 'Ada', isActive: true },
    { id: 'b', name: 'Bea', isActive: true },
    { id: 'c', name: 'Cy', isActive: false },
  ];

  it('orders by session count and includes athletes with none', () => {
    const ranked = rankAthletes(
      [session('b', 27), session('b', 27), session('a', 27)],
      accounts
    );
    expect(ranked.map((r) => r.id)).toEqual(['b', 'a', 'c']);
    expect(ranked[2]).toMatchObject({ sessions: 0, avgAccuracy: null, lastSessionAt: null });
  });

  it('breaks a session tie on average accuracy', () => {
    const ranked = rankAthletes(
      [
        session('a', 27, { overall_accuracy: 50 }),
        session('b', 27, { overall_accuracy: 95 }),
      ],
      accounts
    );
    expect(ranked[0].id).toBe('b');
  });

  it('records the most recent session date', () => {
    const ranked = rankAthletes([session('a', 10), session('a', 27)], accounts, 1);
    expect(ranked[0].lastSessionAt).toBe(iso(27));
  });

  it('honours the limit', () => {
    expect(rankAthletes([], accounts, 2)).toHaveLength(2);
  });
});

describe('meanComplianceGrade', () => {
  it('returns null when the nullable grade column was never filled in', () => {
    expect(meanComplianceGrade([session('a', 27)])).toBeNull();
    expect(meanComplianceGrade([])).toBeNull();
  });

  it('averages the graded sessions only', () => {
    const grade = meanComplianceGrade([
      session('a', 27, { icu_compliance_grade: 80 }),
      session('a', 27, { icu_compliance_grade: 100 }),
      session('a', 27, { icu_compliance_grade: null }),
    ]);
    expect(grade).toBe(90);
  });
});

describe('activeUserCount', () => {
  it('counts distinct athletes rather than sessions', () => {
    expect(
      activeUserCount([session('a', 27), session('a', 26), session('b', 27)])
    ).toBe(2);
    expect(activeUserCount([])).toBe(0);
  });
});

describe('weekdayLabel', () => {
  it('renders a short weekday name', () => {
    expect(weekdayLabel('2026-09-21')).toMatch(/Mon/);
  });

  it('returns the key unchanged when it is not a date', () => {
    expect(weekdayLabel('not-a-date')).toBe('not-a-date');
  });
});

describe('aggregateSessionsByAthlete', () => {
  it('keeps each athlete isolated', () => {
    const totals = aggregateSessionsByAthlete([
      { user_id: 'a', overall_accuracy: 90, session_date: iso(20) },
      { user_id: 'b', overall_accuracy: 40, session_date: iso(21) },
    ]);
    expect(totals.get('a')?.avgAccuracy).toBe(90);
    expect(totals.get('b')?.avgAccuracy).toBe(40);
    expect(totals.get('a')?.sessions).toBe(1);
  });

  it('returns null average for an athlete with only unscored sessions', () => {
    const totals = aggregateSessionsByAthlete([
      { user_id: 'a', overall_accuracy: null, session_date: iso(20) },
    ]);
    expect(totals.get('a')).toEqual({
      sessions: 1,
      avgAccuracy: null,
      lastSessionAt: iso(20),
    });
  });

  it('returns an empty map for no sessions', () => {
    expect(aggregateSessionsByAthlete([]).size).toBe(0);
  });
});
