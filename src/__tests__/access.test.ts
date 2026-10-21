import { describe, expect, it } from 'vitest';
import { isPoseLocked, visiblePosesFor } from '../app/utils/access';
import { Pose, PoseDifficulty } from '../app/types';

const makePose = (id: string, difficulty: PoseDifficulty): Pose =>
  ({
    id,
    name: id,
    difficulty,
    masteryPercentage: 0,
  }) as Pose;

describe('isPoseLocked', () => {
  it('locks Intermediate and Advanced poses for unverified athletes', () => {
    expect(isPoseLocked(makePose('p1', 'Beginner'), false)).toBe(false);
    expect(isPoseLocked(makePose('p2', 'Intermediate'), false)).toBe(true);
    expect(isPoseLocked(makePose('p3', 'Advanced'), false)).toBe(true);
  });

  it('unlocks everything for verified athletes when not manually locked', () => {
    expect(isPoseLocked(makePose('p1', 'Beginner'), true)).toBe(false);
    expect(isPoseLocked(makePose('p2', 'Intermediate'), true)).toBe(false);
    expect(isPoseLocked(makePose('p3', 'Advanced'), true)).toBe(false);
  });

  it('locks any pose when isLocked is true, even for verified athletes', () => {
    const beginner = { ...makePose('p1', 'Beginner'), isLocked: true } as Pose;
    const intermediate = { ...makePose('p2', 'Intermediate'), isLocked: true } as Pose;
    const advanced = { ...makePose('p3', 'Advanced'), isLocked: true } as Pose;

    expect(isPoseLocked(beginner, true)).toBe(true);
    expect(isPoseLocked(intermediate, true)).toBe(true);
    expect(isPoseLocked(advanced, true)).toBe(true);
    expect(isPoseLocked(beginner, false)).toBe(true);
  });

  it('exempts administrators: all poses remain unlocked for admins', () => {
    const lockedAdvanced = { ...makePose('p1', 'Advanced'), isLocked: true } as Pose;
    const lockedBeginner = { ...makePose('p2', 'Beginner'), isLocked: true } as Pose;

    expect(isPoseLocked(lockedAdvanced, true, true)).toBe(false);
    expect(isPoseLocked(lockedBeginner, true, true)).toBe(false);
    expect(isPoseLocked(lockedAdvanced, false, true)).toBe(false);
  });
});

describe('visiblePosesFor', () => {
  const poses = [
    makePose('b1', 'Beginner'),
    makePose('b2', 'Beginner'),
    makePose('i1', 'Intermediate'),
    makePose('a1', 'Advanced'),
  ];

  it('filters strictly to beginner poses for unverified athletes', () => {
    const visible = visiblePosesFor(poses, false);
    expect(visible.map((p) => p.id)).toEqual(['b1', 'b2']);
  });

  it('shows every pose for verified athletes', () => {
    expect(visiblePosesFor(poses, true)).toHaveLength(4);
  });
});