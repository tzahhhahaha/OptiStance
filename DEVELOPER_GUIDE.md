# 👨‍💻 Developer Onboarding Guide

Welcome to the Cheerleading Pose Trainer development team! This guide will help you get up to speed quickly.

---

## 🎯 Day 1: Setup & Exploration

### Morning: Environment Setup

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd code
   pnpm install
   ```

2. **Run the App**
   ```bash
   pnpm run dev
   ```
   Open http://localhost:5173

3. **Explore the UI**
   - Sign up with any email/password (demo mode)
   - Navigate through all pages
   - Try the camera feature (allow permissions)
   - Practice a pose
   - View your profile

### Afternoon: Code Exploration

4. **Read Documentation**
   - `README.md` - Project overview
   - `PROJECT_PLAN.md` - Comprehensive plan
   - `QUICK_REFERENCE.md` - Quick lookups

5. **Understand the Structure**
   ```
   src/app/
   ├── App.tsx              # Start here - main router
   ├── components/
   │   ├── LoginPage.tsx    # Authentication
   │   ├── HomePage.tsx     # Dashboard
   │   ├── PosePage.tsx     # Pose library
   │   └── CameraView.tsx   # Camera + AI (most complex)
   ```

6. **Key Concepts to Grasp**
   - State management (useState hooks)
   - Page navigation (currentPage state)
   - MediaPipe integration
   - Tailwind CSS utility classes

---

## 🎯 Day 2: First Contribution

### Make a Small Change

**Task**: Add a new achievement badge

1. **Locate the File**
   ```bash
   src/app/components/ProfilePage.tsx
   ```

2. **Find the Achievements Array** (line ~80)
   ```typescript
   {[
     { icon: '🏆', label: 'First Win', unlocked: false },
     // ... other achievements
   ]}
   ```

3. **Add Your Badge**
   ```typescript
   { icon: '🎓', label: 'Quick Learner', unlocked: false },
   ```

4. **Test Your Change**
   - Save the file
   - Check the Profile page
   - Verify the new badge appears

5. **Commit**
   ```bash
   git add src/app/components/ProfilePage.tsx
   git commit -m "Add Quick Learner achievement badge"
   ```

**Congratulations!** 🎉 You've made your first contribution!

---

## 🎯 Week 1: Deep Dive

### Day 3-4: Component Architecture

**Study These Components**:

1. **BottomNav.tsx** - Simple prop handling
   ```typescript
   interface BottomNavProps {
     currentPage: string;
     onNavigate: (page: string) => void;
   }
   ```

2. **HomePage.tsx** - Multiple features
   - Progress display
   - Navigation callbacks
   - Conditional rendering

3. **PosePage.tsx** - Complex state
   - Pose selection
   - Filtering
   - Search (future)

**Exercise**: Add a search feature to PosePage
```typescript
const [searchQuery, setSearchQuery] = useState('');

