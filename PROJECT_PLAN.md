# Cheerleading Pose Trainer - Project Plan

## 📋 Executive Summary

A mobile-first web application that uses AI-powered pose detection to help cheerleaders perfect their poses, track progress, and improve technique through real-time feedback and personalized training recommendations.

---

## 🎯 Project Goals

### Primary Objectives
1. **Real-time Pose Detection** - Provide instant feedback on cheerleading poses using MediaPipe
2. **Progress Tracking** - Monitor user improvement over time with detailed analytics
3. **Personalized Training** - Recommend drills based on performance weaknesses
4. **ISO 25010 Compliance** - Ensure security, privacy, and quality standards
5. **ICU Standards Alignment** - Follow International Cheer Union guidelines

### Success Metrics
- User accuracy improvement over 30 days: Target 15%+ increase
- Daily active users retention: Target 60%+
- Average session duration: Target 10+ minutes
- Pose completion rate: Target 70%+ of started poses

---

## 🏗️ Application Architecture

### Technology Stack

#### Frontend
- **Framework**: React 18.3.1
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4.1.12
- **Build Tool**: Vite 6.3.5
- **Package Manager**: pnpm

#### AI/ML
- **Pose Detection**: MediaPipe Pose 0.5.x
- **Drawing Utilities**: MediaPipe Drawing Utils
- **Camera Integration**: MediaPipe Camera Utils

#### UI Components
- **Icons**: Lucide React
- **Animations**: Motion (Framer Motion)
- **Routing**: React Router 7.13.0

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     User Interface                       │
│  (React Components + Tailwind CSS + Lucide Icons)       │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│                  Application State                       │
│         (React useState/Context - Local State)           │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│                Camera & Media Layer                      │
│    (getUserMedia API + Video Stream Processing)         │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│              AI Pose Detection Engine                    │
│  (MediaPipe Pose - 33 Body Landmark Detection)          │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│            Analysis & Scoring System                     │
│   (Accuracy Calculation + Feedback Generation)          │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
/workspaces/default/code/
├── src/
│   ├── app/
│   │   ├── App.tsx                    # Main app component & routing
│   │   └── components/
│   │       ├── auth/
│   │       │   ├── LoginPage.tsx      # User login
│   │       │   └── SignupPage.tsx     # User registration
│   │       ├── core/
│   │       │   ├── BottomNav.tsx      # Main navigation bar
│   │       │   ├── HamburgerMenu.tsx  # Side menu
│   │       │   └── CameraButton.tsx   # Floating camera button
│   │       ├── pages/
│   │       │   ├── HomePage.tsx       # Dashboard & stats
│   │       │   ├── PosePage.tsx       # Pose library
│   │       │   ├── ProfilePage.tsx    # User profile
│   │       │   ├── SettingsPage.tsx   # Settings & privacy
│   │       │   ├── AboutPage.tsx      # App information
│   │       │   └── HelpPage.tsx       # Tutorials & FAQs
│   │       └── camera/
│   │           └── CameraView.tsx     # Camera & pose detection
│   ├── styles/
│   │   ├── theme.css                  # Design tokens & variables
│   │   └── fonts.css                  # Font imports
│   └── imports/                       # Static assets
├── package.json                       # Dependencies
└── PROJECT_PLAN.md                    # This file
```

---

## 🎨 Design System

### Color Palette
- **Primary**: Purple 600-800 (#9333ea - #6b21a8)
- **Accent**: Purple 100-200 (#f3e8ff - #e9d5ff)
- **Success**: Green 500-600 (#22c55e - #16a34a)
- **Warning**: Yellow 500-600 (#eab308 - #ca8a04)
- **Error**: Red 500-600 (#ef4444 - #dc2626)
- **Neutral**: Gray 50-900

### Typography
- **Font Family**: System default (sans-serif)
- **Headings**: 500-600 weight
- **Body**: 400 weight
- **Sizes**: 12px - 32px scale

### Components
- **Buttons**: Rounded-xl (12px), gradient backgrounds
- **Cards**: White bg, rounded-2xl (16px), shadow-sm/lg
- **Inputs**: Rounded-xl, border with focus ring
- **Icons**: 16px-24px, consistent stroke width

---

## 👤 User Flows

### 1. Authentication Flow
```
Start
  ↓
