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

/**
 * Build the `locateFile` handler for MediaPipe. It receives just a filename
 * (e.g. 'pose_solution_simd_wasm_bin.wasm') and must return a full URL.
 */
export const mediapipeLocateFile = (file: string): string => `${VENDORED_BASE}${file}`;

/**
 * Resolve an absolute URL for a vendored asset, used for preflight checks.
 */
export const mediapipeAssetUrl = (file: string): string => `${VENDORED_BASE}${file}`;

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

/**
 * Verify the vendored runtime is actually reachable. Resolves to an error
 * string, or null when everything checks out.
 */
export const verifyMediapipeAssets = async (): Promise<string | null> => {
  for (const asset of MEDIAPIPE_REQUIRED_ASSETS) {
    try {
      const res = await fetch(mediapipeAssetUrl(asset), { method: 'HEAD' });
      if (!res.ok) {
        return `Pose engine asset "${asset}" is missing (HTTP ${res.status}). Reinstall dependencies and rebuild.`;
      }
    } catch {
      return `Pose engine asset "${asset}" could not be loaded. Reinstall dependencies and rebuild.`;
    }
  }
  return null;
};
