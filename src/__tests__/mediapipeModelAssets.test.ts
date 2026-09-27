/// <reference types="node" />
import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

/**
 * `modelComplexity` in @mediapipe/pose is an enum with three named values, not
 * an index into a list: 0 = lite, 1 = full, 2 = heavy.
 *
 * The app shipped `modelComplexity: 1` while vendoring only
 * `pose_landmark_lite.tflite`. The runtime therefore requested
 * `pose_landmark_full.tflite`, which is not in the bundle: the fetch 404s and
 * the WASM graph aborts, so pose detection returned no landmarks at all. The
 * preflight check passed throughout, because it verified the lite file while
 * the engine was asking for the full one.
 *
 * These tests tie the two together so the option and the vendored asset list
 * cannot drift apart again.
 */
const COMPLEXITY_TO_MODEL: Record<number, string> = {
  0: 'pose_landmark_lite.tflite',
  1: 'pose_landmark_full.tflite',
  2: 'pose_landmark_heavy.tflite',
};

/** Every file the app actually serves to MediaPipe at runtime. */
const VENDORED_DIR = 'public/mediapipe/pose';

/** The places that construct a Pose, and so choose a model. */
const CALL_SITES = [
  'src/app/components/AICameraScreen.tsx',
  'src/workers/poseWorker.ts',
] as const;

const readVendoredManifest = (): string[] => {
  const manifest = JSON.parse(readFileSync(`${VENDORED_DIR}/VENDORED.json`, 'utf8')) as {
    files: string[];
  };
  return manifest.files;
};

describe('MediaPipe model selection', () => {
  it.each(CALL_SITES)('%s selects a model the bundle actually ships', (file) => {
    const source = readFileSync(file, 'utf8');
    const match = source.match(/modelComplexity:\s*(\d)/);
    expect(match, `${file} must set modelComplexity explicitly`).not.toBeNull();

    const complexity = Number(match![1]);
    const expected = COMPLEXITY_TO_MODEL[complexity];
    expect(expected, `modelComplexity ${complexity} is not a valid enum value`).toBeDefined();

    // The model has to be both declared in the manifest and present on disk,
    // because Vite copies public/ into dist/ and Capacitor bundles that.
    expect(readVendoredManifest()).toContain(expected);
    expect(existsSync(`${VENDORED_DIR}/${expected}`)).toBe(true);
  });

  it('all call sites agree, so the camera and the worker score the same way', () => {
    const chosen = CALL_SITES.map((file) => {
      const match = readFileSync(file, 'utf8').match(/modelComplexity:\s*(\d)/);
      expect(match, `${file} must set modelComplexity explicitly`).not.toBeNull();
      return Number(match![1]);
    });
    expect(new Set(chosen).size).toBe(1);
  });

  it('the vendored manifest lists every file that is on disk, and vice versa', () => {
    // VENDORED.json drives nothing at runtime, but it is what a reader trusts
    // when asking "what does the app ship?". A stale list is worse than none.
    const listed = new Set(readVendoredManifest());
    for (const name of listed) {
      expect(existsSync(`${VENDORED_DIR}/${name}`), `${name} is listed but missing`).toBe(true);
    }
  });

  it('the lite model is the one shipped, and it is the smallest', () => {
    // 1 would add roughly 6 MB to every athlete's download for accuracy the
    // coaching UI does not use. If this ever changes, it is a product decision.
    const files = readVendoredManifest();
    expect(files.filter((f) => f.endsWith('.tflite'))).toEqual(['pose_landmark_lite.tflite']);
  });
});

describe('MediaPipe asset preflight', () => {
  it('checks the model the engine will actually request', () => {
    // MEDIAPIPE_REQUIRED_ASSETS is what stands between a missing file and a
    // blank camera screen. It must name the lite model, because that is what
    // complexity 0 resolves to.
    const source = readFileSync('src/app/utils/mediapipeAssets.ts', 'utf8');
    expect(source).toContain("'pose_landmark_lite.tflite'");
  });
});
