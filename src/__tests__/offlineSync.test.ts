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
  poseId: 'p1',
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

interface StuntResult {
  data: unknown;
  error: unknown;
}

let stuntResult: StuntResult;
let existingSessionResult: unknown;
let insertResult: unknown;

const createQuery = (table: string) => {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.insert = vi.fn(() => Promise.resolve(insertResult));
  chain.maybeSingle = vi.fn(() => Promise.resolve(table === 'stunts' ? stuntResult : existingSessionResult));
  return chain;
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  setOnline(true);
  stuntResult = { data: { id: 'st1' }, error: null };
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

  it('keeps a session that fails, then drops it after 5 attempts', async () => {
    // Unknown stunt name → the upload can never succeed.
    stuntResult = { data: null, error: null };
    queuePracticeSession(makeSession('s1'), 'u1');

    for (let attempt = 1; attempt <= 4; attempt += 1) {
      await syncPendingSessions();
      expect(getPendingSessionCount()).toBe(1);
    }

    await syncPendingSessions(); // 5th failure → dropped
    expect(getPendingSessionCount()).toBe(0);
  });

  it('marks synced sessions so they are never re-queued afterwards', async () => {
    queuePracticeSession(makeSession('s1'), 'u1');
    await expect(syncPendingSessions()).resolves.toBe(1);
    expect(getPendingSessionCount()).toBe(0);
    expect(isSessionSynced('s1')).toBe(true);

    // Re-queueing the same session (e.g. a repeated login) is a no-op.
    queuePracticeSession(makeSession('s1'), 'u1');
    expect(getPendingSessionCount()).toBe(0);

    // A brand new session still queues normally.
    queuePracticeSession(makeSession('s2'), 'u1');
    expect(getPendingSessionCount()).toBe(1);
  });
});
