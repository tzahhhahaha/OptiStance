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
  type TestLandmarks = Record<number, { x: number; y: number; z?: number; visibility?: number }>;

  const scaleLandmarks = (landmarks: TestLandmarks, scale: number): TestLandmarks => {
    const scaled: TestLandmarks = {};
    for (const [key, landmark] of Object.entries(landmarks)) {
      scaled[Number(key)] = {
        ...landmark,
        x: 0.5 + (landmark.x - 0.5) * scale,
        y: 0.5 + (landmark.y - 0.5) * scale,
      };
    }
    return scaled;
  };

  const withPoseLandmarks = (
    left: { knee: { x: number; y: number }; ankle: { x: number; y: number } },
    right: { knee: { x: number; y: number }; ankle: { x: number; y: number } }
  ) => ({
    11: { x: 0.4, y: 0.2, visibility: 0.9 },
    12: { x: 0.6, y: 0.2, visibility: 0.9 },
    23: { x: 0.45, y: 0.48, visibility: 0.9 },
    24: { x: 0.55, y: 0.48, visibility: 0.9 },
    25: { ...left.knee, visibility: 0.9 },
    26: { ...right.knee, visibility: 0.9 },
    27: { ...left.ankle, visibility: 0.9 },
    28: { ...right.ankle, visibility: 0.9 },
  });

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

  it('can detect an arm pose when the lower body is outside the frame', () => {
    const result = analyzePomMotion({
      11: { x: 0.45, y: 0.35, visibility: 0.9 },
      12: { x: 0.55, y: 0.35, visibility: 0.9 },
      13: { x: 0.30, y: 0.18, visibility: 0.9 },
      14: { x: 0.70, y: 0.18, visibility: 0.9 },
      15: { x: 0.18, y: 0.08, visibility: 0.9 },
      16: { x: 0.82, y: 0.08, visibility: 0.9 },
    });

    expect(result.pose?.name).toBe('High V');
  });

  it.each([
    [
      'Liberty',
      {
        left: { knee: { x: 0.45, y: 0.72 }, ankle: { x: 0.45, y: 0.95 } },
        right: { knee: { x: 0.7, y: 0.45 }, ankle: { x: 0.71, y: 0.68 } },
      },
    ],
    [
      'Scorpion',
      {
        left: { knee: { x: 0.45, y: 0.72 }, ankle: { x: 0.45, y: 0.95 } },
        right: { knee: { x: 0.72, y: 0.6 }, ankle: { x: 0.84, y: 0.43 } },
      },
    ],
    [
      'Arabesque',
      {
        left: { knee: { x: 0.45, y: 0.72 }, ankle: { x: 0.45, y: 0.95 } },
        right: { knee: { x: 0.72, y: 0.55 }, ankle: { x: 0.9, y: 0.58 } },
      },
    ],
    [
      'Heel Stretch',
      {
        left: { knee: { x: 0.45, y: 0.72 }, ankle: { x: 0.45, y: 0.95 } },
        right: { knee: { x: 0.58, y: 0.25 }, ankle: { x: 0.61, y: 0.05 } },
      },
    ],
    [
      'Toe Touch',
      {
        left: { knee: { x: 0.28, y: 0.4 }, ankle: { x: 0.11, y: 0.32 } },
        right: { knee: { x: 0.72, y: 0.4 }, ankle: { x: 0.89, y: 0.32 } },
      },
    ],
  ])('detects %s from visible lower-body landmarks', (name, legs) => {
    const result = analyzePomMotion(withPoseLandmarks(legs.left, legs.right));

    expect(result.pose?.name).toBe(name);
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('does not require lower-body landmarks to detect arm poses in a cropped frame', () => {
    const result = analyzePomMotion({
      11: { x: 0.45, y: 0.35, visibility: 0.9 },
      12: { x: 0.55, y: 0.35, visibility: 0.9 },
      13: { x: 0.3, y: 0.18, visibility: 0.9 },
      14: { x: 0.7, y: 0.18, visibility: 0.9 },
      15: { x: 0.18, y: 0.08, visibility: 0.9 },
      16: { x: 0.82, y: 0.08, visibility: 0.9 },
    });

    expect(result.pose?.name).toBe('High V');
  });

  it('does not classify close hands as a supported arm motion', () => {
    const result = analyzePomMotion({
      11: { x: 0.48, y: 0.45, z: 0 },
      12: { x: 0.52, y: 0.45, z: 0 },
      13: { x: 0.46, y: 0.35, z: 0 },
      14: { x: 0.54, y: 0.35, z: 0 },
      15: { x: 0.49, y: 0.30, z: 0 },
      16: { x: 0.51, y: 0.30, z: 0 },
    });

    expect(result.pose).toBeNull();
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

  it('detects Half T from upper-body landmarks when the legs are out of frame', () => {
    const result = analyzePomMotion({
      11: { x: 0.38, y: 0.35, visibility: 0.9 },
      12: { x: 0.62, y: 0.35, visibility: 0.9 },
      13: { x: 0.26, y: 0.35, visibility: 0.9 },
      14: { x: 0.74, y: 0.35, visibility: 0.9 },
      15: { x: 0.34, y: 0.35, visibility: 0.9 },
      16: { x: 0.66, y: 0.35, visibility: 0.9 },
    });

    expect(result.pose?.name).toBe('Half T');
  });

  it('keeps the bent-elbow Half T shape classified as Half T', () => {
    const halfTLandmarks = {
      11: { x: 0.38, y: 0.35 },
      12: { x: 0.62, y: 0.35 },
      13: { x: 0.26, y: 0.35 },
      14: { x: 0.74, y: 0.35 },
      15: { x: 0.34, y: 0.35 },
      16: { x: 0.66, y: 0.35 },
    };

    expect(analyzePomMotion(halfTLandmarks).pose?.name).toBe('Half T');
    expect(analyzePomMotion(scaleLandmarks(halfTLandmarks, 0.6)).pose?.name).toBe('Half T');
  });

  it('recognizes the reference Half T with fists drawn inward toward the chest', () => {
    const result = analyzePomMotion({
      11: { x: 0.42, y: 0.35 },
      12: { x: 0.58, y: 0.35 },
      13: { x: 0.26, y: 0.35 },
      14: { x: 0.74, y: 0.35 },
      15: { x: 0.48, y: 0.37 },
      16: { x: 0.52, y: 0.37 },
    });

    expect(result.pose?.name).toBe('Half T');
  });

  it.each([
    ['High V', {
      11: { x: 0.45, y: 0.35 }, 12: { x: 0.55, y: 0.35 },
      13: { x: 0.3, y: 0.18 }, 14: { x: 0.7, y: 0.18 },
      15: { x: 0.18, y: 0.08 }, 16: { x: 0.82, y: 0.08 },
    }],
    ['Low V', {
      11: { x: 0.45, y: 0.35 }, 12: { x: 0.55, y: 0.35 },
      13: { x: 0.35, y: 0.48 }, 14: { x: 0.65, y: 0.48 },
      15: { x: 0.28, y: 0.62 }, 16: { x: 0.72, y: 0.62 },
    }],
  ])('keeps %s detection at a different camera scale', (name, landmarks) => {
    const result = analyzePomMotion(scaleLandmarks(landmarks, 0.6));

    expect(result.pose?.name).toBe(name);
  });

  it('does not label relaxed arms as a T Motion or another pose', () => {
    const result = analyzePomMotion({
      11: { x: 0.45, y: 0.30 },
      12: { x: 0.55, y: 0.30 },
      13: { x: 0.46, y: 0.45 },
      14: { x: 0.54, y: 0.45 },
      15: { x: 0.46, y: 0.65 },
      16: { x: 0.54, y: 0.65 },
    });

    expect(result.pose).toBeNull();
  });

  it('does not label wide arms as a T Motion when they are not at shoulder height', () => {
    const result = analyzePomMotion({
      11: { x: 0.45, y: 0.30 },
      12: { x: 0.55, y: 0.30 },
      13: { x: 0.28, y: 0.48 },
      14: { x: 0.72, y: 0.48 },
      15: { x: 0.12, y: 0.65 },
      16: { x: 0.88, y: 0.65 },
    });

    expect(result.pose).not.toBe(pomMotionLibrary.find((pose) => pose.name === 'T Motion'));
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

  describe('High V and Low V - Angle Flexibility (Arms Up and Down)', () => {
    it('detects High V when arms are angled higher / narrower overhead (~25° from vertical)', () => {
      // Left shoulder: (0.45, 0.35), Right shoulder: (0.55, 0.35)
      // Arms raised high up in a narrow V
      const result = analyzePomMotion({
        11: { x: 0.45, y: 0.35, visibility: 0.95 },
        12: { x: 0.55, y: 0.35, visibility: 0.95 },
        13: { x: 0.39, y: 0.21, visibility: 0.95 },
        14: { x: 0.61, y: 0.21, visibility: 0.95 },
        15: { x: 0.33, y: 0.08, visibility: 0.95 }, // dx = 0.12, dy = 0.27 -> ~24°
        16: { x: 0.67, y: 0.08, visibility: 0.95 }, // dx = 0.12, dy = 0.27 -> ~24°
      });

      expect(result.pose?.name).toBe('High V');
      expect(result.confidence).toBeGreaterThanOrEqual(0.75);
    });

    it('detects High V when arms are angled lower / wider towards horizontal (~65° from vertical)', () => {
      // Arms extended in a wider High V, lower towards shoulder level
      const result = analyzePomMotion({
        11: { x: 0.45, y: 0.35, visibility: 0.95 },
        12: { x: 0.55, y: 0.35, visibility: 0.95 },
        13: { x: 0.30, y: 0.28, visibility: 0.95 },
        14: { x: 0.70, y: 0.28, visibility: 0.95 },
        15: { x: 0.15, y: 0.21, visibility: 0.95 }, // dx = 0.30, dy = 0.14 -> ~65°
        16: { x: 0.85, y: 0.21, visibility: 0.95 }, // dx = 0.30, dy = 0.14 -> ~65°
      });

      expect(result.pose?.name).toBe('High V');
      expect(result.confidence).toBeGreaterThanOrEqual(0.75);
    });

    it('detects Low V when arms are angled lower / narrower towards legs (~25° from downward vertical)', () => {
      // Arms snapped down closer to the legs in a narrow Low V
      const result = analyzePomMotion({
        11: { x: 0.45, y: 0.35, visibility: 0.95 },
        12: { x: 0.55, y: 0.35, visibility: 0.95 },
        13: { x: 0.39, y: 0.48, visibility: 0.95 },
        14: { x: 0.61, y: 0.48, visibility: 0.95 },
        15: { x: 0.33, y: 0.62, visibility: 0.95 }, // dx = 0.12, dy = 0.27 -> ~24°
        16: { x: 0.67, y: 0.62, visibility: 0.95 }, // dx = 0.12, dy = 0.27 -> ~24°
      });

      expect(result.pose?.name).toBe('Low V');
      expect(result.confidence).toBeGreaterThanOrEqual(0.75);
    });

    it('detects Low V when arms are angled higher / wider towards horizontal (~65° from downward vertical)', () => {
      // Arms angled down but lifted higher towards horizontal in a wider Low V
      const result = analyzePomMotion({
        11: { x: 0.45, y: 0.35, visibility: 0.95 },
        12: { x: 0.55, y: 0.35, visibility: 0.95 },
        13: { x: 0.30, y: 0.42, visibility: 0.95 },
        14: { x: 0.70, y: 0.42, visibility: 0.95 },
        15: { x: 0.15, y: 0.49, visibility: 0.95 }, // dx = 0.30, dy = 0.14 -> ~65°
        16: { x: 0.85, y: 0.49, visibility: 0.95 }, // dx = 0.30, dy = 0.14 -> ~65°
      });

      expect(result.pose?.name).toBe('Low V');
      expect(result.confidence).toBeGreaterThanOrEqual(0.75);
    });

    it('does not classify near-horizontal downward arms as Low V', () => {
      const result = analyzePomMotion({
        11: { x: 0.42, y: 0.38, visibility: 0.95 },
        12: { x: 0.58, y: 0.38, visibility: 0.95 },
        13: { x: 0.26, y: 0.43, visibility: 0.95 },
        14: { x: 0.74, y: 0.43, visibility: 0.95 },
        15: { x: 0.10, y: 0.48, visibility: 0.95 },
        16: { x: 0.90, y: 0.48, visibility: 0.95 },
      });

      expect(result.pose?.name).not.toBe('Low V');
    });

    it('does not classify bent arms as Low V', () => {
      const result = analyzePomMotion({
        11: { x: 0.40, y: 0.35, visibility: 0.95 },
        12: { x: 0.60, y: 0.35, visibility: 0.95 },
        13: { x: 0.20, y: 0.42, visibility: 0.95 },
        14: { x: 0.80, y: 0.42, visibility: 0.95 },
        15: { x: 0.30, y: 0.58, visibility: 0.95 },
        16: { x: 0.70, y: 0.58, visibility: 0.95 },
      });

      expect(result.pose?.name).not.toBe('Low V');
    });

    it('detects Low V in close-up waist-up framing where wrists are near shoulder width', () => {
      // In waist-up framing, shoulders are wide (width = 0.36), wrists hang near waistline
      const result = analyzePomMotion({
        11: { x: 0.32, y: 0.30, visibility: 0.95 },
        12: { x: 0.68, y: 0.30, visibility: 0.95 },
        13: { x: 0.28, y: 0.45, visibility: 0.95 },
        14: { x: 0.72, y: 0.45, visibility: 0.95 },
        15: { x: 0.25, y: 0.60, visibility: 0.95 },
        16: { x: 0.75, y: 0.60, visibility: 0.95 },
      });

      expect(result.pose?.name).toBe('Low V');
      expect(result.confidence).toBeGreaterThanOrEqual(0.75);
    });

    it('detects High V with narrow arm punch overhead (~15° from vertical)', () => {
      const result = analyzePomMotion({
        11: { x: 0.45, y: 0.35, visibility: 0.95 },
        12: { x: 0.55, y: 0.35, visibility: 0.95 },
        13: { x: 0.42, y: 0.20, visibility: 0.95 },
        14: { x: 0.58, y: 0.20, visibility: 0.95 },
        15: { x: 0.38, y: 0.08, visibility: 0.95 },
        16: { x: 0.62, y: 0.08, visibility: 0.95 },
      });

      expect(result.pose?.name).toBe('High V');
      expect(result.confidence).toBeGreaterThanOrEqual(0.75);
    });

    it('detects High V immediately when punching arms straight upward overhead (arm punch up)', () => {
      // Direct overhead arm punch: wrists high above head at x = 0.46 and 0.54
      const result = analyzePomMotion({
        11: { x: 0.42, y: 0.38, visibility: 0.95 },
        12: { x: 0.58, y: 0.38, visibility: 0.95 },
        13: { x: 0.44, y: 0.22, visibility: 0.95 },
        14: { x: 0.56, y: 0.22, visibility: 0.95 },
        15: { x: 0.45, y: 0.06, visibility: 0.95 },
        16: { x: 0.55, y: 0.06, visibility: 0.95 },
      });

      expect(result.pose?.name).toBe('High V');
      expect(result.confidence).toBeGreaterThanOrEqual(0.75);
    });

    it('keeps T-Motion for upward arm drift within 10° of horizontal', () => {
      const result = analyzePomMotion({
        11: { x: 0.42, y: 0.38, visibility: 0.95 },
        12: { x: 0.58, y: 0.38, visibility: 0.95 },
        13: { x: 0.26, y: 0.352, visibility: 0.95 },
        14: { x: 0.74, y: 0.352, visibility: 0.95 },
        15: { x: 0.10, y: 0.324, visibility: 0.95 },
        16: { x: 0.90, y: 0.324, visibility: 0.95 },
      });

      expect(result.pose?.name).toBe('T Motion');
      expect(result.confidence).toBeGreaterThanOrEqual(0.75);
    });

    it('detects Low V immediately when punching arms downward beside hips (arm punch down)', () => {
      // Arms punched down beside hips into narrow Low V
      const result = analyzePomMotion({
        11: { x: 0.40, y: 0.35, visibility: 0.95 },
        12: { x: 0.60, y: 0.35, visibility: 0.95 },
        13: { x: 0.35, y: 0.52, visibility: 0.95 },
        14: { x: 0.65, y: 0.52, visibility: 0.95 },
        15: { x: 0.30, y: 0.70, visibility: 0.95 },
        16: { x: 0.70, y: 0.70, visibility: 0.95 },
      });

      expect(result.pose?.name).toBe('Low V');
      expect(result.confidence).toBeGreaterThanOrEqual(0.75);
    });

    it('keeps T-Motion for downward arm drift within 10° of horizontal', () => {
      const result = analyzePomMotion({
        11: { x: 0.42, y: 0.38, visibility: 0.95 },
        12: { x: 0.58, y: 0.38, visibility: 0.95 },
        13: { x: 0.26, y: 0.408, visibility: 0.95 },
        14: { x: 0.74, y: 0.408, visibility: 0.95 },
        15: { x: 0.10, y: 0.436, visibility: 0.95 },
        16: { x: 0.90, y: 0.436, visibility: 0.95 },
      });

      expect(result.pose?.name).toBe('T Motion');
      expect(result.confidence).toBeGreaterThanOrEqual(0.75);
    });
  });
});
