# OptiStance — Quick Reference Guide

## 🚀 Commands

| Command | Purpose |
|---------|---------|
| `npm install` | Install project dependencies |
| `npm run dev` | Vendor MediaPipe assets and start Vite dev server (`http://localhost:5173`) |
| `npm run build` | Vendor MediaPipe assets and build production bundle to `dist/` |
| `npm run test` | Run Vitest unit and integration tests |
| `npm run lint` | Run ESLint on `src/` (`--max-warnings=0`) |
| `npm run qa` | Run quick file & script sanity check (`scripts/qa/check.js`) |
| `npm run vendor:mediapipe` | Copy MediaPipe Pose & Hands WASM/TFLite assets into `public/mediapipe/` |
| `npm run sync` | Sync `dist/` web assets with Capacitor native projects (`npx cap sync`) |
| `npm run build:android` | Vendor assets, build web bundle, sync, and open Android Studio |
| `npm run build:ios` | Vendor assets, build web bundle, sync, and open Xcode |
| `npm run create:test-user` | Create or confirm test accounts via Supabase Admin API (`scripts/create-test-user.mjs`) |

---

## 📂 Key Files & Components

### Core Application & State
| File | Purpose |
|------|---------|
| `src/app/App.tsx` | Root component, startup auth resolution, tab routing, and offline sync triggers |
| `src/app/types.ts` | Core TypeScript types (`Pose`, `PracticeSession`, `AppSettings`, `UserProfile`, `MASTERY_THRESHOLD`) |
| `src/app/data/poses.ts` | Bundled syllabus of 9 cheerleading poses (`INITIAL_POSES`) |

### Screens & Navigation
| File | Purpose |
|------|---------|
| `src/app/components/AuthScreen.tsx` | Login, registration, password reset, and guest mode entry |
| `src/app/components/Header.tsx` | Top bar displaying user avatar, mastery badge count, and drawer button |
| `src/app/components/BottomNavBar.tsx` | Bottom bar for `library`, `camera` (AI Scan), and `history` tabs |
| `src/app/components/NavigationDrawer.tsx` | Side drawer for `profile`, `settings`, `support`, `about`, and `admin` |
| `src/app/components/PoseLibraryScreen.tsx` | Pose browser with search, category filter, and verification lock state |
| `src/app/components/PoseDetailScreen.tsx` | Detailed pose view with ideal angles, tips, common mistakes, and tutorial video |
| `src/app/components/AICameraScreen.tsx` | Lazy-loaded camera view with MediaPipe Pose + Hands, audio cues, and image upload |
| `src/app/components/SessionHistoryScreen.tsx` | Practice session log and telemetry review |
| `src/app/components/ProfileScreen.tsx` | Athlete stats, profile editing, email confirmation, and verification status |
| `src/app/components/SettingsScreen.tsx` | App preferences (dark/light theme, language, audio cues, notifications, timer) |
| `src/app/components/HelpSupportScreen.tsx` | Help center and Supabase support ticket submission |
| `src/app/components/AboutScreen.tsx` | App overview and ICU compliance summary |
| `src/app/components/DarkAdminPage.tsx` | Lazy-loaded System Manager console (Users, Content, Analytics, Settings) |

### Services & Scoring
| File | Purpose |
|------|---------|
| `src/services/supabaseService.ts` | Singleton Supabase client and typed table services (`userService`, `stuntService`, `sessionService`, `ticketService`, `mediaService`, `analyticsService`) |
| `src/services/supabaseApi.ts` | Auth helpers, verification workflow RPCs, presence tracking, and session merging |
| `src/services/accountStorage.ts` | Per-account localStorage namespacing (`optistance_sessions:<userId>`, `optistance_poses:<userId>`) |
| `src/services/offlineSync.ts` | Offline practice session queue (`optistance_pending_sessions`) and background uploader |
| `src/services/poseImages.ts` | Admin upload/delete helpers for `pose-images` (5 MB) and `pose-videos` (50 MB) buckets |
| `src/app/scoring/scorePose.ts` | Biomechanical joint angle evaluation against ICU standards |
| `src/app/utils/mediapipeAssets.ts` | Local URL resolution and preflight checks for vendored MediaPipe Pose & Hands models |

---

## 🔄 Navigation & Tab Routing

`App.tsx` manages navigation via `currentTab` (`TabType | 'admin'`):

| Screen | `currentTab` Value | Reachable Via |
|--------|--------------------|---------------|
| Pose Library | `'library'` | Bottom NavBar / Drawer |
| AI Camera Scan | `'camera'` | Bottom NavBar center button / "Practice Pose" CTA |
| Session History | `'history'` | Bottom NavBar / Drawer |
| Athlete Profile | `'profile'` | Header avatar / Drawer |
| Preferences | `'settings'` | Navigation Drawer sub-screen |
| Help & Support | `'support'` | Navigation Drawer sub-screen |
| About | `'about'` | Navigation Drawer sub-screen |
| Admin Console | `'admin'` | Navigation Drawer (`SystemManager` role only) |

---

## 📊 Key Data Structures (`src/app/types.ts`)

```typescript
export type PoseCategory = 'Pom Motion' | 'Stunts' | 'Jumps' | 'Tumbling';
export type PoseDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';
export const MASTERY_THRESHOLD = 80;

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
```

---

## 🎯 MediaPipe Offline Configuration

MediaPipe Pose and Hands load strictly from bundled assets in `public/mediapipe/`:

```typescript
import { mediapipeLocateFile, mediapipeHandsLocateFile } from '../utils/mediapipeAssets';

const pose = new MediaPipePose({
  locateFile: mediapipeLocateFile, // '/mediapipe/pose/<file>'
});

pose.setOptions({
  modelComplexity: 0, // Must be 0 to match vendored pose_landmark_lite.tflite
  smoothLandmarks: true,
  enableSegmentation: false,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
});

const hands = new MediaPipeHands({
  locateFile: mediapipeHandsLocateFile, // '/mediapipe/hands/<file>'
});
```

---

**Last Updated**: October 27, 2026
