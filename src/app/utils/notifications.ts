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
const MILESTONE_ID_BASE = 4200;

/**
 * Ask the OS for permission.
 *
 * Only call this from a moment with context (after a first session, from a
 * settings toggle) -- an unexplained cold prompt on launch is the fastest way to
 * get a permanent denial.
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!isCapacitorNative()) return 'unsupported';

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
};

/** Current permission without prompting. Safe to call on every render. */
export const getNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!isCapacitorNative()) return 'unsupported';
  try {
    const status = await LocalNotifications.checkPermissions();
    if (status.display === 'granted') return 'granted';
    if (status.display === 'denied') return 'denied';
    return 'prompt';
  } catch {
    return 'unsupported';
  }
};

const schedule = async (id: number, channel: NotificationChannel) => {
  if (!isCapacitorNative()) return false;
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
