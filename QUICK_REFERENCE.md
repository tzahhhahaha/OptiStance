# Cheerleading Pose Trainer - Quick Reference Guide

## 🚀 Getting Started

### Install Dependencies
```bash
pnpm install
```

### Run Development Server
```bash
pnpm run dev
```

### Build for Production
```bash
pnpm run build
```

---

## 📂 Key Files & Components

### Core Application
| File | Purpose |
|------|---------|
| `src/app/App.tsx` | Main app router & authentication state |
| `src/styles/theme.css` | Design tokens & CSS variables |

### Authentication
| File | Purpose |
|------|---------|
| `LoginPage.tsx` | User login interface |
| `SignupPage.tsx` | User registration interface |

### Main Pages
| File | Purpose |
|------|---------|
| `HomePage.tsx` | Dashboard with stats & shortcuts |
| `PosePage.tsx` | Pose library browser |
| `ProfilePage.tsx` | User profile & achievements |

### Camera & Detection
| File | Purpose |
|------|---------|
| `CameraView.tsx` | Camera interface + MediaPipe integration |

### Navigation
| File | Purpose |
|------|---------|
| `BottomNav.tsx` | Main navigation bar |
| `HamburgerMenu.tsx` | Side menu |
| `CameraButton.tsx` | Floating action button |

---

## 🎨 Design System Quick Reference

### Colors
```css
/* Primary */
--purple-600: #9333ea
--purple-700: #7e22ce
--purple-800: #6b21a8

/* Accent */
--purple-100: #f3e8ff
--purple-200: #e9d5ff

/* Semantic */
--green-600: #16a34a (Success)
--yellow-600: #ca8a04 (Warning)
--red-600: #dc2626 (Error)
```

### Spacing Scale
- xs: 4px (1)
- sm: 8px (2)
- md: 16px (4)
- lg: 24px (6)
- xl: 32px (8)
- 2xl: 48px (12)

### Border Radius
- sm: 8px (rounded-lg)
- md: 12px (rounded-xl)
- lg: 16px (rounded-2xl)
- xl: 24px (rounded-3xl)

---

## 🔌 Key Props Interfaces

### Navigation Props
```typescript
interface BottomNavProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

interface HamburgerMenuProps {
  onNavigate: (page: string) => void;
  userName?: string;
}
```

### Page Props
```typescript
interface HomePageProps {
  onOpenCamera?: () => void;
  onNavigate?: (page: string) => void;
}

interface PosePageProps {
  onOpenCamera?: () => void;
}
```

### Camera Props
```typescript
interface CameraViewProps {
  onClose: () => void;
}
```

---

## 📊 Data Structures

### Pose Object
```typescript
interface Pose {
  id: string;
  name: string;
  category: 'Stunts' | 'Arm Motions' | 'Jumps' | 'Flexibility';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  progress: number; // 0-100
  description: string;
}
```

### User State
```typescript
const [isAuthenticated, setIsAuthenticated] = useState(false);
const [currentPage, setCurrentPage] = useState('login');
const [userName, setUserName] = useState('');
```

---

## 🎯 MediaPipe Configuration

### Initialization
```typescript
const pose = new Pose({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
  },
});

pose.setOptions({
  modelComplexity: 1,
  smoothLandmarks: true,
  enableSegmentation: false,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
});
```

### Landmarks (33 points)
- 0-10: Face
- 11-12: Shoulders
- 13-14: Elbows
- 15-16: Wrists
- 23-24: Hips
- 25-26: Knees
- 27-28: Ankles

---

## 🔄 Page Navigation Flow

```
Login/Signup → Home → {Pose Library, Profile, Settings, About, Help}
                ↓
              Camera → Results
```

### Route Mapping
| Page | State Value |
|------|-------------|
| Login | `'login'` |
| Signup | `'signup'` |
| Home | `'home'` |
| Pose Library | `'pose'` |
| Profile | `'profile'` |
| Settings | `'settings'` |
| About | `'about'` |
| Help | `'help'` |

