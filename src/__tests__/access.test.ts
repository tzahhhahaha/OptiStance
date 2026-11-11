import { describe, expect, it } from 'vitest';
import { isPoseHidden, isPoseLocked, visiblePosesFor } from '../app/utils/access';
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

  it('unlocks every level for verified athletes', () => {
    expect(isPoseLocked(makePose('p1', 'Beginner'), true)).toBe(false);
    expect(isPoseLocked(makePose('p2', 'Intermediate'), true)).toBe(false);
    expect(isPoseLocked(makePose('p3', 'Advanced'), true)).toBe(false);
  });

  it('does not let legacy admin lock data affect pose access', () => {
    const legacyLocked = { ...makePose('p1', 'Beginner'), isLocked: true } as Pose;
    expect(isPoseLocked(legacyLocked, true)).toBe(false);
    expect(isPoseLocked(legacyLocked, false)).toBe(false);
  });
});

describe('visiblePosesFor', () => {
  const poses = [
    makePose('b1', 'Beginner'),
    makePose('b2', 'Beginner'),
    makePose('i1', 'Intermediate'),
    makePose('a1', 'Advanced'),
  ];

  it('filters strictly to beginner poses for unverified accounts', () => {
    const visible = visiblePosesFor(poses, false);
    expect(visible.map((p) => p.id)).toEqual(['b1', 'b2']);
  });

  it('shows the full pose list to guests without changing practice locks', () => {
    expect(visiblePosesFor(poses, false, true)).toEqual(poses);
    expect(isPoseLocked(poses[2], false)).toBe(true);
    expect(isPoseLocked(poses[3], false)).toBe(true);
  });

  it('hides Toe Touch for all account types', () => {
    const toeTouch = makePose('toe-touch', 'Advanced');
    const renamedToeTouch = makePose('custom-id', 'Advanced');
    renamedToeTouch.name = ' Toe Touch ';

    expect(isPoseHidden(toeTouch)).toBe(true);
    expect(isPoseHidden(renamedToeTouch)).toBe(true);
    expect(visiblePosesFor([...poses, toeTouch], false, true)).not.toContain(toeTouch);
    expect(visiblePosesFor([...poses, toeTouch], true)).not.toContain(toeTouch);
  });

  it('keeps guest and verified pose counts aligned for an eight-pose library', () => {
    const availablePoses = Array.from({ length: 8 }, (_, index) =>
      makePose(`pose-${index}`, index < 3 ? 'Beginner' : 'Intermediate')
    );

    expect(visiblePosesFor(availablePoses, false, true)).toHaveLength(8);
    expect(visiblePosesFor(availablePoses, true)).toHaveLength(8);
  });

  it('shows every pose for verified athletes', () => {
    expect(visiblePosesFor(poses, true)).toHaveLength(4);
  });
});