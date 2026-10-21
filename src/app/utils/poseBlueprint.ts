import { mediapipeLocateFile } from './mediapipeAssets';
import { calculateMeasuredAngles, analyzePomMotion } from '../components/poseLibrary';

export interface Landmark3D {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export interface KeyJointCoordinate {
  id: number;
  name: string;
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export const KEY_LANDMARK_NAMES: Record<number, string> = {
  0: 'Nose',
  11: 'L.Shoulder',
  12: 'R.Shoulder',
  13: 'L.Elbow',
  14: 'R.Elbow',
  15: 'L.Wrist',
  16: 'R.Wrist',
  23: 'L.Hip',
  24: 'R.Hip',
  25: 'L.Knee',
  26: 'R.Knee',
  27: 'L.Ankle',
  28: 'R.Ankle',
};

export interface PoseBlueprintResult {
  hasPose: boolean;
  confidence: number;
  landmarks: Landmark3D[];
  keyCoordinates: KeyJointCoordinate[];
  angles: Record<string, number>;
  detectedPoseName: string;
  blueprintDataUrl: string | null;
  blueprintWithCoordsDataUrl: string | null;
  summaryMessage: string;
  coachingCueSuggestion?: string;
}

// MediaPipe 33 standard pose connections for wireframe blueprint
export const BLUEPRINT_CONNECTIONS: [number, number][] = [
  // Head / Face
  [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8], [9, 10],
  // Torso
  [11, 12], [11, 23], [12, 24], [23, 24],
  // Left arm
  [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
  // Right arm
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  // Left leg
  [23, 25], [25, 27], [27, 29], [27, 31], [29, 31],
  // Right leg
  [24, 26], [26, 28], [28, 30], [28, 32], [30, 32],
];

/**
 * Draws the AI Blueprint skeleton directly onto a canvas 2D context.
 */
export function drawBlueprintSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark3D[],
  width: number,
  height: number,
  options?: {
    lineColor?: string;
    jointColor?: string;
    lineWidth?: number;
    jointRadius?: number;
  }
) {
  const lineColor = options?.lineColor ?? '#00f5ff'; // Neon Cyan Blueprint line
  const jointColor = options?.jointColor ?? '#ffffff';
  const lineWidth = options?.lineWidth ?? 3;
  const jointRadius = options?.jointRadius ?? 4;

  // Draw connections (skeleton bones)
  ctx.save();
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.shadowColor = lineColor;
  ctx.shadowBlur = 8;

  for (const [fromIdx, toIdx] of BLUEPRINT_CONNECTIONS) {
    const from = landmarks[fromIdx];
    const to = landmarks[toIdx];
    if (!from || !to) continue;
    if (typeof from.visibility === 'number' && from.visibility < 0.25) continue;
    if (typeof to.visibility === 'number' && to.visibility < 0.25) continue;

    ctx.beginPath();
    ctx.moveTo(from.x * width, from.y * height);
    ctx.lineTo(to.x * width, to.y * height);
    ctx.stroke();
  }
  ctx.restore();

  // Draw landmarks (joints)
  ctx.save();
  for (let i = 0; i < landmarks.length; i++) {
    const lm = landmarks[i];
    if (!lm) continue;
    if (typeof lm.visibility === 'number' && lm.visibility < 0.25) continue;

    const x = lm.x * width;
    const y = lm.y * height;

    // Glowing halo
    ctx.beginPath();
    ctx.arc(x, y, jointRadius + 2, 0, 2 * Math.PI);
    ctx.fillStyle = lineColor;
    ctx.globalAlpha = 0.5;
    ctx.fill();

    // Solid inner joint
    ctx.beginPath();
    ctx.arc(x, y, jointRadius, 0, 2 * Math.PI);
    ctx.fillStyle = jointColor;
    ctx.globalAlpha = 1.0;
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Draws high-tech coordinate tags (e.g. "L.Wrist (0.18, 0.08)") next to key joints.
 */
export function drawCoordinateTags(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark3D[],
  width: number,
  height: number,
  options?: {
    tagColor?: string;
    textColor?: string;
  }
) {
  const tagColor = options?.tagColor ?? '#00f5ff';
  const textColor = options?.textColor ?? '#ffffff';
  const fontSize = Math.max(9, Math.round(width / 75));
  ctx.save();
  ctx.font = `600 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;

  for (const [idStr, name] of Object.entries(KEY_LANDMARK_NAMES)) {
    const id = Number(idStr);
    const lm = landmarks[id];
    if (!lm) continue;
    if (typeof lm.visibility === 'number' && lm.visibility < 0.25) continue;

    const x = lm.x * width;
    const y = lm.y * height;
    const label = `${name} (${lm.x.toFixed(2)}, ${lm.y.toFixed(2)})`;
    const textMetrics = ctx.measureText(label);
    const padding = 3;
    const boxW = textMetrics.width + padding * 2;
    const boxH = fontSize + padding * 2;

    const tagX = Math.min(width - boxW - 4, Math.max(4, x + 6));
    const tagY = Math.min(height - boxH - 4, Math.max(4, y - boxH / 2));

    ctx.fillStyle = 'rgba(4, 16, 28, 0.85)';
    ctx.fillRect(tagX, tagY, boxW, boxH);

    ctx.strokeStyle = tagColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(tagX, tagY, boxW, boxH);

    ctx.fillStyle = textColor;
    ctx.fillText(label, tagX + padding, tagY + fontSize - 1);
  }
  ctx.restore();
}

let cachedPoseDetector: any = null;

async function getOrCreatePoseDetector() {
  if (cachedPoseDetector) return cachedPoseDetector;
  if (typeof window === 'undefined') return null;

  try {
    const { Pose } = await import('@mediapipe/pose');
    const detector = new Pose({
      locateFile: mediapipeLocateFile,
    });
    detector.setOptions({
      modelComplexity: 0,
      smoothLandmarks: false,
      enableSegmentation: false,
      minDetectionConfidence: 0.35,
      minTrackingConfidence: 0.35,
    });
    await detector.initialize?.();
    cachedPoseDetector = detector;
    return detector;
  } catch (err) {
    console.warn('[poseBlueprint] Could not initialize MediaPipe Pose:', err);
    return null;
  }
}

/**
 * Automatically extracts the kinematic pose blueprint from a photo:
 * runs MediaPipe pose detection, computes joint angles, draws the skeleton wireframe,
 * and produces a blueprint data URL.
 */
export async function extractPoseBlueprint(
  source: File | string | HTMLImageElement
): Promise<PoseBlueprintResult> {
  if (typeof document === 'undefined') {
    return {
      hasPose: false,
      confidence: 0,
      landmarks: [],
      keyCoordinates: [],
      angles: {},
      detectedPoseName: 'Unknown',
      blueprintDataUrl: null,
      blueprintWithCoordsDataUrl: null,
      summaryMessage: 'Pose extraction requires browser canvas environment.',
    };
  }

  let imgElement: HTMLImageElement;
  let tempObjectUrl: string | null = null;

  if (source instanceof HTMLImageElement) {
    imgElement = source;
  } else {
    imgElement = new Image();
    imgElement.crossOrigin = 'anonymous';
    if (source instanceof File) {
      tempObjectUrl = URL.createObjectURL(source);
      imgElement.src = tempObjectUrl;
    } else {
      imgElement.src = source;
    }
  }

  try {
    if (!imgElement.complete || imgElement.naturalWidth === 0) {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error('Image load timed out'));
        }, 1500);
        imgElement.onload = () => {
          clearTimeout(timer);
          resolve();
        };
        imgElement.onerror = () => {
          clearTimeout(timer);
          reject(new Error('Failed to load image for blueprint analysis'));
        };
      });
    }
  } catch {
    if (tempObjectUrl) URL.revokeObjectURL(tempObjectUrl);
    return {
      hasPose: false,
      confidence: 0,
      landmarks: [],
      keyCoordinates: [],
      angles: {},
      detectedPoseName: 'Error',
      blueprintDataUrl: null,
      blueprintWithCoordsDataUrl: null,
      summaryMessage: 'Failed to decode image.',
    };
  }

  const width = imgElement.naturalWidth || imgElement.width || 640;
  const height = imgElement.naturalHeight || imgElement.height || 480;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    if (tempObjectUrl) URL.revokeObjectURL(tempObjectUrl);
    return {
      hasPose: false,
      confidence: 0,
      landmarks: [],
      keyCoordinates: [],
      angles: {},
      detectedPoseName: 'Unavailable',
      blueprintDataUrl: null,
      blueprintWithCoordsDataUrl: null,
      summaryMessage: 'Canvas 2D context is unavailable in this environment.',
    };
  }

  // Draw source image onto canvas
  ctx.drawImage(imgElement, 0, 0, width, height);

  const detector = await getOrCreatePoseDetector();
  if (!detector) {
    if (tempObjectUrl) URL.revokeObjectURL(tempObjectUrl);
    return {
      hasPose: false,
      confidence: 0,
      landmarks: [],
      keyCoordinates: [],
      angles: {},
      detectedPoseName: 'Unknown',
      blueprintDataUrl: null,
      blueprintWithCoordsDataUrl: null,
      summaryMessage: 'Pose detection engine is not ready.',
    };
  }

  let detectedLandmarks: Landmark3D[] | null = null;

  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      resolve();
    }, 6000);

    detector.onResults((results: any) => {
      clearTimeout(timer);
      if (results?.poseLandmarks && results.poseLandmarks.length > 0) {
        detectedLandmarks = results.poseLandmarks;
      }
      resolve();
    });

    void detector.send({ image: canvas }).catch((err: any) => {
      clearTimeout(timer);
      console.warn('[poseBlueprint] detector.send error:', err);
      resolve();
    });
  });

  if (tempObjectUrl) {
    URL.revokeObjectURL(tempObjectUrl);
  }

  if (!detectedLandmarks || detectedLandmarks.length === 0) {
    return {
      hasPose: false,
      confidence: 0,
      landmarks: [],
      keyCoordinates: [],
      angles: {},
      detectedPoseName: 'No pose detected',
      blueprintDataUrl: null,
      blueprintWithCoordsDataUrl: null,
      summaryMessage: 'No athlete skeleton detected in this photo. Ensure the athlete is fully visible in frame.',
    };
  }

  // Draw Clean Blueprint Skeleton overlay onto the image
  drawBlueprintSkeleton(ctx, detectedLandmarks, width, height, {
    lineColor: '#00f5ff',
    jointColor: '#ffffff',
    lineWidth: Math.max(3, Math.round(width / 180)),
    jointRadius: Math.max(4, Math.round(width / 140)),
  });

  let blueprintDataUrl: string | null = null;
  try {
    blueprintDataUrl = canvas.toDataURL('image/jpeg', 0.88);
  } catch (err) {
    console.warn('[poseBlueprint] Canvas toDataURL failed:', err);
  }

  // Draw Coordinate HUD tags onto the canvas and capture coordinates version
  drawCoordinateTags(ctx, detectedLandmarks, width, height);

  let blueprintWithCoordsDataUrl: string | null = null;
  try {
    blueprintWithCoordsDataUrl = canvas.toDataURL('image/jpeg', 0.88);
  } catch (err) {
    console.warn('[poseBlueprint] Canvas toDataURL (coords) failed:', err);
  }

  const landmarkMap: Record<number, { x: number; y: number; z?: number }> = {};
  detectedLandmarks.forEach((lm, idx) => {
    landmarkMap[idx] = { x: lm.x, y: lm.y, z: lm.z };
  });

  const angles = calculateMeasuredAngles(landmarkMap);
  const analysis = analyzePomMotion(landmarkMap);
  const detectedPoseName = analysis.pose?.name || 'Cheer Stance';

  // Extract key landmark coordinates for UI inspection and payload
  const keyCoordinates: KeyJointCoordinate[] = Object.entries(KEY_LANDMARK_NAMES).flatMap(([idStr, name]) => {
    const id = Number(idStr);
    const lm = detectedLandmarks?.[id];
    if (!lm) return [];
    return [{
      id,
      name,
      x: Math.round(lm.x * 1000) / 1000,
      y: Math.round(lm.y * 1000) / 1000,
      z: lm.z !== undefined ? Math.round(lm.z * 1000) / 1000 : undefined,
      visibility: lm.visibility !== undefined ? Math.round(lm.visibility * 100) / 100 : undefined,
    }];
  });

  const cueParts: string[] = [];
  if (angles.leftElbow !== undefined && angles.rightElbow !== undefined) {
    cueParts.push(`Elbows at ${angles.leftElbow}° and ${angles.rightElbow}°`);
  }
  if (angles.leftShoulder !== undefined && angles.rightShoulder !== undefined) {
    cueParts.push(`Shoulder angles: ${angles.leftShoulder}° / ${angles.rightShoulder}°`);
  }
  const coachingCueSuggestion = cueParts.length > 0
    ? `Maintain detected blueprint alignment: ${cueParts.join(', ')} with locked core.`
    : 'Lock posture and maintain solid core alignment.';

  return {
    hasPose: true,
    confidence: analysis.confidence || 0.9,
    landmarks: detectedLandmarks,
    keyCoordinates,
    angles,
    detectedPoseName,
    blueprintDataUrl,
    blueprintWithCoordsDataUrl,
    summaryMessage: `Blueprint generated: ${detectedPoseName} detected with ${Object.keys(angles).length} joint angles measured and ${keyCoordinates.length} key coordinates extracted.`,
    coachingCueSuggestion,
  };
}
