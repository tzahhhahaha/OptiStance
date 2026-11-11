/**
 * OptiStance Heel Stretch Biomechanical Evaluator
 * Computer vision pipeline for cheerleading heel stretch position analysis
 * using MediaPipe Pose (33 3D skeletal landmarks).
 */

import { calculateJointAngle, type LandmarkPoint } from './angles';

// ============================================================================
// 1. MediaPipe Pose Landmark Indices Mapping
// ============================================================================

export const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const;

export interface NormalizedPoint3D {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface BodyNormalizedLandmarks {
  origin: { x: number; y: number; z: number }; // Mid-hip origin
  scaleFactor: number; // Torso length (Mid-shoulder to Mid-hip)
  landmarks: Record<string, NormalizedPoint3D>;
}

// ============================================================================
// 2. Evaluation Types & Biomechanical Criteria
// ============================================================================

export type FormGrade = 'correct' | 'warning' | 'error';

export interface CriterionResult {
  name: string;
  measured: number;
  target: number;
  unit: 'deg' | 'ratio';
  status: FormGrade;
  score: number; // 0 - 100
  weight: number;
  cue: string | null;
}

export interface HeelStretchMetrics {
  standingLeg: 'left' | 'right';
  liftedLeg: 'left' | 'right';
  standingKneeAngle: number; // target: 180°
  liftedKneeAngle: number; // target: 180°
  verticalSplitAngle: number; // target: 170° - 180°
  liftedThighToTorsoAngle: number; // target: ~25° - 35° (tight to torso)
  torsoLeanAngle: number; // target: 0° - 10°
  handToFootGripDistance: number; // normalized ratio (target < 0.20 torso units)
  holdingGripSecure: boolean;
  freeArmElbowAngle: number; // target: 170° - 180°
  freeArmElevationAngle: number; // target: 135° - 165°
}

export interface HeelStretchEvaluation {
  isFormCorrect: boolean; // Master binary classification (score >= 80% & no critical errors)
  overallScore: number; // 0 - 100%
  grade: 'Elite' | 'Proficient' | 'Needs Improvement';
  primaryCoachCue: string;
  metrics: HeelStretchMetrics;
  criteria: Record<string, CriterionResult>;
  normalizedLandmarks: BodyNormalizedLandmarks | null;
}

// ============================================================================
// 3. Coordinate Normalization (Body-Relative & Scale-Invariant)
// ============================================================================

/**
 * Normalizes 3D landmarks relative to the athlete's hip center and scales by
 * torso length (distance between shoulder midpoint and hip midpoint).
 * This makes coordinates invariant to camera distance and athlete proportions.
 */
export function extractBodyNormalizedLandmarks(
  landmarks: LandmarkPoint[] | undefined | null
): BodyNormalizedLandmarks | null {
  if (!landmarks || landmarks.length < 33) return null;

  const ls = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
  const rs = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
  const lh = landmarks[POSE_LANDMARKS.LEFT_HIP];
  const rh = landmarks[POSE_LANDMARKS.RIGHT_HIP];

  if (!ls || !rs || !lh || !rh) return null;

  const midShoulder = {
    x: (ls.x + rs.x) / 2,
    y: (ls.y + rs.y) / 2,
    z: ((ls.z ?? 0) + (rs.z ?? 0)) / 2,
  };

  const midHip = {
    x: (lh.x + rh.x) / 2,
    y: (lh.y + rh.y) / 2,
    z: ((lh.z ?? 0) + (rh.z ?? 0)) / 2,
  };

  // Torso length scale (Euclidean distance between shoulder center and hip center)
  const torsoLength = Math.hypot(
    midShoulder.x - midHip.x,
    midShoulder.y - midHip.y,
    midShoulder.z - midHip.z
  );

  const scaleFactor = torsoLength > 0.05 ? torsoLength : 1.0;
  const normalized: Record<string, NormalizedPoint3D> = {};

  for (const [key, index] of Object.entries(POSE_LANDMARKS)) {
    const lm = landmarks[index];
    if (!lm) continue;

    normalized[key.toLowerCase()] = {
      x: (lm.x - midHip.x) / scaleFactor,
      y: (lm.y - midHip.y) / scaleFactor, // Note: negative is upward
      z: ((lm.z ?? 0) - midHip.z) / scaleFactor,
      visibility: lm.visibility ?? 1.0,
    };
  }

  return {
    origin: midHip,
    scaleFactor,
    landmarks: normalized,
  };
}

// ============================================================================
// 4. Base Leg Detection & Mathematical Angle Helpers
// ============================================================================

/**
 * Detects standing leg vs. elevated leg by comparing ankle vertical coordinates.
 * In camera space, Y increases downward; the supporting ankle has a greater Y.
 */
export function detectHeelStretchLegs(landmarks: LandmarkPoint[]): {
  standingLeg: 'left' | 'right';
  liftedLeg: 'left' | 'right';
} {
  const lAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
  const rAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];

