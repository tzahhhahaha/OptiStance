/**
 * Copies the MediaPipe Pose runtime into `public/mediapipe/pose/` so the app
 * never fetches it from a CDN.
 *
 * Why this exists
 *   The pose engine used to be pulled from cdn.jsdelivr.net at runtime via
 *   MediaPipe's `locateFile` hook. In a browser that is merely slow; in a
 *   shipped APK it is fatal for the core feature:
 *     - no network  -> the camera screen never finishes loading
 *     - jsdelivr rate-limits or changes -> every user breaks at once, and the
 *       only fix is a new app build
 *   Everything the WASM runtime needs already ships inside the installed
 *   @mediapipe/pose package, so we copy it into `public/`, which Vite emits
 *   into `dist/` and Capacitor then bundles into the native project.
 *
 * Model choice
 *   AICameraScreen and poseWorker both set modelComplexity: 1, which selects
 *   pose_landmark_lite.tflite. The 'full' (6 MB) and 'heavy' (27 MB) models are
 *   deliberately NOT copied - they are only used at complexity 2/3 and would
 *   add ~34 MB to the APK for no benefit. If modelComplexity is ever raised,
 *   add the matching .tflite to MODELS below or detection will fail to load.
 *
 * SIMD
 *   Both the SIMD and the non-SIMD WASM binaries are copied. MediaPipe feature-
 *   detects at runtime and would otherwise fall back to a CDN request on a
 *   device without WASM SIMD, reintroducing the exact bug this script exists
 *   to remove. capacitor.config.json pins minWebViewEngineVersion to 115, so in
 *   practice SIMD is always chosen and the fallback is dead weight (~6 MB).
 *   Delete the two *_wasm_bin.* entries from RUNTIME below to reclaim it once
 *   you are confident every target device supports SIMD.
 *
 * Runs automatically before `dev` and every build (see package.json).
 */
import { copyFile, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'node_modules', '@mediapipe', 'pose');
const target = join(root, 'public', 'mediapipe', 'pose');

/** Runtime glue the WASM loader requests through `locateFile`. */
const RUNTIME = [
  'pose_solution_packed_assets_loader.js',
  'pose_solution_packed_assets.data',
  'pose_solution_simd_wasm_bin.js',
  'pose_solution_simd_wasm_bin.wasm',
  'pose_solution_simd_wasm_bin.data',
  'pose_solution_wasm_bin.js',
  'pose_solution_wasm_bin.wasm',
  'pose_web.binarypb',
];

/** Detection models. Only 'lite' matches modelComplexity: 1. */
const MODELS = ['pose_landmark_lite.tflite'];

const files = [...RUNTIME, ...MODELS];

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

const main = async () => {
  if (!existsSync(source)) {
    console.error(
      `\n[mediapipe] Cannot find ${source}\n` +
        `[mediapipe] Run "npm install" before building.\n`
    );
    process.exit(1);
  }

  // Only copy what the installed version actually ships. A missing optional
  // file (e.g. an empty .data stub) is fine; a missing required one is not.
  const available = new Set(await readdir(source));
  const required = new Set([...RUNTIME.filter((f) => f.endsWith('.wasm')), ...MODELS]);
  const missing = [...required].filter((f) => !available.has(f));

  if (missing.length) {
    console.error(
      `\n[mediapipe] @mediapipe/pose is missing required runtime files:\n` +
        missing.map((f) => `  - ${f}`).join('\n') +
        `\n[mediapipe] The installed version may have changed its file layout.\n` +
        `[mediapipe] Check node_modules/@mediapipe/pose and update RUNTIME/MODELS in\n` +
        `[mediapipe] ${join('scripts', 'vendor-mediapipe.mjs')}.\n`
    );
    process.exit(1);
  }

  await mkdir(target, { recursive: true });

  let total = 0;
  for (const file of files) {
    if (!available.has(file)) continue;
    const from = join(source, file);
    await copyFile(from, join(target, file));
    total += (await stat(from)).size;
  }

  // Provenance stamp: lets the app (and a human debugging a device) tell which
  // build of the engine is bundled instead of guessing.
  const pkg = JSON.parse(await readFile(join(source, 'package.json'), 'utf8'));
  await writeFile(
    join(target, 'VENDORED.json'),
    JSON.stringify({ package: '@mediapipe/pose', version: pkg.version, files, bytes: total }, null, 2)
  );

  console.log(`[mediapipe] Vendored ${files.length} files (${mb(total)}) -> public/mediapipe/pose`);
  console.log(`[mediapipe] v${pkg.version} | model: pose_landmark_lite.tflite (modelComplexity 1)`);
};

main().catch((err) => {
  console.error('[mediapipe] Vendor step failed:', err.message);
  process.exit(1);
});
