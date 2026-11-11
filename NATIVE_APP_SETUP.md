# OptiStance Native App Setup Guide (Capacitor)

OptiStance supports both **Web/PWA browsers** and **native iOS & Android builds** packaged with Capacitor 8 (`appId: com.optistance.cheerpose`, `appName: OptiStance`).

## Prerequisites

### General
- Node.js 20.x, 22.x, or 24+ and npm
- Run `npm install` at the repository root

### Android Development
- Android Studio installed
- Android SDK (API Level 24+; the app's configured minSdk is 24)
- `JAVA_HOME` configured (JDK 17+)

### iOS Development
- macOS with Xcode 15+
- CocoaPods (`sudo gem install cocoapods`)

---

## Quick Start

### 1. Initialize Platforms (If Not Already Present)

The `android/` and `ios/` directories are already included in the repository. If you ever need to re-add them:
```bash
npm run cap:add:android
npm run cap:add:ios
```

### 2. Build, Sync, and Open Native IDE

Both scripts automatically run `npm run vendor:mediapipe` (bundling the offline MediaPipe Pose & Hands models into `public/mediapipe/`), run `vite build`, sync `dist/` to the native project (`npx cap sync`), and launch the native IDE:

**Android:**
```bash
npm run build:android
# Or alias: npm run dev:android
```

**iOS:**
```bash
npm run build:ios
# Or alias: npm run dev:ios
```

### 3. Sync Web Changes Without Opening IDE

```bash
npm run build
npm run sync
```

---

## Native & Offline Capabilities

- **Offline MediaPipe Inference**: `scripts/vendor-mediapipe.mjs` copies the Pose (`pose_landmark_lite.tflite`) and Hands (`hand_landmark_lite.tflite`) WASM/TFLite runtime into `public/mediapipe/` before every build so pose detection works with zero network connectivity.
- **Camera (`@capacitor/camera` + WebRTC)**: `src/app/utils/device.ts` (`isCapacitorNative`) coordinates permissions and camera selection across native WebViews and desktop/mobile browsers.
- **Haptics (`@capacitor/haptics`)**: `src/app/utils/haptics.ts` provides tactile feedback on pose lock, countdowns, and mastery milestones.
- **Local Notifications (`@capacitor/local-notifications`)**: `src/app/utils/notifications.ts` schedules mastery milestone alerts and offline sync reminders.
- **App Lifecycle (`@capacitor/app`)**: Handles hardware back button navigation and background/foreground transitions.

---

## Generating App Icons

To regenerate native Android and iOS icons from `resources/`:
```bash
npm run icons
```

---

## Building for Production Release

### Android Release Bundle (`.aab`):
```bash
npm run build
npm run sync
cd android
./gradlew bundleRelease
# Output: android/app/build/outputs/bundle/release/app-release.aab
```

### iOS Release Archive:
1. Run `npm run build:ios`
2. In Xcode, select **Any iOS Device (arm64)**
3. Choose **Product** → **Archive** and distribute via **App Store Connect**

---

*Last updated: October 27, 2026*