Login Page
  ├─→ New User? → Sign Up Page → Create Account → Home
  └─→ Existing User → Enter Credentials → Validate → Home
```

### 2. Pose Practice Flow
```
Home/Pose Library
  ↓
Select Pose
  ↓
View Details (Description, Progress, Tips)
  ↓
Click "Start Practice" / "Try Me"
  ↓
Camera Opens
  ├─→ Allow Permissions → Real-time Detection
  └─→ Deny Permissions → Demo Mode (Simulated)
  ↓
Position Body in Frame
  ↓
See Real-time Feedback (Skeleton Overlay + Accuracy %)
  ↓
Start Timer (Optional 3-2-1 countdown)
  ↓
Hold Pose (2 seconds)
  ↓
Results Screen
  ├─→ Overall Score (%)
  ├─→ Detailed Feedback (Body parts scores)
  ├─→ Recommended Drills
  └─→ Try Again / Go Back
```

### 3. Progress Tracking Flow
```
Practice Multiple Poses
  ↓
Data Saved to Profile
  ↓
View Profile Page
  ├─→ Statistics (Poses mastered, Days, Avg score)
  ├─→ Recent Activity (Timeline)
  ├─→ Weekly Goals (Progress bars)
  └─→ Achievements (Unlocked badges)
```

---

## 📊 Data Models

### User
```typescript
interface User {
  id: string;
  name: string;
  email: string;
  password: string; // hashed
  createdAt: Date;
  level: number;
  totalPractices: number;
  currentStreak: number;
}
```

### Pose
```typescript
interface Pose {
  id: string;
  name: string;
  category: 'Stunts' | 'Arm Motions' | 'Jumps' | 'Flexibility';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  description: string;
  progress: number; // 0-100
  instructions: string[];
  referenceImage?: string;
}
```

### PoseAttempt
```typescript
interface PoseAttempt {
  id: string;
  userId: string;
  poseId: string;
  timestamp: Date;
  overallScore: number; // 0-100
  detailedScores: {
    armPosition: number;
    legExtension: number;
    coreAlignment: number;
    balance: number;
  };
  landmarks: MediaPipeLandmark[];
  feedback: string[];
  drillsRecommended: string[];
}
```

### Achievement
```typescript
interface Achievement {
  id: string;
  icon: string;
  label: string;
  description: string;
  requirement: string;
  unlocked: boolean;
  unlockedAt?: Date;
}
```

---

## ✨ Core Features

### 1. Authentication System
- **Login**: Email/password with validation
- **Sign Up**: Name, email, password with confirmation
- **Security**: Password strength requirements (min 6 chars)
- **Session**: Persistent login state
- **Logout**: Secure sign out with data protection

### 2. Pose Library
- **8 Cheerleading Poses**:
  1. Liberty (Advanced Stunt)
  2. High V (Beginner Arm Motion)
  3. T Motion (Beginner Arm Motion)
  4. Scorpion (Advanced Stunt)
  5. Bow and Arrow (Intermediate Arm Motion)
  6. Arabesque (Intermediate Stunt)
  7. Heel Stretch (Advanced Flexibility)
  8. Pike Jump (Intermediate Jump)

- **Features**:
  - Search functionality
  - Category filters
  - Difficulty badges
  - Progress tracking per pose
  - Detailed descriptions

### 3. Real-time Camera Detection
- **Camera Access**: getUserMedia API
- **Permission Handling**: Clear error messages
- **Fallback Mode**: Demo mode when camera unavailable
- **Controls**:
  - Upload image button
  - Flip camera (front/back)
  - Flash toggle
  - Timer (3-2-1 countdown)
  - Capture button

### 4. AI Pose Analysis
- **Technology**: MediaPipe Pose
- **Detection**: 33 body landmarks
- **Real-time Feedback**: 
  - Skeleton overlay on video
  - Live accuracy percentage
  - Pose name detection
  - Minor form corrections

### 5. Results & Feedback
- **Overall Score**: Percentage accuracy
- **Detailed Breakdown**:
  - Arm Position (%)
  - Leg Extension (%)
  - Core Alignment (%)
  - Balance (%)
- **Visual Feedback**: Progress bars
- **Recommendations**: Personalized drills
- **Actions**: Try Again, View Drills

### 6. Progress Tracking
- **Statistics**:
  - Total poses mastered
  - Practice days count
  - Average accuracy score
  - Current streak
- **Weekly Goals**: Visual progress bars
- **Activity Timeline**: Recent attempts with scores
- **Achievements**: Unlockable badges

### 7. Settings & Privacy (ISO 25010)
- **Account Settings**:
  - Edit profile
  - Change password
  - Notification preferences
- **Privacy & Security**:
  - Privacy controls
  - Two-factor authentication (future)
  - Data export/deletion
- **Preferences**:
  - Language selection
  - Dark mode toggle

### 8. Help & Support
- **Tutorials**:
  - Real-time camera usage
  - Image upload guide
- **FAQs**: Common questions
- **Contact Support**: Direct communication

---

## 🔧 Technical Implementation Details

### MediaPipe Integration

#### Setup
```typescript
const pose = new Pose({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
});

