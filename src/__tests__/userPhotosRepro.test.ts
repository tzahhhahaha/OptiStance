import { describe, expect, it } from 'vitest';
import { analyzePomMotion } from '../app/components/poseLibrary';

describe('User Photos Reproduction', () => {
  it('detects High V from User Photo 1 exact coordinates', () => {
    const image1Landmarks = {
      11: { x: 0.538, y: 0.480, visibility: 0.95 },
      12: { x: 0.470, y: 0.493, visibility: 0.95 },
      13: { x: 0.592, y: 0.368, visibility: 0.95 },
      14: { x: 0.415, y: 0.374, visibility: 0.95 },
      15: { x: 0.631, y: 0.232, visibility: 0.95 },
      16: { x: 0.362, y: 0.253, visibility: 0.95 },
      23: { x: 0.524, y: 0.718, visibility: 0.95 },
      24: { x: 0.472, y: 0.722, visibility: 0.95 },
    };

    const result = analyzePomMotion(image1Landmarks);
    expect(result.pose?.name).toBe('High V');

    // Flipped horizontally (raw vs mirrored)
    const flipped = Object.fromEntries(
      Object.entries(image1Landmarks).map(([k, v]) => [k, { ...v, x: 1.0 - v.x }])
    );
    const flippedResult = analyzePomMotion(flipped);
    expect(flippedResult.pose?.name).toBe('High V');
  });

  it('detects Low V from User Photo 2 exact coordinates', () => {
    const image2Landmarks = {
      11: { x: 0.544, y: 0.501, visibility: 0.95 },
      12: { x: 0.438, y: 0.503, visibility: 0.95 },
      13: { x: 0.588, y: 0.617, visibility: 0.95 },
      14: { x: 0.399, y: 0.623, visibility: 0.95 },
      15: { x: 0.633, y: 0.766, visibility: 0.95 },
      16: { x: 0.347, y: 0.757, visibility: 0.95 },
      23: { x: 0.518, y: 0.759, visibility: 0.95 },
      24: { x: 0.461, y: 0.760, visibility: 0.95 },
    };

    const result = analyzePomMotion(image2Landmarks);
    expect(result.pose?.name).toBe('Low V');

    // Flipped horizontally
    const flipped = Object.fromEntries(
      Object.entries(image2Landmarks).map(([k, v]) => [k, { ...v, x: 1.0 - v.x }])
    );
    const flippedResult = analyzePomMotion(flipped);
    expect(flippedResult.pose?.name).toBe('Low V');
  });
});
