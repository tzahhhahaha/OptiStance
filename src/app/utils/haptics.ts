import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/**
 * Native Haptic Feedback service for cheer pose training.
 * Provides tactile pulses on mobile devices when athletes hit target angles,
 * lock holds, or trigger countdowns.
 */

let hapticsSupported: boolean | null = null;

const checkHapticsSupport = async (): Promise<boolean> => {
  if (hapticsSupported !== null) return hapticsSupported;
  try {
    // Basic probe: if Haptics object exists in Capacitor runtime
    if (typeof Haptics?.impact === 'function') {
      hapticsSupported = true;
      return true;
    }
  } catch {
    // Ignore probe errors
  }
  hapticsSupported = false;
  return false;
};

export const hapticFeedback = {
  /**
   * Subtle tactile feedback when an athlete enters the target pose zone (e.g. form >= 80%).
   */
  async targetPoseHit(): Promise<void> {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate(35); } catch { /* ignore */ }
      }
    }
  },

  /**
   * Prominent vibration pulse when an athlete successfully completes a hold duration milestone
   * or triggers a hold capture.
   */
  async holdMilestoneSuccess(): Promise<void> {
    try {
      await Haptics.notification({ type: NotificationType.Success });
    } catch {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate([60, 50, 100]); } catch { /* ignore */ }
      }
    }
  },

  /**
   * Crisp rhythmic tick during countdown ticks (5..6..7..8 or 3..2..1).
   */
  async countdownTick(): Promise<void> {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate(25); } catch { /* ignore */ }
      }
    }
  },

  /**
   * Warning vibration pattern when athlete posture deviates or breaks hold.
   */
  async formWarning(): Promise<void> {
    try {
      await Haptics.notification({ type: NotificationType.Warning });
    } catch {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate([40, 40, 40]); } catch { /* ignore */ }
      }
    }
  },
};
