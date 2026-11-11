# OptiStance — Project Plan & System Architecture

## 📋 Executive Summary

**OptiStance** is a mobile-first web and native (Capacitor iOS/Android) application that uses offline AI-powered pose and hand detection to help cheerleaders perfect their stances, stunts, jumps, and pom motions. It provides real-time biomechanical joint-angle telemetry, International Cheer Union (ICU) compliance scoring, offline session syncing, and a System Manager console for syllabus and athlete management.

---

## 🎯 Project Goals

1. **Real-time Biomechanical Feedback** — Provide instant joint-angle and hand-position feedback using locally bundled MediaPipe Pose (33 landmarks) and MediaPipe Hands (21 landmarks).
2. **Offline-First Reliability** — Bundle ML models in the app package and queue practice sessions locally so athletes can train in gyms without Wi-Fi.
3. **ICU Standards Alignment** — Evaluate poses against International Cheer Union angular tolerances (`src/app/scoring/standards.ts`).
4. **Role-Based Syllabus & Access Control** — Gate Intermediate and Advanced poses behind athlete verification while giving System Managers full control over stunts, reference media, and user accounts.
5. **ISO 25010 Quality & Security** — Enforce Row-Level Security (RLS), per-account local cache isolation, and strict separation of client vs. server-owned profile fields.

---

## 🏗️ Application Architecture

### Technology Stack

#### Frontend & Native Shell
- **Framework**: React 18.3.1 + TypeScript 5.9
- **Styling**: Tailwind CSS v4.1.12 (`@tailwindcss/vite`)
- **Build Tool**: Vite 6.3.5
- **Native Runtime**: Capacitor 8 (`@capacitor/android`, `@capacitor/ios`, `@capacitor/camera`, `@capacitor/haptics`, `@capacitor/local-notifications`, `@capacitor/app`)

#### AI / Computer Vision
- **Body Tracking**: `@mediapipe/pose` 0.5 (`pose_landmark_lite.tflite`, `modelComplexity: 0`)
- **Hand Tracking**: `@mediapipe/hands` 0.4 (`hand_landmark_lite.tflite`, throttled at `100ms` intervals)
- **Asset Delivery**: Vendored into `public/mediapipe/` via `scripts/vendor-mediapipe.mjs`

#### Backend (Supabase)
- **Database**: PostgreSQL with Row-Level Security (`supabase/schema.sql` + `supabase/migrations/`)
- **Authentication**: Supabase Auth (Email/Password + Guest fallback)
- **Realtime**: Postgres changes (`users` verification updates) and Presence (`online-athletes` channel)
- **Storage**: Public-read, admin-write buckets (`pose-images` up to 5 MB, `pose-videos` up to 50 MB)

### System Architecture Diagram

