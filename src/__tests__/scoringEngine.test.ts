import { describe, expect, it } from 'vitest';
import {
  calculateJointAngle,
  calculateTorsoLean,
  calculateVectorElevationFromHorizontal,
  calculateVectorTiltFromVertical,
} from '../app/scoring/angles';
import { scorePose } from '../app/scoring/scorePose';
import { calculateSkillLevel } from '../app/utils/profile';
import { INITIAL_POSES } from '../app/data/poses';

describe('Kinematic Vector Angle Engine', () => {
  it('calculates a 90-degree right angle formed by three orthogonal points', () => {
    // Vertex at (0, 0), Point A at (0, 1) [vertical], Point C at (1, 0) [horizontal]
    const a = { x: 0, y: 1, visibility: 1.0 };
    const b = { x: 0, y: 0, visibility: 1.0 };
    const c = { x: 1, y: 0, visibility: 1.0 };

    const result = calculateJointAngle(a, b, c);
    expect(result).not.toBeNull();
    expect(result?.angle).toBe(90);
  });

  it('calculates a 180-degree locked straight line', () => {
    // Point A at (-1, 0), Vertex at (0, 0), Point C at (1, 0)
    const a = { x: -1, y: 0, visibility: 1.0 };
    const b = { x: 0, y: 0, visibility: 1.0 };
    const c = { x: 1, y: 0, visibility: 1.0 };

    const result = calculateJointAngle(a, b, c);
    expect(result).not.toBeNull();
    expect(result?.angle).toBe(180);
  });

  it('returns null when any landmark has poor visibility', () => {
    const a = { x: 0, y: 1, visibility: 0.1 }; // Low confidence
    const b = { x: 0, y: 0, visibility: 1.0 };
    const c = { x: 1, y: 0, visibility: 1.0 };

    const result = calculateJointAngle(a, b, c);
    expect(result).toBeNull();
  });

  it('calculates vertical torso lean accurately', () => {
    // Shoulders straight above hips
    const shoulder = { x: 0.5, y: 0.3 };
    const hip = { x: 0.5, y: 0.7 };

    const lean = calculateTorsoLean(shoulder, hip);
    expect(lean).toBe(0);
  });

  it('calculates 3D joint and limb alignment angles with camera aspect correction', () => {
    const straightAngle = calculateJointAngle(
      { x: -1, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      16 / 9
    );
    expect(straightAngle?.angle).toBe(180);
    expect(calculateVectorElevationFromHorizontal({ x: 0, y: 0 }, { x: 1, y: 0 }, 16 / 9)).toBe(0);
    expect(calculateVectorTiltFromVertical({ x: 0, y: 0 }, { x: 0, y: 1 }, 16 / 9)).toBe(0);
  });
});

describe('Pose Scoring Engine & ICU Tiers', () => {
  const tMotionPose = INITIAL_POSES.find((p) => p.id === 't-motion') || INITIAL_POSES[0];

  it('computes ICU tier Elite for high form accuracy', () => {
    // Provide synthetic landmarks representing an ideal T-Motion
    const landmarks = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.95 }));
    // Right shoulder (12), right elbow (14), right wrist (16) straight horizontal line:
    landmarks[12] = { x: 0.4, y: 0.35, z: 0, visibility: 0.98 };
    landmarks[14] = { x: 0.25, y: 0.35, z: 0, visibility: 0.98 };
    landmarks[16] = { x: 0.1, y: 0.35, z: 0, visibility: 0.98 };

    // Left shoulder (11), left elbow (13), left wrist (15) straight horizontal line:
    landmarks[11] = { x: 0.6, y: 0.35, z: 0, visibility: 0.98 };
    landmarks[13] = { x: 0.75, y: 0.35, z: 0, visibility: 0.98 };
    landmarks[15] = { x: 0.9, y: 0.35, z: 0, visibility: 0.98 };

    // Hips
    landmarks[24] = { x: 0.45, y: 0.65, z: 0, visibility: 0.98 };
    landmarks[23] = { x: 0.55, y: 0.65, z: 0, visibility: 0.98 };

    const telemetry = scorePose(tMotionPose, landmarks);
    expect(telemetry.evaluations.find((evaluation) => evaluation.jointKey === 'leftShoulder')?.tolerance).toBe(25);
    expect(telemetry.evaluations.find((evaluation) => evaluation.jointKey === 'leftElbow')?.tolerance).toBe(25);
    expect(telemetry.formScore).toBeGreaterThanOrEqual(0);
    expect(telemetry.icuScore).toBeGreaterThanOrEqual(1.0);
    expect(telemetry.icuScore).toBeLessThanOrEqual(10.0);
    expect(['Elite', 'Proficient', 'Form Deduction']).toContain(telemetry.icuTier);
    expect(typeof telemetry.primaryCoachCue).toBe('string');
    expect(telemetry.primaryCoachCue.length).toBeGreaterThan(0);
  });

  it('recognizes kinematic standards and scores each of the 9 bundled poses', () => {
    const dummyLandmarks = Array.from({ length: 33 }, (_, i) => ({
      x: 0.5,
      y: 0.1 + (i / 33) * 0.8,
      z: 0,
      visibility: 0.95,
    }));
    // Base leg differentiation for stunts
    dummyLandmarks[27] = { x: 0.48, y: 0.95, z: 0, visibility: 0.98 }; // left ankle lower
    dummyLandmarks[28] = { x: 0.52, y: 0.70, z: 0, visibility: 0.98 }; // right ankle lifted

    expect(INITIAL_POSES).toHaveLength(9);

    for (const pose of INITIAL_POSES) {
      const result = scorePose(pose, dummyLandmarks);
      expect(result.targetStandard, `Missing standard for ${pose.id}`).not.toBeNull();
      expect(result.targetStandard?.id).toBe(pose.id);
      expect(result.icuScore).toBeGreaterThanOrEqual(1.0);
      expect(result.icuScore).toBeLessThanOrEqual(10.0);
      expect(result.evaluations.length).toBeGreaterThan(0);
      expect(result.primaryCoachCue).toBeTruthy();
    }
  });

  it('accurately scores High V and Low V in waist-up framing when hips have low visibility', () => {
    // Synthetic landmarks where hips (23, 24) and legs (25-28) are cut off / low visibility
    const waistUpLandmarks = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.05 }));

    // High V arm landmarks (visible upper body)
    waistUpLandmarks[11] = { x: 0.40, y: 0.40, z: 0, visibility: 0.95 }; // L shoulder
    waistUpLandmarks[12] = { x: 0.60, y: 0.40, z: 0, visibility: 0.95 }; // R shoulder
    waistUpLandmarks[13] = { x: 0.28, y: 0.25, z: 0, visibility: 0.95 }; // L elbow
    waistUpLandmarks[14] = { x: 0.72, y: 0.25, z: 0, visibility: 0.95 }; // R elbow
    waistUpLandmarks[15] = { x: 0.16, y: 0.10, z: 0, visibility: 0.95 }; // L wrist
    waistUpLandmarks[16] = { x: 0.84, y: 0.10, z: 0, visibility: 0.95 }; // R wrist

    const highVResult = scorePose('high-v', waistUpLandmarks);
    expect(highVResult.isTargetRecognized).toBe(true);
    expect(highVResult.formScore).toBeGreaterThanOrEqual(75);
    expect(highVResult.measuredAngles.leftShoulder).toBeDefined();
    expect(highVResult.measuredAngles.rightShoulder).toBeDefined();

    // Low V arm landmarks (visible upper body)
    waistUpLandmarks[13] = { x: 0.28, y: 0.55, z: 0, visibility: 0.95 }; // L elbow
    waistUpLandmarks[14] = { x: 0.72, y: 0.55, z: 0, visibility: 0.95 }; // R elbow
    waistUpLandmarks[15] = { x: 0.18, y: 0.70, z: 0, visibility: 0.95 }; // L wrist
    waistUpLandmarks[16] = { x: 0.82, y: 0.70, z: 0, visibility: 0.95 }; // R wrist

    const lowVResult = scorePose('low-v', waistUpLandmarks);
    expect(lowVResult.isTargetRecognized).toBe(true);
    expect(lowVResult.formScore).toBeGreaterThanOrEqual(75);
    expect(lowVResult.measuredAngles.leftShoulder).toBeDefined();
    expect(lowVResult.measuredAngles.rightShoulder).toBeDefined();
  });

  it('scores an Arabesque using standing alignment, rear-leg height, and T-arm checks', () => {
    const landmarks = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.98 }));
    landmarks[11] = { x: 0.39, y: 0.3, z: 0, visibility: 0.98 };
    landmarks[12] = { x: 0.69, y: 0.3, z: 0, visibility: 0.98 };
    landmarks[13] = { x: 0.24, y: 0.3, z: 0, visibility: 0.98 };
    landmarks[14] = { x: 0.84, y: 0.3, z: 0, visibility: 0.98 };
    landmarks[15] = { x: 0.09, y: 0.3, z: 0, visibility: 0.98 };
    landmarks[16] = { x: 0.99, y: 0.3, z: 0, visibility: 0.98 };
    landmarks[23] = { x: 0.46, y: 0.5, z: 0, visibility: 0.98 };
    landmarks[24] = { x: 0.54, y: 0.5, z: 0, visibility: 0.98 };
    landmarks[25] = { x: 0.46, y: 0.72, z: 0, visibility: 0.98 };
    landmarks[26] = { x: 0.71, y: 0.5, z: 0, visibility: 0.98 };
    landmarks[27] = { x: 0.46, y: 0.95, z: 0, visibility: 0.98 };
    landmarks[28] = { x: 0.88, y: 0.5, z: 0, visibility: 0.98 };

    const result = scorePose('arabesque', landmarks);
    expect(result.baseLeg).toBe('left');
    expect(result.isTargetRecognized).toBe(true);
    expect(result.measuredAngles.standingKnee).toBe(180);
    expect(result.measuredAngles.liftedKnee).toBe(180);
    expect(result.measuredAngles.standingLegAlignment).toBe(0);
    expect(result.measuredAngles.rearLegElevation).toBe(0);
    expect(result.measuredAngles.leftArmElevation).toBe(0);
    expect(result.measuredAngles.rightArmElevation).toBe(0);
  });

  it('does not recognize an Arabesque when required joint measurements are missing', () => {
    const landmarks = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.98 }));
    landmarks[11] = { x: 0.4, y: 0.3, z: 0, visibility: 0.98 };
    landmarks[12] = { x: 0.6, y: 0.3, z: 0, visibility: 0.98 };
    landmarks[13] = { x: 0.25, y: 0.3, z: 0, visibility: 0.05 };
    landmarks[14] = { x: 0.75, y: 0.3, z: 0, visibility: 0.98 };
    landmarks[15] = { x: 0.1, y: 0.3, z: 0, visibility: 0.98 };
    landmarks[16] = { x: 0.9, y: 0.3, z: 0, visibility: 0.98 };
    landmarks[23] = { x: 0.46, y: 0.5, z: 0, visibility: 0.98 };
    landmarks[24] = { x: 0.54, y: 0.5, z: 0, visibility: 0.98 };
    landmarks[25] = { x: 0.46, y: 0.72, z: 0, visibility: 0.98 };
    landmarks[26] = { x: 0.71, y: 0.5, z: 0, visibility: 0.98 };
    landmarks[27] = { x: 0.46, y: 0.95, z: 0, visibility: 0.98 };
    landmarks[28] = { x: 0.88, y: 0.5, z: 0, visibility: 0.98 };

    const result = scorePose('arabesque', landmarks);
    expect(result.measuredAngles.leftElbow).toBeUndefined();
    expect(result.isTargetRecognized).toBe(false);
    expect(result.formScore).toBeLessThan(100);
  });
});

