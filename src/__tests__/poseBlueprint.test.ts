import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BLUEPRINT_CONNECTIONS,
  KEY_LANDMARK_NAMES,
  drawBlueprintSkeleton,
  drawCoordinateTags,
  extractPoseBlueprint,
  type Landmark3D,
} from '../app/utils/poseBlueprint';

describe('poseBlueprint', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
  describe('BLUEPRINT_CONNECTIONS', () => {
    it('contains standard biomechanical connection pairs', () => {
      expect(BLUEPRINT_CONNECTIONS.length).toBeGreaterThanOrEqual(25);

      // Verify torso connection (left shoulder 11 to right shoulder 12)
      expect(BLUEPRINT_CONNECTIONS).toContainEqual([11, 12]);
      // Verify left arm (11-13, 13-15)
      expect(BLUEPRINT_CONNECTIONS).toContainEqual([11, 13]);
      expect(BLUEPRINT_CONNECTIONS).toContainEqual([13, 15]);
      // Verify right arm (12-14, 14-16)
      expect(BLUEPRINT_CONNECTIONS).toContainEqual([12, 14]);
      expect(BLUEPRINT_CONNECTIONS).toContainEqual([14, 16]);
      // Verify hips (23 to 24)
      expect(BLUEPRINT_CONNECTIONS).toContainEqual([23, 24]);
    });
  });

  describe('KEY_LANDMARK_NAMES', () => {
    it('defines standard anatomical landmarks for coordinate tracking', () => {
      expect(KEY_LANDMARK_NAMES[11]).toBe('L.Shoulder');
      expect(KEY_LANDMARK_NAMES[12]).toBe('R.Shoulder');
      expect(KEY_LANDMARK_NAMES[13]).toBe('L.Elbow');
      expect(KEY_LANDMARK_NAMES[14]).toBe('R.Elbow');
      expect(KEY_LANDMARK_NAMES[15]).toBe('L.Wrist');
      expect(KEY_LANDMARK_NAMES[16]).toBe('R.Wrist');
      expect(KEY_LANDMARK_NAMES[25]).toBe('L.Knee');
      expect(KEY_LANDMARK_NAMES[26]).toBe('R.Knee');
    });
  });

  describe('drawBlueprintSkeleton', () => {
    it('draws connections and joints to canvas context without throwing', () => {
      const mockCtx = {
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        strokeStyle: '',
        lineWidth: 0,
        lineCap: '',
        shadowColor: '',
        shadowBlur: 0,
        fillStyle: '',
        globalAlpha: 1,
      } as unknown as CanvasRenderingContext2D;

      const mockLandmarks: Landmark3D[] = Array.from({ length: 33 }, () => ({
        x: 0.5,
        y: 0.5,
        z: 0,
        visibility: 0.9,
      }));

      expect(() => {
        drawBlueprintSkeleton(mockCtx, mockLandmarks, 800, 600, {
          lineColor: '#00f5ff',
          jointColor: '#ffffff',
          lineWidth: 4,
          jointRadius: 5,
        });
      }).not.toThrow();

      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.stroke).toHaveBeenCalled();
      expect(mockCtx.fill).toHaveBeenCalled();
    });

    it('skips joints and lines when landmark visibility is low', () => {
      const mockCtx = {
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        strokeStyle: '',
        lineWidth: 0,
        lineCap: '',
        shadowColor: '',
        shadowBlur: 0,
        fillStyle: '',
        globalAlpha: 1,
      } as unknown as CanvasRenderingContext2D;

      // All joints have 0.1 visibility (below 0.25 threshold)
      const mockLandmarks: Landmark3D[] = Array.from({ length: 33 }, () => ({
        x: 0.5,
        y: 0.5,
        z: 0,
        visibility: 0.1,
      }));

      drawBlueprintSkeleton(mockCtx, mockLandmarks, 800, 600);

      // Line and circle strokes/fills should be skipped
      expect(mockCtx.stroke).not.toHaveBeenCalled();
      expect(mockCtx.fill).not.toHaveBeenCalled();
    });
  });

  describe('drawCoordinateTags', () => {
    it('draws coordinate HUD badges for visible key landmarks', () => {
      const mockCtx = {
        save: vi.fn(),
        restore: vi.fn(),
        measureText: vi.fn().mockReturnValue({ width: 60 }),
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        fillText: vi.fn(),
        font: '',
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 0,
      } as unknown as CanvasRenderingContext2D;

      const mockLandmarks: Landmark3D[] = Array.from({ length: 33 }, () => ({
        x: 0.45,
        y: 0.35,
        z: 0,
        visibility: 0.95,
      }));

      expect(() => {
        drawCoordinateTags(mockCtx, mockLandmarks, 800, 600);
      }).not.toThrow();

      expect(mockCtx.fillRect).toHaveBeenCalled();
      expect(mockCtx.strokeRect).toHaveBeenCalled();
      expect(mockCtx.fillText).toHaveBeenCalled();
    });
  });

  describe('extractPoseBlueprint', () => {
    it('returns a structured result with failure reason if image cannot be decoded', async () => {
      const mockImg = new Image();
      // Simulate immediately errored image
      setTimeout(() => {
        mockImg.dispatchEvent(new Event('error'));
      }, 10);

      const result = await extractPoseBlueprint(mockImg);

      expect(result).toBeDefined();
      expect(result.hasPose).toBe(false);
      expect(result.landmarks).toEqual([]);
      expect(result.keyCoordinates).toEqual([]);
      expect(typeof result.summaryMessage).toBe('string');
    });

    it('handles completed image element gracefully in node/jsdom environment', async () => {
      const mockImg = new Image();
      Object.defineProperty(mockImg, 'complete', { value: true });
      Object.defineProperty(mockImg, 'naturalWidth', { value: 640 });
      Object.defineProperty(mockImg, 'naturalHeight', { value: 480 });

      const result = await extractPoseBlueprint(mockImg);

      expect(result).toBeDefined();
      expect(result.landmarks).toEqual([]);
      expect(result.keyCoordinates).toEqual([]);
      expect(typeof result.summaryMessage).toBe('string');
    });
  });
});
