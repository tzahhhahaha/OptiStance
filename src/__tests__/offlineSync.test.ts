import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ from: vi.fn() }));

vi.mock('../services/supabaseService', () => ({
  supabase: { from: mocks.from },
  isSupabaseConfigured: true,
}));

import { getPendingSessionCount, isSessionSynced, queuePracticeSession, syncPendingSessions } from '../services/offlineSync';
import type { PracticeSession } from '../app/types';

const makeSession = (id: string): PracticeSession => ({
  id,
  poseId: 'high-v',
  poseName: 'High V',
  timestamp: '2026-01-01T00:00:00.000Z',
  accuracyScore: 85,
  durationSeconds: 120,
  corrections: [],
  icuScore: 8,
  feedbackSummary: 'Great form',
});

const setOnline = (value: boolean) => {
  Object.defineProperty(window.navigator, 'onLine', { value, configurable: true });
};

/** A row in the `stunts` table, as far as the lookup is concerned. */
interface StuntRow {
  id: string;
  name: string;
  pose_key: string | null;
}

let stuntRows: StuntRow[];
let existingSessionResult: unknown;
let insertResult: { error: unknown } | null;
/** Every `.eq(column, value)` pair the code under test issued, in order. */
let eqCalls: Array<[string, unknown]>;

const findStunt = (filters: Array<[string, unknown]>): StuntRow | null => {
  const match = stuntRows.find((row) =>
    filters.every(([col, val]) => {
      if (col === 'id') return row.id === val;
      if (col === 'name') return row.name === val;
      if (col === 'pose_key') return row.pose_key === val;
      return false;
    })
  );
  return match ?? null;
};

const createQuery = (table: string) => {
  const filters: Array<[string, unknown]> = [];
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn((col: string, val: unknown) => {
    filters.push([col, val]);
    eqCalls.push([col, val]);
    return chain;
  });
  chain.insert = vi.fn(() => Promise.resolve(insertResult));
  chain.maybeSingle = vi.fn(() => {
    if (table !== 'stunts') return Promise.resolve(existingSessionResult);
    const row = findStunt(filters);
    return Promise.resolve(row ? { data: { id: row.id }, error: null } : { data: null, error: null });
  });
  return chain;
};

/** Columns the stunt lookup was filtered on, in order. */
const stuntLookupColumns = (): string[] =>
  eqCalls.filter(([col]) => col === 'pose_key' || col === 'name').map(([col]) => col);

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  setOnline(true);
  eqCalls = [];
  stuntRows = [{ id: 'st1', name: 'High V', pose_key: 'high-v' }];
  existingSessionResult = { data: null, error: null };
  insertResult = { error: null };
  mocks.from.mockImplementation((table: string) => createQuery(table));
});

describe('queuePracticeSession', () => {
  it('ignores sessions without a user id (guests)', () => {
    queuePracticeSession(makeSession('s1'), undefined);
    expect(getPendingSessionCount()).toBe(0);
  });

  it('queues a session and de-duplicates by id', () => {
    queuePracticeSession(makeSession('s1'), 'u1');
    queuePracticeSession(makeSession('s1'), 'u1');
    queuePracticeSession(makeSession('s2'), 'u1');
    expect(getPendingSessionCount()).toBe(2);
  });
});

describe('syncPendingSessions', () => {
  it('does nothing while offline', async () => {
    queuePracticeSession(makeSession('s1'), 'u1');
    setOnline(false);

    await expect(syncPendingSessions()).resolves.toBe(0);
    expect(getPendingSessionCount()).toBe(1);
  });

  it('uploads a queued session and clears the queue', async () => {
    queuePracticeSession(makeSession('s1'), 'u1');

    await expect(syncPendingSessions()).resolves.toBe(1);
    expect(getPendingSessionCount()).toBe(0);
  });

  it('treats an already-present cloud session as synced (idempotent)', async () => {
    existingSessionResult = { data: { id: 'cloud-1' }, error: null };
    queuePracticeSession(makeSession('s1'), 'u1');

    await expect(syncPendingSessions()).resolves.toBe(1);
    expect(getPendingSessionCount()).toBe(0);
  });

  it('marks synced sessions so they are never re-queued afterwards', async () => {
    queuePracticeSession(makeSession('s1'), 'u1');
    await expect(syncPendingSessions()).resolves.toBe(1);
    expect(getPendingSessionCount()).toBe(0);
    expect(isSessionSynced('s1', 'u1')).toBe(true);

    // Re-queueing the same session (e.g. a repeated login) is a no-op.
    queuePracticeSession(makeSession('s1'), 'u1');
    expect(getPendingSessionCount()).toBe(0);

    // A brand new session still queues normally.
    queuePracticeSession(makeSession('s2'), 'u1');
    expect(getPendingSessionCount()).toBe(1);
  });

  it('scopes the synced registry per account, so colliding ids are not swallowed', async () => {
    // Session ids come from a timestamp, so two accounts can produce the same
    // one. A shared registry would mark the second account's session as already
    // uploaded and it would never reach the server.
    queuePracticeSession(makeSession('s1'), 'u1');
    await expect(syncPendingSessions()).resolves.toBe(1);
    expect(isSessionSynced('s1', 'u1')).toBe(true);

    expect(isSessionSynced('s1', 'u2')).toBe(false);
    queuePracticeSession(makeSession('s1'), 'u2');
    expect(getPendingSessionCount()).toBe(1);
  });

  it('uploads a queued session as the account that captured it, not the current one', async () => {
    // u1 goes offline, records, then u2 signs in before the device reconnects.
    queuePracticeSession(makeSession('s1'), 'u1');
    setOnline(false);
    expect(await syncPendingSessions()).toBe(0);
    expect(getPendingSessionCount()).toBe(1);

    setOnline(true);
    await syncPendingSessions();

    expect(getPendingSessionCount()).toBe(0);
    expect(isSessionSynced('s1', 'u1')).toBe(true);
    expect(isSessionSynced('s1', 'u2')).toBe(false);
  });
});

