/**
 * OptiStance Autonomous Kinematic Scoring Engine
 * Evaluates athlete landmarks strictly against target pose standards.
 */

import {
  calculateJointAngle,
  calculateVectorElevationFromHorizontal,
  calculateVectorTiltFromVertical,
  extractKinematicAngles,
  type LandmarkPoint,
} from './angles';
import {
  POSE_STANDARDS,
  detectBaseLeg,
  normalizePoseKey,
  type PoseKinematicStandard,
} from './standards';

export type JointStatus = 'correct' | 'warning' | 'error';

export interface JointEvaluation {
  jointKey: string;
  name: string;
  measured: number;
  target: number;
  tolerance: number;
  deviation: number;
  status: JointStatus;
  cue: string | null;
}

export interface PoseScoreResult {
  isTargetRecognized: boolean;
  formScore: number; // 0 - 100 %
  icuScore: number; // 1.0 - 10.0
  icuTier: 'Elite' | 'Proficient' | 'Form Deduction';
  icuTierLabel: string;
  measuredAngles: Record<string, number>;
  evaluations: JointEvaluation[];
  primaryCoachCue: string;
  baseLeg?: 'left' | 'right';
  targetStandard: PoseKinematicStandard | null;
}

const JOINT_NAMES: Record<string, string> = {
  leftElbow: 'Left Elbow',
  rightElbow: 'Right Elbow',
  leftShoulder: 'Left Shoulder',
  rightShoulder: 'Right Shoulder',
  leftHip: 'Left Hip',
  rightHip: 'Right Hip',
  leftKnee: 'Left Knee',
  rightKnee: 'Right Knee',
  standingKnee: 'Standing Knee',
  liftedKnee: 'Lifted Knee',
  liftedHip: 'Lifted Hip',
  standingLegAlignment: 'Standing Leg Alignment',
  rearLegElevation: 'Rear Leg Elevation',
  leftArmElevation: 'Left Arm Elevation',
  rightArmElevation: 'Right Arm Elevation',
  hipSpread: 'Hip Straddle',
  torsoLean: 'Torso Alignment',
};

function midpoint(a: LandmarkPoint | undefined, b: LandmarkPoint | undefined): LandmarkPoint | undefined {
  if (!a || !b) return undefined;
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: ((a.z ?? 0) + (b.z ?? 0)) / 2,
    visibility: Math.min(a.visibility ?? 1, b.visibility ?? 1),
  };
}

/**
 * Scores the current athlete frame against the chosen target pose.
 */
