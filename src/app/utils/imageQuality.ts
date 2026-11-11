/**
 * Image Quality & Blur Detection Utility
 *
 * Analyzes uploaded cheerleader photos to detect:
 * 1. Motion blur / out-of-focus blur using Laplacian gradient variance
 * 2. Environmental lighting / exposure issues (too dark or overexposed)
 * 3. Resolution and framing quality
 */

export interface ImageQualityReport {
  isBlurry: boolean;
  sharpness: 'sharp' | 'slight-blur' | 'blurry';
  sharpnessScore: number; // 0 to 100
  variance: number;
  lighting: 'optimal' | 'low' | 'overexposed';
  avgLuminance: number;
  width: number;
  height: number;
  isAcceptable: boolean;
  summaryMessage: string;
  feedbackTips: string[];
}

/**
 * Computes the discrete Laplacian variance and perceived luminance
 * from raw RGBA pixel data.
 */
export function analyzeImagePixels(
  data: Uint8ClampedArray | number[],
  width: number,
  height: number
): ImageQualityReport {
  if (width < 3 || height < 3 || data.length < width * height * 4) {
    return {
      isBlurry: false,
      sharpness: 'sharp',
      sharpnessScore: 50,
      variance: 200,
      lighting: 'optimal',
      avgLuminance: 128,
      width,
      height,
      isAcceptable: true,
      summaryMessage: 'Image dimensions are too small to analyze.',
      feedbackTips: [],
    };
  }

  // 1. Convert to grayscale buffer
  const gray = new Float32Array(width * height);
  let totalLuminance = 0;

  for (let i = 0, p = 0; i < data.length && p < gray.length; i += 4, p++) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // ITU-R BT.601 standard weights
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    gray[p] = lum;
    totalLuminance += lum;
  }

  const avgLuminance = Math.round(totalLuminance / gray.length);

  // 2. Discrete Laplacian kernel:
  // [  0,  1,  0 ]
  // [  1, -4,  1 ]
  // [  0,  1,  0 ]
  let sumL = 0;
  let sumSqL = 0;
  let count = 0;

  for (let y = 1; y < height - 1; y++) {
    const rowOffset = y * width;
    for (let x = 1; x < width - 1; x++) {
      const idx = rowOffset + x;
      const lap =
        gray[idx - 1] +
        gray[idx + 1] +
        gray[idx - width] +
        gray[idx + width] -
        4 * gray[idx];

      sumL += lap;
      sumSqL += lap * lap;
      count++;
    }
  }

  const meanL = count > 0 ? sumL / count : 0;
  const variance = count > 0 ? Math.max(0, sumSqL / count - meanL * meanL) : 0;

  // 3. Classify sharpness
  let sharpness: 'sharp' | 'slight-blur' | 'blurry' = 'sharp';
  let isBlurry = false;
  let sharpnessScore = Math.min(100, Math.max(0, Math.round((Math.sqrt(variance) / 18) * 100)));

  if (variance < 90) {
    sharpness = 'blurry';
    isBlurry = true;
    sharpnessScore = Math.min(45, Math.round((variance / 90) * 45));
  } else if (variance < 170) {
    sharpness = 'slight-blur';
    sharpnessScore = Math.min(75, 45 + Math.round(((variance - 90) / 80) * 30));
  }

  // 4. Classify lighting
  let lighting: 'optimal' | 'low' | 'overexposed' = 'optimal';
  if (avgLuminance < 50) {
    lighting = 'low';
  } else if (avgLuminance > 220) {
    lighting = 'overexposed';
  }

  // 5. Build user-facing feedback
  const feedbackTips: string[] = [];
  if (isBlurry) {
    feedbackTips.push('The image is blurry. Please upload a sharper, steady photo for accurate pose detection.');
  }
  if (lighting === 'low') {
    feedbackTips.push('The photo is too dark. Increase lighting or use a flash to reveal joint lines.');
  } else if (lighting === 'overexposed') {
    feedbackTips.push('The photo has harsh glare or overexposure. Reduce direct backlighting.');
  }

  if (width < 400 || height < 400) {
    feedbackTips.push('Resolution is low. A higher resolution photo ensures precise angle measurements.');
  }

  const isAcceptable = !isBlurry && lighting !== 'low';

  let summaryMessage = 'Image quality is excellent for pose analysis.';
  if (isBlurry && lighting === 'low') {
    summaryMessage = 'The image is blurry and lighting is too dark. Please upload a clearer photo.';
  } else if (isBlurry) {
    summaryMessage = 'The image is blurry. Detection may miss joint angles.';
  } else if (lighting === 'low') {
    summaryMessage = 'The image has low lighting. Joint recognition may be reduced.';
  } else if (sharpness === 'slight-blur') {
    summaryMessage = 'Slight motion blur detected, but pose analysis is possible.';
  }

  return {
    isBlurry,
    sharpness,
    sharpnessScore,
    variance: Math.round(variance),
    lighting,
    avgLuminance,
    width,
    height,
    isAcceptable,
    summaryMessage,
    feedbackTips,
  };
}

/**
 * Analyzes an HTMLImageElement using an offscreen canvas.
 */
export function analyzeUploadedImage(img: HTMLImageElement): ImageQualityReport {
  try {
    const canvas = document.createElement('canvas');
    // Sample at 240px max dimension for fast processing (< 4ms)
    const maxDim = 240;
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || 640, img.naturalHeight || 480));
    const targetW = Math.max(10, Math.round((img.naturalWidth || 640) * scale));
    const targetH = Math.max(10, Math.round((img.naturalHeight || 480) * scale));

    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context unavailable');
    }

    ctx.drawImage(img, 0, 0, targetW, targetH);
    const imgData = ctx.getImageData(0, 0, targetW, targetH);

    const report = analyzeImagePixels(imgData.data, targetW, targetH);
    return {
      ...report,
      width: img.naturalWidth || targetW,
      height: img.naturalHeight || targetH,
    };
  } catch (err) {
    console.warn('[imageQuality] Failed to analyze image with canvas:', err);
    return {
      isBlurry: false,
      sharpness: 'sharp',
      sharpnessScore: 80,
      variance: 250,
      lighting: 'optimal',
      avgLuminance: 128,
      width: img.naturalWidth || 640,
      height: img.naturalHeight || 480,
      isAcceptable: true,
      summaryMessage: 'Photo loaded for analysis.',
      feedbackTips: [],
    };
  }
}