---

## 🛠️ Common Patterns

### Opening Camera
```typescript
const handleCameraClick = () => {
  setShowCamera(true);
};
```

### Navigation
```typescript
const handleNavigation = (page: string) => {
  if (page === 'logout') {
    handleLogout();
  } else {
    setCurrentPage(page);
  }
};
```

### Authentication
```typescript
const handleLogin = (email: string, password: string) => {
  setIsAuthenticated(true);
  setUserName('Juan Dela Cruz');
  setCurrentPage('home');
};
```

---

## 🎬 Camera Permissions

### Request Camera
```typescript
const stream = await navigator.mediaDevices.getUserMedia({
  video: {
    facingMode: 'user', // or 'environment'
    width: { ideal: 1280 },
    height: { ideal: 720 }
  },
  audio: false,
});
```

### Handle Errors
```typescript
catch (error) {
  if (error.name === 'NotAllowedError') {
    // Permission denied
  } else if (error.name === 'NotFoundError') {
    // No camera found
  }
}
```

---

## 📱 Responsive Classes

### Mobile-First Utilities
```css
/* Containers */
.p-4              /* padding: 16px */
.pb-24            /* padding-bottom: 96px (nav space) */
.rounded-2xl      /* border-radius: 16px */

/* Layout */
.grid-cols-2      /* 2 columns */
.grid-cols-3      /* 3 columns */
.gap-3            /* gap: 12px */

/* Text */
.text-sm          /* 14px */
.text-lg          /* 18px */
.text-2xl         /* 24px */
.font-semibold    /* 600 weight */
```

---

## 🔍 Debugging Tips

### Check Camera Status
```typescript
console.log('Camera stream:', stream);
console.log('Video playing:', videoRef.current?.readyState);
```

### Monitor Pose Detection
```typescript
console.log('Landmarks:', results.poseLandmarks);
console.log('Accuracy:', currentAccuracy);
```

### State Inspection
```typescript
console.log('Current page:', currentPage);
console.log('Authenticated:', isAuthenticated);
```

---

## 🚨 Common Issues & Solutions

### Issue: Camera not working
**Solution**: Check browser permissions, ensure HTTPS, verify getUserMedia support

### Issue: Pose detection slow
**Solution**: Reduce video resolution, set modelComplexity to 0

### Issue: Navigation not working
**Solution**: Verify onNavigate prop is passed correctly

### Issue: Styling not applied
**Solution**: Check Tailwind class names, ensure theme.css is imported

---

## 📦 Dependencies Overview

### Core (Required)
- `react` - UI library
- `react-dom` - React renderer
- `@mediapipe/pose` - Pose detection
- `tailwindcss` - Styling
- `lucide-react` - Icons

### Dev Dependencies
- `vite` - Build tool
- `@vitejs/plugin-react` - React support
- `typescript` - Type checking

---

## 🎯 Performance Targets

| Metric | Target |
|--------|--------|
| Page Load | < 2s |
| Camera FPS | 30fps |
| Detection Latency | < 100ms |
| Bundle Size | < 500KB |

---

## 📋 Checklist for New Features

- [ ] Create component in appropriate folder
- [ ] Add TypeScript interfaces
- [ ] Implement responsive design (mobile-first)
- [ ] Add error handling
- [ ] Test on mobile viewport
- [ ] Update navigation if needed
- [ ] Add to this documentation

---

## 🔗 Useful Resources

- [MediaPipe Pose Docs](https://google.github.io/mediapipe/solutions/pose.html)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [React Docs](https://react.dev)
- [Lucide Icons](https://lucide.dev)

---

**Quick Start Commands:**
```bash
# Install
pnpm install

# Run dev
pnpm run dev

# Build
pnpm run build

# Format code (if configured)
pnpm run format
```

---

**Last Updated**: May 12, 2026
