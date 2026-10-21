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
  videoUrl?: string;
  points: number;
  idealAngles: Record<string, string>;
  commonMistakes: string[];
  icuStandardGuideline: string;
  defaultSkeleton: {
    joints: SkeletonJoint[];
    lines: SkeletonLine[];
  };
  sampleCorrectionMessage: string;
  /** Whether the coach/admin has temporarily locked this pose from athlete practice */
  isLocked?: boolean;
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
  icuTier?: string;
  measuredAngles?: Record<string, number>;
  feedbackSummary: string;
  capturedImage?: string;
  rawImage?: string;
  baseLeg?: 'left' | 'right';
}

export interface AppSettings {
  language: string;
  darkMode: boolean;
  audioCues: boolean;
  /**
   * Whether the athlete opted in to local reminders (pending-sync nudges and
   * mastery milestones). Distinct from `audioCues`, which is the spoken
   * in-session coaching voice. The OS permission is tracked separately by
   * `getNotificationPermission()` -- this flag is our half of the answer.
   */
  notificationsEnabled: boolean;
  countdownTimer: number; // 0, 3, 5
  showSkeletonOverlay: boolean;
  autoCapture: boolean;
  cameraFacing: 'user' | 'environment';
}

export interface UserProfile {
  id?: string;
  name: string;
  email: string;
  /**
   * System role, owned by the server. NEVER athlete-editable — the admin
   * console is gated on this value, so a client-writable `role` would let any
   * athlete reveal (but not use) the admin interface. Use
   * `displayRoleLabel()` for anything shown to the athlete, and
   * `isSystemManager()` for gating.
   */
  role: string;
  /**
   * Cheer position the athlete chose for themselves ("Top Flyer", "Tumbler",
   * ...). Display-only and local, so it is safe to let the athlete edit it.
   * Falls back to the generic "Cheer Athlete" when blank.
   */
  specialty?: string;
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

/**
 * The only profile fields an athlete is allowed to change themselves.
 *
 * Deliberately narrow so that a "save profile" form cannot compile if it starts
 * writing `role`, `email`, `isVerified` or `id` — those are server-owned. Using
 * this instead of `Partial<UserProfile>` is what keeps the admin gate honest.
 */
export type EditableProfileFields = Pick<UserProfile, 'name' | 'specialty'>;
