# 👨‍💻 OptiStance Developer Onboarding Guide

Welcome to the **OptiStance** development team! This guide covers setting up the project, understanding the architecture, and making changes safely.

---

## 🎯 Step 1: Environment Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment Variables**
   Copy `.env.example` to `.env.local` and add your Supabase project credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
   ```
   *(If you do not configure `.env.local`, you can still explore the app using **Continue as Guest** mode, which runs locally with bundled poses and offline MediaPipe models.)*

3. **Start the Development Server**
   ```bash
   npm run dev
   ```
   `predev` automatically runs `scripts/vendor-mediapipe.mjs` to copy the MediaPipe Pose and Hands WASM/TFLite files into `public/mediapipe/`. Open `http://localhost:5173`.

---

## 🏗️ Step 2: Architecture Overview

### Core Entry & State (`src/app/App.tsx`)
- **Startup Auth Resolution**: Waits (up to `4000ms`) for `resolveStartupAuth()` in `src/services/supabaseApi.ts` to verify any active Supabase session before dismissing `LoadingScreen.tsx`.
- **Per-Account Isolation**: `src/services/accountStorage.ts` namespaces `localStorage` keys (`optistance_sessions:<userId>`, `optistance_poses:<userId>`) so switching accounts on a shared device never leaks history or mastery progress.
- **Lazy-Loaded Chunks**: `AICameraScreen.tsx` and `DarkAdminPage.tsx` are code-split via `React.lazy()` so the initial bundle stays fast.

### Pose Syllabus & Cloud Overlay
- **Bundled Poses**: `src/app/data/poses.ts` exports `INITIAL_POSES` (9 poses across `Pom Motion`, `Stunts`, and `Jumps`).
- **Admin Syllabus Sync**: When signed in, `App.tsx` fetches active and archived rows from the Supabase `stunts` table, overlays admin-uploaded reference images (`pose-images` bucket), hides archived poses, and merges any newly created stunts into `displayPoses`.
- **Verification Gating**: `src/app/utils/access.ts` (`isPoseLocked`, `visiblePosesFor`) restricts `Intermediate` and `Advanced` poses to verified athletes (`user.isVerified === true`) or System Managers (`isSystemManager(user)`).

### Real-time AI Camera & Scoring (`src/app/components/AICameraScreen.tsx`)
- **Offline MediaPipe Models**: `src/app/utils/mediapipeAssets.ts` resolves model files from `/mediapipe/pose/` and `/mediapipe/hands/`. Never use an external CDN (`cdn.jsdelivr.net` or `unpkg.com`); `src/__tests__/mediapipeOffline.test.ts` enforces this.
- **Model Complexity**: Both `AICameraScreen.tsx` and `src/workers/poseWorker.ts` must use `modelComplexity: 0` to match the bundled `pose_landmark_lite.tflite` file (enforced by `src/__tests__/mediapipeModelAssets.test.ts`).
- **Biomechanical Scoring**: `src/app/scoring/scorePose.ts` and `src/app/scoring/standards.ts` compute joint angles (`src/app/scoring/angles.ts`) and evaluate ICU compliance.

---

## 🛠️ Common Development Tasks

### Adding or Modifying a Bundled Pose
1. Open `src/app/data/poses.ts` and update `INITIAL_POSES` (adhering to the `Pose` interface in `src/app/types.ts`).
2. Add or update the corresponding biomechanical joint angle standard in `src/app/scoring/standards.ts`.
3. Add a command cue in `getPoseCommandCue()` inside `src/app/components/AICameraScreen.tsx`.
4. Place the bundled reference image in `public/poses/<pose-id>.jpg` and register it in `src/app/utils/poseReferenceImages.ts`.

### Working with Supabase & RLS
- All raw Supabase queries belong in `src/services/supabaseService.ts`.
- App-facing camelCase wrappers and auth/RPC helpers belong in `src/services/supabaseApi.ts`.
- Database migrations live in `supabase/migrations/`. Never expose `SUPABASE_SERVICE_ROLE_KEY` in a `VITE_*` variable; keep it only in `.env.admin.local` for CLI scripts like `scripts/create-test-user.mjs`.

### Editing Profile Fields Safely
- `EditableProfileFields` in `src/app/types.ts` is intentionally restricted to `Pick<UserProfile, 'name' | 'specialty'>`. Server-owned fields (`role`, `email`, `isVerified`, `id`) must never be made client-editable.

---

## 🧪 Testing & Verification

Before opening a pull request, run the full verification suite:

```bash
# Run unit & integration tests (Vitest)
npm test -- --run

# Run ESLint (zero warnings allowed)
npm run lint

# Build production bundle
npm run build
```

Key test files in `src/__tests__/`:
- `mediapipeOffline.test.ts` & `mediapipeModelAssets.test.ts` — Ensures offline MediaPipe assets exist and match `modelComplexity: 0`.
- `scoringEngine.test.ts` — Tests biomechanical scoring and ICU compliance evaluation.
- `accountIsolation.test.ts` & `offlineSync.test.ts` — Verifies per-account storage scoping and offline queue syncing.
- `access.test.ts` & `stuntLockAndArchive.test.ts` — Verifies verification gating and stunt archiving.

---

*Last updated: October 27, 2026*