export function scorePose(
  targetPoseIdOrName: string | { id?: string; name?: string },
  landmarks: LandmarkPoint[] | undefined | null,
  options?: {
    difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
    aspectRatio?: number;
  }
): PoseScoreResult {
  const normKey = normalizePoseKey(targetPoseIdOrName);
  const standard = POSE_STANDARDS[normKey] ?? null;

  if (!landmarks || landmarks.length < 29 || !standard) {
    return {
      isTargetRecognized: false,
      formScore: 0,
      icuScore: 1.0,
      icuTier: 'Form Deduction',
      icuTierLabel: 'Reposition in frame',
      measuredAngles: {},
      evaluations: [],
      primaryCoachCue: 'Step inside the camera frame so all key joints are visible.',
      targetStandard: standard,
    };
  }

  // 1. Extract measured joint angles
  const aspectRatio = options?.aspectRatio ?? 1;
  const rawAngles = extractKinematicAngles(landmarks, aspectRatio);
  const measuredAngles = { ...rawAngles };

  // 2. Handle single-leg stunt mapping (standing vs lifted leg)
  let baseLeg: 'left' | 'right' | undefined;
  if (standard.isSingleLeg) {
    const legDetection = detectBaseLeg(landmarks);
    baseLeg = legDetection.baseLeg;

    if (baseLeg === 'left') {
      if (rawAngles.leftKnee !== undefined) measuredAngles.standingKnee = rawAngles.leftKnee;
      if (rawAngles.rightKnee !== undefined) measuredAngles.liftedKnee = rawAngles.rightKnee;
      if (standard.id !== 'arabesque' && rawAngles.rightHip !== undefined) measuredAngles.liftedHip = rawAngles.rightHip;
    } else {
      if (rawAngles.rightKnee !== undefined) measuredAngles.standingKnee = rawAngles.rightKnee;
      if (rawAngles.leftKnee !== undefined) measuredAngles.liftedKnee = rawAngles.leftKnee;
      if (standard.id !== 'arabesque' && rawAngles.leftHip !== undefined) measuredAngles.liftedHip = rawAngles.leftHip;
    }

    if (standard.id === 'arabesque') {
      const liftedSide = baseLeg === 'left' ? 'right' : 'left';
      const standingAnkle = landmarks[baseLeg === 'left' ? 27 : 28];
      const liftedHip = landmarks[liftedSide === 'left' ? 23 : 24];
      const liftedKnee = landmarks[liftedSide === 'left' ? 25 : 26];
      const liftedAnkle = landmarks[liftedSide === 'left' ? 27 : 28];
      const shoulderMid = midpoint(landmarks[11], landmarks[12]);

      const liftedHipAngle = calculateJointAngle(shoulderMid, liftedHip, liftedKnee, aspectRatio);
      if (liftedHipAngle) measuredAngles.liftedHip = liftedHipAngle.angle;

      const standingHip = landmarks[baseLeg === 'left' ? 23 : 24];
      const standingLegAlignment = calculateVectorTiltFromVertical(standingHip, standingAnkle, aspectRatio);
      if (standingLegAlignment !== null) measuredAngles.standingLegAlignment = standingLegAlignment;

      const rearLegElevation = calculateVectorElevationFromHorizontal(liftedHip, liftedAnkle, aspectRatio);
      if (rearLegElevation !== null) measuredAngles.rearLegElevation = rearLegElevation;

      const leftArmElevation = calculateVectorElevationFromHorizontal(landmarks[11], landmarks[15], aspectRatio);
      if (leftArmElevation !== null) measuredAngles.leftArmElevation = leftArmElevation;

      const rightArmElevation = calculateVectorElevationFromHorizontal(landmarks[12], landmarks[16], aspectRatio);
      if (rightArmElevation !== null) measuredAngles.rightArmElevation = rightArmElevation;
    }
  }

  // 3. Evaluate each joint defined in the standard
  const evaluations: JointEvaluation[] = [];
  const isAdvanced = options?.difficulty === 'Advanced';
  let totalWeightedScore = 0;
  let totalWeight = 0;
  let totalDeviationPenalty = 0;
  let hasMissingRequiredMeasurement = false;

  let worstEvaluation: JointEvaluation | null = null;
  let maxSeverity = 0;

  for (const [jointKey, jointStd] of Object.entries(standard.joints)) {
    const measured = measuredAngles[jointKey];
    if (measured === undefined) {
      if (standard.id === 'arabesque') {
        totalWeight += jointStd.weight;
        hasMissingRequiredMeasurement = true;
      }
      continue;
    }

    const target = jointStd.target;
    const tolerance = isAdvanced ? jointStd.toleranceAdvanced : jointStd.toleranceBeginner;
    const deviation = Math.abs(measured - target);

    let status: JointStatus = 'correct';
    let cue: string | null = null;

    if (deviation <= tolerance) {
      status = 'correct';
    } else if (deviation <= tolerance * 1.5) {
      status = 'warning';
      cue = measured < target ? jointStd.cueLow : jointStd.cueHigh;
    } else {
      status = 'error';
      cue = measured < target ? jointStd.cueLow : jointStd.cueHigh;
    }

    // Continuous Joint Score (100% inside tolerance, down to 0% at 3x tolerance)
    const normalizedErr = Math.max(0, deviation - tolerance);
    const maxDropRange = tolerance * 2.0;
    const jointScore = Math.max(0, 100 - (normalizedErr / maxDropRange) * 100);

    totalWeightedScore += jointScore * jointStd.weight;
    totalWeight += jointStd.weight;

    // ICU Deduction Penalty: 0 if in tolerance, up to 1.5 per major joint fault
    const jointPenalty = (normalizedErr / maxDropRange) * (jointStd.weight * 0.8);
    totalDeviationPenalty += jointPenalty;

    const evalItem: JointEvaluation = {
      jointKey,
      name: JOINT_NAMES[jointKey] ?? jointKey,
      measured,
      target,
      tolerance,
      deviation,
      status,
      cue,
    };
    evaluations.push(evalItem);

    // Track worst joint fault for primary coach cue
    const severity = (deviation / tolerance) * jointStd.weight;
    if (severity > maxSeverity && status !== 'correct') {
      maxSeverity = severity;
      worstEvaluation = evalItem;
    }
  }

  // 4. Calculate Final Form Score (0 - 100)
  const formScore = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;

  // 5. Calculate Final ICU Execution Score (1.0 - 10.0)
  const rawIcu = Math.max(1.0, Math.min(10.0, 10.0 - totalDeviationPenalty));
  const icuScore = Math.round(rawIcu * 10) / 10;

  let icuTier: 'Elite' | 'Proficient' | 'Form Deduction';
  let icuTierLabel: string;
  if (icuScore >= 9.0) {
    icuTier = 'Elite';
    icuTierLabel = 'Elite Execution';
  } else if (icuScore >= 7.5) {
    icuTier = 'Proficient';
    icuTierLabel = 'Proficient Form';
  } else {
    icuTier = 'Form Deduction';
    icuTierLabel = `Form Deduction (-${(10 - icuScore).toFixed(1)})`;
  }

  // 6. Generate Energetic Primary Cheer Coach Cue
  let primaryCoachCue: string;
  if (formScore >= 90) {
    primaryCoachCue = `Flawless ${standard.name}! Outstanding extension and lock!`;
  } else if (worstEvaluation && worstEvaluation.cue) {
    primaryCoachCue = worstEvaluation.cue;
  } else if (hasMissingRequiredMeasurement) {
    primaryCoachCue = 'Keep your full body and both arms visible so the Arabesque can be scored.';
  } else if (formScore >= 75) {
    primaryCoachCue = `Strong hold! Refine joint lines to reach 90%+ mastery!`;
  } else {
    primaryCoachCue = `Lock your core and align arms and legs to the ${standard.name} standard.`;
  }

  return {
    isTargetRecognized: formScore >= 40 && !hasMissingRequiredMeasurement,
    formScore,
    icuScore,
    icuTier,
    icuTierLabel,
    measuredAngles,
    evaluations,
    primaryCoachCue,
    baseLeg,
    targetStandard: standard,
  };
}
