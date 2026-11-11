import type { PracticeSession } from '../types';

export interface TodayPracticeSummary {
  sessionCount: number;
  poses: Array<{ poseId: string; poseName: string; attempts: number }>;
  bestScore: number;
  averageScore: number;
  practiceSeconds: number;
}

const isSameLocalDay = (timestamp: string, date: Date): boolean => {
  const sessionDate = new Date(timestamp);
  return (
    !Number.isNaN(sessionDate.getTime()) &&
    sessionDate.getFullYear() === date.getFullYear() &&
    sessionDate.getMonth() === date.getMonth() &&
    sessionDate.getDate() === date.getDate()
  );
};

export function getTodayPracticeSummary(
  sessions: PracticeSession[],
  date = new Date()
): TodayPracticeSummary {
  const uniqueSessions = Array.from(new Map(sessions.map((session) => [session.id, session])).values());
  const todaySessions = uniqueSessions.filter((session) => isSameLocalDay(session.timestamp, date));
  const posesById = new Map<string, { poseId: string; poseName: string; attempts: number }>();

  for (const session of todaySessions) {
    const pose = posesById.get(session.poseId);
    if (pose) {
      pose.attempts += 1;
    } else {
      posesById.set(session.poseId, {
        poseId: session.poseId,
        poseName: session.poseName,
        attempts: 1,
      });
    }
  }

  const totalScore = todaySessions.reduce((total, session) => total + session.accuracyScore, 0);

  return {
    sessionCount: todaySessions.length,
    poses: Array.from(posesById.values()),
    bestScore: todaySessions.reduce((best, session) => Math.max(best, session.accuracyScore), 0),
    averageScore: todaySessions.length ? Math.round(totalScore / todaySessions.length) : 0,
    practiceSeconds: todaySessions.reduce(
      (total, session) =>
        total + (Number.isFinite(session.durationSeconds) ? Math.max(0, session.durationSeconds) : 0),
      0
    ),
  };
}
