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

  it('unlocks everything for verified athletes', () => {
    expect(isPoseLocked(makePose('p1', 'Beginner'), true)).toBe(false);
    expect(isPoseLocked(makePose('p2', 'Intermediate'), true)).toBe(false);
    expect(isPoseLocked(makePose('p3', 'Advanced'), true)).toBe(false);
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