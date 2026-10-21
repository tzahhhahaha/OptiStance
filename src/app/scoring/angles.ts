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
  c: LandmarkPoint | undefined
): JointAngleResult | null {
  if (!a || !b || !c) return null;

  // Visibility check
  const visA = a.visibility ?? 1;
  const visB = b.visibility ?? 1;
  const visC = c.visibility ?? 1;
  const confidence = Math.min(visA, visB, visC);
  if (confidence < 0.25) return null;

  // Vector BA and Vector BC
  const v1x = a.x - b.x;
  const v1y = a.y - b.y;
  const v2x = c.x - b.x;
  const v2y = c.y - b.y;

  const dot = v1x * v2x + v1y * v2y;
  const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
  const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);

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
  hipMid: LandmarkPoint | undefined
): number | null {
  if (!shoulderMid || !hipMid) return null;

  const dx = shoulderMid.x - hipMid.x;
  const dy = hipMid.y - shoulderMid.y; // positive when shoulder is above hip

  if (dy <= 0) return null; // inverted

  const rad = Math.atan2(Math.abs(dx), dy);
  return Math.round((rad * 180) / Math.PI);
}

/**
 * Calculates all primary kinematic angles from a MediaPipe landmark array.
 */
export function extractKinematicAngles(landmarks: LandmarkPoint[] | undefined | null): Record<string, number> {
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
  const lElbow = calculateJointAngle(landmarks[11], landmarks[13], landmarks[15]);
  if (lElbow) angles.leftElbow = lElbow.angle;

  // Right Elbow (Shoulder 12 -> Elbow 14 -> Wrist 16)
  const rElbow = calculateJointAngle(landmarks[12], landmarks[14], landmarks[16]);
  if (rElbow) angles.rightElbow = rElbow.angle;

  // Left Shoulder (Hip 23 -> Shoulder 11 -> Elbow 13)
  const lShoulder = calculateJointAngle(landmarks[23], landmarks[11], landmarks[13]);
  if (lShoulder) angles.leftShoulder = lShoulder.angle;

  // Right Shoulder (Hip 24 -> Shoulder 12 -> Elbow 14)
  const rShoulder = calculateJointAngle(landmarks[24], landmarks[12], landmarks[14]);
  if (rShoulder) angles.rightShoulder = rShoulder.angle;

  // Left Hip (Shoulder 11 -> Hip 23 -> Knee 25)
  const lHip = calculateJointAngle(landmarks[11], landmarks[23], landmarks[25]);
  if (lHip) angles.leftHip = lHip.angle;

  // Right Hip (Shoulder 12 -> Hip 24 -> Knee 26)
  const rHip = calculateJointAngle(landmarks[12], landmarks[24], landmarks[26]);
  if (rHip) angles.rightHip = rHip.angle;

  // Left Knee (Hip 23 -> Knee 25 -> Ankle 27)
  const lKnee = calculateJointAngle(landmarks[23], landmarks[25], landmarks[27]);
  if (lKnee) angles.leftKnee = lKnee.angle;

  // Right Knee (Hip 24 -> Knee 26 -> Ankle 28)
  const rKnee = calculateJointAngle(landmarks[24], landmarks[26], landmarks[28]);
  if (rKnee) angles.rightKnee = rKnee.angle;

  // Hip Abduction (Knee 25 -> Hip Center -> Knee 26)
  if (landmarks[23] && landmarks[24] && landmarks[25] && landmarks[26]) {
    const hipCenter: LandmarkPoint = {
      x: (landmarks[23].x + landmarks[24].x) / 2,
      y: (landmarks[23].y + landmarks[24].y) / 2,
      visibility: Math.min(landmarks[23].visibility ?? 1, landmarks[24].visibility ?? 1),
    };
    const hipSpread = calculateJointAngle(landmarks[25], hipCenter, landmarks[26]);
    if (hipSpread) angles.hipSpread = hipSpread.angle;
  }

  // Torso Verticality
  if (landmarks[11] && landmarks[12] && landmarks[23] && landmarks[24]) {
    const shoulderMid: LandmarkPoint = {
      x: (landmarks[11].x + landmarks[12].x) / 2,
      y: (landmarks[11].y + landmarks[12].y) / 2,
    };
    const hipMid: LandmarkPoint = {
      x: (landmarks[23].x + landmarks[24].x) / 2,
      y: (landmarks[23].y + landmarks[24].y) / 2,
    };
    const lean = calculateTorsoLean(shoulderMid, hipMid);
    if (lean !== null) angles.torsoLean = lean;
  }

  return angles;
}