const filteredPoses = poses.filter(pose => 
  pose.name.toLowerCase().includes(searchQuery.toLowerCase())
);
```

### Day 5: MediaPipe Integration

**Study CameraView.tsx** - This is the most complex component!

**Key Functions**:

1. **startCamera()** - Request camera access
2. **initializePose()** - Setup MediaPipe
3. **onPoseResults()** - Process detection results
4. **handleCapture()** - Take snapshot

**Experiment**:
```typescript
// Try changing detection sensitivity
pose.setOptions({
  minDetectionConfidence: 0.7, // Was 0.5
});
```

**Challenge**: Log landmark data to console
```typescript
const onPoseResults = (results: any) => {
  if (results.poseLandmarks) {
    console.log('Shoulder position:', results.poseLandmarks[11]);
  }
  // ... rest of function
};
```

---

## 🎯 Week 2: Feature Development

### Project Ideas (Pick One)

#### 🟢 Beginner: Add a New Page

**Task**: Create a "Statistics" page

1. Create new component:
   ```typescript
   // src/app/components/StatsPage.tsx
   export function StatsPage({ onBack }: { onBack: () => void }) {
     return (
       <div>
         <h1>Statistics</h1>
         {/* Add charts, graphs, etc. */}
       </div>
     );
   }
   ```

2. Add to App.tsx:
   ```typescript
   import { StatsPage } from './components/StatsPage';
   
   // In return statement
   {currentPage === 'stats' && <StatsPage onBack={() => setCurrentPage('home')} />}
   ```

3. Link from HomePage:
   ```typescript
   <button onClick={() => onNavigate?.('stats')}>
     View Detailed Stats
   </button>
   ```

#### 🟡 Intermediate: Improve Pose Detection

**Task**: Add accuracy calculation for specific body parts

1. **Create angle calculator**:
   ```typescript
   function calculateAngle(
     a: Landmark,
     b: Landmark,
     c: Landmark
   ): number {
     const radians = Math.atan2(c.y - b.y, c.x - b.x) -
                     Math.atan2(a.y - b.y, a.x - b.x);
     let angle = Math.abs(radians * 180.0 / Math.PI);
     if (angle > 180.0) angle = 360 - angle;
     return angle;
   }
   ```

2. **Calculate arm angles**:
   ```typescript
   const leftArmAngle = calculateAngle(
     results.poseLandmarks[11], // shoulder
     results.poseLandmarks[13], // elbow
     results.poseLandmarks[15]  // wrist
   );
   ```

3. **Display feedback**:
   ```typescript
   <div>Left arm angle: {leftArmAngle.toFixed(1)}°</div>
   ```

#### 🔴 Advanced: Backend Integration

**Task**: Connect to Supabase for data persistence

1. **Install Supabase**:
   ```bash
   pnpm add @supabase/supabase-js
   ```

2. **Setup client**:
   ```typescript
   // src/lib/supabase.ts
   import { createClient } from '@supabase/supabase-js';
   
   export const supabase = createClient(
     process.env.SUPABASE_URL!,
     process.env.SUPABASE_KEY!
   );
   ```

3. **Save pose attempts**:
   ```typescript
   const savePoseAttempt = async (data) => {
     const { error } = await supabase
       .from('pose_attempts')
       .insert(data);
   };
   ```

---

## 🛠️ Common Development Tasks

### Adding a New Pose

1. **Open PosePage.tsx**
2. **Add to poses array**:
   ```typescript
   {
     id: '9',
     name: 'Scale',
     category: 'Stunts',
     difficulty: 'Advanced',
     progress: 0,
     description: 'Balance on one leg with other extended'
   }
   ```

### Changing Theme Colors

1. **Open src/styles/theme.css**
2. **Modify CSS variables**:
   ```css
   :root {
     --primary: #3b82f6; /* Change to blue */
   }
   ```

### Adding Icons

1. **Browse** https://lucide.dev
2. **Import**:
   ```typescript
   import { Heart } from 'lucide-react';
   ```
3. **Use**:
   ```tsx
   <Heart className="w-6 h-6 text-red-500" />
   ```

### Creating New Components

**Template**:
```typescript
import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';

interface MyComponentProps {
  onBack: () => void;
  title: string;
}

export function MyComponent({ onBack, title }: MyComponentProps) {
  const [state, setState] = useState('');

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white pb-24">
      <div className="bg-gradient-to-br from-purple-600 to-purple-800 text-white p-6 pb-8 rounded-b-3xl">
        <button onClick={onBack} className="flex items-center gap-2 mb-4">
          <ChevronLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
        <h1 className="text-2xl font-bold">{title}</h1>
      </div>

      <div className="p-4">
        {/* Your content here */}
      </div>
    </div>
  );
}
```

---

## 🐛 Debugging Guide

### React DevTools

1. **Install Extension**
   - Chrome: React Developer Tools
   - Firefox: React DevTools

2. **Inspect Components**
   - Open DevTools → Components tab
   - View props and state
   - Track re-renders

### Common Issues

#### Camera Not Starting
```typescript
// Add debug logs
const startCamera = async () => {
  console.log('Requesting camera...');
  try {
    const stream = await navigator.mediaDevices.getUserMedia({...});
    console.log('Camera started:', stream);
  } catch (error) {
    console.error('Camera error:', error);
  }
};
```

#### State Not Updating
```typescript
// Check if you're mutating state
// ❌ Wrong
const addPose = () => {
  poses.push(newPose); // Mutation!
};

// ✅ Correct
const addPose = () => {
  setPoses([...poses, newPose]); // New array
};
```

#### Tailwind Classes Not Working
```typescript
// ❌ Dynamic classes don't work
className={`text-${color}-600`}

