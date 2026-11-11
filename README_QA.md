# Web, Android & iOS QA Checklist

## Preconditions
- Node.js 20.x, 22.x, or 24+ and npm installed.
- Run `npm install` and configure `.env.local` from `.env.example` (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`).
- Run automated checks first:
  ```bash
  npm run qa
  npm run lint
  npm test -- --run
  ```

## Web QA
- Run `npm run dev` (`predev` automatically vendors MediaPipe assets into `public/mediapipe/`) and open `http://localhost:5173`.
- Test **Continue as Guest** as well as **Sign Up / Log In** on `AuthScreen`.
- Verify that unverified/guest users can practice **Beginner** poses (`T-Motion`, `High V`, `Low V`, `Half-T`) and see the verification lock on **Intermediate** and **Advanced** poses.
- On `ProfileScreen`, test **Request Verification** and confirm Intermediate/Advanced poses unlock immediately.
- Open `AICameraScreen` (via the center **AI Scan** button in `BottomNavBar` or **Practice Pose** on `PoseDetailScreen`).
- Verify camera permission prompt, live 33-point body skeleton overlay, 21-point hand landmark markers, framing/lighting indicator, and real-time accuracy ring.
- Test **Upload Photo** inside `AICameraScreen` and verify the image quality report, pose evaluation, and branded scorecard download (`createBrandedScorecard`).
- The web version requires an internet connection. Offline browser/PWA access and offline AI inference are not supported; do not treat cached app-shell or model behavior as a web requirement.
- Restore connectivity after a disconnection and verify the web app recovers and any supported pending session sync completes.

## Android (Capacitor)
- Run `npm run build:android` to vendor MediaPipe assets, build `dist/`, sync Capacitor, and open Android Studio.
- Run on an emulator or physical device.
- Verify native camera permissions, haptic feedback, local notifications, and offline pose/hand landmark detection with Airplane Mode enabled.

## iOS (Capacitor)
- On macOS, run `npm run build:ios` to open Xcode.
- Configure signing, run on a physical device, and verify camera permissions, safe-area insets, and offline pose/hand detection.

## Security QA
- Ensure `.env.local` and `.env.admin.local` are git-ignored and never committed.
- Confirm `SUPABASE_SERVICE_ROLE_KEY` is never prefixed with `VITE_`.
- Sign out of one account and sign in as another on the same device; verify that practice history and mastery scores do not carry over (`src/services/accountStorage.ts`).
