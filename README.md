# 🤸 OptiStance — Cheerleading Pose Trainer

A mobile-first web and Capacitor native application (iOS & Android) that uses AI-powered biomechanical pose and hand detection to help cheerleaders perfect their poses, track practice sessions, and improve technique through real-time ICU-aligned feedback. Offline AI inference and session queueing are supported in the installed native apps; the web version requires an internet connection.

![Status](https://img.shields.io/badge/status-active-success.svg)
![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

---

## ✨ Features

### 🎯 Real-time Biomechanical Pose & Hand Detection
- **MediaPipe Pose Integration** - 33-point body landmark tracking (`modelComplexity: 0` lite model)
- **MediaPipe Hands Integration** - 21-point hand landmark tracking for up to two hands
- **100% Offline Inference** - Pose and hand WASM/TFLite assets are vendored locally into `public/mediapipe/` (`scripts/vendor-mediapipe.mjs`); no external CDN required at runtime
- **Live Feedback & Audio Coaching** - Real-time joint angle telemetry, ICU compliance scoring, framing/lighting checks, and spoken coaching cues
- **Pose-Specific Training Drills** - Browse drills from each pose detail page and get an offline recommendation after a scored attempt based on the largest joint deviation
- **Image Upload & Branded Scorecards** - Analyze static photos and export shareable scorecards with skeleton overlays

### 📚 Comprehensive Pose Syllabus
- **9 Bundled Cheerleading Poses**:
  - **Beginner**: `T-Motion`, `High V`, `Low V`, `Half-T`
  - **Intermediate**: `Liberty`, `Arabesque`
  - **Advanced**: `Toe Touch`, `Heel Stretch`, `Scorpion`
- **Admin-Managed Cloud Syllabus** - System Managers can create, edit, archive, restore, and upload custom reference images (`pose-images`) and tutorial videos (`pose-videos` / YouTube) via the Admin Console
- **Verification Gating** - Guests and unverified accounts access Beginner poses; verified athletes unlock Intermediate and Advanced poses in real time

### 📊 Progress Analytics & Offline Sync
- **Per-Account Scoped Storage** - Local cache (`src/services/accountStorage.ts`) isolates practice history and mastery per user ID
- **Native Offline Queue & Cloud Sync** - Sessions recorded offline in the installed iOS/Android apps are queued (`src/services/offlineSync.ts`) and automatically synced to Supabase when connectivity returns; web access requires internet
- **Mastery & Milestones** - Poses reach mastery at `80%+` accuracy (`MASTERY_THRESHOLD`), with local notifications for milestones and pending sync reminders

### 🔐 Authentication & Role-Based Security
- **Supabase Auth + RLS** - Email/password sign-up, login, frictionless onboarding, and "Continue as Guest" mode
- **System Manager Console** - Dedicated dark-themed Admin Console (`DarkAdminPage.tsx`) for managing users, stunt syllabus, ICU joint angle standards, analytics, and support tickets

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20.x, 22.x, or 24+ (Node versions supported by the installed Vitest release)
- npm or pnpm

### Installation & Local Development

```bash
# Install dependencies
npm install

# Configure environment variables (optional for guest/offline mode, required for cloud features)
cp .env.example .env.local

# Start development server (automatically runs vendor:mediapipe via predev)
npm run dev

# Open browser
# Navigate to http://localhost:5173
```

### Native Mobile Builds (Capacitor)

```bash
# Build web assets, vendor MediaPipe, sync Capacitor, and open IDE
npm run build:android
npm run build:ios
```

See [NATIVE_APP_SETUP.md](NATIVE_APP_SETUP.md) and [SUPABASE_SETUP.md](SUPABASE_SETUP.md) for full platform and backend configuration details.

---

## 🏗️ Tech Stack

### Frontend & Mobile
- **React 18.3.1** + **TypeScript 5.9**
- **Tailwind CSS 4.1** (`@tailwindcss/vite`)
- **Vite 6.3** - Build tool with code-splitting for `AICameraScreen` and `DarkAdminPage`
- **Capacitor 8** - Android & iOS native runtime (`@capacitor/camera`, `@capacitor/haptics`, `@capacitor/local-notifications`, `@capacitor/app`)

### AI / Computer Vision
- **`@mediapipe/pose` (0.5)** - 33-point body landmark detection
- **`@mediapipe/hands` (0.4)** - 21-point hand tracking
- **`@mediapipe/drawing_utils` & `@mediapipe/camera_utils`**

### Backend & Data
- **Supabase (`@supabase/supabase-js` 2.x)** - PostgreSQL database, Authentication, Row-Level Security (RLS), Realtime subscriptions, and Storage (`pose-images`, `pose-videos`)

### UI & Testing
- **Lucide React** - Icons
- **Radix UI / shadcn/ui** - Accessible UI primitives
- **Recharts** - Analytics charts
- **Vitest + React Testing Library** - Unit and integration test suite

---

## 📂 Project Structure

```text
src/
├── app/
│   ├── App.tsx                           # Root application state, auth resolution & tab routing
│   ├── types.ts                          # Core TypeScript interfaces (Pose, PracticeSession, UserProfile, AppSettings)
│   ├── data/
│   │   └── poses.ts                      # 9 bundled poses (INITIAL_POSES)
│   ├── scoring/
│   │   ├── angles.ts                     # Biomechanical joint angle math
│   │   ├── standards.ts                  # ICU joint angle targets & tolerances
│   │   ├── scorePose.ts                  # Real-time pose scoring engine
│   │   ├── jumpPeak.ts                   # Jump apex detection (Toe Touch)
│   │   └── drawTelemetry.ts              # Skeleton/hand canvas rendering & scorecard export
│   ├── components/
│   │   ├── AuthScreen.tsx                # Login, sign-up, password reset & guest entry
│   │   ├── Header.tsx                    # Top app bar with mastery counter & profile trigger
│   │   ├── BottomNavBar.tsx              # Bottom navigation (Library, AI Scan, History)
│   │   ├── NavigationDrawer.tsx          # Side drawer (Profile, Preferences, Help, About, Admin)
│   │   ├── PoseLibraryScreen.tsx         # Pose syllabus grid/list, search & category filters
│   │   ├── PoseDetailScreen.tsx          # Pose breakdown, ideal angles, tips & tutorial video
│   │   ├── PoseCard.tsx / PoseList.tsx   # Pose display components with verification lock badges
│   │   ├── AICameraScreen.tsx            # Live camera, MediaPipe inference, photo upload & summary
│   │   ├── SessionHistoryScreen.tsx      # Practice session log & telemetry history
│   │   ├── ProfileScreen.tsx             # Athlete stats, verification request & account settings
│   │   ├── SettingsScreen.tsx            # Theme, language, audio cues, notifications & camera prefs
│   │   ├── HelpSupportScreen.tsx         # FAQs & Supabase support ticket submission
│   │   ├── AboutScreen.tsx               # App overview & ICU compliance info
│   │   ├── DarkAdminPage.tsx             # System Manager console (lazy-loaded)
│   │   └── admin/                        # Admin tabs (Users, Content, Analytics, Settings, PoseVideoInput)
│   ├── hooks/                            # Custom hooks (verification, service worker updates)
│   └── utils/                            # Offline MediaPipe loader, localization, audio, haptics, framing
├── services/
│   ├── supabaseService.ts                # Supabase client & typed table services
│   ├── supabaseApi.ts                    # Auth, verification, session merge & admin RPC wrappers
│   ├── offlineSync.ts                    # Offline practice session queue & background uploader
│   ├── accountStorage.ts                 # Per-account namespaced localStorage cache
│   └── poseImages.ts                     # Admin pose image & video upload helpers
├── styles/
│   ├── index.css                         # Light/dark theme rules & glassmorphic surfaces
│   ├── theme.css                         # Design system CSS variables
│   ├── globals.css / tailwind.css        # Base Tailwind setup
│   └── fonts.css                         # Typography
└── __tests__/                            # Vitest unit & integration test suites
```

---

## 🔧 Configuration

### Offline MediaPipe Settings
MediaPipe assets are vendored automatically before `npm run dev` and `npm run build` via `scripts/vendor-mediapipe.mjs` and resolved by `src/app/utils/mediapipeAssets.ts`:

```typescript
const pose = new MediaPipePose({
  locateFile: mediapipeLocateFile, // resolves to /mediapipe/pose/<file>
});

pose.setOptions({
  modelComplexity: 0,           // 0 = lite (matches vendored pose_landmark_lite.tflite)
  smoothLandmarks: true,
  enableSegmentation: false,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
});
```

---

## 🧪 Testing & QA

```bash
# Run unit & integration test suite
npm test

# Run linter
npm run lint

# Run quick project structure QA check
npm run qa

# Run full CI pipeline (clean install, lint, test, build)
npm run ci
```

---

## 📚 Documentation Index

- **[SUPABASE_SETUP.md](SUPABASE_SETUP.md)** - Database schema, migrations, RLS policies, storage buckets, and test user scripts
- **[NATIVE_APP_SETUP.md](NATIVE_APP_SETUP.md)** - Android & iOS Capacitor build and deployment workflow
- **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - Developer quick reference for components, types, and scripts
- **[DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md)** - Onboarding guide for contributing to OptiStance
- **[PROJECT_PLAN.md](PROJECT_PLAN.md)** - System architecture and feature specifications
- **[README_QA.md](README_QA.md)** - Web, Android, and iOS QA checklist
- **[README_SECURITY.md](README_SECURITY.md)** - Security model, RLS hardening, and token/storage practices

---

*Last updated: October 27, 2026*
