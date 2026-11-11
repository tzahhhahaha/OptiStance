# OptiStance Engineering & Design System Guidelines

## 1. Architecture & Code Organization
- **Single Supabase Client**: All database queries must go through the singleton client and typed services in `src/services/supabaseService.ts` and `src/services/supabaseApi.ts`.
- **Per-Account Local Storage**: Never read or write athlete practice sessions or pose mastery under global `localStorage` keys. Always use `src/services/accountStorage.ts` (`readAccountSessions`, `writeAccountSessions`, `readAccountPoses`, `writeAccountPoses`).
- **Offline-First MediaPipe**:
  - MediaPipe Pose (`@mediapipe/pose`) and Hands (`@mediapipe/hands`) must load exclusively from bundled local assets via `src/app/utils/mediapipeAssets.ts` (`/mediapipe/pose/` and `/mediapipe/hands/`).
  - Never introduce runtime CDN URLs (`cdn.jsdelivr.net`, `unpkg.com`).
  - Keep `modelComplexity: 0` in `AICameraScreen.tsx` and `poseWorker.ts` to match the bundled `pose_landmark_lite.tflite` model.
- **Lazy Loading**: Keep heavy screens (`AICameraScreen.tsx` and `DarkAdminPage.tsx`) lazy-loaded via `React.lazy` in `src/app/App.tsx`.

## 2. Security & Access Control
- **Server-Owned Fields**: `role`, `isVerified`, `verificationStatus`, `email`, and `id` on `UserProfile` are server-owned. Client profile forms may only update `EditableProfileFields` (`name` and `specialty`).
- **Verification Gating**: Use `isPoseLocked()` and `visiblePosesFor()` from `src/app/utils/access.ts` to gate `Intermediate` and `Advanced` poses for unverified users and guests.
- **Secrets**: Never prefix `SUPABASE_SERVICE_ROLE_KEY` with `VITE_`.

## 3. UI & Design System
- **Theme Support**: The athlete app supports both Dark Mode (`#050507` base, `.dark-theme`) and Light Mode (`#F4F6FB` base, `.light-theme`) toggled on the root wrapper in `App.tsx`.
- **Admin Console Isolation**: `DarkAdminPage.tsx` is portalled directly to `document.body` so `.light-theme` descendant overrides never bleed into the dark-only admin interface.
- **Navigation Layout**:
  - `BottomNavBar.tsx` provides 3 primary destinations: **Library** (`'library'`), center prominent **AI Scan** button (`'camera'`), and **History** (`'history'`).
  - Secondary screens (`'profile'`, `'settings'`, `'support'`, `'about'`, `'admin'`) are accessed via `Header.tsx` and `NavigationDrawer.tsx`.
