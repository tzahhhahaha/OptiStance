import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BottomNavBar, TabType } from './components/BottomNavBar';
import { NavigationDrawer } from './components/NavigationDrawer';
import { PoseLibraryScreen } from './components/PoseLibraryScreen';
import { PoseDetailScreen } from './components/PoseDetailScreen';
import { AICameraScreen } from './components/AICameraScreen';
import { SessionHistoryScreen } from './components/SessionHistoryScreen';
import { HelpSupportScreen } from './components/HelpSupportScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { AboutScreen } from './components/AboutScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { LoadingScreen } from './components/LoadingScreen';
import { AuthScreen } from './components/AuthScreen';
import { DarkAdminPage } from './components/DarkAdminPage';
import { INITIAL_POSES, INITIAL_SESSIONS } from './data/poses';
import { Pose, PracticeSession, AppSettings, UserProfile } from './types';

const DEFAULT_USER: UserProfile = {
  name: 'System Manager',
  email: 'admin@optistance.com',
  role: 'SystemManager',
  avatarUrl: '',
  totalSessions: 24,
  totalPracticeMinutes: 180,
  masteredCount: 4
};

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabType | 'admin'>('library');
  const [selectedPose, setSelectedPose] = useState<Pose | null>(null);
  const [activeCameraPose, setActiveCameraPose] = useState<Pose | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // App Startup Lifecycle State: Always show Loading Screen upon opening the app
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingMessage, setLoadingMessage] = useState<string>('Biomechanical Engine');
  
  // Authentication State
  const [user, setUser] = useState<UserProfile>(() => {
    const savedUser = localStorage.getItem('optistance_auth_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        // Force SystemManager role for demo/admin testing
        parsed.role = 'SystemManager';
        parsed.name = 'System Manager';
        return parsed;
      } catch {
        // fallback
      }
    }
    return DEFAULT_USER;
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const savedAuth = localStorage.getItem('optistance_is_authenticated');
    return savedAuth !== null ? savedAuth === 'true' : true;
  });

  const [poses, setPoses] = useState<Pose[]>(() => {
    const saved = localStorage.getItem('optistance_poses');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_POSES;
  });

  const [sessions, setSessions] = useState<PracticeSession[]>(() => {
    const saved = localStorage.getItem('optistance_sessions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_SESSIONS;
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('optistance_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return {
      language: 'English (US)',
      darkMode: true,
      audioCues: true,
      countdownTimer: 3,
      showSkeletonOverlay: true,
      autoCapture: false,
      cameraFacing: 'user'
    };
  });

  // Apply theme class to document body
  useEffect(() => {
    localStorage.setItem('optistance_settings', JSON.stringify(settings));
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      document.body.classList.remove('light-theme');
      document.body.classList.add('dark-theme');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark-theme');
      document.body.classList.add('light-theme');
    }
  }, [settings]);

  // Persist auth & user data
  useEffect(() => {
    localStorage.setItem('optistance_auth_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('optistance_is_authenticated', String(isAuthenticated));
  }, [isAuthenticated]);

  // Persist poses & sessions
  useEffect(() => {
    localStorage.setItem('optistance_poses', JSON.stringify(poses));
  }, [poses]);

  useEffect(() => {
    localStorage.setItem('optistance_sessions', JSON.stringify(sessions));
  }, [sessions]);

  // Handle Authentication flow
  const handleAuthSuccess = (authenticatedUser: UserProfile) => {
    setUser(authenticatedUser);
    setIsAuthenticated(true);
    setCurrentTab('library');
    setSelectedPose(null);
  };

  const handleContinueAsGuest = () => {
    const guestUser: UserProfile = {
      name: 'Guest Athlete',
      email: 'guest@optistance.app',
      role: 'Cheer Athlete',
      avatarUrl: '',
      totalSessions: 12,
      totalPracticeMinutes: 90,
      masteredCount: 2
    };
    setUser(guestUser);
    setIsAuthenticated(true);
    setCurrentTab('library');
    setSelectedPose(null);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setSelectedPose(null);
    setActiveCameraPose(null);
    setDrawerOpen(false);
    setCurrentTab('library');
    localStorage.setItem('optistance_is_authenticated', 'false');
  };

  // Handle saving a practice session
  const handleSaveSession = (newSession: PracticeSession) => {
    setSessions((prev) => [newSession, ...prev]);

    // Update the pose's mastery score
    setPoses((prevPoses) =>
      prevPoses.map((p) => {
        if (p.id === newSession.poseId) {
          const updatedMastery = Math.max(p.masteryPercentage, newSession.accuracyScore);
          return {
            ...p,
            masteryPercentage: updatedMastery
          };
        }
        return p;
      })
    );

    // If viewing this pose detail, update that too
    if (selectedPose && selectedPose.id === newSession.poseId) {
      setSelectedPose((prev) =>
        prev
          ? {
              ...prev,
              masteryPercentage: Math.max(prev.masteryPercentage, newSession.accuracyScore)
            }
          : null
      );
    }
  };

  const handleStartPractice = (pose: Pose) => {
    setActiveCameraPose(pose);
  };

  const handleStartPracticeWithPoseId = (poseId: string) => {
    const found = poses.find((p) => p.id === poseId) || poses[0];
    setActiveCameraPose(found);
  };

  const handleSelectTab = (tab: TabType | string | 'admin') => {
    if (tab === 'admin') {
      setCurrentTab('admin' as any);
      setSelectedPose(null);
      setActiveCameraPose(null);
    } else if (tab === 'camera') {
      setCurrentTab(tab as TabType);
      setActiveCameraPose(null);
    } else {
      setSelectedPose(null);
      setCurrentTab(tab as TabType);
      setActiveCameraPose(null);
    }
  };

  const handleBackToDrawer = () => {
    setCurrentTab('library');
    setDrawerOpen(true);
  };

  const handleNavigate = (page: string) => {
    if (page === 'admin/users' || page === 'admin/thresholds' || page === 'admin') {
      handleSelectTab('admin');
    } else {
      handleSelectTab(page as TabType);
    }
  };

  const isAdminScreen = currentTab === 'admin';
  const isDrawerSubScreen = currentTab === 'settings' || currentTab === 'support' || currentTab === 'about';

  // 1. Initial Loading Screen (Runs first upon app launch)
  if (isLoading) {
    return (
      <LoadingScreen
        message={loadingMessage}
        onComplete={() => setIsLoading(false)}
      />
    );
  }

  // 2. Authentication Screen (Log In & Sign Up)
  if (!isAuthenticated) {
    return (
      <AuthScreen
        onAuthSuccess={handleAuthSuccess}
        onContinueAsGuest={handleContinueAsGuest}
      />
    );
  }

  // 3. Main Authenticated Application
  return (
    <div className={`min-h-screen relative overflow-x-hidden font-sans transition-colors duration-200 ${
      settings.darkMode
        ? 'dark-theme bg-[#050507] text-[#E0E0E6] selection:bg-indigo-500/30 selection:text-white'
        : 'light-theme bg-[#F4F6FB] text-slate-800 selection:bg-indigo-500/20 selection:text-slate-900'
    }`}>
      {/* Immersive UI Ambient Background Glows */}
      <div className="fixed -top-[10%] -left-[5%] w-[600px] h-[600px] bg-indigo-900/20 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed -bottom-[10%] -right-[5%] w-[700px] h-[700px] bg-rose-900/15 rounded-full blur-[160px] pointer-events-none z-0" />
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[400px] bg-purple-900/10 rounded-full blur-[150px] pointer-events-none z-0" />

      {/* Fullscreen AI Camera View when active */}
      {(currentTab === 'camera' || activeCameraPose) && (
        <AICameraScreen
          initialPose={activeCameraPose ?? null}
          allPoses={poses}
          audioCuesEnabled={settings.audioCues}
          onClose={() => {
            setActiveCameraPose(null);
            setCurrentTab('library');
          }}
          onSaveSession={handleSaveSession}
        />
      )}

      {/* Global Navigation Drawer */}
      {!isAdminScreen && (
        <NavigationDrawer
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          currentTab={currentTab}
          onSelectTab={handleSelectTab}
          user={user}
          onLogout={handleLogout}
        />
      )}

      {/* Admin Panel */}
      {isAdminScreen && (
        <DarkAdminPage
          isAdmin={user.role === 'admin' || user.role === 'SystemManager'}
          userName={user.name}
          userRole={user.role}
          onBack={() => {
            setCurrentTab('library');
            setDrawerOpen(true);
          }}
        />
      )}

      {/* Admin Panel or Main App */}
      {isAdminScreen ? null : selectedPose ? (
        <div className="relative z-10 max-w-7xl mx-auto min-h-screen pb-24">
          <PoseDetailScreen
            pose={selectedPose}
            onBack={() => setSelectedPose(null)}
            onStartPractice={handleStartPractice}
          />
        </div>
      ) : isDrawerSubScreen ? (
        /* Drawer Sub-Screens (Preferences, Support, About): Clean View with Dedicated Back-to-Drawer Button */
        <div className="relative z-10 max-w-7xl mx-auto min-h-screen flex flex-col">
          {currentTab === 'settings' && (
            <SettingsScreen
              settings={settings}
              onUpdateSettings={(newVals) => setSettings((prev) => ({ ...prev, ...newVals }))}
              user={user}
              onUpdateUser={(newVals) => setUser((prev) => ({ ...prev, ...newVals }))}
              onLogout={handleLogout}
              onBack={handleBackToDrawer}
            />
          )}

          {currentTab === 'support' && (
            <HelpSupportScreen
              onBack={handleBackToDrawer}
              onContactSupport={() => setDrawerOpen(true)}
              onNavigateTab={handleSelectTab}
            />
          )}

          {currentTab === 'about' && (
            <AboutScreen
              onBack={handleBackToDrawer}
              onNavigateTab={handleSelectTab}
            />
          )}
        </div>
      ) : (
        /* Main Tabs View (Library, History, Profile) */
        <div className="relative z-10 max-w-7xl mx-auto min-h-screen flex flex-col justify-between">
          <Header
            onOpenDrawer={() => setDrawerOpen(true)}
            onOpenProfile={() => setCurrentTab('profile')}
            user={user}
            totalMastered={poses.filter((p) => p.masteryPercentage >= 80).length}
          />

          <main className="flex-1 pb-24">
            {currentTab === 'library' && (
              <PoseLibraryScreen
                poses={poses}
                onSelectPose={(pose) => setSelectedPose(pose)}
                onStartPractice={handleStartPractice}
              />
            )}

            {currentTab === 'history' && (
              <SessionHistoryScreen
                sessions={sessions}
                onStartPracticeWithPoseId={handleStartPracticeWithPoseId}
              />
            )}

            {currentTab === 'profile' && (
              <ProfileScreen
                user={user}
                poses={poses}
                sessions={sessions}
                onUpdateUser={(newVals) => setUser((prev) => ({ ...prev, ...newVals }))}
                onStartPracticeWithPoseId={handleStartPracticeWithPoseId}
                onNavigateToSettings={() => setCurrentTab('settings')}
              />
            )}

            {/* Note: Camera tab triggers activeCameraPose fullscreen overlay */}
          </main>

          <BottomNavBar
            currentTab={currentTab}
            onSelectTab={handleSelectTab}
          />
        </div>
      )}
    </div>
  );
}