pose.setOptions({
  modelComplexity: 1,           // 0, 1, or 2
  smoothLandmarks: true,        // Smooth results
  enableSegmentation: false,    // Not needed
  minDetectionConfidence: 0.5,  // Detection threshold
  minTrackingConfidence: 0.5,   // Tracking threshold
});
```

#### Pose Detection Loop
```typescript
const detectPose = async () => {
  if (videoRef.current && poseRef.current) {
    await poseRef.current.send({ image: videoRef.current });
    requestAnimationFrame(detectPose);
  }
};
```

#### Results Processing
```typescript
const onPoseResults = (results: Results) => {
  // 1. Draw skeleton on canvas
  drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS);
  drawLandmarks(ctx, results.poseLandmarks);
  
  // 2. Calculate accuracy score
  const score = calculatePoseAccuracy(results.poseLandmarks, referencePose);
  
  // 3. Update UI
  setCurrentAccuracy(score);
};
```

### Accuracy Calculation Algorithm

```typescript
function calculatePoseAccuracy(
  landmarks: Landmark[],
  referencePose: ReferencePose
): number {
  // 1. Extract key angles
  const userAngles = {
    leftArm: calculateAngle(landmarks[11], landmarks[13], landmarks[15]),
    rightArm: calculateAngle(landmarks[12], landmarks[14], landmarks[16]),
    leftLeg: calculateAngle(landmarks[23], landmarks[25], landmarks[27]),
    rightLeg: calculateAngle(landmarks[24], landmarks[26], landmarks[28]),
    torsoTilt: calculateAngle(landmarks[11], landmarks[23], landmarks[24]),
  };
  
  // 2. Compare with reference angles
  const scores = Object.keys(userAngles).map(key => {
    const diff = Math.abs(userAngles[key] - referencePose[key]);
    return Math.max(0, 100 - (diff * 2)); // 2% penalty per degree off
  });
  
  // 3. Weighted average
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}
```

### State Management

```typescript
// App-level state
const [isAuthenticated, setIsAuthenticated] = useState(false);
const [currentPage, setCurrentPage] = useState('login');
const [userName, setUserName] = useState('');

