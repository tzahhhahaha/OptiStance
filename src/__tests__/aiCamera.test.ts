import { describe, expect, it } from 'vitest';
import { existsSync, statSync } from 'node:fs';
import { analyzePomMotion, calculateMeasuredAngles } from '../app/components/poseLibrary';
import { evaluateFraming } from '../app/utils/framingQuality';
import { getCameraConstraints } from '../app/utils/device';
import {
  mediapipeHandsLocateFile,
  mediapipeLocateFile,
  MEDIAPIPE_HANDS_REQUIRED_ASSETS,
  MEDIAPIPE_REQUIRED_ASSETS,
} from '../app/utils/mediapipeAssets';
import { INITIAL_POSES } from '../app/data/poses';

describe('AI Camera - MediaPipe Asset Integrity & Offline Readiness', () => {
  it('locates all vendored MediaPipe assets inside public/mediapipe/pose', () => {
    for (const asset of MEDIAPIPE_REQUIRED_ASSETS) {
      const url = mediapipeLocateFile(asset);
      expect(url).toContain(`mediapipe/pose/${asset}`);
    }
  });

  it('all required MediaPipe offline model and wasm files exist with non-zero size', () => {
    for (const asset of MEDIAPIPE_REQUIRED_ASSETS) {
      const localPath = `public/mediapipe/pose/${asset}`;
      expect(existsSync(localPath), `Missing MediaPipe asset: ${localPath}`).toBe(true);
      const stat = statSync(localPath);
      expect(stat.size, `MediaPipe asset ${asset} is empty`).toBeGreaterThan(1000);
    }
  });
});

describe('AI Camera - Offline Hand Landmark Assets', () => {
  it('locates hand tracking assets inside the app bundle', () => {
    for (const asset of MEDIAPIPE_HANDS_REQUIRED_ASSETS) {
      expect(mediapipeHandsLocateFile(asset)).toContain(`mediapipe/hands/${asset}`);
      const localPath = `public/mediapipe/hands/${asset}`;
      expect(existsSync(localPath), `Missing hand tracking asset: ${localPath}`).toBe(true);
      expect(statSync(localPath).size, `${asset} is empty`).toBeGreaterThan(0);
    }
  });
});

describe('AI Camera - Camera Device Constraints', () => {
  it('specifies appropriate video resolution and facing mode for athlete training', () => {
    const userConstraints = getCameraConstraints('user');
    expect(userConstraints.audio).toBe(false);
    expect(userConstraints.video).toBeDefined();
    if (typeof userConstraints.video === 'object') {
      expect(userConstraints.video.facingMode).toBe('user');
      expect(userConstraints.video.width).toEqual({ ideal: 1280 });
      expect(userConstraints.video.height).toEqual({ ideal: 720 });
    }

    const envConstraints = getCameraConstraints('environment');
    if (typeof envConstraints.video === 'object') {
      expect(envConstraints.video.facingMode).toBe('environment');
    }
  });
});

