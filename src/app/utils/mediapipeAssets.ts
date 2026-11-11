/**
 * Where the MediaPipe Pose runtime is loaded from.
 *
 * Both the camera screen and the pose worker must agree on this, so the logic
 * lives here instead of being duplicated at each call site.
 *
 * The assets are vendored into `public/mediapipe/pose/` by
 * `scripts/vendor-mediapipe.mjs`, which Vite copies into `dist/` and Capacitor
 * then bundles into the native project. That makes pose detection work with no
 * network at all — the requirement for a real offline app.
 *
 * `import.meta.env.BASE_URL` is used rather than a bare leading slash so the
 * paths stay correct if the web build is ever served from a sub-path.
 */
const VENDORED_BASE = `${import.meta.env.BASE_URL}mediapipe/pose/`;
const VENDORED_HANDS_BASE = `${import.meta.env.BASE_URL}mediapipe/hands/`;

/**
 * Build the `locateFile` handler for MediaPipe. It receives just a filename
 * (e.g. 'pose_solution_simd_wasm_bin.wasm') and must return a full URL.
 */
export const mediapipeLocateFile = (file: string): string => `${VENDORED_BASE}${file}`;

/**
 * Resolve an absolute URL for a vendored asset, used for preflight checks.
 */
export const mediapipeAssetUrl = (file: string): string => `${VENDORED_BASE}${file}`;

export const mediapipeHandsLocateFile = (file: string): string => `${VENDORED_HANDS_BASE}${file}`;

export const mediapipeHandsAssetUrl = (file: string): string => `${VENDORED_HANDS_BASE}${file}`;

/**
 * Files that must be present for pose detection to start. Used to fail loudly
 * with an actionable message instead of hanging on a blank camera screen when
 * the vendor step was skipped or the asset list drifted.
 */
export const MEDIAPIPE_REQUIRED_ASSETS = [
  'pose_solution_simd_wasm_bin.wasm',
  'pose_solution_packed_assets.data',
  'pose_landmark_lite.tflite',
] as const;

export const MEDIAPIPE_HANDS_REQUIRED_ASSETS = [
  'hands_solution_simd_wasm_bin.wasm',
  'hands_solution_packed_assets.data',
  'hands.binarypb',
  'hand_landmark_lite.tflite',
] as const;

/**
 * Verify the vendored runtime is actually reachable. Resolves to an error
 * string, or null when everything checks out.
 */
const verifyAssets = async (
  assets: readonly string[],
  getUrl: (file: string) => string,
  label: string
): Promise<string | null> => {
  for (const asset of assets) {
    const url = getUrl(asset);
    try {
      let res = await fetch(url, { method: 'HEAD' });
      if (res.status === 405 || (!res.ok && res.status !== 404)) {
        // Fallback to GET with byte range if server forbids HEAD
        res = await fetch(url, { method: 'GET', headers: { Range: 'bytes=0-0' } });
      }
      if (!res.ok && res.status !== 206 && res.status !== 304) {
        return `${label} asset "${asset}" is missing (HTTP ${res.status}). Reinstall dependencies and rebuild.`;
      }
    } catch {
      // In native WebViews (capacitor://localhost) or file schemes, HEAD may reject.
      // Attempt lightweight GET before declaring failure.
      try {
        const getRes = await fetch(url, { method: 'GET' });
        if (!getRes.ok && getRes.status !== 304) {
          return `${label} asset "${asset}" is missing (HTTP ${getRes.status}). Reinstall dependencies and rebuild.`;
        }
      } catch (getErr) {
        const isStandardWeb =
          typeof window !== 'undefined' &&
          (window.location.protocol === 'http:' || window.location.protocol === 'https:');
        if (isStandardWeb) {
          return `${label} asset "${asset}" could not be loaded. Reinstall dependencies and rebuild.`;
        }
        console.warn(`[mediapipeAssets] Preflight check skipped for ${label} asset ${asset}:`, getErr);
      }
    }
  }
  return null;
};

export const verifyMediapipeAssets = (): Promise<string | null> =>
  verifyAssets(MEDIAPIPE_REQUIRED_ASSETS, mediapipeAssetUrl, 'Pose engine');

export const verifyMediapipeHandsAssets = (): Promise<string | null> =>
  verifyAssets(MEDIAPIPE_HANDS_REQUIRED_ASSETS, mediapipeHandsAssetUrl, 'Hand tracking');
