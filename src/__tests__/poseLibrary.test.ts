import { describe, expect, it } from 'vitest';
import { analyzePomMotion, filterPoses, pomMotionLibrary } from '../app/components/poseLibrary';

describe('filterPoses', () => {
  it('filters motions by search text', () => {
    const result = filterPoses(pomMotionLibrary, 'high', 'All');

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('High V');
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
});
