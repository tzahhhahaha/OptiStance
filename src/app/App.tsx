import React, { useState, useEffect, useRef } from 'react';
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
import { INITIAL_POSES } from './data/poses';
import { Pose, PracticeSession, AppSettings, UserProfile, MASTERY_THRESHOLD } from './types';
import { queuePracticeSession, syncPendingSessions } from '../services/offlineSync';
import {
  getVerificationState,
  resolveStartupAuth,
  subscribeToVerification,
  supabaseSignOut,
  fetchServerPracticeSessions,
  mergePracticeSessions
} from '../services/supabaseApi';
import {
  clearAccountData,
  migrateLegacyAccountData,
  readAccountPoses,
  readAccountSessions,
  writeAccountPoses,
  writeAccountSessions
} from '../services/accountStorage';

/**
 * The account id from the previously persisted session, used to pick the right
 * localStorage scope on the very first render — before any effect has run and
 * before the live Supabase session has been resolved. Returns undefined for a
 * guest or a first-time visitor, which maps to the guest scope.
 */
const storedAccountId = (): string | undefined => {
  try {
    const raw = localStorage.getItem('optistance_auth_user');
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Partial<UserProfile> | null;
    return parsed && !parsed.isGuest && parsed.id ? parsed.id : undefined;
  } catch {
    return undefined;
  }
};

const DEFAULT_USER: UserProfile = {
  name: 'Guest Athlete',
  email: 'guest@optistance.app',
  role: 'Cheer Athlete',
  avatarUrl: '',
  totalSessions: 0,
  totalPracticeMinutes: 0,
  masteredCount: 0
};

/**
 * Profile totals derived from the practice history.
 *
 * The profile used to keep its own counters and increment them on save, while
 * the history lived in a separate list. The two drifted, so the profile could
 * report zero sessions next to a full history screen. Deriving both numbers from
 * the one list makes that class of bug unrepresentable.
 */
