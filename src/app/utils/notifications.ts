/**
 * Local notifications.
 *
 * These are deliberately *local* only. Remote push would need an APNs key, an
 * FCM service-account JSON, and a Supabase Edge Function to fan out from -- all
 * of which are secrets and account work, not code. Rather than stub a remote
 * path that cannot work yet, this module does the two things that are genuinely
 * useful on a device that spends most of its time offline:
 *
 *   1. Tells the athlete when practice is waiting to sync.
 *   2. Confirms a mastery milestone right after a session.
 *
 * Everything degrades to a no-op on web and when permission is denied, so no
 * call site needs to branch on platform.
 */

import { LocalNotifications } from '@capacitor/local-notifications';
import { isCapacitorNative } from './device';

export type NotificationPermission = 'granted' | 'denied' | 'prompt' | 'unsupported';

export interface NotificationChannel {
  id: string;
  title: string;
  body: string;
}

/** Stable notification ids, so a re-notification replaces rather than stacks. */
const REMINDER_ID = 4101;
const DAILY_REMINDER_ID = 4105;
const MILESTONE_ID_BASE = 4200;

const isWebNotificationsSupported = (): boolean =>
  typeof window !== 'undefined' && 'Notification' in window;

const mapWebPermission = (perm: globalThis.NotificationPermission): NotificationPermission => {
  if (perm === 'granted') return 'granted';
  if (perm === 'denied') return 'denied';
  return 'prompt';
};

/**
 * Ask the OS or browser for permission.
 *
 * Only call this from a moment with context (after a first session, from a
 * settings toggle) -- an unexplained cold prompt on launch is the fastest way to
 * get a permanent denial.
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (isCapacitorNative()) {
    try {
      const current = await LocalNotifications.checkPermissions();
      if (current.display === 'granted') return 'granted';
      if (current.display === 'denied') return 'denied';

      const asked = await LocalNotifications.requestPermissions();
      if (asked.display === 'granted') return 'granted';
      if (asked.display === 'denied') return 'denied';
      return 'prompt';
    } catch (err) {
      console.warn('[notifications] permission request failed:', err);
      return 'unsupported';
    }
  }

  if (isWebNotificationsSupported()) {
    try {
      if (window.Notification.permission === 'granted') return 'granted';
      if (window.Notification.permission === 'denied') return 'denied';
      const asked = await window.Notification.requestPermission();
      return mapWebPermission(asked);
    } catch (err) {
      console.warn('[notifications] web permission request failed:', err);
      return 'unsupported';
    }
  }

  return 'unsupported';
};

/** Current permission without prompting. Safe to call on every render. */
export const getNotificationPermission = async (): Promise<NotificationPermission> => {
  if (isCapacitorNative()) {
    try {
      const status = await LocalNotifications.checkPermissions();
      if (status.display === 'granted') return 'granted';
      if (status.display === 'denied') return 'denied';
      return 'prompt';
    } catch {
      return 'unsupported';
    }
  }

  if (isWebNotificationsSupported()) {
    try {
      return mapWebPermission(window.Notification.permission);
    } catch {
      return 'unsupported';
    }
  }

  return 'unsupported';
};

const schedule = async (id: number, channel: NotificationChannel): Promise<boolean> => {
  if (isCapacitorNative()) {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id,
            title: channel.title,
            body: channel.body,
            schedule: { at: new Date(Date.now() + 1000) },
            smallIcon: 'ic_stat_icon',
          },
        ],
      });
      return true;
    } catch (err) {
      console.warn(`[notifications] could not schedule "${channel.title}":`, err);
      return false;
    }
  }

  if (isWebNotificationsSupported() && window.Notification.permission === 'granted') {
    try {
      new window.Notification(channel.title, {
        body: channel.body,
        tag: channel.id,
        icon: '/favicon.ico',
      });
      return true;
    } catch (err) {
      console.warn(`[notifications] could not display web notification "${channel.title}":`, err);
      return false;
    }
  }

  return false;
};

/** Clear every notification this module owns (used when the athlete opts out). */
export const clearAllNotifications = async (): Promise<void> => {
  if (!isCapacitorNative()) return;
  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }
  } catch (err) {
    console.warn('[notifications] could not clear pending notifications:', err);
  }
};

/** Format 24-hour "HH:MM" time into friendly 12-hour format (e.g. "6:00 PM"). */
export const formatReminderTime12h = (time24?: string): string => {
  const raw = time24 && /^\d{1,2}:\d{2}$/.test(time24) ? time24 : '18:00';
  const [hStr, mStr] = raw.split(':');
  const h = Math.max(0, Math.min(23, parseInt(hStr, 10) || 18));
  const m = Math.max(0, Math.min(59, parseInt(mStr, 10) || 0));
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
};

/**
 * Schedule or update the repeating daily practice reminder on native Capacitor.
 * On web browsers, `App.tsx` checks the current local time against `reminderTime`.
 */
export const scheduleDailyPracticeReminder = async (reminderTime = '18:00'): Promise<boolean> => {
  const raw = /^\d{1,2}:\d{2}$/.test(reminderTime) ? reminderTime : '18:00';
  const [hStr, mStr] = raw.split(':');
  const hour = Math.max(0, Math.min(23, parseInt(hStr, 10) || 18));
  const minute = Math.max(0, Math.min(59, parseInt(mStr, 10) || 0));

  if (!isCapacitorNative()) return true;

  try {
    await LocalNotifications.cancel({ notifications: [{ id: DAILY_REMINDER_ID }] }).catch(() => {});
    await LocalNotifications.schedule({
      notifications: [
        {
          id: DAILY_REMINDER_ID,
          title: 'Time for Cheer Practice!',
          body: 'Keep your pose accuracy sharp — complete a quick practice session today.',
          schedule: {
            on: { hour, minute },
            repeats: true,
            allowWhileIdle: true,
          },
          smallIcon: 'ic_stat_icon',
        },
      ],
    });
    return true;
  } catch (err) {
    console.warn('[notifications] could not schedule daily practice reminder:', err);
    return false;
  }
};

export const notifyDailyPracticeReminder = async (): Promise<boolean> => {
  return schedule(DAILY_REMINDER_ID, {
    id: 'daily-practice-reminder',
    title: 'Time for Cheer Practice!',
    body: 'Keep your pose accuracy sharp — complete a quick practice session today.',
  });
};

export const notifySessionsWaitingToSync = async (pendingCount: number): Promise<boolean> => {
  if (pendingCount <= 0) return false;
  return schedule(REMINDER_ID, {
    id: 'pending-sync',
    title: `${pendingCount} session${pendingCount === 1 ? '' : 's'} waiting to sync`,
    body: 'Reconnect to the internet to back up your practice history.',
  });
};

export const notifyMasteryMilestone = async (poseName: string, accuracy: number): Promise<boolean> => {
  // Reuse one id per pose so repeated milestones for the same pose replace
  // rather than stacking up in the tray.
  let hash = 0;
  for (let i = 0; i < poseName.length; i += 1) hash = (hash * 31 + poseName.charCodeAt(i)) | 0;
  const id = MILESTONE_ID_BASE + Math.abs(hash % 500);

  return schedule(id, {
    id: `mastery-${poseName}`,
    title: `${poseName} mastered`,
    body: `You hit ${accuracy}% accuracy. Keep the streak going.`,
  });
};
