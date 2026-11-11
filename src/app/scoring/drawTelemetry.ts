/**
 * OptiStance Biomechanical Telemetry Renderer
 * Draws color-coded skeleton joints, angle arcs, and scorecard overlays onto images.
 */

import type { PoseScoreResult } from './scorePose';
import type { NormalizedLandmarkListList } from '@mediapipe/hands';

export const POSE_CONNECTIONS_MAP: [number, number][] = [
  // Torso
  [11, 12], [11, 23], [12, 24], [23, 24],
  // Left arm
  [11, 13], [13, 15],
  // Right arm
  [12, 14], [14, 16],
  // Left leg
  [23, 25], [25, 27],
  // Right leg
  [24, 26], [26, 28],
];

export const FACE_FEATURE_CONNECTIONS_MAP: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 7],
  [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10],
];

const HAND_BASE_MARKER_IDS = [0, 5, 17];

export const JOINT_LANDMARK_MAP: Record<string, number> = {
  leftElbow: 13,
  rightElbow: 14,
  leftShoulder: 11,
  rightShoulder: 12,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  standingKnee: 25, // dynamic
  liftedKnee: 26,
  liftedHip: 23,
};

export function smoothHandLandmarks(
  current: NormalizedLandmarkListList,
  previous: NormalizedLandmarkListList,
  smoothingFactor = 0.25
): NormalizedLandmarkListList {
  if (
    current.length !== previous.length ||
    current.some((hand, handIndex) => hand.length !== previous[handIndex]?.length)
  ) {
    return current.map((hand) => hand.map((landmark) => ({ ...landmark })));
  }

  return current.map((hand, handIndex) =>
    hand.map((landmark, landmarkIndex) => {
      const prior = previous[handIndex][landmarkIndex];
      return {
        ...landmark,
        x: prior.x + (landmark.x - prior.x) * smoothingFactor,
        y: prior.y + (landmark.y - prior.y) * smoothingFactor,
        z: prior.z + (landmark.z - prior.z) * smoothingFactor,
      };
    })
  );
}

