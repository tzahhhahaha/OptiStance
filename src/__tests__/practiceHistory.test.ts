import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ from: vi.fn() }));

vi.mock('../services/supabaseService', () => ({
  supabase: { from: mocks.from, auth: { getSession: vi.fn() } },
}));

import { fetchServerPracticeSessions, mergePracticeSessions } from '../services/supabaseApi';
import type { PracticeSession } from '../app/types';

/**
 * The sync path has always written practice_sessions but nothing ever read them
 * back, so history was stranded on whichever device recorded it. These cover the
 * read path and the merge that reconciles the server copy with the device cache.
 */

let rows: unknown[];
let filters: Array<[string, unknown]>;

const createQuery = () => {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn((col: string, val: unknown) => {
    filters.push([col, val]);
    return chain;
  });
  chain.order = vi.fn(() => Promise.resolve({ data: rows, error: null }));
  return chain;
};

beforeEach(() => {
  vi.clearAllMocks();
  rows = [];
  filters = [];
  mocks.from.mockImplementation(() => createQuery());
});

describe('fetchServerPracticeSessions', () => {
  it('scopes the query to the requested user', async () => {
    await fetchServerPracticeSessions('u1');
    expect(mocks.from).toHaveBeenCalledWith('practice_sessions');
    expect(filters).toContainEqual(['user_id', 'u1']);
  });

  it('recovers the original local id from the upload marker', async () => {
    rows = [
      {
        id: 'r1',
        session_date: '2026-01-02T10:00:00.000Z',
        duration_minutes: 2,
        overall_accuracy: 91.4,
        icu_compliance_grade: 8,
        session_notes: 'Superb joint alignment! [local-session:sess-123]',
        stunts: { name: 'T-Motion' },
      },
    ];

    const [session] = await fetchServerPracticeSessions('u1');

    // The marker is the only stable link to the device copy; without it the same
    // session would appear twice after a merge.
    expect(session.id).toBe('sess-123');
    expect(session.poseName).toBe('T-Motion');
    expect(session.accuracyScore).toBe(91);
    expect(session.durationSeconds).toBe(120);
    expect(session.icuScore).toBe(8);
  });

  it('strips the upload marker out of the feedback the athlete reads', async () => {
    rows = [
      {
        id: 'r1',
        session_date: '2026-01-02T10:00:00.000Z',
        duration_minutes: 1,
        overall_accuracy: 70,
        session_notes: 'Good hold! [local-session:sess-9]',
        stunts: { name: 'T-Motion' },
      },
    ];

    const [session] = await fetchServerPracticeSessions('u1');

    expect(session.feedbackSummary).toBe('Good hold!');
    expect(session.feedbackSummary).not.toMatch(/local-session/);
  });

  it('gives rows without a marker a stable id, so a merge cannot duplicate them', async () => {
    rows = [
      {
        id: 'row-uuid-1',
        session_date: '2026-01-02T10:00:00.000Z',
        duration_minutes: 1,
        overall_accuracy: 50,
        session_notes: 'No marker here',
        stunts: { name: 'Full Turn' },
      },
    ];

    const [first] = await fetchServerPracticeSessions('u1');
    const [again] = await fetchServerPracticeSessions('u1');

    expect(first.id).toBe('srv-row-uuid-1');
    expect(again.id).toBe(first.id);
  });

  it('handles a missing stunt join without throwing', async () => {
    rows = [
      {
        id: 'r1',
        session_date: '2026-01-02T10:00:00.000Z',
        duration_minutes: 1,
        overall_accuracy: 10,
        session_notes: '',
        stunts: null,
      },
    ];

    const [session] = await fetchServerPracticeSessions('u1');
    expect(session.poseName).toBe('Unknown Pose');
  });

  it('returns an empty list rather than failing when there is no history', async () => {
    rows = [];
    await expect(fetchServerPracticeSessions('u1')).resolves.toEqual([]);
  });
});

describe('mergePracticeSessions', () => {
  const local = (id: string, extra: Partial<PracticeSession> = {}): PracticeSession => ({
    id,
    poseId: 'p1',
    poseName: 'High V',
    timestamp: '2026-01-01T00:00:00.000Z',
    accuracyScore: 80,
    durationSeconds: 60,
    corrections: [],
    feedbackSummary: 'local copy',
    ...extra,
  });

  it('adds server-only sessions so history follows the account', () => {
    const merged = mergePracticeSessions([local('s1')], [local('s2')]);
    expect(merged.map((s) => s.id).sort()).toEqual(['s1', 's2']);
  });

  it('prefers the local copy, which has detail the table has no column for', () => {
    const merged = mergePracticeSessions(
      [local('s1', { corrections: ['knee straight'], measuredAngles: { knee: 178 } })],
      [local('s1', { corrections: [], feedbackSummary: 'server copy' })]
    );

    expect(merged).toHaveLength(1);
    expect(merged[0].corrections).toEqual(['knee straight']);
    expect(merged[0].measuredAngles).toEqual({ knee: 178 });
  });

  it('de-duplicates by id instead of listing a session twice', () => {
    const merged = mergePracticeSessions([local('s1'), local('s2')], [local('s1'), local('s2')]);
    expect(merged).toHaveLength(2);
  });

  it('orders newest first', () => {
    const merged = mergePracticeSessions(
      [
        local('old', { timestamp: '2026-01-01T00:00:00.000Z' }),
        local('new', { timestamp: '2026-03-01T00:00:00.000Z' }),
      ],
      []
    );
    expect(merged.map((s) => s.id)).toEqual(['new', 'old']);
  });

  it('sorts unparseable timestamps last instead of making the order arbitrary', () => {
    const merged = mergePracticeSessions(
      [local('broken', { timestamp: 'not-a-date' }), local('good', { timestamp: '2026-01-01T00:00:00.000Z' })],
      []
    );
    expect(merged.map((s) => s.id)).toEqual(['good', 'broken']);
  });

  it('is stable when both lists are empty', () => {
    expect(mergePracticeSessions([], [])).toEqual([]);
  });
});
