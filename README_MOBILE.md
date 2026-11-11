# Mobile Packaging Quick Reference (Capacitor)

OptiStance is pre-configured for iOS and Android using Capacitor (`capacitor.config.json` with `appId: com.optistance.cheerpose` and `appName: OptiStance`).

## 1. Install Dependencies

```bash
npm install
```

## 2. Configure Environment

Create `.env.local` (see `.env.example`) with your Supabase credentials (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`) to enable cloud authentication, syllabus updates, and session syncing. Without `.env.local`, the app runs in local/guest mode.

## 3. Build & Open Native Projects

The following scripts automatically vendor the offline MediaPipe Pose & Hands models (`npm run vendor:mediapipe`), build the web bundle (`vite build`), sync Capacitor (`npx cap sync`), and open the native IDE:

```bash
# Android (opens Android Studio)
npm run build:android

# iOS (requires macOS + Xcode)
npm run build:ios
```

To sync web changes without launching the IDE:
```bash
npm run build
npm run sync
```

For full details, see [NATIVE_APP_SETUP.md](NATIVE_APP_SETUP.md).
