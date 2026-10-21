import { describe, it, expect } from 'vitest';
import { evaluateFraming, LandmarkPoint } from '../app/utils/framingQuality';

function createDummyLandmarks(overrides: Record<number, Partial<LandmarkPoint>> = {}): LandmarkPoint[] {
  const landmarks: LandmarkPoint[] = [];
  for (let i = 0; i < 33; i++) {
    landmarks.push({
      x: 0.5,
      y: 0.1 + (i / 33) * 0.8,
      visibility: 0.9,
      ...overrides[i]
    });
  }
  // Standard healthy body layout
  landmarks[0] = { x: 0.5, y: 0.15, visibility: 0.9, ...overrides[0] }; // nose
  landmarks[11] = { x: 0.4, y: 0.25, visibility: 0.9, ...overrides[11] }; // left shoulder
  landmarks[12] = { x: 0.6, y: 0.25, visibility: 0.9, ...overrides[12] }; // right shoulder
  landmarks[23] = { x: 0.45, y: 0.55, visibility: 0.9, ...overrides[23] }; // left hip
  landmarks[24] = { x: 0.55, y: 0.55, visibility: 0.9, ...overrides[24] }; // right hip
  landmarks[27] = { x: 0.45, y: 0.85, visibility: 0.9, ...overrides[27] }; // left ankle
  landmarks[28] = { x: 0.55, y: 0.85, visibility: 0.9, ...overrides[28] }; // right ankle
  return landmarks;
}

describe('evaluateFraming', () => {
  it('returns adjust status when landmarks are missing or empty', () => {
    const result = evaluateFraming(null);
    expect(result.status).toBe('adjust');
    expect(result.message).toContain('Position yourself');
  });

  it('detects optimal framing for a properly positioned athlete', () => {
    const landmarks = createDummyLandmarks();
    const result = evaluateFraming(landmarks, 'optimal');
    expect(result.status).toBe('optimal');
    expect(result.isFullyInFrame).toBe(true);
    expect(result.message).toContain('Optimal Framing');
  });

  it('detects when athlete is too close to camera', () => {
    const landmarks = createDummyLandmarks({
      11: { x: 0.1, y: 0.2 },
      12: { x: 0.9, y: 0.2 }
    });
    const result = evaluateFraming(landmarks);
    expect(result.status).toBe('adjust');
    expect(result.distanceStatus).toBe('too-close');
    expect(result.message).toContain('Step back');
  });

  it('detects head cut off at top of screen', () => {
    const landmarks = createDummyLandmarks({
      0: { x: 0.5, y: 0.02 } // Cut off at top
    });
    const result = evaluateFraming(landmarks);
    expect(result.status).toBe('adjust');
    expect(result.message).toContain('Head cut off');
  });

  it('detects feet cut off at bottom of screen', () => {
    const landmarks = createDummyLandmarks({
      27: { x: 0.45, y: 0.98 },
      28: { x: 0.55, y: 0.98 }
    });
    const result = evaluateFraming(landmarks);
    expect(result.status).toBe('adjust');
    expect(result.message).toContain('Keep full body');
  });

  it('flags low gym lighting even when body is detected', () => {
    const landmarks = createDummyLandmarks();
    const result = evaluateFraming(landmarks, 'low');
    expect(result.status).toBe('warning');
    expect(result.lightingStatus).toBe('low');
    expect(result.message).toContain('Dim gym lighting');
  });
});
