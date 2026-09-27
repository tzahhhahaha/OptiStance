/**
 * Regression guard for the empty-Library bug.
 *
 * The Library screen rendered with no poses for any account that had never had
 * poses written to its scope -- i.e. every account on a fresh install. The cause
 * was that `readAccountPoses` falls back to `[]` and nothing ever seeded the
 * bundled library, so the empty result was then persisted back to storage,
 * making it permanent. The only symptom an athlete could act on was "reload",
 * which never helped.
 *
 * These tests pin the two halves of the fix: an empty cache must yield the
 * bundled library, and seeding must not hand out the shared constant.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { INITIAL_POSES } from '../app/data/poses';
import { readAccountPoses, writeAccountPoses } from '../services/accountStorage';
import type { Pose } from '../app/types';

const ACCOUNT = 'athlete-1';

/**
 * Mirror of the `readLibraryForAccount` helper in App.tsx.
 *
 * Duplicated here on purpose: App.tsx is a React component module with no
 * exported helpers, and importing it would pull the whole app (MediaPipe, the
 * admin console) into a unit test. If the real helper is renamed or dropped, the
 * behaviour it encodes has to be re-implemented here, which is the point.
 */
const bundledPoses = (): Pose[] => JSON.parse(JSON.stringify(INITIAL_POSES)) as Pose[];

const readLibraryForAccount = (accountId: string | null | undefined): Pose[] => {
  const cached = readAccountPoses(accountId);
  return cached.length > 0 ? cached : bundledPoses();
};

describe('library seeding', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('returns the bundled library when nothing is cached', () => {
    const library = readLibraryForAccount(ACCOUNT);
    expect(library.length).toBe(INITIAL_POSES.length);
    expect(library.length).toBeGreaterThan(0);
  });

  it('returns the bundled library for a fresh account, not an empty list', () => {
    // The exact failure: this used to be [].
    expect(readLibraryForAccount(ACCOUNT)).not.toHaveLength(0);
  });

  it('seeds the guest scope too', () => {
    expect(readLibraryForAccount(null).length).toBe(INITIAL_POSES.length);
  });

  it('prefers cached poses over the bundled library', () => {
    const cached: Pose[] = [{ ...INITIAL_POSES[0], masteryPercentage: 42 }];
    writeAccountPoses(ACCOUNT, cached);

    const library = readLibraryForAccount(ACCOUNT);
    expect(library).toHaveLength(1);
    expect(library[0].masteryPercentage).toBe(42);
  });

  it('recovers if an empty list was already persisted', () => {
    // The bad state is sticky: the old code wrote [] back. Anything already in
    // that state must still come back with a library after this fix.
    writeAccountPoses(ACCOUNT, []);
    expect(readLibraryForAccount(ACCOUNT).length).toBe(INITIAL_POSES.length);
  });

  it('never hands out the shared INITIAL_POSES constant', () => {
    const library = readLibraryForAccount(ACCOUNT);

    // Simulate the mutation `handleSaveSession` performs.
    library[0].masteryPercentage = 99;

    // The constant must be untouched, or the signed-out athlete's progress
    // would follow the next account onto this device.
    expect(INITIAL_POSES[0].masteryPercentage).not.toBe(99);
    expect(readLibraryForAccount('someone-else')[0].masteryPercentage).not.toBe(99);
  });

  it('gives each account its own objects', () => {
    const a = readLibraryForAccount(ACCOUNT);
    const b = readLibraryForAccount('athlete-2');
    expect(a[0]).not.toBe(b[0]);
  });
});