  if (!lAnkle || !rAnkle) {
    return { standingLeg: 'right', liftedLeg: 'left' };
  }

  // Supporting ankle on the stunt base/floor has a substantially larger Y value
  if (lAnkle.y > rAnkle.y + 0.1) {
    return { standingLeg: 'left', liftedLeg: 'right' };
  }
  return { standingLeg: 'right', liftedLeg: 'left' };
}

function compute3DAngle(
  p1: LandmarkPoint | undefined,
  p2: LandmarkPoint | undefined,
  p3: LandmarkPoint | undefined
): number {
  if (!p1 || !p2 || !p3) return 0;
  const v1 = [p1.x - p2.x, p1.y - p2.y, (p1.z ?? 0) - (p2.z ?? 0)];
  const v2 = [p3.x - p2.x, p3.y - p2.y, (p3.z ?? 0) - (p2.z ?? 0)];

  const dot = v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
  const mag1 = Math.hypot(v1[0], v1[1], v1[2]);
  const mag2 = Math.hypot(v2[0], v2[1], v2[2]);

  if (mag1 * mag2 === 0) return 0;
  const cos = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return Math.round((Math.acos(cos) * 180) / Math.PI);
}

// ============================================================================
// 5. Rule-Based Heel Stretch Form Evaluator
// ============================================================================

/**
 * Evaluates an athlete's frame for a cheerleading Heel Stretch.
 * Produces percentage accuracy (0 - 100%), binary classification,
 * detailed kinematic criteria, and actionable coaching cues.
 */
