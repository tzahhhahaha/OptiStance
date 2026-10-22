import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { hapticFeedback } from '../app/utils/haptics';

vi.mock('@capacitor/haptics', () => ({
  Haptics: {
    impact: vi.fn().mockResolvedValue(undefined),
    notification: vi.fn().mockResolvedValue(undefined),
    vibrate: vi.fn().mockResolvedValue(undefined),
  },
  ImpactStyle: {
    Light: 'LIGHT',
    Medium: 'MEDIUM',
    Heavy: 'HEAVY',
  },
  NotificationType: {
    Success: 'SUCCESS',
    Warning: 'WARNING',
    Error: 'ERROR',
  },
}));

describe('hapticFeedback service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('triggers Light impact on target pose hit', async () => {
    await hapticFeedback.targetPoseHit();
    expect(Haptics.impact).toHaveBeenCalledWith({ style: ImpactStyle.Light });
  });

  it('triggers Success notification on hold milestone success', async () => {
    await hapticFeedback.holdMilestoneSuccess();
    expect(Haptics.notification).toHaveBeenCalledWith({ type: NotificationType.Success });
  });

  it('triggers Medium impact on countdown tick', async () => {
    await hapticFeedback.countdownTick();
    expect(Haptics.impact).toHaveBeenCalledWith({ style: ImpactStyle.Medium });
  });

  it('triggers Warning notification on form deviation', async () => {
    await hapticFeedback.formWarning();
    expect(Haptics.notification).toHaveBeenCalledWith({ type: NotificationType.Warning });
  });

  it('gracefully falls back to navigator.vibrate when Haptics throws', async () => {
    vi.mocked(Haptics.impact).mockRejectedValueOnce(new Error('Device unsupported'));
    const vibrateSpy = vi.fn();
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrateSpy,
      configurable: true,
      writable: true,
    });

    await hapticFeedback.targetPoseHit();
    expect(vibrateSpy).toHaveBeenCalledWith(35);
  });
});
