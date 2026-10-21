import { describe, expect, it, vi } from 'vitest';
import { drawHandLandmarks, smoothHandLandmarks } from '../app/scoring/drawTelemetry';

const createContext = () =>
  ({
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
  }) as unknown as CanvasRenderingContext2D;

describe('hand landmark overlay', () => {
  it('draws only three base markers for each detected hand', () => {
    const ctx = createContext();
    const hand = Array.from({ length: 21 }, (_, index) => ({
      x: index / 21,
      y: index / 21,
      z: 0,
    }));

    drawHandLandmarks(ctx, [hand], 1280, 720);

    expect(ctx.lineTo).not.toHaveBeenCalled();
    expect(ctx.arc).toHaveBeenCalledTimes(6);
    expect(ctx.strokeStyle).toBe('#ffffff');
    expect(ctx.fillStyle).toBe('#10b981');
    expect(ctx.restore).toHaveBeenCalledOnce();
  });

  it('mirrors landmarks for a front-camera snapshot', () => {
    const ctx = createContext();
    const hand = Array.from({ length: 21 }, (_, index) => ({
      x: index / 21,
      y: index / 21,
      z: 0,
    }));

    drawHandLandmarks(ctx, [hand], 640, 480, true);

    expect(ctx.translate).toHaveBeenCalledWith(640, 0);
    expect(ctx.scale).toHaveBeenCalledWith(-1, 1);
  });

  it('smooths hand movement between detection updates', () => {
    const previous = [[{ x: 0, y: 0, z: 0 }]];
    const current = [[{ x: 1, y: 1, z: 1 }]];

    expect(smoothHandLandmarks(current, previous)).toEqual([
      [{ x: 0.25, y: 0.25, z: 0.25 }],
    ]);
  });
});