/**
 * The stunt a session belongs to used to be resolved with
 * `.eq('name', session.poseName)` on every attempt. `stunts.name` is UNIQUE but
 * freely editable in the admin console, so an admin rename made every queued
 * session for that stunt unresolvable, and the queue then deleted them after
 * MAX_ATTEMPTS. The athlete's practice history disappeared silently.
 */
describe('resolving the stunt a session belongs to', () => {
  it('prefers the stable pose_key over the editable name', async () => {
    queuePracticeSession(makeSession('s1'), 'u1');
    await syncPendingSessions();

    // pose_key matched on the first try, so the name was never consulted.
    expect(stuntLookupColumns()).toEqual(['pose_key']);
  });

  it('falls back to name for rows that predate pose_key', async () => {
    stuntRows = [{ id: 'st1', name: 'High V', pose_key: null }];
    queuePracticeSession(makeSession('s1'), 'u1');

    await expect(syncPendingSessions()).resolves.toBe(1);
    expect(stuntLookupColumns()).toEqual(['pose_key', 'name']);
  });

  it('still uploads after the stunt is renamed, via the pinned id', async () => {
    queuePracticeSession(makeSession('s1'), 'u1');
    // First attempt fails on the insert (server hiccup), so the session stays
    // queued and the resolved id is pinned onto it.
    insertResult = { error: { message: 'deadlock detected' } };
    await syncPendingSessions();
    expect(getPendingSessionCount()).toBe(1);

    // An admin renames the stunt. The name no longer matches anything.
    stuntRows = [{ id: 'st1', name: 'Renamed High V', pose_key: 'high-v' }];
    insertResult = { error: null };
    eqCalls = [];

    await expect(syncPendingSessions()).resolves.toBe(1);
    expect(getPendingSessionCount()).toBe(0);

    // No lookup at all: the id was already resolved, so a rename cannot break it.
    expect(stuntLookupColumns()).toEqual([]);
  });

  it('does not lose a session when the stunt is renamed before the first sync', async () => {
    // The athlete recorded offline, then an admin renamed the stunt, then the
    // device came back online. pose_key is untouched by a rename, so the
    // session still resolves and still uploads.
    stuntRows = [{ id: 'st1', name: 'Renamed High V', pose_key: 'high-v' }];
    queuePracticeSession(makeSession('s1'), 'u1');

    await expect(syncPendingSessions()).resolves.toBe(1);
    expect(getPendingSessionCount()).toBe(0);
  });
});

/**
 * Dropping recorded practice is the worst outcome this module can produce, so a
 * session whose stunt cannot be resolved is held rather than discarded. The old
 * code counted it as a failed attempt and deleted it after five tries.
 */
describe('sessions whose stunt cannot be resolved', () => {
  beforeEach(() => {
    stuntRows = [];
  });

  it('holds the session indefinitely instead of dropping it', async () => {
    queuePracticeSession(makeSession('s1'), 'u1');

    for (let attempt = 1; attempt <= 8; attempt += 1) {
      await expect(syncPendingSessions()).resolves.toBe(0);
      expect(getPendingSessionCount()).toBe(1);
    }
  });

  it('uploads it once the stunt row appears', async () => {
    queuePracticeSession(makeSession('s1'), 'u1');
    await syncPendingSessions();
    expect(getPendingSessionCount()).toBe(1);

    // An admin creates (or restores) the stunt.
    stuntRows = [{ id: 'st1', name: 'High V', pose_key: 'high-v' }];
    await expect(syncPendingSessions()).resolves.toBe(1);
    expect(getPendingSessionCount()).toBe(0);
  });
});

describe('transient upload failures', () => {
  it('retries, then drops a session after 5 attempts', async () => {
    // A failing insert is transient (network, server, lock), not a missing row,
    // so the old MAX_ATTEMPTS budget still applies.
    insertResult = { error: { message: 'deadlock detected' } };
    queuePracticeSession(makeSession('s1'), 'u1');

    for (let attempt = 1; attempt <= 4; attempt += 1) {
      await syncPendingSessions();
      expect(getPendingSessionCount()).toBe(1);
    }

    await syncPendingSessions(); // 5th failure → dropped
    expect(getPendingSessionCount()).toBe(0);
  });

  it('keeps the resolved stunt id across retries', async () => {
    insertResult = { error: { message: 'deadlock detected' } };
    queuePracticeSession(makeSession('s1'), 'u1');
    await syncPendingSessions();
    expect(getPendingSessionCount()).toBe(1);

    // Second attempt needs no lookup, because the id was pinned on the first.
    insertResult = { error: null };
    eqCalls = [];
    await expect(syncPendingSessions()).resolves.toBe(1);
    expect(stuntLookupColumns()).toEqual([]);
  });
});