export function drawHandLandmarks(
  ctx: CanvasRenderingContext2D,
  hands: NormalizedLandmarkListList,
  width: number,
  height: number,
  mirrored = false
) {
  if (!hands.length) return;

  ctx.save();
  if (mirrored) {
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
  }

  for (const hand of hands) {
    for (const index of HAND_BASE_MARKER_IDS) {
      const landmark = hand[index];
      if (!landmark) continue;

      const x = landmark.x * width;
      const y = landmark.y * height;

      ctx.beginPath();
      ctx.arc(x, y, Math.max(3, Math.round(width / 180)), 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(16, 185, 129, 0.4)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, Math.max(2, Math.round(width / 300)), 0, 2 * Math.PI);
      ctx.fillStyle = '#10b981';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  ctx.restore();
}

/**
 * Draws the biomechanical skeleton with color-coded joints (🟢/🟡/🔴)
 * and degree labels onto a canvas context.
 */
export function drawBiomechanicalSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: any[],
  scoreResult: PoseScoreResult | null,
  width: number,
  height: number
) {
  if (!landmarks || landmarks.length < 29) return;

  // Build a lookup of joint statuses
  const statusByLandmarkId: Record<number, 'correct' | 'warning' | 'error'> = {};
  const degreeByLandmarkId: Record<number, number> = {};

  if (scoreResult && scoreResult.evaluations) {
    for (const ev of scoreResult.evaluations) {
      let lmId = JOINT_LANDMARK_MAP[ev.jointKey];
      if (ev.jointKey === 'standingKnee') {
        lmId = scoreResult.baseLeg === 'right' ? 26 : 25;
      } else if (ev.jointKey === 'liftedKnee') {
        lmId = scoreResult.baseLeg === 'right' ? 25 : 26;
      } else if (ev.jointKey === 'liftedHip') {
        lmId = scoreResult.baseLeg === 'right' ? 23 : 24;
      }

      if (lmId !== undefined) {
        statusByLandmarkId[lmId] = ev.status;
        degreeByLandmarkId[lmId] = ev.measured;
      }
    }
  }

  // Draw connector lines
  ctx.save();
  for (const [startId, endId] of FACE_FEATURE_CONNECTIONS_MAP) {
    const lmA = landmarks[startId];
    const lmB = landmarks[endId];
    if (!lmA || !lmB || (lmA.visibility ?? 1) < 0.3 || (lmB.visibility ?? 1) < 0.3) continue;

    ctx.beginPath();
    ctx.moveTo(lmA.x * width, lmA.y * height);
    ctx.lineTo(lmB.x * width, lmB.y * height);
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = Math.max(3, Math.round(width / 160));
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  for (const [startId, endId] of POSE_CONNECTIONS_MAP) {
    const lmA = landmarks[startId];
    const lmB = landmarks[endId];
    if (!lmA || !lmB || (lmA.visibility ?? 1) < 0.3 || (lmB.visibility ?? 1) < 0.3) continue;

    const statusA = statusByLandmarkId[startId];
    const statusB = statusByLandmarkId[endId];

    let strokeColor = '#10b981'; // Green default
    if (statusA === 'error' || statusB === 'error') {
      strokeColor = '#f43f5e'; // Red
    } else if (statusA === 'warning' || statusB === 'warning') {
      strokeColor = '#f59e0b'; // Amber
    }

    ctx.beginPath();
    ctx.moveTo(lmA.x * width, lmA.y * height);
    ctx.lineTo(lmB.x * width, lmB.y * height);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = Math.max(3, Math.round(width / 160));
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  // Draw face and body landmark circles & degree badges
  for (let id = 0; id <= 28; id++) {
    const lm = landmarks[id];
    if (!lm || (lm.visibility ?? 1) < 0.3) continue;

    const x = lm.x * width;
    const y = lm.y * height;
    const status = statusByLandmarkId[id] ?? 'correct';

    let fillColor = '#10b981';
    let haloColor = 'rgba(16, 185, 129, 0.4)';
    if (status === 'error') {
      fillColor = '#f43f5e';
      haloColor = 'rgba(244, 63, 94, 0.4)';
    } else if (status === 'warning') {
      fillColor = '#f59e0b';
      haloColor = 'rgba(245, 158, 11, 0.4)';
    }
    const isSmallLandmark = id <= 10 || id === 15 || id === 16;
    const haloRadius = isSmallLandmark
      ? Math.max(4, Math.round(width / 130))
      : Math.max(7, Math.round(width / 70));
    const jointRadius = isSmallLandmark
      ? Math.max(2, Math.round(width / 220))
      : Math.max(4, Math.round(width / 120));

    // Outer glow ring
    ctx.beginPath();
    ctx.arc(x, y, haloRadius, 0, 2 * Math.PI);
    ctx.fillStyle = haloColor;
    ctx.fill();

    // Solid inner joint dot
    ctx.beginPath();
    ctx.arc(x, y, jointRadius, 0, 2 * Math.PI);
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Draw measured degree badge if available
    const deg = degreeByLandmarkId[id];
    if (deg !== undefined) {
      const label = `${deg}°`;
      ctx.font = `bold ${Math.max(10, Math.round(width / 50))}px monospace`;
      const textMetrics = ctx.measureText(label);
      const bgW = textMetrics.width + 8;
      const bgH = Math.max(14, Math.round(width / 40));

      const badgeX = x + 8;
      const badgeY = y - 8;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(badgeX, badgeY - bgH + 2, bgW, bgH, 4);
      } else {
        ctx.rect(badgeX, badgeY - bgH + 2, bgW, bgH);
      }
      ctx.fill();
      ctx.strokeStyle = fillColor;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, badgeX + 4, badgeY - 2);
    }
  }

  ctx.restore();
}

/**
 * Renders an exported image with a branded OptiStance scorecard banner at the bottom.
 */
export function createBrandedScorecard(
  baseDataUrl: string,
  poseName: string,
  score: number,
  icuScore: number,
  cue: string
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const bannerHeight = Math.max(70, Math.round(img.height * 0.16));
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height + bannerHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(baseDataUrl);
        return;
      }

      // Draw photo
      ctx.drawImage(img, 0, 0);

      // Draw banner
      ctx.fillStyle = '#0a0a10';
      ctx.fillRect(0, img.height, canvas.width, bannerHeight);

      // Gradient accent line
      const grad = ctx.createLinearGradient(0, img.height, canvas.width, img.height);
      grad.addColorStop(0, '#6366f1');
      grad.addColorStop(0.5, '#ec4899');
      grad.addColorStop(1, '#10b981');
      ctx.fillStyle = grad;
      ctx.fillRect(0, img.height, canvas.width, 3);

      // App Title & Pose Name
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.max(14, Math.round(canvas.width / 32))}px sans-serif`;
      ctx.fillText(`OptiStance • ${poseName}`, 16, img.height + bannerHeight * 0.42);

      // Coach Cue
      ctx.fillStyle = '#a1a1aa';
      ctx.font = `${Math.max(10, Math.round(canvas.width / 48))}px sans-serif`;
      const truncatedCue = cue.length > 55 ? `${cue.slice(0, 52)}...` : cue;
      ctx.fillText(truncatedCue, 16, img.height + bannerHeight * 0.75);

      // Score Badges on Right
      const scoreText = `${score}%`;
      ctx.font = `black ${Math.max(18, Math.round(canvas.width / 24))}px monospace`;
      const scoreWidth = ctx.measureText(scoreText).width;
      ctx.fillStyle = score >= 80 ? '#34d399' : '#fbbf24';
      ctx.fillText(scoreText, canvas.width - scoreWidth - 16, img.height + bannerHeight * 0.52);

      const icuText = `ICU ${icuScore}/10`;
      ctx.font = `bold ${Math.max(10, Math.round(canvas.width / 50))}px sans-serif`;
      ctx.fillStyle = '#818cf8';
      const icuWidth = ctx.measureText(icuText).width;
      ctx.fillText(icuText, canvas.width - icuWidth - 16, img.height + bannerHeight * 0.80);

      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => resolve(baseDataUrl);
    img.src = baseDataUrl;
  });
}
