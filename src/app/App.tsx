import React, { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { Camera, ShieldCheck } from 'lucide-react';
import { Header } from './components/Header';
import { BottomNavBar, TabType } from './components/BottomNavBar';
import { NavigationDrawer } from './components/NavigationDrawer';
import { useServiceWorkerUpdate } from './hooks/useServiceWorkerUpdate';
import { ServiceWorkerUpdateBanner } from './components/ServiceWorkerUpdateBanner';
import { PoseLibraryScreen } from './components/PoseLibraryScreen';
import { PoseDetailScreen } from './components/PoseDetailScreen';
import { SessionHistoryScreen } from './components/SessionHistoryScreen';
import { HelpSupportScreen } from './components/HelpSupportScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { AboutScreen } from './components/AboutScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { LoadingScreen } from './components/LoadingScreen';
import { AuthScreen } from './components/AuthScreen';
import { INITIAL_POSES } from './data/poses';
import { Pose, PracticeSession, AppSettings, UserProfile, MASTERY_THRESHOLD } from './types';
import { supabase } from '../services/supabaseService';
import { getPendingSessionCount, queuePracticeSession, syncPendingSessions } from '../services/offlineSync';
import {
  checkAndCompleteEmailConfirmation,
  getCurrentUser,
  getVerificationState,
  resolveStartupAuth,
  subscribeToVerification,
  trackAthletePresence,
  supabaseSignOut,
  fetchServerPracticeSessions,
  mergePracticeSessions,
  supabaseGetStunts,
  supabaseGetArchivedStunts,
} from '../services/supabaseApi';
import {
  clearAccountData,
  migrateLegacyAccountData,
  readAccountPoses,
  readAccountSessions,
  resolveStoredAccountId,
  writeAccountPoses,
  writeAccountSessions
} from '../services/accountStorage';
import { applyAdminPoseImages, applyAdminPoseVideos, getBundledPoseImage, isLegacyGoogleUrl } from './utils/poseReferenceImages';
import {
  notifyDailyPracticeReminder,
  notifyMasteryMilestone,
  notifySessionsWaitingToSync,
  scheduleDailyPracticeReminder
} from './utils/notifications';
import { isSystemManager, displayRoleLabel } from './utils/profile';
import type { PoseImageSource } from './utils/poseReferenceImages';
import type { Stunt } from '../types/supabase';
import { setAppLanguage } from './utils/localization';
import { isPoseHidden } from './utils/access';

/*
 * Split the two heavy screens out of the initial bundle.
 *
 * `AICameraScreen` pulls in `@mediapipe/pose` and `@mediapipe/drawing_utils`,
 * which together were the single largest contributor to a ~780 kB entry chunk
 * that every athlete downloaded before they could look at the pose library --
 * and the pose engine is the one part of the app most of them never open.
 * `DarkAdminPage` is only ever reachable by a system manager, so shipping it to
 * every athlete is pure waste.
 *
 * Both are behind a real interaction (tapping the camera tab, entering the
 * console), so there is a natural moment to fetch them and a Suspense boundary
 * to cover the gap.
 */
const AICameraScreen = lazy(() =>
  import('./components/AICameraScreen').then((m) => ({ default: m.AICameraScreen }))
);
const DarkAdminPage = lazy(() =>
  import('./components/DarkAdminPage').then((m) => ({ default: m.DarkAdminPage }))
);

/**
 * Fallback shown while the camera chunk downloads.
 *
 * Deliberately near-black and edge-to-edge: the camera view is a fullscreen dark
 * surface, so anything lighter would flash the athlete's eyes when the chunk
 * lands. The message names the real cost -- the pose engine is a few megabytes
 * and only needed the first time -- rather than pretending to be instant.
 */
const CameraLoadingFallback = () => (
  <div className="fixed inset-0 z-40 bg-[#050507] flex flex-col items-center justify-center gap-3 p-8 text-center">
    <div className="w-11 h-11 rounded-2xl bg-indigo-500/15 border border-indigo-400/30 flex items-center justify-center">
      <Camera className="w-5 h-5 text-indigo-300" />
    </div>
    <p className="text-sm font-semibold text-white">Loading the pose engine</p>
    <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
      This downloads once, then works offline.
    </p>
  </div>
);

/** Fallback shown while the admin console chunk downloads. */
const AdminLoadingFallback = () => (
  <div className="fixed inset-0 z-50 bg-[#08080c] flex flex-col items-center justify-center gap-3 p-8 text-center">
    <div className="w-11 h-11 rounded-2xl bg-indigo-500/15 border border-indigo-400/30 flex items-center justify-center">
      <ShieldCheck className="w-5 h-5 text-indigo-300" />
    </div>
    <p className="text-sm font-semibold text-white">Loading the admin console</p>
  </div>
);

/**
 * The account id from the previously persisted session, used to pick the right
 * localStorage scope on the very first render — before any effect has run and
 * before the live Supabase session has been resolved.
 */
const storedAccountId = (): string | undefined => resolveStoredAccountId();

/**
 * How long a cached answer for the admin pose images is trusted before a
 * background refresh. Module scope so the effect does not re-run on identity
 * changes: a constant is not a dependency.
 */
const POSE_IMAGES_TTL_MS = 5 * 60 * 1000;

/**
 * How long the splash will wait on the startup auth check before giving up and
 * letting the app proceed on locally persisted state. Long enough to cover a
 * normal request on a mediocre connection, short enough that a black screen is
 * never the answer.
 */
const STARTUP_AUTH_TIMEOUT_MS = 4000;

/** Tabs reachable from the bottom navigation bar. */
const isMainTab = (tab: TabType | 'admin'): tab is TabType =>
  tab === 'library' || tab === 'camera' || tab === 'history' || tab === 'profile';

/** Tabs that render as a drawer sub-screen with their own "Back to Menu". */
const isDrawerSubScreenTab = (tab: TabType | 'admin'): boolean =>
  tab === 'settings' || tab === 'support' || tab === 'about';

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

/**
 * A private copy of the bundled pose library.
 *
 * Deep-cloned rather than handed out directly because the app mutates poses as
 * the athlete progresses (`masteryPercentage` is raised in `handleSaveSession`).
 * Seeding the shared `INITIAL_POSES` constant would let one account's progress
 * leak into the constant and reappear for the next account to sign in.
 */
const bundledPoses = (): Pose[] => JSON.parse(JSON.stringify(INITIAL_POSES)) as Pose[];

/**
 * The pose library for an account: whatever is cached, or the bundled library.
 *
 * This is the fix for an empty Library screen. `readAccountPoses` defaults to an
 * empty list, and the only place `INITIAL_POSES` was ever assigned was inside
 * `handleLogout`. So an account that had never had poses written to its scope --
 * which is every account on a fresh install -- got `[]`, the library rendered
 * empty, and the persist effect then wrote that empty list straight back to
 * storage. Reloading could not recover it, which is why the only available
 * response to an empty library was to reload repeatedly.
 *
 * The bundled poses are the seed and the offline floor; the admin-managed
 * reference images are layered on top separately.
 */
const readLibraryForAccount = (accountId: string | null | undefined): Pose[] => {
  const cached = readAccountPoses(accountId);
  const bundled = bundledPoses();
  if (cached.length === 0) return bundled;

  // Merge bundled poses so newly added library poses (such as Scorpion) appear
  // immediately even if the athlete has existing cached progress from older versions.
  const cachedById = new Map<string, Pose>(cached.map((p) => [p.id, p]));
  const merged: Pose[] = bundled.map((b) => {
    const existing = cachedById.get(b.id);
    return existing ? { ...b, masteryPercentage: existing.masteryPercentage ?? 0 } : b;
  });

  // Preserve any custom or non-bundled cached poses
  for (const c of cached) {
    if (!bundled.some((b) => b.id === c.id)) {
      merged.push(c);
    }
  }

  return merged;
};

export default function App() {
  const { isUpdateAvailable, reloadToUpdate, dismissUpdate } = useServiceWorkerUpdate();
  const [currentTab, setCurrentTab] = useState<TabType | 'admin'>('library');
  const [selectedPose, setSelectedPose] = useState<Pose | null>(null);
  const [activeCameraPose, setActiveCameraPose] = useState<Pose | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Which bottom-nav tab the athlete was on before opening a drawer
  // sub-screen, so "Back to Menu" can return them there.
  const [returnTab, setReturnTab] = useState<TabType>('library');

  // App Startup Lifecycle State
  //
  // This used to drive a fake splash: a timer counting a random 0-100% while
  // narrating "Connecting MediaPipe Pose ML" and "Calibrating joint vector
  // kinematics", none of which was real work. It blocked the app for over a
  // second on every launch, for a varying duration each time, which read as the
  // app being slow to start.
  //
  // There is exactly one thing worth waiting for -- resolving whether a live
  // Supabase session exists, because guessing wrong either flashes the sign-in
  // screen at a signed-in athlete or drops a valid session on the floor. So the
  // gate is now tied to that single real request, and the splash is honest
  // about being the only thing it is waiting on.
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingMessage] = useState<string>('Restoring your session');
  
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
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  // Cached practice history and pose mastery belong to an account, not to the
  // device, so they are read through accountStorage under the current account's
  // scope. Without this the next person to sign in inherited the previous
  // account's history.
  const [poses, setPoses] = useState<Pose[]>(() =>
    readLibraryForAccount(storedAccountId())
  );

  const [sessions, setSessions] = useState<PracticeSession[]>(() =>
    readAccountSessions(storedAccountId())
  );

  // Admin-managed pose reference images.
  //
  // The pose library itself is static data compiled into the bundle, so the
  // pictures an admin uploads in the console have to be fetched separately and
  // overlaid onto it. This holds only the image metadata; the poses the athlete
  // has actually practised against stay in `poses` below and are never
  // overwritten with server data.
  const [poseImages, setPoseImages] = useState<PoseImageSource[]>([]);
  const [serverStunts, setServerStunts] = useState<Stunt[]>(() => {
    try {
      const raw = localStorage.getItem('optistance_server_stunts_cache');
      return raw ? (JSON.parse(raw) as Stunt[]) : [];
    } catch {
      return [];
    }
  });
  const [serverArchivedStunts, setServerArchivedStunts] = useState<Stunt[]>(() => {
    try {
      const raw = localStorage.getItem('optistance_server_archived_stunts_cache');
      return raw ? (JSON.parse(raw) as Stunt[]) : [];
    } catch {
      return [];
    }
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    // Defaults first, then whatever was persisted on top. Merging this way
    // means a settings blob written by an older build still picks up fields
    // added since (e.g. `notificationsEnabled`) instead of leaving them
    // `undefined`, which a raw `JSON.parse` would do.
    const defaults: AppSettings = {
      language: 'English (US)',
      darkMode: true,
      audioCues: true,
      showFormCorrectionOverlay: true,
      notificationsEnabled: false,
      reminderTime: '18:00',
      countdownTimer: 3,
      showSkeletonOverlay: true,
      autoCapture: false,
      cameraFacing: 'user'
    };

    const saved = localStorage.getItem('optistance_settings');
    if (saved) {
      try {
        return { ...defaults, ...JSON.parse(saved) };
      } catch {
        // Corrupt blob: fall through to defaults rather than losing settings.
      }
    }
    return defaults;
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

  // Remind the athlete when sessions are still stuck in the offline queue.
  //
  // This runs on an interval rather than on every session save, because the
  // moment an athlete most needs the nudge is when they have walked away from
  // the app -- saving a session while looking at the screen needs no prompt.
  // One notification is reused per count, so this cannot stack up in the tray.
  useEffect(() => {
    if (!settings.notificationsEnabled || !isAuthenticated || user.isGuest) return;

    const remind = () => {
      if (navigator.onLine) return; // online sessions are already flushing
      // Do not nag while the app is in the foreground: the athlete can already
      // see the pending count on the history screen.
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') return;
      const pending = getPendingSessionCount();
      if (pending > 0) void notifySessionsWaitingToSync(pending);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') remind();
    };

    remind();
    const timer = setInterval(remind, 5 * 60 * 1000);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [settings.notificationsEnabled, isAuthenticated, user.isGuest]);

  // Daily scheduled practice reminder (Native + Web Browser).
  useEffect(() => {
    if (!settings.notificationsEnabled || !isAuthenticated) return;

    const targetTime = settings.reminderTime || '18:00';
    void scheduleDailyPracticeReminder(targetTime);

    const checkDailyReminder = () => {
      const now = new Date();
      const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
        now.getDate()
      ).padStart(2, '0')}`;

      if (localStorage.getItem('optistance_last_daily_reminder_date') === todayKey) return;

      const [hStr, mStr] = targetTime.split(':');
      const targetHour = parseInt(hStr, 10) || 18;
      const targetMin = parseInt(mStr, 10) || 0;
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const targetMinutes = targetHour * 60 + targetMin;

      // Only trigger once local time reaches or passes the target time today
      if (nowMinutes < targetMinutes) return;

      // Skip if the athlete already recorded a session today
      const practicedToday = sessions.some((s) => {
        if (!s.timestamp) return false;
        const d = new Date(s.timestamp);
        if (Number.isNaN(d.getTime())) return false;
        return (
          d.getFullYear() === now.getFullYear() &&
          d.getMonth() === now.getMonth() &&
          d.getDate() === now.getDate()
        );
      });

      if (practicedToday) {
        localStorage.setItem('optistance_last_daily_reminder_date', todayKey);
        return;
      }

      localStorage.setItem('optistance_last_daily_reminder_date', todayKey);
      void notifyDailyPracticeReminder();
    };

    checkDailyReminder();
    const timer = setInterval(checkDailyReminder, 30 * 1000);
    return () => clearInterval(timer);
  }, [settings.notificationsEnabled, settings.reminderTime, isAuthenticated, sessions]);

  // Shared admin-managed pose content and reference images.
  //
  // Active stunts are readable by guests as well as signed-in athletes, so
  // everyone sees the same syllabus. The guest RLS policy excludes archived
  // rows, so only a signed-in account can refresh the shared archive cache.
  //
  // The cache below is the point of this rewrite. It used to re-run on every
  // single visit to the Library tab and issue a fresh `select *` of the whole
  // stunts table each time, so navigating in and out of the library cost a
  // network round trip every time, and the images only appeared once that
  // request came back. On a slow connection the library looked permanently
  // half-loaded and reloading was the only way to force it.
  //
  // Now the data is fetched once per session, cached, and revalidated in the
  // background when it is stale. A first visit still awaits the fetch (there is
  // genuinely nothing to show yet), but every visit after that renders
  // instantly from cache. The bundled images remain the offline fallback.
  const poseImagesLoadedRef = useRef(false);
  const poseImagesFetchedAtRef = useRef(0);

  useEffect(() => {
    const handleArchiveEvent = (e: Event) => {
      const detail = (e as CustomEvent<{ stuntId: string; stuntName?: string; poseKey?: string | null }>).detail;
      if (!detail) return;
      setServerStunts((prev) => {
        const target = prev.find((s) => s.id === detail.stuntId);
        if (target) {
          setServerArchivedStunts((archPrev) => {
            const nextArch = [{ ...target, is_archived: true }, ...archPrev];
            try {
              localStorage.setItem('optistance_server_archived_stunts_cache', JSON.stringify(nextArch));
            } catch {
              // ignore storage quota errors
            }
            return nextArch;
          });
        }
        const nextStunts = prev.filter((s) => s.id !== detail.stuntId);
        try {
          localStorage.setItem('optistance_server_stunts_cache', JSON.stringify(nextStunts));
        } catch {
          // ignore storage quota errors
        }
        return nextStunts;
      });
      poseImagesLoadedRef.current = false;
      poseImagesFetchedAtRef.current = 0;
    };

    const handleRestoreEvent = (e: Event) => {
      const detail = (e as CustomEvent<{ stuntId: string; stuntName?: string; poseKey?: string | null }>).detail;
      if (!detail) return;
      setServerArchivedStunts((prev) => {
        const target = prev.find((s) => s.id === detail.stuntId);
        if (target) {
          setServerStunts((stuntPrev) => {
            const nextStunts = [{ ...target, is_archived: false }, ...stuntPrev];
            try {
              localStorage.setItem('optistance_server_stunts_cache', JSON.stringify(nextStunts));
            } catch {
              // ignore storage quota errors
            }
            return nextStunts;
          });
        }
        const nextArch = prev.filter((s) => s.id !== detail.stuntId);
        try {
          localStorage.setItem('optistance_server_archived_stunts_cache', JSON.stringify(nextArch));
        } catch {
          // ignore storage quota errors
        }
        return nextArch;
      });
      poseImagesLoadedRef.current = false;
      poseImagesFetchedAtRef.current = 0;
    };

    window.addEventListener('optistance:stunt-archive', handleArchiveEvent);
    window.addEventListener('optistance:stunt-restore', handleRestoreEvent);

    return () => {
      window.removeEventListener('optistance:stunt-archive', handleArchiveEvent);
      window.removeEventListener('optistance:stunt-restore', handleRestoreEvent);
    };
  }, []);

  useEffect(() => {
    // Only pull when the library is actually on screen, so no athlete pays for
    // this request during a session that never opens the library.
    if (currentTab !== 'library') return;

    // Already have it, and it is fresh enough. Render from what we have.
    if (poseImagesLoadedRef.current && Date.now() - poseImagesFetchedAtRef.current < POSE_IMAGES_TTL_MS) {
      return;
    }

    let cancelled = false;
    const isBackgroundRevalidation = poseImagesLoadedRef.current;

    void (async () => {
      try {
        const stunts = await supabaseGetStunts();
        if (cancelled) return;
        poseImagesLoadedRef.current = true;
        poseImagesFetchedAtRef.current = Date.now();
        setServerStunts(stunts);
        try {
          localStorage.setItem('optistance_server_stunts_cache', JSON.stringify(stunts));
        } catch {
          // ignore storage quota errors
        }
        setPoseImages(
          stunts.map((s) => ({
            pose_key: s.pose_key,
            reference_image_url: s.reference_image_url,
            reference_video_url: s.reference_video_url,
          }))
        );
      } catch (e) {
        // The bundled poses/images remain available while offline or when the
        // shared syllabus cannot be fetched.
        if (!cancelled && !isBackgroundRevalidation) {
          setPoseImages([]);
        }
        console.warn('Could not load the shared pose syllabus and reference images:', e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentTab]);

  useEffect(() => {
    if (!isAuthenticated || user.isGuest || !user.id) return;

    let cancelled = false;
    void supabaseGetArchivedStunts()
      .then((archived) => {
        if (cancelled) return;
        setServerArchivedStunts(archived);
        try {
          localStorage.setItem('optistance_server_archived_stunts_cache', JSON.stringify(archived));
        } catch {
          // ignore storage quota errors
        }
      })
      .catch((error) => {
        console.warn('Could not refresh the shared archived-pose cache:', error);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user.id, user.isGuest]);

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

  // Track online presence for signed-in athletes so admin console displays
  // real-time active status and newly registered accounts across devices.
  useEffect(() => {
    if (!isAuthenticated || user.isGuest || !user.id) return;
    const cleanup = trackAthletePresence(user.id, {
      fullName: user.name,
      email: user.email,
      role: user.role === 'SystemManager' ? 'SystemManager' : 'Athlete',
      isVerified: user.isVerified === true,
    });
    return () => {
      cleanup();
    };
  }, [isAuthenticated, user.isGuest, user.id, user.name, user.email, user.role, user.isVerified]);

  // Apply theme to the document.
  //
  // The `light-theme` / `dark-theme` class deliberately goes on the app wrapper
  // only, never on <body>. Every rule for it in styles/index.css is a descendant
  // selector (`.light-theme .bg-[#050507]` and so on), so putting the class on
  // <body> leaked the athlete's light-mode overrides into the admin console,
  // which is hardcoded dark and was rendered inside that wrapper. Those rules
  // carry `!important`, so nothing inside the console could win.
  //
  // <body> still tracks the theme for overscroll and for the moment before React
  // mounts, via inline styles, because it is outside the wrapper.
  useEffect(() => {
    const root = document.documentElement;
    setAppLanguage(settings.language);
    root.classList.toggle('dark', settings.darkMode);
    root.classList.toggle('light', !settings.darkMode);

    document.body.style.backgroundColor = settings.darkMode ? '#050507' : '#F8FAFC';
    document.body.style.color = settings.darkMode ? '#E0E0E6' : '#0F172A';
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

    setPoses(readLibraryForAccount(accountId));
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
      // Bound the wait. The splash is now released by this request rather than
      // by a timer, so a request that never settles -- a stalled network, a
      // captive portal in a gym -- would otherwise leave the athlete staring at
      // a splash forever. On timeout we proceed with the locally persisted
      // state, which is the correct outcome for an offline device anyway: the
      // cached library and history are already on disk.
      const timeout = new Promise<'timeout'>((resolve) => {
        setTimeout(() => resolve('timeout'), STARTUP_AUTH_TIMEOUT_MS);
      });

      const result = await Promise.race([resolveStartupAuth({
        isAuthenticated,
        userId: user.id,
        isGuest: user.isGuest,
        emailVerified: user.emailVerified,
      }), timeout]);
      if (cancelled) return;

      if (result === 'timeout') return; // keep persisted state, move on

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
    })()
      .catch((err) => {
        // A failed auth lookup must not strand the app on the splash. Falling
        // through to the sign-in screen is the safe outcome: the athlete can
        // retry, and nothing is silently treated as signed in.
        console.warn('Startup session check failed:', err);
        if (!cancelled) setIsAuthenticated(false);
      })
      .finally(() => {
        // This is the only thing the splash was ever waiting on, so this is
        // the only place that is allowed to end it. It runs on failure too --
        // the splash must never outlive the request it represents.
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-login listener when user returns from clicking Supabase confirmation email
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
        setIsAuthenticated(false);
        return;
      }

      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) {
        setIsPasswordRecovery(false);
        try {
          const current = await getCurrentUser();
          if (current) {
            setUser((prev) => ({
              ...prev,
              id: current.id,
              name: current.fullName || prev.name,
              email: current.email || prev.email,
              role: current.role === 'SystemManager' ? 'SystemManager' : 'Cheer Athlete',
              isGuest: false,
              emailVerified: current.emailVerified !== false,
              isVerified: current.isVerified === true,
              verificationStatus: current.verificationStatus ?? prev.verificationStatus,
            }));
            setIsAuthenticated((wasAuthed) => {
              if (!wasAuthed) {
                setCurrentTab('library');
                setSelectedPose(null);
              }
              return true;
            });
          }
        } catch (err) {
          console.warn('Auto-login on auth state change failed:', err);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Cross-browser / cross-device email confirmation detector:
  // When an athlete clicks the confirmation link in their email app, it often
  // opens in the email app's built-in browser (or redirects to `localhost` on a
  // phone after Supabase has already marked `email_confirmed_at` on the server).
  // When the athlete returns to this browser tab, automatically complete sign-in
  // and flip `emailVerified` to true so they don't get stuck on the banner.
  useEffect(() => {
    if (!isAuthenticated || user.isGuest || user.emailVerified !== false || !user.email) {
      return;
    }

    let cancelled = false;
    const checkNow = async () => {
      if (cancelled) return;
      const res = await checkAndCompleteEmailConfirmation(user.email);
      if (cancelled || !res.confirmed || !res.user) return;
      const u = res.user;
      setUser((prev) => ({
        ...prev,
        id: u.id || prev.id,
        name: u.fullName || prev.name,
        email: u.email || prev.email,
        role: u.role === 'SystemManager' ? 'SystemManager' : 'Cheer Athlete',
        isGuest: false,
        emailVerified: true,
        isVerified: u.isVerified === true || prev.isVerified === true,
        verificationStatus: u.verificationStatus ?? prev.verificationStatus,
      }));
    };

    const handleReturnToTab = () => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        void checkNow();
      }
    };

    window.addEventListener('focus', handleReturnToTab);
    document.addEventListener('visibilitychange', handleReturnToTab);
    const interval = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        void checkNow();
      }
    }, 5000);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', handleReturnToTab);
      document.removeEventListener('visibilitychange', handleReturnToTab);
      clearInterval(interval);
    };
  }, [isAuthenticated, user.isGuest, user.emailVerified, user.email]);

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
    setServerStunts([]);
    // A copy, not the constant: `handleSaveSession` raises `masteryPercentage`
    // on these objects, and mutating the shared `INITIAL_POSES` would carry the
    // signed-out athlete's progress into the next account to use the app.
    setPoses(bundledPoses());
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
      !newSession.isDuplicateUpload && p.id === newSession.poseId
        ? { ...p, masteryPercentage: Math.max(p.masteryPercentage, newSession.accuracyScore) }
        : p
    );
    setPoses(nextPoses);

    // Local notification for a newly earned mastery milestone: only when this
    // session is what pushed the pose across the threshold, not every session
    // that lands above it. `poses` is still the pre-update list here, so it
    // holds the previous mastery value.
    const previousMastery = poses.find((p) => p.id === newSession.poseId)?.masteryPercentage ?? 0;
    if (
      settings.notificationsEnabled &&
      !newSession.isDuplicateUpload &&
      newSession.accuracyScore >= MASTERY_THRESHOLD &&
      previousMastery < MASTERY_THRESHOLD
    ) {
      void notifyMasteryMilestone(newSession.poseName, newSession.accuracyScore);
    }

    const masteredCount = nextPoses.filter((p) => p.masteryPercentage >= MASTERY_THRESHOLD).length;

    // Derive the totals from the session list rather than incrementing a counter
    // alongside it. Two counters drifting apart is what made the profile claim
    // zero sessions while the history screen listed a full account.
    const nextSessions = [newSession, ...sessions.filter((s) => s.id !== newSession.id)];
    setSessions(nextSessions);
    setUser((prevUser) => ({
      ...prevUser,
      ...sessionTotals(nextSessions),
      masteredCount: Math.max(prevUser.masteredCount || 0, masteredCount)
    }));

    // If viewing this pose detail, update that too
    if (!newSession.isDuplicateUpload && selectedPose && selectedPose.id === newSession.poseId) {
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
    if (isPoseHidden(pose)) return;
    setActiveCameraPose(pose);
  };

  const handleStartPracticeWithPoseId = (poseId: string) => {
    const found = displayPoses.find((p) => p.id === poseId);
    // Don't guess. This used to fall back to `poses[0]`, so the "Start First
    // Practice" empty state dropped the athlete into the camera scanning a pose
    // they had never chosen. Callers that mean "let me browse" now say so.
    if (!found) return;
    setActiveCameraPose(found);
  };

  const handleSelectTab = (tab: TabType | 'admin') => {
    setSelectedPose(null);
    setActiveCameraPose(null);
    if (isDrawerSubScreenTab(tab)) {
      // Remember which main tab the athlete came from, so the sub-screen's
      // "Back to Menu" can return there instead of always resetting to Library.
      setReturnTab(isMainTab(currentTab) ? currentTab : returnTab);
    }
    setCurrentTab(tab);
  };

  const handleBackToDrawer = () => {
    setCurrentTab(returnTab);
    setDrawerOpen(true);
  };

  const isAdminScreen = currentTab === 'admin';
  const isDrawerSubScreen = isDrawerSubScreenTab(currentTab);

  // What the athlete sees, as opposed to what is stored. `poses` stays the
  // account's own record (mastery scores the athlete earned); `displayPoses` is
  // that same list with admin-uploaded pictures swapped in and any newly added
  // stunts from the syllabus seamlessly included so all admin poses appear in the UI.
  const displayPoses = useMemo(() => {
    const overlaid = applyAdminPoseVideos(
      applyAdminPoseImages(poses, poseImages),
      poseImages
    );

    const archivedKeys = new Set(serverArchivedStunts.map((s) => s.pose_key).filter(Boolean));
    serverArchivedStunts.forEach((s) => archivedKeys.add(s.id));
    const archivedNames = new Set(serverArchivedStunts.map((s) => s.name.toLowerCase().trim()));

    // Archived poses are hidden from athlete view until restored by an admin
    const activeOverlaid = overlaid.filter(
      (p) => !archivedKeys.has(p.id) && !archivedNames.has(p.name.toLowerCase().trim())
    );

    if (serverStunts.length === 0 && serverArchivedStunts.length === 0) {
      return activeOverlaid.filter((pose) => !isPoseHidden(pose));
    }

    const existingKeys = new Set(activeOverlaid.map((p) => p.id));
    const existingNames = new Set(activeOverlaid.map((p) => p.name.toLowerCase().trim()));

    const extraPoses: Pose[] = [];
    for (const s of serverStunts) {
      if (s.pose_key && existingKeys.has(s.pose_key)) continue;
      if (existingNames.has(s.name.toLowerCase().trim())) continue;

      const mapCat = (c?: string): Pose['category'] => {
        const cat = (c || '').toLowerCase();
        if (cat.includes('pom')) return 'Pom Motion';
        if (cat.includes('jump')) return 'Jumps';
        if (cat.includes('tumb')) return 'Tumbling';
        return 'Stunts';
      };

      const mapDiff = (d?: string): Pose['difficulty'] => {
        const diff = (d || '').toLowerCase();
        if (diff === 'intermediate') return 'Intermediate';
        if (diff === 'advanced') return 'Advanced';
        return 'Beginner';
      };

      const fallbackImg = getBundledPoseImage(s.pose_key, s.name) || '/poses/liberty.jpg';
      const effectiveImg = s.reference_image_url && !isLegacyGoogleUrl(s.reference_image_url)
        ? s.reference_image_url
        : fallbackImg;

      extraPoses.push({
        id: s.pose_key || s.id,
        name: s.name,
        category: mapCat(s.category),
        difficulty: mapDiff(s.difficulty_tier),
        description: s.description || s.coaching_cues || 'Coached cheerleading stunt syllabus.',
        practiceTips: s.coaching_cues ? [{ text: s.coaching_cues, type: 'check' }] : [],
        masteryPercentage: 0,
        imageUrl: effectiveImg,
        videoUrl: s.reference_video_url,
        points: s.target_points || 150,
        idealAngles: {},
        commonMistakes: s.common_mistakes ? [s.common_mistakes] : [],
        icuStandardGuideline: 'ICU Competition Standard Stunt Position.',
        defaultSkeleton: { joints: [], lines: [] },
        sampleCorrectionMessage: s.coaching_cues || 'Maintain tight core and steady balance.',
      });
    }

    const availablePoses = extraPoses.length > 0
      ? [...activeOverlaid, ...extraPoses]
      : activeOverlaid;
    return availablePoses.filter((pose) => !isPoseHidden(pose));
  }, [poses, poseImages, serverStunts, serverArchivedStunts]);

  // 1. Initial Loading Screen (Runs first upon app launch)
  if (isLoading) {
    return <LoadingScreen message={loadingMessage} />;
  }

  // 2. Authentication Screen (Log In & Sign Up)
  if (!isAuthenticated || isPasswordRecovery) {
    return (
      <AuthScreen
        onAuthSuccess={handleAuthSuccess}
        onContinueAsGuest={handleContinueAsGuest}
        isPasswordRecovery={isPasswordRecovery}
        onPasswordRecoveryComplete={() => setIsPasswordRecovery(false)}
      />
    );
  }

  // 3. Main Authenticated Application
  return (
    <div className={`min-h-screen relative overflow-x-clip font-sans transition-colors duration-200 ${
      settings.darkMode
        ? 'dark-theme bg-[#050507] text-[#E0E0E6] selection:bg-indigo-500/30 selection:text-white'
        : 'light-theme bg-[#F4F6FB] text-slate-800 selection:bg-indigo-500/20 selection:text-slate-900'
    }`}>
      {/*
        Ambient background wash.

        This used to be three `fixed` divs of 600x600 / 700x700 / 500x400 px,
        each with a `blur(140-160px)` filter, mounted permanently behind every
        screen. A filter that wide has to be rasterised at that resolution and
        re-composited whenever anything in the layer stack changes, so it
        repainted continuously -- and because the divs are `fixed`, scrolling
        forced a recomposite of a roughly 700px blurred surface on every frame.
        On a phone GPU that is the single most expensive thing on the page, and
        it was the main reason the UI felt like it was lagging.

        The same look is now a single static `radial-gradient` painted straight
        into the wrapper's background. Gradients are rasterised once and cached,
        cost nothing to scroll, and look effectively identical at these
        opacities. `will-change` is deliberately not set: hinting a compositor
        layer for a static wash only wastes memory.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: settings.darkMode
            ? 'radial-gradient(60rem 40rem at 12% -8%, rgba(49,46,129,0.28), transparent 60%),' +
              'radial-gradient(64rem 44rem at 105% 108%, rgba(76,5,60,0.22), transparent 60%),' +
              'radial-gradient(48rem 32rem at 50% 42%, rgba(59,7,100,0.16), transparent 65%)'
            : 'radial-gradient(60rem 40rem at 12% -8%, rgba(199,210,254,0.55), transparent 60%),' +
              'radial-gradient(64rem 44rem at 105% 108%, rgba(254,205,211,0.45), transparent 60%),' +
              'radial-gradient(48rem 32rem at 50% 42%, rgba(221,214,254,0.45), transparent 65%)',
        }}
      />

      {/* Fullscreen AI Camera View when active */}
      {(currentTab === 'camera' || activeCameraPose) && (
        <Suspense fallback={<CameraLoadingFallback />}>
          <AICameraScreen
            initialPose={
              activeCameraPose && !isPoseHidden(activeCameraPose)
                ? activeCameraPose
                : null
            }
            allPoses={displayPoses}
            isVerified={user.isVerified === true || isSystemManager(user)}
            isGuest={user.isGuest === true}
            sessions={sessions}
            audioCuesEnabled={settings.audioCues}
            showFormCorrectionOverlay={settings.showFormCorrectionOverlay}
            autoCaptureEnabled={settings.autoCapture}
            onClose={() => {
              setActiveCameraPose(null);
              setCurrentTab('library');
            }}
            onSaveSession={handleSaveSession}
          />
        </Suspense>
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

      {/*
        Admin Panel.

        Portalled to <body> so it sits outside the themed wrapper above. Inside
        it, an athlete on light mode applied ~90 `!important` overrides to the
        console's hardcoded dark palette, so the whole thing rendered as a
        washed-out white-on-white page. It is also `overflow-x-clip`d by the
        wrapper, which the console's own `fixed inset-0` layout does not need.
      */}
      {isAdminScreen &&
        createPortal(
          <Suspense fallback={<AdminLoadingFallback />}>
            <DarkAdminPage
              isAdmin={isSystemManager(user)}
              userName={user.name}
              userRole={displayRoleLabel(user)}
              onBack={() => {
                poseImagesLoadedRef.current = false;
                poseImagesFetchedAtRef.current = 0;
                setCurrentTab('library');
                setDrawerOpen(false);
              }}
            />
          </Suspense>,
          document.body
        )}

      {/* Admin Panel or Main App */}
      {isAdminScreen ? null : selectedPose && !isPoseHidden(selectedPose) ? (
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
            isDrawerOpen={drawerOpen}
          />

          <main className="flex-1 pb-24">
            {currentTab === 'library' && (
              <PoseLibraryScreen
                poses={displayPoses}
                isVerified={user.isVerified === true || isSystemManager(user)}
                isGuest={user.isGuest === true}
                onSelectPose={(pose) => setSelectedPose(pose)}
                onStartPractice={handleStartPractice}
              />
            )}

            {currentTab === 'history' && (
              <SessionHistoryScreen
                sessions={sessions}
                onStartPracticeWithPoseId={handleStartPracticeWithPoseId}
                onBrowseLibrary={() => handleSelectTab('library')}
              />
            )}

            {currentTab === 'profile' && (
              <ProfileScreen
                user={user}
                poses={displayPoses}
                sessions={sessions}
                onUpdateUser={(newVals) => setUser((prev) => ({ ...prev, ...newVals }))}
                onStartPracticeWithPoseId={handleStartPracticeWithPoseId}
              />
            )}

            {/* Note: Camera tab triggers activeCameraPose fullscreen overlay */}
          </main>

          <ServiceWorkerUpdateBanner
            isUpdateAvailable={isUpdateAvailable}
            onUpdate={reloadToUpdate}
            onDismiss={dismissUpdate}
          />

          <BottomNavBar
            currentTab={currentTab}
            onSelectTab={handleSelectTab}
          />
        </div>
      )}
    </div>
  );
}