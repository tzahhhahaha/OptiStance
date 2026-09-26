/// <reference types="node" />
import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  accountScope,
  clearAccountData,
  migrateLegacyAccountData,
  readAccountPoses,
  readAccountSessions,
  readAccountSyncedIds,
  scopedKey,
  writeAccountPoses,
  writeAccountSessions,
  writeAccountSyncedIds,
} from '../services/accountStorage';
import type { PracticeSession, Pose } from '../app/types';

/**
 * Practice history and pose mastery used to be cached under fixed localStorage
 * keys, so the next account to sign in on a device inherited the previous
 * account's data — and handleAuthSuccess pushed that inherited history into the
 * new account's database record. These tests pin the per-account scoping closed.
 */

const makeSession = (id: string, timestamp = '2026-01-01T00:00:00.000Z'): PracticeSession => ({
  id,
  poseId: 'p1',
  poseName: 'High V',
  timestamp,
  accuracyScore: 85,
  durationSeconds: 120,
  corrections: ['knee straight'],
  measuredAngles: { knee: 178 },
  feedbackSummary: 'Great form',
});

// Only the fields this suite reads back are needed; the full Pose shape is
// irrelevant to key scoping.
const makePose = (id: string): Pose =>
  ({ id, name: 'High V', masteryPercentage: 40 }) as unknown as Pose;

beforeEach(() => {
  localStorage.clear();
});

describe('scoping', () => {
  it('gives every account a distinct key', () => {
    expect(scopedKey('optistance_sessions', 'u1')).not.toBe(
      scopedKey('optistance_sessions', 'u2')
    );
  });

  it('uses a guest scope when nobody is signed in', () => {
    expect(accountScope(undefined)).toBe('guest');
    expect(accountScope(null)).toBe('guest');
    expect(accountScope('')).toBe('guest');
    expect(accountScope('u1')).toBe('u1');
  });

  it('never writes account data back to an unscoped key', () => {
    writeAccountSessions('u1', [makeSession('s1')]);
    expect(localStorage.getItem('optistance_sessions')).toBeNull();
    expect(localStorage.getItem(scopedKey('optistance_sessions', 'u1'))).not.toBeNull();
  });
});

describe('isolation between accounts', () => {
  it('does not show one athlete the other athlete’s history', () => {
    writeAccountSessions('u1', [makeSession('a1'), makeSession('a2')]);
    writeAccountSessions('u2', [makeSession('b1')]);

    expect(readAccountSessions('u1').map((s) => s.id)).toEqual(['a1', 'a2']);
    expect(readAccountSessions('u2').map((s) => s.id)).toEqual(['b1']);
  });

  it('gives a brand new account an empty history on a device that has data', () => {
    writeAccountSessions('u1', [makeSession('a1')]);
    // u3 has never used this device. It must not inherit u1's practice history.
    expect(readAccountSessions('u3')).toEqual([]);
  });

  it('keeps pose mastery separate per account', () => {
    writeAccountPoses('u1', [makePose('u1-pose')]);
    expect(readAccountPoses('u1')).toHaveLength(1);
    expect(readAccountPoses('u2')).toEqual([]);
  });

  it('keeps the synced registry separate per account', () => {
    const u1 = readAccountSyncedIds('u1');
    u1.add('s1');
    writeAccountSyncedIds('u1', u1);

    expect(readAccountSyncedIds('u1').has('s1')).toBe(true);
    expect(readAccountSyncedIds('u2').has('s1')).toBe(false);
  });

  it('clears only the named account', () => {
    writeAccountSessions('u1', [makeSession('a1')]);
    writeAccountSessions('u2', [makeSession('b1')]);

    clearAccountData('u1');

    expect(readAccountSessions('u1')).toEqual([]);
    expect(readAccountSessions('u2').map((s) => s.id)).toEqual(['b1']);
  });
});

describe('legacy migration', () => {
  it('adopts pre-namespacing history for the account using the app now', () => {
    localStorage.setItem(
      'optistance_sessions',
      JSON.stringify([makeSession('old-1'), makeSession('old-2')])
    );

    const migrated = migrateLegacyAccountData('u1');

    expect(migrated).toContain('optistance_sessions');
    expect(readAccountSessions('u1').map((s) => s.id)).toEqual(['old-1', 'old-2']);
    // The global key is gone, so nothing can read it unscoped again.
    expect(localStorage.getItem('optistance_sessions')).toBeNull();
  });

  it('runs only once', () => {
    localStorage.setItem('optistance_sessions', JSON.stringify([makeSession('old-1')]));
    migrateLegacyAccountData('u1');

    writeAccountSessions('u1', [makeSession('new-1')]);

    expect(migrateLegacyAccountData('u1')).toEqual([]);
    expect(readAccountSessions('u1').map((s) => s.id)).toEqual(['new-1']);
  });

  it('never overwrites an account that already has its own data', () => {
    writeAccountSessions('u1', [makeSession('scoped-1')]);
    localStorage.setItem('optistance_sessions', JSON.stringify([makeSession('legacy-1')]));

    migrateLegacyAccountData('u1');

    expect(readAccountSessions('u1').map((s) => s.id)).toEqual(['scoped-1']);
    expect(localStorage.getItem('optistance_sessions')).toBeNull();
  });

  it('attributes history to the guest scope when nobody is signed in', () => {
    localStorage.setItem('optistance_sessions', JSON.stringify([makeSession('g1')]));
    migrateLegacyAccountData(undefined);
    expect(readAccountSessions(undefined).map((s) => s.id)).toEqual(['g1']);
  });

  it('survives a corrupt cache', () => {
    localStorage.setItem('optistance_sessions', '{not json');
    expect(() => migrateLegacyAccountData('u1')).not.toThrow();
    expect(readAccountSessions('u1')).toEqual([]);
  });
});

describe('App.tsx wiring', () => {
  const app = readFileSync('src/app/App.tsx', 'utf8');

  it('reads cached sessions from the account scope on login, not from state', () => {
    // The old line was `sessions.forEach((s) => queuePracticeSession(s, id))`,
    // which re-queued whatever the previous account left behind.
    expect(app).not.toMatch(/sessions\.forEach\(\s*\(session\)\s*=>/);
    expect(app).toMatch(/readAccountSessions\(authenticatedUser\.id\)/);
  });

  it('no longer writes sessions to an unscoped key', () => {
    expect(app).not.toMatch(/setItem\('optistance_sessions'/);
    expect(app).not.toMatch(/setItem\('optistance_poses'/);
  });

  it('clears the account cache on sign-out', () => {
    expect(app).toMatch(/clearAccountData\(accountId\)/);
  });

  it('never persists the outgoing account history into the incoming account scope', () => {
    // React renders the new user one commit before the reload effect swaps the
    // cache. Without a guard the persist effect runs in that window and copies
    // the previous account's sessions into the new account's key.
    expect(app).toMatch(/loadedAccountRef/);
    expect(app).toMatch(/if \(loadedAccountRef\.current !== accountId\) return;/);
  });

  it('claims the scope in the reload effect, not the persist effect', () => {
    const claimIndex = app.indexOf('loadedAccountRef.current = accountId;');
    const reloadIndex = app.indexOf('migrateLegacyAccountData(accountId)');
    expect(claimIndex).toBeGreaterThan(-1);
    expect(reloadIndex).toBeGreaterThan(claimIndex);
  });

  it('derives the profile totals from the session list', () => {
    expect(app).toMatch(/sessionTotals/);
    expect(app).not.toMatch(/totalSessions: \(prevUser\.totalSessions \|\| 0\) \+ 1/);
  });
});