// Camera state
const [stream, setStream] = useState<MediaStream | null>(null);
const [showCamera, setShowCamera] = useState(false);
const [cameraError, setCameraError] = useState<string | null>(null);

// Pose detection state
const [currentAccuracy, setCurrentAccuracy] = useState(0);
const [detectedPose, setDetectedPose] = useState('');
const [showResults, setShowResults] = useState(false);
```

---

## 🔒 Security & Privacy (ISO 25010)

### Security Standards
1. **Authentication**:
   - Passwords must be hashed (bcrypt recommended)
   - Min 6 characters requirement
   - Email validation
   
2. **Data Protection**:
   - No storage of camera images without consent
   - Local-first data storage
   - Secure session management
   
3. **Camera Privacy**:
   - Clear permission requests
   - Visual indicators when camera active
   - Easy disable/revoke access

### ISO 25010 Compliance Areas
- ✅ **Security**: Authentication, authorization, data encryption
- ✅ **Privacy**: Data minimization, user consent, transparency
- ✅ **Usability**: Clear UI, accessibility, error handling
- ✅ **Performance**: Fast load times, smooth 30fps detection
- ✅ **Reliability**: Graceful fallbacks, error recovery

---

## 📱 Responsive Design

### Breakpoints
- **Mobile**: 320px - 640px (primary target)
- **Tablet**: 641px - 1024px
- **Desktop**: 1025px+ (future enhancement)

### Mobile-First Approach
- Touch-optimized buttons (min 44px)
- Bottom navigation for thumb reach
- Floating action button (camera)
- Swipe gestures (future)
- Pull-to-refresh (future)

---

## 🚀 Development Roadmap

### Phase 1: MVP (Current - Week 1-2) ✅
- [x] Authentication (Login/Signup)
- [x] Basic navigation (Home, Pose, Profile)
- [x] Pose library (8 poses)
- [x] Camera integration with MediaPipe
- [x] Real-time pose detection
- [x] Results screen with scoring
- [x] Basic progress tracking
- [x] Settings, About, Help pages

### Phase 2: Backend Integration (Week 3-4)
- [ ] Set up backend (Node.js/Express or Supabase)
- [ ] User authentication API
- [ ] Database schema (Users, Poses, Attempts)
- [ ] Save pose attempts to database
- [ ] Retrieve user progress from backend
- [ ] API security (JWT tokens)

### Phase 3: Enhanced Features (Week 5-6)
- [ ] Detailed drill library
- [ ] Video tutorials for each pose
- [ ] Social features (leaderboard)
- [ ] Share progress to social media
- [ ] Offline mode (PWA)
- [ ] Push notifications

### Phase 4: Advanced AI (Week 7-8)
- [ ] Custom pose creation
- [ ] Coach mode (compare two videos)
- [ ] Slow-motion replay
- [ ] Frame-by-frame analysis
- [ ] Export pose analysis reports
- [ ] Voice feedback during practice

### Phase 5: Gamification (Week 9-10)
- [ ] Advanced achievement system
- [ ] Daily challenges
- [ ] Streak rewards
- [ ] Virtual badges and trophies
- [ ] Leveling system
- [ ] Team competitions

### Phase 6: Platform Expansion (Week 11-12)
- [ ] Native mobile app (React Native)
- [ ] iOS App Store deployment
- [ ] Android Play Store deployment
- [ ] Tablet optimization
- [ ] Desktop application
- [ ] Smart TV support

---

## 🧪 Testing Strategy

### Unit Testing
- Component rendering tests
- State management tests
- Utility function tests
- Target: 80% code coverage

### Integration Testing
- User authentication flow
- Pose detection pipeline
- Data persistence
- Camera permissions

### E2E Testing (Cypress/Playwright)
- Complete user journeys
- Critical paths:
  1. Sign up → Practice pose → View results
  2. Login → Browse poses → Start practice
  3. Settings update → Profile view

### Performance Testing
- MediaPipe FPS (target: 30fps)
- Page load times (target: <2s)
- Memory usage monitoring
- Battery consumption (mobile)

### Accessibility Testing
- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader support
- Color contrast ratios

---

## 📈 Analytics & Metrics

### User Metrics
- Daily/Monthly Active Users (DAU/MAU)
- Session duration
- Retention rate (1-day, 7-day, 30-day)
- Churn rate

### Engagement Metrics
- Poses practiced per session
- Average accuracy score
- Completion rate
- Return frequency

### Technical Metrics
- App load time
- API response time
- Error rate
- Camera permission grant rate
- Pose detection accuracy

---

## 💡 Future Enhancements

### Short-term (3-6 months)
1. **Pose Library Expansion**: 50+ poses
2. **Custom Routines**: Create workout sequences
3. **Progress Export**: PDF reports
4. **Multiple Languages**: Spanish, Tagalog
5. **Dark Mode**: Full implementation

### Mid-term (6-12 months)
1. **Live Classes**: Group practice sessions
2. **Coach Marketplace**: Connect with trainers
3. **AR Mode**: Augmented reality overlays
4. **Wearable Integration**: Sync with fitness trackers
5. **Voice Commands**: Hands-free operation

### Long-term (12+ months)
1. **AI Coach**: Personalized training plans
2. **Competition Mode**: Virtual tournaments
3. **3D Pose Modeling**: Advanced visualization
4. **Injury Prevention**: Risk assessment
5. **Professional Certification**: ICU partnerships

---

## 🤝 Stakeholders

### Primary Users
- **Cheerleaders**: Ages 12-25, practice 3-5x/week
- **Coaches**: Monitor team progress
- **Parents**: Track child development

### Secondary Users
- **Fitness Enthusiasts**: General pose training
- **Dance Teams**: Similar pose requirements
- **Physical Therapists**: Rehabilitation tracking

---

## 💰 Monetization Strategy (Future)

### Freemium Model
- **Free Tier**:
  - 8 basic poses
  - 5 practices per day
  - Basic analytics
  
- **Premium Tier** ($9.99/month):
  - Unlimited poses
  - Unlimited practices
  - Advanced analytics
  - Drill library
  - Video tutorials
  - Ad-free experience
  
- **Coach Tier** ($29.99/month):
  - Team management
  - Bulk user creation
  - Custom pose creation
  - Export reports
  - Priority support

---

## 📞 Support & Maintenance

### Support Channels
- In-app help center
- Email: support@cheerapp.com
- FAQ documentation
- Video tutorials

### Maintenance Schedule
- **Daily**: Monitor error logs
- **Weekly**: Performance review
- **Monthly**: Feature updates
- **Quarterly**: Major releases

---

## 📄 License & Compliance

### Open Source Libraries
- React (MIT)
- MediaPipe (Apache 2.0)
- Tailwind CSS (MIT)
- Lucide Icons (ISC)

### Compliance
- GDPR (EU users)
- COPPA (users under 13)
- ISO 25010 (quality standards)
- ICU Guidelines (pose standards)

---

## 🎓 Documentation

### Developer Docs
- README.md - Setup instructions
- API.md - Backend API reference
- COMPONENTS.md - Component library
- CONTRIBUTING.md - Contribution guidelines

### User Docs
- User Guide PDF
- Video tutorials
- FAQ section
- Troubleshooting guide

---

## 📝 Conclusion

This cheerleading pose trainer app combines cutting-edge AI technology with user-centric design to create an engaging, educational platform for cheerleaders of all levels. The phased development approach ensures a solid MVP while leaving room for innovation and growth.

**Next Steps:**
1. Complete backend integration (Phase 2)
2. Conduct user testing with real cheerleaders
3. Iterate based on feedback
4. Launch beta program
5. Prepare for public release

---

**Document Version**: 1.0  
**Last Updated**: May 12, 2026  
**Author**: Development Team  
**Status**: Active Development
