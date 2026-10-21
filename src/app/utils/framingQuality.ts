/**
 * Biomechanical Framing & Environmental Quality Assessment
 *
 * Evaluates MediaPipe landmarks and canvas video feed to give athletes
 * real-time posture positioning, distance cues, and gym lighting feedback.
 */

export interface FramingFeedback {
  status: 'optimal' | 'warning' | 'adjust';
  message: string;
  isFullyInFrame: boolean;
  lightingStatus: 'optimal' | 'low' | 'overexposed';
  distanceStatus: 'optimal' | 'too-close' | 'too-far';
}

export interface LandmarkPoint {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

/**
 * Checks environmental lighting directly from an HTMLVideoElement or HTMLImageElement.
 * Samples a 40x40 thumbnail offscreen to avoid reading from cleared overlay canvases.
 */
let offscreenLightingCanvas: HTMLCanvasElement | null = null;
let offscreenLightingCtx: CanvasRenderingContext2D | null = null;

export function evaluateLightingFromSource(
  source: HTMLVideoElement | HTMLImageElement | null
): 'optimal' | 'low' | 'overexposed' {
  if (!source) return 'optimal';
  try {
    if (typeof document === 'undefined') return 'optimal';
    if (!offscreenLightingCanvas) {
      offscreenLightingCanvas = document.createElement('canvas');
      offscreenLightingCanvas.width = 40;
      offscreenLightingCanvas.height = 40;
      offscreenLightingCtx = offscreenLightingCanvas.getContext('2d', { willReadFrequently: true });
    }
    if (!offscreenLightingCtx) return 'optimal';
    offscreenLightingCtx.drawImage(source, 0, 0, 40, 40);
    const imgData = offscreenLightingCtx.getImageData(0, 0, 40, 40);
    const data = imgData.data;

    let totalLuminance = 0;
    const pixelCount = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      totalLuminance += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
    const avgLuminance = totalLuminance / pixelCount;
    if (avgLuminance < 35) return 'low';
    if (avgLuminance > 230) return 'overexposed';
    return 'optimal';
  } catch {
    return 'optimal';
  }
}

/**
 * Checks environmental lighting from a 2D canvas context.
 * Computes ITU-R BT.601 perceived luminance from a sampled grid of pixels.
 */
export function evaluateLighting(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): 'optimal' | 'low' | 'overexposed' {
  if (width <= 0 || height <= 0) return 'optimal';

  try {
    // Sample a 40x40 center thumbnail to keep execution fast (< 0.2ms)
    const sampleWidth = Math.min(40, width);
    const sampleHeight = Math.min(40, height);
    const startX = Math.floor((width - sampleWidth) / 2);
    const startY = Math.floor((height - sampleHeight) / 2);

    const imgData = ctx.getImageData(startX, startY, sampleWidth, sampleHeight);
    const data = imgData.data;

    let totalLuminance = 0;
    const pixelCount = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // ITU-R BT.601 standard weights
      totalLuminance += 0.299 * r + 0.587 * g + 0.114 * b;
    }

    const avgLuminance = totalLuminance / pixelCount;

    if (avgLuminance < 45) return 'low';
    if (avgLuminance > 225) return 'overexposed';
    return 'optimal';
  } catch {
    // If canvas reading is blocked (tainted canvas or context lost), fail safe to optimal
    return 'optimal';
  }
}

/**
 * Assesses distance, full-body visibility, and positioning of the athlete.
 */
export function evaluateFraming(
  landmarks: LandmarkPoint[] | undefined | null,
  lighting: 'optimal' | 'low' | 'overexposed' = 'optimal'
): FramingFeedback {
  if (!landmarks || landmarks.length < 33) {
    return {
      status: 'adjust',
      message: 'Position yourself in front of the camera',
      isFullyInFrame: false,
      lightingStatus: lighting,
      distanceStatus: 'optimal'
    };
  }

  const nose = landmarks[0];
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  const leftAnkle = landmarks[27];
  const rightAnkle = landmarks[28];

  const isVisible = (p?: LandmarkPoint) => !!p && (p.visibility ?? 1) >= 0.35;

  // 1. Distance Analysis
  let distanceStatus: 'optimal' | 'too-close' | 'too-far' = 'optimal';
  if (leftShoulder && rightShoulder) {
    const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
    if (shoulderWidth > 0.46) {
      distanceStatus = 'too-close';
    } else if (shoulderWidth < 0.10 && isVisible(leftShoulder) && isVisible(rightShoulder)) {
      distanceStatus = 'too-far';
    }
  }

  if (leftHip && rightHip && leftShoulder && rightShoulder && distanceStatus === 'optimal') {
    const torsoHeight = Math.abs(((leftHip.y + rightHip.y) / 2) - ((leftShoulder.y + rightShoulder.y) / 2));
    if (torsoHeight > 0.55) {
      distanceStatus = 'too-close';
    } else if (torsoHeight < 0.14) {
      distanceStatus = 'too-far';
    }
  }

  // 2. Full Body Bounds Check
  const headCutOff = nose && nose.y < 0.05;
  const feetCutOff = (leftAnkle && leftAnkle.y > 0.95) || (rightAnkle && rightAnkle.y > 0.95);
  const feetMissing = (!isVisible(leftAnkle) && !isVisible(rightAnkle));

  // 3. Horizontal Center Check
  let offCenter = false;
  if (leftShoulder && rightShoulder) {
    const centerX = (leftShoulder.x + rightShoulder.x) / 2;
    if (centerX < 0.18 || centerX > 0.82) {
      offCenter = true;
    }
  }

  // 4. Determine Composite Feedback
  if (lighting === 'low') {
    return {
      status: 'warning',
      message: 'Dim gym lighting • Increase lighting for accurate scan',
      isFullyInFrame: !headCutOff && !feetCutOff && !feetMissing,
      lightingStatus: 'low',
      distanceStatus
    };
  }

  if (distanceStatus === 'too-close') {
    return {
      status: 'adjust',
      message: 'Step back • Too close to camera',
      isFullyInFrame: false,
      lightingStatus: lighting,
      distanceStatus: 'too-close'
    };
  }

  if (headCutOff) {
    return {
      status: 'adjust',
      message: 'Tilt camera up • Head cut off at top',
      isFullyInFrame: false,
      lightingStatus: lighting,
      distanceStatus
    };
  }

  if (feetCutOff || feetMissing) {
    return {
      status: 'adjust',
      message: 'Step back • Keep full body & feet in frame',
      isFullyInFrame: false,
      lightingStatus: lighting,
      distanceStatus
    };
  }

  if (offCenter) {
    return {
      status: 'adjust',
      message: 'Center yourself in the camera view',
      isFullyInFrame: false,
      lightingStatus: lighting,
      distanceStatus
    };
  }

  if (distanceStatus === 'too-far') {
    return {
      status: 'adjust',
      message: 'Step closer to the camera',
      isFullyInFrame: true,
      lightingStatus: lighting,
      distanceStatus: 'too-far'
    };
  }

  return {
    status: 'optimal',
    message: 'Optimal Framing • Full Body Detected',
    isFullyInFrame: true,
    lightingStatus: lighting,
    distanceStatus: 'optimal'
  };
}
