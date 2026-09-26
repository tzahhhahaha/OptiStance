import { afterEach, describe, expect, it } from 'vitest';
import {
  detectDevice,
  getCameraConstraints,
  getRecommendedCameraFacing,
  isCapacitorNative,
} from '../app/utils/device';

const DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const ANDROID_PHONE_UA =
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36';
const ANDROID_TABLET_UA =
  'Mozilla/5.0 (Linux; Android 13; SM-X700) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const IPAD_UA =
  'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

const setUserAgent = (ua: string) => {
  Object.defineProperty(window.navigator, 'userAgent', { value: ua, configurable: true });
};

const setCapacitor = (cap: unknown) => {
  (window as unknown as { Capacitor?: unknown }).Capacitor = cap;
};

const originalUserAgent = window.navigator.userAgent;

afterEach(() => {
  setUserAgent(originalUserAgent);
  delete (window as unknown as { Capacitor?: unknown }).Capacitor;
});

describe('detectDevice', () => {
  it('detects a desktop browser as web and recommends the front camera', () => {
    setUserAgent(DESKTOP_UA);
    const info = detectDevice();

    expect(info.type).toBe('web');
    expect(info.isMobile).toBe(false);
    expect(info.isNative).toBe(false);
    expect(info.platform).toBe('web');
    expect(info.recommendedCameraFacing).toBe('user');
  });

  it('detects an Android phone and recommends the rear camera', () => {
    setUserAgent(ANDROID_PHONE_UA);
    const info = detectDevice();

    expect(info.type).toBe('mobile');
    expect(info.isMobile).toBe(true);
    expect(info.platform).toBe('android');
    expect(info.recommendedCameraFacing).toBe('environment');
  });

  it('detects an iPhone as iOS mobile', () => {
    setUserAgent(IPHONE_UA);
    const info = detectDevice();

    expect(info.type).toBe('mobile');
    expect(info.platform).toBe('ios');
    expect(info.recommendedCameraFacing).toBe('environment');
  });

  it('detects an iPad as a tablet', () => {
    setUserAgent(IPAD_UA);
    const info = detectDevice();

    expect(info.type).toBe('tablet');
    expect(info.isMobile).toBe(true);
  });

  it('detects an Android tablet (no "Mobile" token) as a tablet', () => {
    setUserAgent(ANDROID_TABLET_UA);
    expect(detectDevice().type).toBe('tablet');
  });

  it('treats the Capacitor native shell as mobile even with a desktop UA', () => {
    setUserAgent(DESKTOP_UA);
    setCapacitor({ isNativePlatform: () => true, getPlatform: () => 'ios' });

    const info = detectDevice();

    expect(info.isNative).toBe(true);
    expect(info.isMobile).toBe(true);
    expect(info.platform).toBe('ios');
    expect(info.recommendedCameraFacing).toBe('environment');
    expect(isCapacitorNative()).toBe(true);
  });

  it('reports non-native when Capacitor is absent', () => {
    setUserAgent(DESKTOP_UA);
    expect(isCapacitorNative()).toBe(false);
  });
});

describe('getRecommendedCameraFacing', () => {
  it('mirrors detectDevice().recommendedCameraFacing', () => {
    setUserAgent(DESKTOP_UA);
    expect(getRecommendedCameraFacing()).toBe('user');

    setUserAgent(ANDROID_PHONE_UA);
    expect(getRecommendedCameraFacing()).toBe('environment');
  });
});

describe('getCameraConstraints', () => {
  it('builds constraints for the requested facing mode', () => {
    const constraints = getCameraConstraints('environment') as MediaStreamConstraints;
    const video = constraints.video as MediaTrackConstraints;

    expect(video.facingMode).toBe('environment');
    expect(video.width).toEqual({ ideal: 1280 });
    expect(video.height).toEqual({ ideal: 720 });
    expect(constraints.audio).toBe(false);
  });

  it('uses the device recommendation by default', () => {
    setUserAgent(ANDROID_PHONE_UA);
    const video = getCameraConstraints().video as MediaTrackConstraints;
    expect(video.facingMode).toBe('environment');
  });
});