// ✅ Use full class names
className={color === 'purple' ? 'text-purple-600' : 'text-blue-600'}
```

---

## 📚 Learning Resources

### React
- [React Docs](https://react.dev) - Official documentation
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)

### MediaPipe
- [Pose Detection Guide](https://google.github.io/mediapipe/solutions/pose.html)
- [Landmark Reference](https://google.github.io/mediapipe/solutions/pose#pose-landmark-model)

### Tailwind CSS
- [Tailwind Docs](https://tailwindcss.com/docs)
- [Tailwind Cheat Sheet](https://nerdcave.com/tailwind-cheat-sheet)

### TypeScript
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Type Challenges](https://github.com/type-challenges/type-challenges)

---

## 🎓 Best Practices

### Code Style

1. **Use TypeScript Types**
   ```typescript
   // ✅ Good
   interface Props {
     name: string;
     age: number;
   }
   
   // ❌ Avoid
   const MyComponent = (props: any) => {...}
   ```

2. **Destructure Props**
   ```typescript
   // ✅ Good
   export function Card({ title, description }: CardProps) {
   
   // ❌ Avoid
   export function Card(props) {
     return <div>{props.title}</div>
   }
   ```

3. **Use Meaningful Names**
   ```typescript
   // ✅ Good
   const handlePoseSelection = () => {...}
   
   // ❌ Avoid
   const fn1 = () => {...}
   ```

### Component Design

1. **Keep Components Small**
   - Single responsibility
   - < 200 lines of code
   - Extract sub-components

2. **Avoid Prop Drilling**
   ```typescript
   // If passing props through 3+ levels, consider:
   // - Context API
   // - Composition
   // - State management library
   ```

3. **Use Custom Hooks**
   ```typescript
   // Extract reusable logic
   function useCamera() {
     const [stream, setStream] = useState<MediaStream | null>(null);
     // ... camera logic
     return { stream, startCamera, stopCamera };
   }
   ```

### Performance

1. **Memoize Expensive Calculations**
   ```typescript
   const sortedPoses = useMemo(() => {
     return poses.sort((a, b) => a.name.localeCompare(b.name));
   }, [poses]);
   ```

2. **Avoid Inline Functions in JSX**
   ```typescript
   // ❌ Creates new function on each render
   <button onClick={() => handleClick(id)}>
   
   // ✅ Better
   const handleButtonClick = useCallback(() => {
     handleClick(id);
   }, [id]);
   <button onClick={handleButtonClick}>
   ```

---

## 🤝 Collaboration

### Git Workflow

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/add-statistics-page
   ```

2. **Make Changes & Commit**
   ```bash
   git add .
   git commit -m "feat: add statistics page with weekly charts"
   ```

3. **Push & Create PR**
   ```bash
   git push origin feature/add-statistics-page
   # Create PR on GitHub
   ```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new pose to library
fix: resolve camera permission issue
docs: update README with new features
style: format code with prettier
refactor: extract pose calculation logic
test: add unit tests for accuracy calculator
```

### Code Review

**When Reviewing**:
- [ ] Code follows style guide
- [ ] No console.logs left
- [ ] TypeScript types used
- [ ] Responsive on mobile
- [ ] Handles errors gracefully

---

## 🎯 Next Steps

### Week 3+: Choose Your Path

#### 🎨 Frontend Focus
- Implement animations with Motion
- Create micro-interactions
- Add skeleton loading states
- Improve accessibility (WCAG 2.1)

#### 🧠 AI/ML Focus
- Improve pose accuracy algorithm
- Add custom pose training
- Implement pose comparison
- Research other ML models

#### 🔌 Backend Focus
- Setup Supabase database
- Create REST/GraphQL API
- Implement authentication
- Add real-time sync

#### 📱 Mobile Focus
- Convert to React Native
- Add offline support (PWA)
- Implement push notifications
- Optimize for battery life

---

## 💬 Getting Help

### Internal Resources
1. Check existing documentation
2. Search codebase for examples
3. Review similar components

### External Resources
1. Stack Overflow
2. React Discord
3. MediaPipe GitHub Issues

### Ask the Team
- Slack: #dev-cheerleading-app
- Email: dev-team@cheerapp.com
- Stand-up: Daily 10 AM

---

## 🎉 Conclusion

You're now ready to contribute to the Cheerleading Pose Trainer!

**Remember**:
- Start small, think big
- Ask questions
- Test thoroughly
- Have fun coding! 🚀

---

**Welcome aboard! 🎊**

*Last updated: May 12, 2026*
