import { describe, expect, it } from 'vitest';
import type { PracticeSession } from '../app/types';
import { getTodayPracticeSummary } from '../app/utils/todayPracticeSummary';

const makeSession = (
  id: string,
  poseId: string,
  poseName: string,
  timestamp: string,
  accuracyScore: number,
  durationSeconds: number
): PracticeSession => ({
  id,
  poseId,
  poseName,
  timestamp,
  accuracyScore,
  durationSeconds,
  corrections: [],
  feedbackSummary: '',
});

describe('getTodayPracticeSummary', () => {
  it('aggregates today sessions and groups attempts by pose', () => {
    const today = new Date(2026, 9, 27, 12);
    const repeatedSession = makeSession(
      '2',
      'high-v',
      'High V',
      new Date(2026, 9, 27, 10).toISOString(),
      90,
      120
    );
    const sessions = [
      makeSession('1', 'high-v', 'High V', new Date(2026, 9, 27, 9).toISOString(), 80, 60),
      repeatedSession,
      repeatedSession,
      makeSession('3', 'liberty', 'Liberty', new Date(2026, 9, 27, 11).toISOString(), 70, 30),
      makeSession('4', 'low-v', 'Low V', new Date(2026, 9, 26, 23, 59).toISOString(), 100, 300),
    ];

    expect(getTodayPracticeSummary(sessions, today)).toEqual({
      sessionCount: 3,
      poses: [
        { poseId: 'high-v', poseName: 'High V', attempts: 2 },
        { poseId: 'liberty', poseName: 'Liberty', attempts: 1 },
      ],
      bestScore: 90,
      averageScore: 80,
      practiceSeconds: 210,
    });
  });

  it('returns zeroed metrics when there are no sessions today', () => {
    const today = new Date(2026, 9, 27, 12);
    const yesterday = makeSession(
      '1',
      'high-v',
      'High V',
      new Date(2026, 9, 26, 12).toISOString(),
      80,
      60
    );

    expect(getTodayPracticeSummary([yesterday], today)).toEqual({
      sessionCount: 0,
      poses: [],
      bestScore: 0,
      averageScore: 0,
      practiceSeconds: 0,
    });
  });
});