describe('AI Camera - Real-Time Landmark Pose Detection', () => {
  it('accurately identifies High V pose landmarks', () => {
    const landmarks = {
      11: { x: 0.45, y: 0.35, z: 0 },
      12: { x: 0.55, y: 0.35, z: 0 },
      13: { x: 0.30, y: 0.18, z: 0 },
      14: { x: 0.70, y: 0.18, z: 0 },
      15: { x: 0.18, y: 0.08, z: 0 },
      16: { x: 0.82, y: 0.08, z: 0 },
      23: { x: 0.48, y: 0.55, z: 0 },
      24: { x: 0.52, y: 0.55, z: 0 },
    };

    const analysis = analyzePomMotion(landmarks);
    expect(analysis.pose?.name).toBe('High V');
    expect(analysis.confidence).toBeGreaterThan(0.6);
  });

  it('accurately identifies Low V pose landmarks', () => {
    const landmarks = {
      11: { x: 0.45, y: 0.35, z: 0 },
      12: { x: 0.55, y: 0.35, z: 0 },
      13: { x: 0.35, y: 0.48, z: 0 },
      14: { x: 0.65, y: 0.48, z: 0 },
      15: { x: 0.28, y: 0.62, z: 0 },
      16: { x: 0.72, y: 0.62, z: 0 },
      23: { x: 0.48, y: 0.55, z: 0 },
      24: { x: 0.52, y: 0.55, z: 0 },
    };

    const analysis = analyzePomMotion(landmarks);
    expect(analysis.pose?.name).toBe('Low V');
    expect(analysis.confidence).toBeGreaterThan(0.6);
  });

  it('accurately identifies T-Motion pose landmarks', () => {
    const landmarks = {
      11: { x: 0.45, y: 0.35, z: 0 },
      12: { x: 0.55, y: 0.35, z: 0 },
      13: { x: 0.28, y: 0.35, z: 0 },
      14: { x: 0.72, y: 0.35, z: 0 },
      15: { x: 0.12, y: 0.35, z: 0 },
      16: { x: 0.88, y: 0.35, z: 0 },
      23: { x: 0.48, y: 0.55, z: 0 },
      24: { x: 0.52, y: 0.55, z: 0 },
    };

    const analysis = analyzePomMotion(landmarks);
    expect(analysis.pose?.name).toBe('T Motion');
    expect(analysis.confidence).toBeGreaterThan(0.6);
  });

  it('returns no pose when confidence is insufficient', () => {
    const analysis = analyzePomMotion({});
    expect(analysis.pose).toBeNull();
    expect(analysis.confidence).toBe(0);
  });

  it('measures joint angles across elbows and shoulders', () => {
    const landmarks = {
      11: { x: 0.4, y: 0.2 },
      13: { x: 0.4, y: 0.5 },
      15: { x: 0.4, y: 0.8 },
      23: { x: 0.4, y: 0.8 },
    };
    const angles = calculateMeasuredAngles(landmarks);
    expect(angles.leftElbow).toBe(180);
  });
});

describe('AI Camera - Framing and Distance Evaluation', () => {
  it('confirms optimal framing when full athlete is visible', () => {
    const landmarks = Array.from({ length: 33 }, (_, i) => ({
      x: 0.5,
      y: 0.1 + (i / 33) * 0.75,
      visibility: 0.95,
    }));
    landmarks[0] = { x: 0.5, y: 0.15, visibility: 0.95 }; // head
    landmarks[11] = { x: 0.4, y: 0.25, visibility: 0.95 }; // left shoulder
    landmarks[12] = { x: 0.6, y: 0.25, visibility: 0.95 }; // right shoulder
    landmarks[23] = { x: 0.45, y: 0.55, visibility: 0.95 }; // left hip
    landmarks[24] = { x: 0.55, y: 0.55, visibility: 0.95 }; // right hip
    landmarks[27] = { x: 0.45, y: 0.85, visibility: 0.95 }; // feet
    landmarks[28] = { x: 0.55, y: 0.85, visibility: 0.95 };

    const feedback = evaluateFraming(landmarks, 'optimal');
    expect(feedback.isFullyInFrame).toBe(true);
    expect(feedback.status).toBe('optimal');
  });

  it('detects when athlete steps too close to the lens', () => {
    const landmarks = Array.from({ length: 33 }, (_, i) => ({
      x: 0.5,
      y: 0.1 + (i / 33) * 0.8,
      visibility: 0.95,
    }));
    // Shoulders taking up entire screen width
    landmarks[11] = { x: 0.05, y: 0.3, visibility: 0.95 };
    landmarks[12] = { x: 0.95, y: 0.3, visibility: 0.95 };

    const feedback = evaluateFraming(landmarks);
    expect(feedback.distanceStatus).toBe('too-close');
    expect(feedback.status).toBe('adjust');
  });
});

describe('AI Camera - Library Compatibility', () => {
  it('all bundled poses have valid skeletons and point structures', () => {
    for (const pose of INITIAL_POSES) {
      expect(pose.id).toBeTruthy();
      expect(pose.name).toBeTruthy();
      expect(pose.imageUrl).toBeTruthy();
      expect(pose.defaultSkeleton.joints.length).toBeGreaterThan(0);
      expect(pose.defaultSkeleton.lines.length).toBeGreaterThan(0);
      expect(pose.points).toBeGreaterThan(0);
    }
  });

  it('includes both High V and Low V in the active pose library', () => {
    const poseIds = INITIAL_POSES.map((p) => p.id);
    expect(poseIds).toContain('high-v');
    expect(poseIds).toContain('low-v');
    expect(poseIds).toContain('t-motion');
    expect(poseIds).toContain('liberty');
  });
});