export function evaluateHeelStretch(
  landmarks: LandmarkPoint[] | undefined | null
): HeelStretchEvaluation {
  const failSafe: HeelStretchEvaluation = {
    isFormCorrect: false,
    overallScore: 0,
    grade: 'Needs Improvement',
    primaryCoachCue: 'Step fully inside the camera frame so all joints are visible.',
    metrics: {
      standingLeg: 'right',
      liftedLeg: 'left',
      standingKneeAngle: 0,
      liftedKneeAngle: 0,
      verticalSplitAngle: 0,
      liftedThighToTorsoAngle: 0,
      torsoLeanAngle: 0,
      handToFootGripDistance: 1,
      holdingGripSecure: false,
      freeArmElbowAngle: 0,
      freeArmElevationAngle: 0,
    },
    criteria: {},
    normalizedLandmarks: null,
  };

  if (!landmarks || landmarks.length < 33) return failSafe;

  const bodyNorm = extractBodyNormalizedLandmarks(landmarks);
  const { standingLeg, liftedLeg } = detectHeelStretchLegs(landmarks);

  // Landmark IDs by role
  const isRightStanding = standingLeg === 'right';
  const standHipId = isRightStanding ? POSE_LANDMARKS.RIGHT_HIP : POSE_LANDMARKS.LEFT_HIP;
  const standKneeId = isRightStanding ? POSE_LANDMARKS.RIGHT_KNEE : POSE_LANDMARKS.LEFT_KNEE;
  const standAnkleId = isRightStanding ? POSE_LANDMARKS.RIGHT_ANKLE : POSE_LANDMARKS.LEFT_ANKLE;

  const liftHipId = isRightStanding ? POSE_LANDMARKS.LEFT_HIP : POSE_LANDMARKS.RIGHT_HIP;
  const liftKneeId = isRightStanding ? POSE_LANDMARKS.LEFT_KNEE : POSE_LANDMARKS.RIGHT_KNEE;
  const liftAnkleId = isRightStanding ? POSE_LANDMARKS.LEFT_ANKLE : POSE_LANDMARKS.RIGHT_ANKLE;

  const gripWristId = isRightStanding ? POSE_LANDMARKS.LEFT_WRIST : POSE_LANDMARKS.RIGHT_WRIST;
  const freeShoulderId = isRightStanding ? POSE_LANDMARKS.RIGHT_SHOULDER : POSE_LANDMARKS.LEFT_SHOULDER;
  const freeElbowId = isRightStanding ? POSE_LANDMARKS.RIGHT_ELBOW : POSE_LANDMARKS.LEFT_ELBOW;
  const freeWristId = isRightStanding ? POSE_LANDMARKS.RIGHT_WRIST : POSE_LANDMARKS.LEFT_WRIST;

  const standHip = landmarks[standHipId];
  const standKnee = landmarks[standKneeId];
  const standAnkle = landmarks[standAnkleId];

  const liftHip = landmarks[liftHipId];
  const liftKnee = landmarks[liftKneeId];
  const liftAnkle = landmarks[liftAnkleId];

  const gripWrist = landmarks[gripWristId];
  const freeShoulder = landmarks[freeShoulderId];
  const freeElbow = landmarks[freeElbowId];
  const freeWrist = landmarks[freeWristId];

  const ls = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
  const rs = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
  const lh = landmarks[POSE_LANDMARKS.LEFT_HIP];
  const rh = landmarks[POSE_LANDMARKS.RIGHT_HIP];

  const midShoulder: LandmarkPoint = {
    x: ((ls?.x ?? 0) + (rs?.x ?? 0)) / 2,
    y: ((ls?.y ?? 0) + (rs?.y ?? 0)) / 2,
    z: ((ls?.z ?? 0) + (rs?.z ?? 0)) / 2,
  };
  const midHip: LandmarkPoint = {
    x: ((lh?.x ?? 0) + (rh?.x ?? 0)) / 2,
    y: ((lh?.y ?? 0) + (rh?.y ?? 0)) / 2,
    z: ((lh?.z ?? 0) + (rh?.z ?? 0)) / 2,
  };

  // --- 1. Compute Biomechanical Angles ---
  const standingKneeAngle = compute3DAngle(standHip, standKnee, standAnkle);
  const liftedKneeAngle = compute3DAngle(liftHip, liftKnee, liftAnkle);
  const verticalSplitAngle = compute3DAngle(standKnee, midHip, liftKnee);
  const liftedThighToTorsoAngle = compute3DAngle(midShoulder, liftHip, liftKnee);

  // Torso Lean relative to vertical
  const dxTorso = midShoulder.x - midHip.x;
  const dyTorso = midHip.y - midShoulder.y;
  const torsoLeanAngle = Math.round((Math.atan2(Math.abs(dxTorso), Math.max(0.001, dyTorso)) * 180) / Math.PI);

  // Grip Distance (Holding Hand Wrist to Lifted Ankle, normalized to torso length)
  const torsoScale = bodyNorm?.scaleFactor ?? 0.3;
  const gripDistRaw = Math.hypot(
    (gripWrist?.x ?? 0) - (liftAnkle?.x ?? 0),
    (gripWrist?.y ?? 0) - (liftAnkle?.y ?? 0),
    ((gripWrist?.z ?? 0) - (liftAnkle?.z ?? 0))
  );
  const normalizedGripDist = Number((gripDistRaw / torsoScale).toFixed(3));
  const holdingGripSecure = normalizedGripDist <= 0.28;

  // Free Arm Motion
  const freeArmElbowAngle = compute3DAngle(freeShoulder, freeElbow, freeWrist);
  const freeArmElevationAngle = compute3DAngle(midHip, freeShoulder, freeWrist);

  // --- 2. Form Criteria Evaluation & Scoring ---
  const criteria: Record<string, CriterionResult> = {};

  // Criterion A: Standing Knee Lock (Target: 180°, Weight: 25)
  const standingKneeDev = Math.abs(standingKneeAngle - 180);
  let standingKneeStatus: FormGrade = 'correct';
  let standingKneeCue: string | null = null;
  if (standingKneeDev <= 8) {
    standingKneeStatus = 'correct';
  } else if (standingKneeDev <= 16) {
    standingKneeStatus = 'warning';
    standingKneeCue = 'Drive heel into the floor and lock your standing knee straight!';
  } else {
    standingKneeStatus = 'error';
    standingKneeCue = 'Standing knee is bent! Lock supporting leg completely straight.';
  }
  const standingKneeScore = Math.max(0, 100 - standingKneeDev * 4.5);
  criteria['standingLegExtension'] = {
    name: 'Standing Leg Extension',
    measured: standingKneeAngle,
    target: 180,
    unit: 'deg',
    status: standingKneeStatus,
    score: standingKneeScore,
    weight: 0.25,
    cue: standingKneeCue,
  };

  // Criterion B: Extended Leg Lock (Target: 180°, Weight: 25)
  const liftedKneeDev = Math.abs(liftedKneeAngle - 180);
  let liftedKneeStatus: FormGrade = 'correct';
  let liftedKneeCue: string | null = null;
  if (liftedKneeDev <= 10) {
    liftedKneeStatus = 'correct';
  } else if (liftedKneeDev <= 20) {
    liftedKneeStatus = 'warning';
    liftedKneeCue = 'Straighten the top knee — avoid bending your extended leg.';
  } else {
    liftedKneeStatus = 'error';
    liftedKneeCue = 'Lock extended leg straight! Do not bend knee in the stretch.';
  }
  const liftedKneeScore = Math.max(0, 100 - liftedKneeDev * 4.0);
  criteria['extendedLegLock'] = {
    name: 'Extended Leg Lock',
    measured: liftedKneeAngle,
    target: 180,
    unit: 'deg',
    status: liftedKneeStatus,
    score: liftedKneeScore,
    weight: 0.25,
    cue: liftedKneeCue,
  };

  // Criterion C: Vertical Split Elevation (Target: 175°+, Weight: 20)
  const splitDeficit = Math.max(0, 175 - verticalSplitAngle);
  let splitStatus: FormGrade = 'correct';
  let splitCue: string | null = null;
  if (splitDeficit <= 10) {
    splitStatus = 'correct';
  } else if (splitDeficit <= 25) {
    splitStatus = 'warning';
    splitCue = 'Pull heel higher alongside your ear for true vertical extension.';
  } else {
    splitStatus = 'error';
    splitCue = 'Drive stretch leg higher — aim for a straight 180° vertical split!';
  }
  const splitScore = Math.max(0, 100 - splitDeficit * 3.0);
  criteria['verticalSplit'] = {
    name: 'Vertical Split Angle',
    measured: verticalSplitAngle,
    target: 175,
    unit: 'deg',
    status: splitStatus,
    score: splitScore,
    weight: 0.2,
    cue: splitCue,
  };

  // Criterion D: Torso & Spine Verticality (Target: 0° - 12°, Weight: 15)
  let torsoStatus: FormGrade = 'correct';
  let torsoCue: string | null = null;
  if (torsoLeanAngle <= 12) {
    torsoStatus = 'correct';
  } else if (torsoLeanAngle <= 20) {
    torsoStatus = 'warning';
    torsoCue = 'Keep chest upright and square hips — avoid leaning sideways!';
  } else {
    torsoStatus = 'error';
    torsoCue = 'Excessive torso lean! Engage core and stack shoulders over hips.';
  }
  const torsoScore = Math.max(0, 100 - Math.max(0, torsoLeanAngle - 8) * 5.0);
  criteria['torsoAlignment'] = {
    name: 'Torso Alignment',
    measured: torsoLeanAngle,
    target: 0,
    unit: 'deg',
    status: torsoStatus,
    score: torsoScore,
    weight: 0.15,
    cue: torsoCue,
  };

  // Criterion E: Heel Grip & Balance Arm (Target: Secure grip + locked arm, Weight: 15)
  let armStatus: FormGrade = 'correct';
  let armCue: string | null = null;
  if (holdingGripSecure && freeArmElbowAngle >= 160) {
    armStatus = 'correct';
  } else if (!holdingGripSecure) {
    armStatus = 'warning';
    armCue = 'Firmly grip the bottom arch or heel with your holding hand.';
  } else {
    armStatus = 'warning';
    armCue = 'Lock free arm straight into strong High V / diagonal position.';
  }
  const gripScore = holdingGripSecure ? 100 : Math.max(20, Math.round(100 - (normalizedGripDist - 0.28) * 150));
  const freeArmScore = Math.max(0, 100 - Math.max(0, 175 - freeArmElbowAngle) * 2.5);
  const armCombinedScore = Math.round((gripScore + freeArmScore) / 2);
  criteria['armPlacementAndGrip'] = {
    name: 'Arm Placement & Heel Grip',
    measured: freeArmElbowAngle,
    target: 180,
    unit: 'deg',
    status: armStatus,
    score: armCombinedScore,
    weight: 0.15,
    cue: armCue,
  };

  // --- 3. Composite Weighted Score & Coaching Cue ---
  let totalWeightedScore = 0;
  let activeCue: string | null = null;
  let highestWeightError = 0;

  for (const crit of Object.values(criteria)) {
    totalWeightedScore += crit.score * crit.weight;
    if (crit.status !== 'correct' && crit.cue && crit.weight > highestWeightError) {
      highestWeightError = crit.weight;
      activeCue = crit.cue;
    }
  }

  const overallScore = Math.round(Math.max(0, Math.min(100, totalWeightedScore)));
  const isFormCorrect =
    overallScore >= 80 &&
    standingKneeStatus !== 'error' &&
    liftedKneeStatus !== 'error';

  let grade: 'Elite' | 'Proficient' | 'Needs Improvement' = 'Needs Improvement';
  if (overallScore >= 90) grade = 'Elite';
  else if (overallScore >= 75) grade = 'Proficient';

  const primaryCoachCue =
    activeCue ||
    (isFormCorrect
      ? 'Picture-perfect Heel Stretch! Squeeze core and hold extension.'
      : 'Maintain tall chest, lock both knees, and pull heel tight to ear.');

  return {
    isFormCorrect,
    overallScore,
    grade,
    primaryCoachCue,
    metrics: {
      standingLeg,
      liftedLeg,
      standingKneeAngle,
      liftedKneeAngle,
      verticalSplitAngle,
      liftedThighToTorsoAngle,
      torsoLeanAngle,
      handToFootGripDistance: normalizedGripDist,
      holdingGripSecure,
      freeArmElbowAngle,
      freeArmElevationAngle,
    },
    criteria,
    normalizedLandmarks: bodyNorm,
  };
}

