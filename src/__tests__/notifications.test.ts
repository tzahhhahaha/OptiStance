/**
 * Guards on the notification helper.
 *
 * The whole module is a no-op off-device, so the tests here are about the two
 * things that can actually lie to the athlete: claiming a capability that does
 * not exist, and firing a notification nobody opted into.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

type Display = 'prompt' | 'granted' | 'denied';
type QueuedNotification = { id: number; title: string; body: string };
type SchedulePayload = { notifications: QueuedNotification[] };
type PermissionResult = { display: Display };

// Typed via the `vi.fn` generic rather than unused parameters, so the call
// signatures are known without tripping the unused-vars lint rule.
const schedule = vi.fn<(payload: SchedulePayload) => Promise<void>>(async () => undefined);
const checkPermissions = vi.fn<() => Promise<PermissionResult>>(async () => ({ display: 'prompt' }));
const requestPermissions = vi.fn<() => Promise<PermissionResult>>(async () => ({ display: 'granted' }));
const getPending = vi.fn<() => Promise<{ notifications: QueuedNotification[] }>>(async () => ({
  notifications: [],
}));
const cancel = vi.fn<(payload: SchedulePayload) => Promise<void>>(async () => undefined);

// The factory is hoisted above the `const` declarations above, so each entry
// delegates through an arrow function: the reference is only read when the
// module under test actually calls it, which is after initialisation.
vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    schedule: (payload: SchedulePayload) => schedule(payload),
    checkPermissions: () => checkPermissions(),
    requestPermissions: () => requestPermissions(),
    getPending: () => getPending(),
    cancel: (payload: SchedulePayload) => cancel(payload),
  },
}));

let isNative = true;
vi.mock('../app/utils/device', () => ({
  isCapacitorNative: () => isNative,
}));

import {
  clearAllNotifications,
  getNotificationPermission,
  notifyMasteryMilestone,
  notifySessionsWaitingToSync,
  requestNotificationPermission
} from '../app/utils/notifications';

beforeEach(() => {
  isNative = true;
  schedule.mockClear();
  checkPermissions.mockReset().mockResolvedValue({ display: 'prompt' });
  requestPermissions.mockReset().mockResolvedValue({ display: 'granted' });
  getPending.mockReset().mockResolvedValue({ notifications: [] });
  cancel.mockClear();
});

/** Pull the single notification a test just scheduled. */
const lastScheduled = (call = 0): QueuedNotification => {
  const payload = schedule.mock.calls[call][0];
  expect(payload).toBeDefined();
  return payload.notifications[0];
};

describe('permission reporting', () => {
  it('reports unsupported in a browser rather than pretending', async () => {
    isNative = false;
    expect(await getNotificationPermission()).toBe('unsupported');
    expect(await requestNotificationPermission()).toBe('unsupported');
    expect(schedule).not.toHaveBeenCalled();
  });

  it('does not prompt when permission is already granted', async () => {
    checkPermissions.mockResolvedValue({ display: 'granted' });
    expect(await requestNotificationPermission()).toBe('granted');
    expect(requestPermissions).not.toHaveBeenCalled();
  });

  it('surfaces a denial instead of retrying the prompt', async () => {
    checkPermissions.mockResolvedValue({ display: 'denied' });
    expect(await requestNotificationPermission()).toBe('denied');
    expect(requestPermissions).not.toHaveBeenCalled();
  });

  it('prompts when the OS has not been asked yet', async () => {
    expect(await requestNotificationPermission()).toBe('granted');
    expect(requestPermissions).toHaveBeenCalledTimes(1);
  });

  it('degrades to unsupported when the plugin throws', async () => {
    checkPermissions.mockRejectedValue(new Error('no plugin registered'));
    expect(await getNotificationPermission()).toBe('unsupported');
  });
});

describe('scheduling', () => {
  it('says nothing when there is nothing to sync', async () => {
    expect(await notifySessionsWaitingToSync(0)).toBe(false);
    expect(schedule).not.toHaveBeenCalled();
  });

  it('pluralises the pending-sync reminder', async () => {
    expect(await notifySessionsWaitingToSync(1)).toBe(true);
    expect(lastScheduled().title).toBe('1 session waiting to sync');

    schedule.mockClear();
    expect(await notifySessionsWaitingToSync(4)).toBe(true);
    expect(lastScheduled().title).toBe('4 sessions waiting to sync');
  });

  it('reuses one notification id so reminders do not stack up', async () => {
    await notifySessionsWaitingToSync(2);
    await notifySessionsWaitingToSync(7);
    expect(lastScheduled(1).id).toBe(lastScheduled(0).id);
  });

  it('reports failure instead of throwing when scheduling fails', async () => {
    schedule.mockRejectedValueOnce(new Error('no channel'));
    expect(await notifySessionsWaitingToSync(3)).toBe(false);
  });

  it('gives each pose a stable milestone id so repeats replace', async () => {
    await notifyMasteryMilestone('Liberty', 88);
    const first = lastScheduled().id;
    schedule.mockClear();
    await notifyMasteryMilestone('Liberty', 91);
    expect(lastScheduled().id).toBe(first);
  });

  it('does not collide milestone ids across different poses', async () => {
    await notifyMasteryMilestone('Liberty', 88);
    await notifyMasteryMilestone('Arabesque', 90);
    expect(lastScheduled(1).id).not.toBe(lastScheduled(0).id);
  });

  it('stays silent off-device', async () => {
    isNative = false;
    expect(await notifySessionsWaitingToSync(5)).toBe(false);
    expect(await notifyMasteryMilestone('Liberty', 90)).toBe(false);
    expect(schedule).not.toHaveBeenCalled();
  });
});

describe('clearing', () => {
  it('cancels pending notifications when the athlete opts out', async () => {
    getPending.mockResolvedValue({ notifications: [{ id: 4101, title: 'a', body: 'b' }] });
    await clearAllNotifications();
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('does not call cancel when nothing is pending', async () => {
    await clearAllNotifications();
    expect(cancel).not.toHaveBeenCalled();
  });

  it('does not throw when clearing fails', async () => {
    getPending.mockRejectedValue(new Error('boom'));
    await expect(clearAllNotifications()).resolves.toBeUndefined();
  });
});
