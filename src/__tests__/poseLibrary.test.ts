import { describe, expect, it } from 'vitest';
import { analyzePomMotion, filterPoses, pomMotionLibrary } from '../app/components/poseLibrary';

describe('filterPoses', () => {
  it('filters motions by search text', () => {
    const result = filterPoses(pomMotionLibrary, 'high', 'All');

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('High V');
  });

  it('filters motions with trailing and leading whitespace', () => {
    const result = filterPoses(pomMotionLibrary, '  Scorpion   ', 'All');

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Scorpion');
  });

  it('filters motions tolerating hyphen and space variations', () => {
    const resultWithHyphen = filterPoses(pomMotionLibrary, 'Half-T', 'All');
    const resultWithSpace = filterPoses(pomMotionLibrary, 'half t', 'All');

    expect(resultWithHyphen).toHaveLength(1);
    expect(resultWithHyphen[0].name).toBe('Half T');
    expect(resultWithSpace).toHaveLength(1);
    expect(resultWithSpace[0].name).toBe('Half T');
  });

  it('filters motions by difficulty keyword', () => {
    const advanced = filterPoses(pomMotionLibrary, 'advanced', 'All');
    expect(advanced.length).toBeGreaterThanOrEqual(3);
    expect(advanced.map((p) => p.name)).toContain('Liberty');
    expect(advanced.map((p) => p.name)).toContain('Scorpion');
  });

  it('filters motions by category', () => {
    const result = filterPoses(pomMotionLibrary, '', 'Stunts');

    expect(result).toHaveLength(3);
    expect(result.map((pose) => pose.name)).toEqual(['Liberty', 'Scorpion', 'Arabesque']);
  });
});

describe('analyzePomMotion', () => {
  it('detects a high V from simple landmarks', () => {
    const result = analyzePomMotion({
      11: { x: 0.45, y: 0.35, z: 0 },
      12: { x: 0.55, y: 0.35, z: 0 },
      13: { x: 0.30, y: 0.18, z: 0 },
      14: { x: 0.70, y: 0.18, z: 0 },
      15: { x: 0.18, y: 0.08, z: 0 },
      16: { x: 0.82, y: 0.08, z: 0 },
      23: { x: 0.48, y: 0.55, z: 0 },
      24: { x: 0.52, y: 0.55, z: 0 },
      25: { x: 0.48, y: 0.75, z: 0 },
      26: { x: 0.52, y: 0.75, z: 0 },
      27: { x: 0.48, y: 0.95, z: 0 },
      28: { x: 0.52, y: 0.95, z: 0 },
    });

    expect(result.pose?.name).toBe('High V');
    expect(result.confidence).toBeGreaterThan(0.4);
  });

  it('detects a clap from close hand landmarks', () => {
    const result = analyzePomMotion({
      11: { x: 0.48, y: 0.45, z: 0 },
      12: { x: 0.52, y: 0.45, z: 0 },
      13: { x: 0.46, y: 0.35, z: 0 },
      14: { x: 0.54, y: 0.35, z: 0 },
      15: { x: 0.49, y: 0.30, z: 0 },
      16: { x: 0.51, y: 0.30, z: 0 },
    });

    expect(result.pose?.name).toBe('Clap');
    expect(result.confidence).toBeGreaterThan(0.4);
  });

  it('detects a Low V from downward angled arms', () => {
    const result = analyzePomMotion({
      11: { x: 0.45, y: 0.35, z: 0 },
      12: { x: 0.55, y: 0.35, z: 0 },
      13: { x: 0.35, y: 0.48, z: 0 },
      14: { x: 0.65, y: 0.48, z: 0 },
      15: { x: 0.28, y: 0.62, z: 0 },
      16: { x: 0.72, y: 0.62, z: 0 },
      23: { x: 0.48, y: 0.55, z: 0 },
      24: { x: 0.52, y: 0.55, z: 0 },
    });

    expect(result.pose?.name).toBe('Low V');
    expect(result.confidence).toBeGreaterThan(0.45);
  });

  it('calculates measured joint angles from landmark geometry', async () => {
    const { calculateMeasuredAngles } = await import('../app/components/poseLibrary');
    // Perfectly straight arm: shoulder (0, 0), elbow (0, 1), wrist (0, 2) -> 180 degrees
    const angles = calculateMeasuredAngles({
      11: { x: 0.4, y: 0.2 },
      13: { x: 0.4, y: 0.5 },
      15: { x: 0.4, y: 0.8 },
      23: { x: 0.4, y: 0.8 },
    });

    expect(angles.leftElbow).toBe(180);
  });
});