// ============================================================================
// 6. Gold-Standard Heel Stretch Baseline Dataset Template (JSON)
// ============================================================================

export const HEEL_STRETCH_GOLD_STANDARD_BASELINE = {
  pose_id: 'cheer_heel_stretch_standard_01',
  pose_name: 'Heel Stretch (Right Base, Left Elevated)',
  category: 'Stunts / Flexibility',
  reference_metadata: {
    athlete_position: 'flyer',
    standing_leg: 'right',
    lifted_leg: 'left',
    grip_hand: 'left',
    free_arm: 'right',
    free_arm_motion: 'high_v_diagonal',
    coordinate_space: 'mediapipe_normalized_3d',
    frame_resolution: { width: 517, height: 1024 },
  },
  reference_angles: {
    standing_knee_extension: 174,
    lifted_knee_extension: 180,
    vertical_split_angle: 172,
    lifted_thigh_to_torso_angle: 31,
    torso_lean_from_vertical: 13,
    free_arm_elbow_extension: 176,
    free_arm_elevation: 160,
  },
  landmarks: {
    nose: { id: 0, x: 0.5143, y: 0.2916, z: -0.05, visibility: 0.99 },
    left_shoulder: { id: 11, x: 0.547, y: 0.4225, z: -0.03, visibility: 0.99 },
    right_shoulder: { id: 12, x: 0.4298, y: 0.3827, z: -0.04, visibility: 0.99 },
    left_elbow: { id: 13, x: 0.6203, y: 0.371, z: 0.02, visibility: 0.98 },
    right_elbow: { id: 14, x: 0.2965, y: 0.3139, z: -0.08, visibility: 0.98 },
    left_wrist: { id: 15, x: 0.6219, y: 0.2527, z: 0.05, visibility: 0.98 },
    right_wrist: { id: 16, x: 0.1567, y: 0.2304, z: -0.12, visibility: 0.98 },
    left_hip: { id: 23, x: 0.6103, y: 0.5137, z: 0.02, visibility: 0.99 },
    right_hip: { id: 24, x: 0.4847, y: 0.5479, z: 0.0, visibility: 0.99 },
    left_knee: { id: 25, x: 0.6203, y: 0.371, z: 0.06, visibility: 0.98 },
    right_knee: { id: 26, x: 0.5203, y: 0.6829, z: 0.02, visibility: 0.99 },
    left_ankle: { id: 27, x: 0.6294, y: 0.2206, z: 0.08, visibility: 0.99 },
    right_ankle: { id: 28, x: 0.5288, y: 0.8694, z: 0.04, visibility: 0.99 },
    left_heel: { id: 29, x: 0.6219, y: 0.2527, z: 0.07, visibility: 0.98 },
    right_heel: { id: 30, x: 0.535, y: 0.88, z: 0.05, visibility: 0.98 },
    left_foot_index: { id: 31, x: 0.5839, y: 0.1647, z: 0.06, visibility: 0.98 },
    right_foot_index: { id: 32, x: 0.5551, y: 0.8818, z: 0.01, visibility: 0.98 },
  },
};