const sessionTotals = (sessions: PracticeSession[]) => ({
  totalSessions: sessions.length,
  totalPracticeMinutes: sessions.reduce(
    (total, session) => total + Math.round((session.durationSeconds || 0) / 60),
    0
  )
});

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabType | 'admin'>('library');
  const [selectedPose, setSelectedPose] = useState<Pose | null>(null);
  const [activeCameraPose, setActiveCameraPose] = useState<Pose | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // App Startup Lifecycle State: Always show Loading Screen upon opening the app
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingMessage] = useState<string>('Biomechanical Engine');
  
  // Authentication State
  const [user, setUser] = useState<UserProfile>(() => {
    const savedUser = localStorage.getItem('optistance_auth_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        // Validate the stored user has a legitimate role
        if (parsed && typeof parsed === 'object' && parsed.name && parsed.email) {
          return parsed as UserProfile;
        }
      } catch {
        // fallback
      }
    }
    return DEFAULT_USER;
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const savedAuth = localStorage.getItem('optistance_is_authenticated');
    return savedAuth !== null ? savedAuth === 'true' : false;
  });

  // Cached practice history and pose mastery belong to an account, not to the
  // device, so they are read through accountStorage under the current account's
  // scope. Without this the next person to sign in inherited the previous
  // account's history.
  const [poses, setPoses] = useState<Pose[]>(() =>
    readAccountPoses(storedAccountId())
  );

  const [sessions, setSessions] = useState<PracticeSession[]>(() =>
    readAccountSessions(storedAccountId())
  );

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

  useEffect(() => {
    const sync = () => {
      if (isAuthenticated && !user.isGuest && user.emailVerified !== false) {
        void syncPendingSessions();
      }
    };

    sync();
    window.addEventListener('online', sync);
    return () => window.removeEventListener('online', sync);
  }, [isAuthenticated, user.isGuest, user.emailVerified]);

  // Live verification gating: watch is_verified on the profile row so locked
  // poses/camera unlock the moment an admin verifies the athlete (and lock
  // again if it is ever revoked). Also do a one-shot fetch to catch races.
  useEffect(() => {
    if (!isAuthenticated || user.isGuest || !user.id) return;
    let cancelled = false;
    void getVerificationState().then(({ isVerified, status }) => {
      if (cancelled) return;
      setUser((prev) =>
        prev.id === user.id &&
        (isVerified !== (prev.isVerified === true) || status !== prev.verificationStatus)
          ? { ...prev, isVerified, verificationStatus: status }
          : prev
      );
    });
    const unsubscribe = subscribeToVerification(user.id, (isVerified) => {
      if (cancelled) return;
      setUser((prev) => ({
        ...prev,
        isVerified,
        // 'rejected'/'pending' both imply not verified; the derived boolean is
        // authoritative, so only widen the status when it is actually verified.
        verificationStatus: isVerified ? 'verified' : prev.verificationStatus,
      }));
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [isAuthenticated, user.isGuest, user.id]);

  // Apply theme class to document body
  useEffect(() => {
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

  // Which account the data currently in `sessions`/`poses` belongs to.
  //
  // React renders the new user one commit before the account-change effect has
  // reloaded the cache, so for that single commit `user` is the incoming account
  // while `sessions` is still the outgoing account's. The persist effect runs in
  // that window and would otherwise copy the previous account's history into the
  // new account's scope. Comparing against this ref makes it skip instead; the
  // follow-up render, after the reload has set both, persists normally.
  const loadedAccountRef = useRef<string | null>(storedAccountId() ?? null);

  // Persist app state to localStorage. Settings and the auth marker stay global
  // (device-level and session-level), while poses and sessions are written under
  // the current account's scope so they cannot be read by the next account to
  // sign in on this device.
  useEffect(() => {
    const accountId = user.isGuest ? null : user.id ?? null;
    localStorage.setItem('optistance_settings', JSON.stringify(settings));
    localStorage.setItem('optistance_auth_user', JSON.stringify(user));
    localStorage.setItem('optistance_is_authenticated', String(isAuthenticated));

    if (loadedAccountRef.current !== accountId) return; // reload still pending
    writeAccountPoses(accountId, poses);
    writeAccountSessions(accountId, sessions);
  }, [settings, user, isAuthenticated, poses, sessions]);

  // Reload cached data whenever the active account changes, then reconcile with
  // the server.
  //
  // This is the fix for account data bleeding across sign-ins: switching accounts
  // now swaps the whole local history instead of leaving the previous account's
  // sessions on screen. The server fetch makes history follow the account, so it
  // is no longer stranded on the device that recorded it.
  useEffect(() => {
    const accountId = user.isGuest ? null : user.id ?? null;

    // Claim the scope before touching storage, so the persist effect's guard sees
    // a matching pair and the reload below is what gets written.
    loadedAccountRef.current = accountId;

    // One-time upgrade: data recorded before per-account scoping existed is
    // attributed to whoever is using the app now, which is the only attribution
    // the old keys carried.
    migrateLegacyAccountData(accountId);

    setPoses(readAccountPoses(accountId));
    const cached = readAccountSessions(accountId);
    setSessions(cached);
    setUser((prev) => ({ ...prev, ...sessionTotals(cached) }));

    if (!accountId) return;

    let cancelled = false;
    void (async () => {
      try {
        const remote = await fetchServerPracticeSessions(accountId);
        if (cancelled) return;
        // Re-read rather than closing over `cached`: a session recorded while the
        // request was in flight must not be dropped by the merge.
        const merged = mergePracticeSessions(readAccountSessions(accountId), remote);
        setSessions(merged);
        setUser((prev) => ({ ...prev, ...sessionTotals(merged) }));
      } catch (e) {
        // Offline or unreachable. The cached history is already on screen, so
        // there is nothing to recover and nothing to tell the athlete yet.
        console.warn('Could not load practice history from the server:', e);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, user.isGuest]);

  // Startup auth resolution:
  //  - If a real Supabase session exists (fresh login, remembered session, or
  //    the redirect after clicking the email confirmation link), load the
  //    profile and enter the app so the user lands on the home screen.
  //  - If localStorage claims an authenticated non-guest user with NO session
  //    behind it, clear it so nobody is auto-logged-in from stale state.
  //
  // Deps are deliberately empty: this resolves the *startup* state exactly
  // once, reading the initial render's values on purpose. Re-running it when
  // isAuthenticated or user changes would fight the normal login/logout
  // handlers below, which own those transitions from that point on.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await resolveStartupAuth({
        isAuthenticated,
        userId: user.id,
        isGuest: user.isGuest,
        emailVerified: user.emailVerified,
      });
      if (cancelled) return;

      if (result.action === 'clear') {
        localStorage.removeItem('optistance_auth_user');
        localStorage.removeItem('optistance_is_authenticated');
        setUser(DEFAULT_USER);
        setIsAuthenticated(false);
      } else if (result.action === 'authenticated') {
        const u = result.user;
        setUser({
          id: u.id,
          name: u.fullName,
          email: u.email,
          role: u.role === 'SystemManager' ? 'SystemManager' : 'Cheer Athlete',
          avatarUrl: '',
          totalSessions: 0,
          totalPracticeMinutes: 0,
          masteredCount: 0,
          isGuest: false,
          emailVerified: u.emailVerified !== false,
          isVerified: u.isVerified === true,
        });
        setIsAuthenticated(true);
        setCurrentTab('library');
        setSelectedPose(null);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle Authentication flow
  const handleAuthSuccess = (authenticatedUser: UserProfile) => {
    setUser(authenticatedUser);
    setIsAuthenticated(true);
    setCurrentTab('library');
    setSelectedPose(null);

    // Re-queue this account's own cached sessions for upload.
    //
    // The cache is read from the authenticated account's scope rather than from
    // whatever happens to be in state. Reading `sessions` here would push the
    // previous account's (or a guest's) history into the new account's database
    // record — guest-captured and never-synced sessions are not in the synced
    // registry, so nothing else would have filtered them out.
    const canSync = !authenticatedUser.isGuest && authenticatedUser.emailVerified !== false;
    if (canSync && authenticatedUser.id) {
      readAccountSessions(authenticatedUser.id).forEach((session) =>
        queuePracticeSession(session, authenticatedUser.id)
      );
    }
  };

  const handleContinueAsGuest = () => {
    const guestUser: UserProfile = {
      id: undefined,
      name: 'Guest Athlete',
      email: 'guest@optistance.app',
      role: 'Cheer Athlete',
      avatarUrl: '',
      totalSessions: 0,
      totalPracticeMinutes: 0,
      masteredCount: 0,
      isGuest: true,
      isVerified: false
    };
    setUser(guestUser);
    setIsAuthenticated(true);
    setCurrentTab('library');
    setSelectedPose(null);
  };

  const handleLogout = () => {
    // Clear the Supabase session too, otherwise the startup resolver would
    // silently sign the user back in on the next launch.
    void supabaseSignOut();
    setIsAuthenticated(false);
    setSelectedPose(null);
    setActiveCameraPose(null);
    setDrawerOpen(false);
    setCurrentTab('library');

    // Drop the account's cached history and pose mastery from the device.
    //
    // Without this the previous account's practice history stayed in state and in
    // localStorage, so whoever signed in next saw it. The account-change effect
    // reloads from the guest scope, but the signed-out account's copy has no
    // reason to remain on a device that is now showing the sign-in screen.
    const accountId = user.isGuest ? null : user.id ?? null;
    if (accountId) clearAccountData(accountId);
    setSessions([]);
    setPoses(INITIAL_POSES);
  };

  // Handle saving a practice session
  const handleSaveSession = (newSession: PracticeSession) => {
    const canSync = !user.isGuest && user.emailVerified !== false;
    queuePracticeSession(newSession, canSync ? user.id : undefined);
    if (navigator.onLine && canSync) {
      void syncPendingSessions();
    }

    // Update the target pose's mastery score first, then derive the mastered count
    // from the freshly updated list (avoids reading stale pose data from this render).
    const nextPoses = poses.map((p) =>
      p.id === newSession.poseId
        ? { ...p, masteryPercentage: Math.max(p.masteryPercentage, newSession.accuracyScore) }
        : p
    );
    setPoses(nextPoses);

    const masteredCount = nextPoses.filter((p) => p.masteryPercentage >= MASTERY_THRESHOLD).length;

    // Derive the totals from the session list rather than incrementing a counter
    // alongside it. Two counters drifting apart is what made the profile claim
    // zero sessions while the history screen listed a full account.
    const nextSessions = [newSession, ...sessions];
    setSessions(nextSessions);
    setUser((prevUser) => ({
      ...prevUser,
      ...sessionTotals(nextSessions),
      masteredCount: Math.max(prevUser.masteredCount || 0, masteredCount)
    }));

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

  const handleSelectTab = (tab: TabType | 'admin') => {
    setSelectedPose(null);
    setActiveCameraPose(null);
    setCurrentTab(tab);
  };

  const handleBackToDrawer = () => {
    setCurrentTab('library');
    setDrawerOpen(true);
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
          isVerified={user.isVerified === true}
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
            totalMastered={poses.filter((p) => p.masteryPercentage >= MASTERY_THRESHOLD).length}
          />

          <main className="flex-1 pb-24">
            {currentTab === 'library' && (
              <PoseLibraryScreen
                poses={poses}
                isVerified={user.isVerified === true}
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