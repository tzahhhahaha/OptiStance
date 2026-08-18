export type PoseCategory = 'Pom Motion' | 'Stunts' | 'Jumps' | 'Tumbling';
export type PoseDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export interface PracticeTip {
  text: string;
  type: 'check' | 'warning';
}

export interface SkeletonJoint {
  id: string;
  name: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  status: 'correct' | 'error' | 'warning';
  angle?: number;
  expectedAngle?: number;
}

export interface SkeletonLine {
  from: string;
  to: string;
  status: 'correct' | 'error';
}

export interface Pose {
  id: string;
  name: string;
  category: PoseCategory;
  difficulty: PoseDifficulty;
  description: string;
  practiceTips: PracticeTip[];
  masteryPercentage: number;
  imageUrl: string;
  points: number;
  idealAngles: Record<string, string>;
  commonMistakes: string[];
  icuStandardGuideline: string;
  defaultSkeleton: {
    joints: SkeletonJoint[];
    lines: SkeletonLine[];
  };
  sampleCorrectionMessage: string;
}

export interface PracticeSession {
  id: string;
  poseId: string;
  poseName: string;
  timestamp: string;
  accuracyScore: number;
  durationSeconds: number;
  corrections: string[];
  icuScore: number;
  feedbackSummary: string;
}

export interface AppSettings {
  language: string;
  darkMode: boolean;
  audioCues: boolean;
  countdownTimer: number; // 0, 3, 5
  showSkeletonOverlay: boolean;
  autoCapture: boolean;
  cameraFacing: 'user' | 'environment';
}

export interface UserProfile {
  name: string;
  email: string;
  role: string;
  team?: string;
  avatarUrl: string;
  totalSessions: number;
  totalPracticeMinutes: number;
  masteredCount: number;
}
