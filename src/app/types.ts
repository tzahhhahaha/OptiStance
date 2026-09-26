export type PoseCategory = 'Pom Motion' | 'Stunts' | 'Jumps' | 'Tumbling';
export type PoseDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';

// A pose is considered "mastered" once its mastery percentage reaches this threshold.
export const MASTERY_THRESHOLD = 80;

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
  icuScore?: number;
  measuredAngles?: Record<string, number>;
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
  id?: string;
  name: string;
  email: string;
  role: string;
  team?: string;
  avatarUrl: string;
  totalSessions: number;
  totalPracticeMinutes: number;
  masteredCount: number;
  isGuest?: boolean;
  /**
   * Email verification status. `false` means the account signed up while
   * Supabase email confirmation is enabled and has not confirmed yet — the user
   * is in the app and may verify whenever they choose. `true`/undefined means
   * verified (or a guest).
   */
  emailVerified?: boolean;
  /**
   * Athlete verification status (is_verified on the profiles/users row).
   * `true` unlocks Intermediate + Advanced poses in the gallery and camera.
   * Guests and unverified accounts default to `false`.
   */
  isVerified?: boolean;
  /**
   * Verification workflow state (verification_status on the users row).
   *   unverified - never requested; only Beginner poses
   *   pending    - request submitted, waiting on an admin
   *   verified   - approved; all poses
   *   rejected   - declined; the athlete may request again
   * `isVerified` above is derived from this by the database.
   */
  verificationStatus?: VerificationStatus;
}

/** Workflow state of an athlete's verification request. */
export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';
