// Device + camera capability detection.
//
// The app runs both as a web app and as a Capacitor native app (iOS/Android).
// The camera to use differs by device: laptops/desktops have a single front
// webcam, while phones/tablets have front + rear cameras and benefit from the
// rear ("environment") camera for a wider, higher-quality full-body capture.

export type DeviceType = 'web' | 'mobile' | 'tablet';
export type CameraFacing = 'user' | 'environment';

export interface DeviceInfo {
  /** Coarse device class used to pick UI/camera defaults. */
  type: DeviceType;
  /** Phone or tablet (as opposed to desktop/laptop web). */
  isMobile: boolean;
  /** Running inside the Capacitor native shell (the installed iOS/Android app). */
  isNative: boolean;
  platform: 'ios' | 'android' | 'web';
  /** Facing mode the app should start with for this device. */
  recommendedCameraFacing: CameraFacing;
}

const PHONE_UA = /Android.*Mobile|iPhone|iPod|Windows Phone|BlackBerry|IEMobile|Opera Mini|Mobile Safari/i;
const TABLET_UA = /iPad|Android(?!.*Mobile)|Tablet|PlayBook|Silk/i;

const getCapacitor = (): any => {
  if (typeof window === 'undefined') return undefined;
  return (window as any).Capacitor;
};

/** True when running inside the Capacitor native shell rather than a browser. */
export const isCapacitorNative = (): boolean => {
  const cap = getCapacitor();
  if (!cap) return false;
  const flag = typeof cap.isNativePlatform === 'function' ? cap.isNativePlatform() : cap.isNative;
  return Boolean(flag);
};

const getCapacitorPlatform = (): string => {
  const cap = getCapacitor();
  if (cap && typeof cap.getPlatform === 'function') {
    try {
      return String(cap.getPlatform());
    } catch {
      return '';
    }
  }
  return '';
};

/**
 * Inspect the runtime environment and report the device class, platform, and
 * the camera facing mode the app should start with.
 */
export const detectDevice = (): DeviceInfo => {
  if (typeof navigator === 'undefined') {
    return {
      type: 'web',
      isMobile: false,
      isNative: false,
      platform: 'web',
      recommendedCameraFacing: 'user',
    };
  }

  const ua = navigator.userAgent || '';
  const isNative = isCapacitorNative();
  const capPlatform = getCapacitorPlatform().toLowerCase();

  const platform: DeviceInfo['platform'] =
    /iphone|ipad|ipod/i.test(ua) || capPlatform === 'ios'
      ? 'ios'
      : /android/i.test(ua) || capPlatform === 'android'
        ? 'android'
        : 'web';

  // iPadOS 13+ masquerades as desktop Safari; use touch points to detect it.
  const isIPadOS =
    platform === 'web' && /Macintosh/i.test(ua) && (navigator.maxTouchPoints ?? 0) > 1;

  const isTablet = TABLET_UA.test(ua) || isIPadOS;
  const isPhone = PHONE_UA.test(ua) && !isTablet;
  const mobileish = isNative || isPhone || isTablet;

  const type: DeviceType = !mobileish ? 'web' : isTablet ? 'tablet' : 'mobile';

  return {
    type,
    isMobile: mobileish,
    isNative,
    platform,
    // Laptops/desktops use the front webcam; phones/tablets start on the rear
    // camera for a wider, higher-quality shot. Users can still flip the camera.
    recommendedCameraFacing: mobileish ? 'environment' : 'user',
  };
};

/** Facing mode the current device should start with. */
export const getRecommendedCameraFacing = (): CameraFacing => detectDevice().recommendedCameraFacing;

/** MediaTrack constraints suited to the current device and facing mode. */
export const getCameraConstraints = (
  facing: CameraFacing = getRecommendedCameraFacing()
): MediaStreamConstraints => ({
  video: {
    facingMode: facing,
    width: { ideal: 1280 },
    height: { ideal: 720 },
  },
  audio: false,
});
