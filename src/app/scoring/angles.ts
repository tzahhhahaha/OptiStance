/**
 * OptiStance Kinematic Vector Engine
 * Calculates 2D/3D joint angles using landmark triads.
 */

export interface LandmarkPoint {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export interface JointAngleResult {
  angle: number; // in degrees 0 - 180
  confidence: number; // minimum visibility across triad
}

/**
 * Calculates the inner angle (in degrees) formed by three points: A -> B -> C,
 * where B is the vertex (the joint).
 */
export function calculateJointAngle(
  a: LandmarkPoint | undefined,
  b: LandmarkPoint | undefined,
  c: LandmarkPoint | undefined,
  aspectRatio = 1
): JointAngleResult | null {
  if (!a || !b || !c) return null;

  // Visibility check
  const visA = a.visibility ?? 1;
  const visB = b.visibility ?? 1;
  const visC = c.visibility ?? 1;
  const confidence = Math.min(visA, visB, visC);
  if (confidence < 0.20) return null;

  const scale = Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 1;
  const v1 = [(a.x - b.x) * scale, a.y - b.y, ((a.z ?? 0) - (b.z ?? 0)) * scale];
  const v2 = [(c.x - b.x) * scale, c.y - b.y, ((c.z ?? 0) - (b.z ?? 0)) * scale];
  const dot = v1.reduce((sum, value, index) => sum + value * v2[index], 0);
  const mag1 = Math.hypot(...v1);
  const mag2 = Math.hypot(...v2);

  if (mag1 === 0 || mag2 === 0) return null;

  const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  const angleDegrees = Math.round((Math.acos(cosAngle) * 180) / Math.PI);

  return { angle: angleDegrees, confidence };
}

/**
 * Calculates angle between a vector (A -> B) and the vertical gravity vector (0, 1).
 * Returns torso lean in degrees (0° = perfectly vertical).
 */
export function calculateTorsoLean(
  shoulderMid: LandmarkPoint | undefined,
  hipMid: LandmarkPoint | undefined,
  aspectRatio = 1
): number | null {
  if (!shoulderMid || !hipMid) return null;

  const scale = Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 1;
  const dx = (shoulderMid.x - hipMid.x) * scale;
  const dz = ((shoulderMid.z ?? 0) - (hipMid.z ?? 0)) * scale;
  const dy = hipMid.y - shoulderMid.y; // positive when shoulder is above hip

  if (dy <= 0) return null; // inverted

  const rad = Math.atan2(Math.hypot(dx, dz), dy);
  return Math.round((rad * 180) / Math.PI);
}

export function calculateVectorElevationFromHorizontal(
  from: LandmarkPoint | undefined,
  to: LandmarkPoint | undefined,
  aspectRatio = 1
): number | null {
  if (!from || !to) return null;
  const visibility = Math.min(from.visibility ?? 1, to.visibility ?? 1);
  if (visibility < 0.20) return null;

  const scale = Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 1;
  const dx = (to.x - from.x) * scale;
  const dy = to.y - from.y;
  const dz = ((to.z ?? 0) - (from.z ?? 0)) * scale;
  const horizontalLength = Math.hypot(dx, dz);
  if (Math.hypot(horizontalLength, dy) < 1e-8) return null;
  return Math.round((Math.atan2(Math.abs(dy), horizontalLength) * 180) / Math.PI);
}

export function calculateVectorTiltFromVertical(
  from: LandmarkPoint | undefined,
  to: LandmarkPoint | undefined,
  aspectRatio = 1
): number | null {
  const elevation = calculateVectorElevationFromHorizontal(from, to, aspectRatio);
  return elevation === null ? null : 90 - elevation;
}

/**
 * Calculates all primary kinematic angles from a MediaPipe landmark array.
 */
export function extractKinematicAngles(
  landmarks: LandmarkPoint[] | undefined | null,
  aspectRatio = 1
): Record<string, number> {
  if (!landmarks || landmarks.length < 33) return {};

  const angles: Record<string, number> = {};

  // MediaPipe Landmark IDs:
  // 11: L Shoulder, 12: R Shoulder
  // 13: L Elbow,    14: R Elbow
  // 15: L Wrist,    16: R Wrist
  // 23: L Hip,      24: R Hip
  // 25: L Knee,     26: R Knee
  // 27: L Ankle,    28: R Ankle

  // Left Elbow (Shoulder 11 -> Elbow 13 -> Wrist 15)
  const lElbow = calculateJointAngle(landmarks[11], landmarks[13], landmarks[15], aspectRatio);
  if (lElbow) angles.leftElbow = lElbow.angle;

  // Right Elbow (Shoulder 12 -> Elbow 14 -> Wrist 16)
  const rElbow = calculateJointAngle(landmarks[12], landmarks[14], landmarks[16], aspectRatio);
  if (rElbow) angles.rightElbow = rElbow.angle;

  const shoulder11 = landmarks[11];
  const shoulder12 = landmarks[12];
  const hip23 = landmarks[23];
  const hip24 = landmarks[24];

  // If hips are missing or low visibility (e.g. waist-up framing), use vertical torso reference point below shoulder
  const effectiveHip23 = (hip23 && (hip23.visibility ?? 1) >= 0.20 && hip23.y > (shoulder11?.y ?? 0))
    ? hip23
    : (shoulder11 ? { x: shoulder11.x, y: shoulder11.y + 0.35, visibility: 1.0 } : undefined);

  const effectiveHip24 = (hip24 && (hip24.visibility ?? 1) >= 0.20 && hip24.y > (shoulder12?.y ?? 0))
    ? hip24
    : (shoulder12 ? { x: shoulder12.x, y: shoulder12.y + 0.35, visibility: 1.0 } : undefined);

  // Left Shoulder (Hip 23 -> Shoulder 11 -> Elbow 13)
  const lShoulder = calculateJointAngle(effectiveHip23, landmarks[11], landmarks[13], aspectRatio);
  if (lShoulder) angles.leftShoulder = lShoulder.angle;

  // Right Shoulder (Hip 24 -> Shoulder 12 -> Elbow 14)
  const rShoulder = calculateJointAngle(effectiveHip24, landmarks[12], landmarks[14], aspectRatio);
  if (rShoulder) angles.rightShoulder = rShoulder.angle;

  // Left Hip (Shoulder 11 -> Hip 23 -> Knee 25)
  const lHip = calculateJointAngle(landmarks[11], landmarks[23], landmarks[25], aspectRatio);
  if (lHip) angles.leftHip = lHip.angle;

  // Right Hip (Shoulder 12 -> Hip 24 -> Knee 26)
  const rHip = calculateJointAngle(landmarks[12], landmarks[24], landmarks[26], aspectRatio);
  if (rHip) angles.rightHip = rHip.angle;

  // Left Knee (Hip 23 -> Knee 25 -> Ankle 27)
  const lKnee = calculateJointAngle(landmarks[23], landmarks[25], landmarks[27], aspectRatio);
  if (lKnee) angles.leftKnee = lKnee.angle;

  // Right Knee (Hip 24 -> Knee 26 -> Ankle 28)
  const rKnee = calculateJointAngle(landmarks[24], landmarks[26], landmarks[28], aspectRatio);
  if (rKnee) angles.rightKnee = rKnee.angle;

  // Hip Abduction (Knee 25 -> Hip Center -> Knee 26)
  if (landmarks[23] && landmarks[24] && landmarks[25] && landmarks[26]) {
    const hipCenter: LandmarkPoint = {
      x: (landmarks[23].x + landmarks[24].x) / 2,
      y: (landmarks[23].y + landmarks[24].y) / 2,
      z: ((landmarks[23].z ?? 0) + (landmarks[24].z ?? 0)) / 2,
      visibility: Math.min(landmarks[23].visibility ?? 1, landmarks[24].visibility ?? 1),
    };
    const hipSpread = calculateJointAngle(landmarks[25], hipCenter, landmarks[26], aspectRatio);
    if (hipSpread) angles.hipSpread = hipSpread.angle;
  }

  // Torso Verticality
  if (landmarks[11] && landmarks[12]) {
    const shoulderMid: LandmarkPoint = {
      x: (landmarks[11].x + landmarks[12].x) / 2,
      y: (landmarks[11].y + landmarks[12].y) / 2,
      z: ((landmarks[11].z ?? 0) + (landmarks[12].z ?? 0)) / 2,
    };
    if (hip23 && hip24 && (hip23.visibility ?? 1) >= 0.20 && (hip24.visibility ?? 1) >= 0.20) {
      const hipMid: LandmarkPoint = {
        x: (hip23.x + hip24.x) / 2,
        y: (hip23.y + hip24.y) / 2,
        z: ((hip23.z ?? 0) + (hip24.z ?? 0)) / 2,
      };
      const lean = calculateTorsoLean(shoulderMid, hipMid, aspectRatio);
      if (lean !== null) angles.torsoLean = lean;
    } else {
      // In upper-body/waist-up framing, torso is upright when shoulders are level
      const shoulderTilt = Math.abs(landmarks[11].y - landmarks[12].y);
      const shoulderWidth = Math.max(0.01, Math.abs(landmarks[11].x - landmarks[12].x));
      angles.torsoLean = Math.round((Math.atan2(shoulderTilt, shoulderWidth) * 180) / Math.PI);
    }
  }

  return angles;
}
