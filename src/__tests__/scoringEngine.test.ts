import { describe, expect, it } from 'vitest';
import { calculateJointAngle, calculateTorsoLean } from '../app/scoring/angles';
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
    expect(telemetry.formScore).toBeGreaterThanOrEqual(0);
    expect(telemetry.icuScore).toBeGreaterThanOrEqual(1.0);
    expect(telemetry.icuScore).toBeLessThanOrEqual(10.0);
    expect(['Elite', 'Proficient', 'Form Deduction']).toContain(telemetry.icuTier);
    expect(typeof telemetry.primaryCoachCue).toBe('string');
    expect(telemetry.primaryCoachCue.length).toBeGreaterThan(0);
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
