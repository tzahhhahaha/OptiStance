# OptiStance Native App Setup Guide

This project is now configured as a **pure native mobile app** for iOS and Android using Capacitor. Web browser support has been removed.

## Prerequisites

### For Both iOS and Android:
```bash
npm install -g @capacitor/cli
npm install
```

### For Android Development:
- Android Studio installed
- Android SDK (API Level 21+)
- JAVA_HOME environment variable configured

### For iOS Development:
- Xcode 14+
- macOS 12+
- CocoaPods (`sudo gem install cocoapods`)

## Quick Start

### 1. Initialize Platforms (First Time Only)

**Android:**
```bash
npm run cap:add:android
```

**iOS:**
```bash
npm run cap:add:ios
```

### 2. Build and Run

**For Android:**
```bash
npm run build:android
# This builds the app and opens Android Studio
# Select your device/emulator and run
```

**For iOS:**
```bash
npm run build:ios
# This builds the app and opens Xcode
# Select your device/simulator and press Run (Cmd+R)
```

### 3. Development Workflow

After initial setup, use these commands:

**Sync code changes to native projects:**
```bash
npm run sync
```

**Build and open in IDE:**
```bash
npm run dev:android    # Opens Android Studio
npm run dev:ios        # Opens Xcode
```

**Build only (without opening IDE):**
```bash
npm run build
```

## Project Structure

```
├── src/                          # React source code
│   ├── app/
│   │   └── App.tsx              # Main app component
│   ├── services/
│   │   ├── supabaseService.ts   # Backend API
│   │   └── supabaseApi.ts       # Database operations
│   └── styles/                   # Mobile-optimized styles
├── android/                       # Android native code (auto-generated)
├── ios/                          # iOS native code (auto-generated)
├── capacitor.config.json         # Native app configuration
├── package.json                  # Dependencies and scripts
└── vite.config.ts               # Build configuration
```

## Native Features Enabled

- **Camera Access**: Pose detection and video capture
- **Storage**: Local data persistence
- **Back Button**: Hardware back button handling (Android)
- **App Lifecycle**: Pause/resume event handling
- **Full Screen**: Edge-to-edge display support (iOS notch handling)

## Building for Production

### Android Release Build:
```bash
cd android
./gradlew bundleRelease
# Output: android/app/build/outputs/bundle/release/app-release.aab
```

### iOS Release Build:
```bash
# In Xcode:
# 1. Select "Any iOS Device (arm64)"
# 2. Product → Archive
# 3. Distribute using "App Store Connect"
```

## Debugging

### Android:
- Chrome DevTools: `chrome://inspect` while app is running
- Android Studio: Logcat panel shows app logs

### iOS:
- Xcode: Console shows app logs
- Safari DevTools: Develop → [Device] → Your App

## Important Notes

- **No Web Support**: This is now a mobile-only app. Web browser support has been removed.
- **App IDs**: Update `capacitor.config.json` with your unique app ID before publishing
- **Version Bumping**: Update version in `capacitor.config.json` and app build settings for releases
- **Plugins**: All Capacitor plugins are managed via `npm install @capacitor/[plugin-name]`

## Troubleshooting

**"Pod install failed" (iOS):**
```bash
cd ios
rm -rf Pods Podfile.lock
pod install
cd ..
```

**"Gradle sync failed" (Android):**
```bash
cd android
./gradlew clean
cd ..
npm run sync
```

**App not showing latest changes:**
```bash
npm run sync
# Then rebuild in Android Studio or Xcode
```

## Next Steps

1. Update the app ID in `capacitor.config.json` with your organization's ID
2. Add app icons and splash screens in `android/app/src/main/res` and `ios/App/App/Assets.xcassets`
3. Configure signing certificates for iOS (Apple Developer account required)
4. Set up Keystore for Android signing
5. Test on physical devices before publishing to app stores

For more info: https://capacitorjs.com/docs