describe('Athlete Skill Level Progression', () => {
  it('assigns Level 1 Novice to new athletes', () => {
    const level = calculateSkillLevel([], []);
    expect(level.level).toBe(1);
    expect(level.label).toContain('Level 1');
  });

  it('promotes to Level 2 Intermediate when mastering 3+ poses with 75%+ avg', () => {
    const poses = [
      { masteryPercentage: 85 },
      { masteryPercentage: 90 },
      { masteryPercentage: 80 },
    ];
    const sessions = [{ accuracyScore: 78 }, { accuracyScore: 82 }];

    const level = calculateSkillLevel(poses, sessions);
    expect(level.level).toBe(2);
    expect(level.label).toContain('Level 2');
  });

  it('promotes to Level 3 Advanced when mastering 6+ poses with 85%+ avg', () => {
    const poses = [
      { masteryPercentage: 90 },
      { masteryPercentage: 88 },
      { masteryPercentage: 92 },
      { masteryPercentage: 85 },
      { masteryPercentage: 86 },
      { masteryPercentage: 95 },
    ];
    const sessions = [{ accuracyScore: 88 }, { accuracyScore: 92 }];

    const level = calculateSkillLevel(poses, sessions);
    expect(level.level).toBe(3);
    expect(level.label).toContain('Level 3');
  });
});