```text
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                          │
│  (React 18 + Tailwind CSS + Radix/shadcn UI + Lucide Icons)     │
│  Lazy Chunks: AICameraScreen (MediaPipe) & DarkAdminPage        │
└───────────────┬─────────────────────────────────┬───────────────┘
                │                                 │
┌───────────────▼───────────────┐ ┌───────────────▼───────────────┐
│     Local & Offline Layer     │ │     Supabase Cloud Layer      │
│  - accountStorage.ts (Scoped) │ │  - supabaseService.ts (CRUD)  │
│  - offlineSync.ts (Queue)     │ │  - supabaseApi.ts (Auth/RPCs) │
│  - Service Worker (public/sw) │ │  - Realtime & Storage Buckets │
└───────────────┬───────────────┘ └───────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────────────┐
│              Camera & Offline AI Inference Layer                │
│  - WebRTC getUserMedia / @capacitor/camera                      │
│  - Vendored MediaPipe Pose (33 pts) + MediaPipe Hands (21 pts)  │
│  - Framing & Lighting Quality Evaluator (framingQuality.ts)     │
└───────────────┬─────────────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────────────┐
│            Biomechanical Scoring & Telemetry Engine             │
│  - Joint Angle Calculator (angles.ts) & ICU Rubric (scorePose)  │
│  - Jump Apex Detector (jumpPeak.ts)                             │
│  - Skeleton & Hand Canvas Overlay + Scorecard Export            │
│  - Web Speech API Audio Coach (audio.ts) & Haptics (haptics.ts) │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```text
/
├── src/
│   ├── app/
│   │   ├── App.tsx                        # Main application state & tab router
│   │   ├── types.ts                       # Core data models & constants
│   │   ├── data/
│   │   │   └── poses.ts                   # 9 bundled poses (INITIAL_POSES)
│   │   ├── scoring/
│   │   │   ├── angles.ts                  # 2D/3D joint angle math
│   │   │   ├── standards.ts               # ICU target angles & tolerances
│   │   │   ├── scorePose.ts               # Pose evaluation & feedback generator
│   │   │   ├── jumpPeak.ts                # Jump peak detector
│   │   │   └── drawTelemetry.ts           # Skeleton/hand drawing & scorecard export
│   │   ├── components/
│   │   │   ├── AuthScreen.tsx             # Login, signup, password reset, guest mode
│   │   │   ├── Header.tsx                 # Top bar
│   │   │   ├── BottomNavBar.tsx           # Library, AI Scan, History navigation
│   │   │   ├── NavigationDrawer.tsx       # Side menu drawer
│   │   │   ├── PoseLibraryScreen.tsx      # Pose browser & filters
│   │   │   ├── PoseDetailScreen.tsx       # Pose details & tutorial video player
│   │   │   ├── PoseCard.tsx               # Pose card with lock/mastery badges
│   │   │   ├── PoseList.tsx               # Compact pose list view
│   │   │   ├── AICameraScreen.tsx         # Camera + MediaPipe Pose/Hands + upload
│   │   │   ├── SessionHistoryScreen.tsx   # Practice history & session details
│   │   │   ├── ProfileScreen.tsx          # Athlete profile & verification status
│   │   │   ├── SettingsScreen.tsx         # Theme, language, audio, notifications
│   │   │   ├── HelpSupportScreen.tsx      # FAQs & support ticket form
│   │   │   ├── AboutScreen.tsx            # App & ICU standards info
│   │   │   ├── DarkAdminPage.tsx          # System Manager console
│   │   │   └── admin/                     # Admin modules (Users, Content, Analytics, Settings)
│   │   ├── hooks/                         # Verification & service worker hooks
│   │   └── utils/                         # Access control, audio, device, framing, localization
│   ├── services/
│   │   ├── supabaseService.ts             # Supabase client & table services
│   │   ├── supabaseApi.ts                 # Auth, verification & admin API helpers
│   │   ├── accountStorage.ts              # Per-account localStorage scoping
│   │   ├── offlineSync.ts                 # Offline session queue & sync
│   │   └── poseImages.ts                  # Storage bucket upload/delete helpers
│   ├── styles/                            # Tailwind v4 & theme CSS
│   └── __tests__/                         # Vitest test suites
├── supabase/
│   ├── schema.sql                         # Canonical PostgreSQL schema & RLS policies
│   ├── fix_user_sync.sql                  # auth.users -> public.users trigger
│   └── migrations/                        # Incremental SQL migrations
├── scripts/
│   ├── vendor-mediapipe.mjs               # Copies MediaPipe assets to public/mediapipe/
│   ├── create-test-user.mjs               # CLI tool for creating/confirming test users
│   └── qa/check.js                        # Quick QA structure check
├── capacitor.config.json                  # Capacitor native configuration (com.optistance.cheerpose)
└── package.json                           # Scripts and dependencies
```

---

## ✨ Implemented Core Features

### 1. Pose Syllabus (`src/app/data/poses.ts`)
9 bundled poses with ICU guidelines, ideal angles, practice tips, and common mistakes:
1. **T-Motion** (Beginner — Pom Motion)
2. **High V** (Beginner — Pom Motion)
3. **Low V** (Beginner — Pom Motion)
4. **Half-T** (Beginner — Pom Motion)
5. **Liberty** (Intermediate — Stunts)
6. **Arabesque** (Intermediate — Stunts)
7. **Toe Touch** (Advanced — Jumps)
8. **Heel Stretch** (Advanced — Stunts)
9. **Scorpion** (Advanced — Stunts)

Plus dynamic cloud stunts created or managed by admins in the `stunts` table.

### 2. Verification & Tiered Access (`src/app/utils/access.ts`)
- **Tier 1 (Guest)**: Local-only sessions, Beginner poses unlocked.
- **Tier 2 (Unverified Athlete)**: Signed-in account, Beginner poses unlocked, can tap **Request Verification** on the Profile screen (`request_verification` RPC).
- **Tier 3 (Verified Athlete)**: All Beginner, Intermediate, and Advanced poses unlocked.
- **Tier 4 (System Manager / Admin)**: Full access to all poses plus the Admin Console (`DarkAdminPage.tsx`).

### 3. AI Camera & Image Upload (`src/app/components/AICameraScreen.tsx`)
- Live webcam / native camera feed with front/rear camera switching, countdown timer (`0s`, `3s`, `5s`), flash toggle, and framing/lighting diagnostics.
- Static photo upload with image quality analysis (`src/app/utils/imageQuality.ts`) and full pose evaluation.
- Shareable branded scorecard generator (`createBrandedScorecard` in `src/app/scoring/drawTelemetry.ts`).

### 4. System Manager Console (`src/app/components/DarkAdminPage.tsx`)
- **Users (`DarkAdminUsers.tsx`)**: Real-time online presence badges, role management, verification review/revocation, account activation, and admin-assisted password resets (`admin_set_user_password` RPC).
- **Content (`DarkAdminContent.tsx`)**: Create, edit, archive, restore, and delete stunts; upload reference images (`pose-images`) and tutorial videos (`pose-videos` or YouTube links via `PoseVideoInput.tsx`); configure ICU joint angle standards.
- **Analytics (`DarkAdminAnalytics.tsx`)**: Squad accuracy trends, session volume, and difficulty insights.
- **Settings (`DarkAdminSettings.tsx`)**: Support ticket management, replies, and storage usage monitoring.

---

**Document Version**: 2.0  
**Last Updated**: October 27, 2026  
**Status**: Active Production Architecture
