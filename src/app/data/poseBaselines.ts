/**
 * OptiStance Biomechanical Reference Baselines & MediaPipe 3D Landmark Datasets
 * Gold-standard reference landmarks extracted from verified elite cheerleading performance.
 */

import { LandmarkPoint } from '../scoring/angles';

export interface ReferenceLandmark3D extends LandmarkPoint {
  id: number;
  name: string;
  x: number; // Normalized [0, 1]
  y: number; // Normalized [0, 1]
  z: number; // Depth relative to hips midpoint
  visibility: number; // Detection confidence [0, 1]
}

export interface BiomechanicalTargetAngle {
  jointKey: string;
  name: string;
  jointTriple: [number, number, number]; // [A, Vertex, C]
  targetDegrees: number;
  acceptableMin: number;
  acceptableMax: number;
  warningTolerance: number;
  description: string;
  faultCue: string;
}

export interface PoseBaselineDataset {
  poseId: string;
  poseName: string;
  category: string;
  metadata: {
    standingLeg: 'left' | 'right';
    liftedLeg: 'left' | 'right';
    motion: string;
    coordinateSpace: 'mediapipe_normalized_3d';
    referenceFrame: { width: number; height: number };
  };
  landmarks: Record<string, ReferenceLandmark3D>;
  landmarksArray: ReferenceLandmark3D[];
  targetAngles: Record<string, BiomechanicalTargetAngle>;
}

/**
 * Standard Cheerleading Liberty Pose Baseline (Right Standing Leg, High V Motion)
 * Calibrated against empirical MediaPipe Pose extraction from reference imagery.
 */
export const LIBERTY_BASELINE: PoseBaselineDataset = {
  poseId: 'liberty',
  poseName: 'Liberty',
  category: 'Stunts',
  metadata: {
    standingLeg: 'right',
    liftedLeg: 'left',
    motion: 'high_v',
    coordinateSpace: 'mediapipe_normalized_3d',
    referenceFrame: { width: 767, height: 1024 },
  },
  landmarks: {
    nose: { id: 0, name: 'nose', x: 0.4746, y: 0.4053, z: -0.12, visibility: 0.99 },
    left_eye_inner: { id: 1, name: 'left_eye_inner', x: 0.485, y: 0.395, z: -0.11, visibility: 0.99 },
    left_eye: { id: 2, name: 'left_eye', x: 0.493, y: 0.395, z: -0.1, visibility: 0.99 },
    left_eye_outer: { id: 3, name: 'left_eye_outer', x: 0.501, y: 0.396, z: -0.1, visibility: 0.99 },
    right_eye_inner: { id: 4, name: 'right_eye_inner', x: 0.463, y: 0.398, z: -0.11, visibility: 0.99 },
    right_eye: { id: 5, name: 'right_eye', x: 0.455, y: 0.4, z: -0.11, visibility: 0.99 },
    right_eye_outer: { id: 6, name: 'right_eye_outer', x: 0.446, y: 0.403, z: -0.11, visibility: 0.99 },
    left_ear: { id: 7, name: 'left_ear', x: 0.518, y: 0.428, z: -0.05, visibility: 0.98 },
    right_ear: { id: 8, name: 'right_ear', x: 0.432, y: 0.436, z: -0.06, visibility: 0.98 },
    mouth_left: { id: 9, name: 'mouth_left', x: 0.488, y: 0.43, z: -0.09, visibility: 0.99 },
    mouth_right: { id: 10, name: 'mouth_right', x: 0.457, y: 0.433, z: -0.09, visibility: 0.99 },
    left_shoulder: { id: 11, name: 'left_shoulder', x: 0.5372, y: 0.4414, z: -0.05, visibility: 0.99 },
    right_shoulder: { id: 12, name: 'right_shoulder', x: 0.4094, y: 0.4531, z: -0.08, visibility: 0.99 },
    left_elbow: { id: 13, name: 'left_elbow', x: 0.5658, y: 0.4102, z: -0.08, visibility: 0.98 },
    right_elbow: { id: 14, name: 'right_elbow', x: 0.3559, y: 0.377, z: -0.12, visibility: 0.98 },
    left_wrist: { id: 15, name: 'left_wrist', x: 0.6232, y: 0.3711, z: -0.1, visibility: 0.97 },
    right_wrist: { id: 16, name: 'right_wrist', x: 0.309, y: 0.2998, z: -0.15, visibility: 0.98 },
    left_pinky: { id: 17, name: 'left_pinky', x: 0.6323, y: 0.3604, z: -0.11, visibility: 0.96 },
    right_pinky: { id: 18, name: 'right_pinky', x: 0.2634, y: 0.25, z: -0.17, visibility: 0.97 },
    left_index: { id: 19, name: 'left_index', x: 0.6493, y: 0.3682, z: -0.11, visibility: 0.96 },
    right_index: { id: 20, name: 'right_index', x: 0.2725, y: 0.2422, z: -0.17, visibility: 0.97 },
    left_thumb: { id: 21, name: 'left_thumb', x: 0.6089, y: 0.3838, z: -0.09, visibility: 0.96 },
    right_thumb: { id: 22, name: 'right_thumb', x: 0.3012, y: 0.2861, z: -0.14, visibility: 0.97 },
    left_hip: { id: 23, name: 'left_hip', x: 0.5228, y: 0.5879, z: -0.02, visibility: 0.99 },
    right_hip: { id: 24, name: 'right_hip', x: 0.4446, y: 0.6113, z: 0.02, visibility: 0.99 },
    left_knee: { id: 25, name: 'left_knee', x: 0.631, y: 0.6475, z: -0.28, visibility: 0.98 },
    right_knee: { id: 26, name: 'right_knee', x: 0.4628, y: 0.7148, z: 0.03, visibility: 0.99 },
    left_ankle: { id: 27, name: 'left_ankle', x: 0.502, y: 0.6982, z: -0.06, visibility: 0.98 },
    right_ankle: { id: 28, name: 'right_ankle', x: 0.4733, y: 0.8057, z: 0.06, visibility: 0.99 },
    left_heel: { id: 29, name: 'left_heel', x: 0.4902, y: 0.7148, z: -0.04, visibility: 0.97 },
    right_heel: { id: 30, name: 'right_heel', x: 0.4746, y: 0.8457, z: 0.08, visibility: 0.98 },
    left_foot_index: { id: 31, name: 'left_foot_index', x: 0.4811, y: 0.7314, z: -0.08, visibility: 0.97 },
    right_foot_index: { id: 32, name: 'right_foot_index', x: 0.502, y: 0.8828, z: 0.02, visibility: 0.98 },
  },
  landmarksArray: [
    { id: 0, name: 'nose', x: 0.4746, y: 0.4053, z: -0.12, visibility: 0.99 },
    { id: 1, name: 'left_eye_inner', x: 0.485, y: 0.395, z: -0.11, visibility: 0.99 },
    { id: 2, name: 'left_eye', x: 0.493, y: 0.395, z: -0.1, visibility: 0.99 },
    { id: 3, name: 'left_eye_outer', x: 0.501, y: 0.396, z: -0.1, visibility: 0.99 },
    { id: 4, name: 'right_eye_inner', x: 0.463, y: 0.398, z: -0.11, visibility: 0.99 },
    { id: 5, name: 'right_eye', x: 0.455, y: 0.4, z: -0.11, visibility: 0.99 },
    { id: 6, name: 'right_eye_outer', x: 0.446, y: 0.403, z: -0.11, visibility: 0.99 },
    { id: 7, name: 'left_ear', x: 0.518, y: 0.428, z: -0.05, visibility: 0.98 },
    { id: 8, name: 'right_ear', x: 0.432, y: 0.436, z: -0.06, visibility: 0.98 },
    { id: 9, name: 'mouth_left', x: 0.488, y: 0.43, z: -0.09, visibility: 0.99 },
    { id: 10, name: 'mouth_right', x: 0.457, y: 0.433, z: -0.09, visibility: 0.99 },
    { id: 11, name: 'left_shoulder', x: 0.5372, y: 0.4414, z: -0.05, visibility: 0.99 },
    { id: 12, name: 'right_shoulder', x: 0.4094, y: 0.4531, z: -0.08, visibility: 0.99 },
    { id: 13, name: 'left_elbow', x: 0.5658, y: 0.4102, z: -0.08, visibility: 0.98 },
    { id: 14, name: 'right_elbow', x: 0.3559, y: 0.377, z: -0.12, visibility: 0.98 },
    { id: 15, name: 'left_wrist', x: 0.6232, y: 0.3711, z: -0.1, visibility: 0.97 },
    { id: 16, name: 'right_wrist', x: 0.309, y: 0.2998, z: -0.15, visibility: 0.98 },
    { id: 17, name: 'left_pinky', x: 0.6323, y: 0.3604, z: -0.11, visibility: 0.96 },
    { id: 18, name: 'right_pinky', x: 0.2634, y: 0.25, z: -0.17, visibility: 0.97 },
    { id: 19, name: 'left_index', x: 0.6493, y: 0.3682, z: -0.11, visibility: 0.96 },
    { id: 20, name: 'right_index', x: 0.2725, y: 0.2422, z: -0.17, visibility: 0.97 },
    { id: 21, name: 'left_thumb', x: 0.6089, y: 0.3838, z: -0.09, visibility: 0.96 },
    { id: 22, name: 'right_thumb', x: 0.3012, y: 0.2861, z: -0.14, visibility: 0.97 },
    { id: 23, name: 'left_hip', x: 0.5228, y: 0.5879, z: -0.02, visibility: 0.99 },
    { id: 24, name: 'right_hip', x: 0.4446, y: 0.6113, z: 0.02, visibility: 0.99 },
    { id: 25, name: 'left_knee', x: 0.631, y: 0.6475, z: -0.28, visibility: 0.98 },
    { id: 26, name: 'right_knee', x: 0.4628, y: 0.7148, z: 0.03, visibility: 0.99 },
    { id: 27, name: 'left_ankle', x: 0.502, y: 0.6982, z: -0.06, visibility: 0.98 },
    { id: 28, name: 'right_ankle', x: 0.4733, y: 0.8057, z: 0.06, visibility: 0.99 },
    { id: 29, name: 'left_heel', x: 0.4902, y: 0.7148, z: -0.04, visibility: 0.97 },
    { id: 30, name: 'right_heel', x: 0.4746, y: 0.8457, z: 0.08, visibility: 0.98 },
    { id: 31, name: 'left_foot_index', x: 0.4811, y: 0.7314, z: -0.08, visibility: 0.97 },
    { id: 32, name: 'right_foot_index', x: 0.502, y: 0.8828, z: 0.02, visibility: 0.98 },
  ],
  targetAngles: {
    standingKnee: {
      jointKey: 'standingKnee',
      name: 'Standing Knee Extension',
      jointTriple: [24, 26, 28],
      targetDegrees: 177.4,
      acceptableMin: 172.0,
      acceptableMax: 180.0,
      warningTolerance: 10.0,
      description: 'Fully locked weight-bearing knee extension.',
      faultCue: 'Lock your standing knee completely — drive heel down!',
    },
    liftedKnee: {
      jointKey: 'liftedKnee',
      name: 'Lifted Knee Flexion',
      jointTriple: [23, 25, 27],
      targetDegrees: 64.0,
      acceptableMin: 45.0,
      acceptableMax: 75.0,
      warningTolerance: 15.0,
      description: 'Sharp acute knee fold with foot tucked against supporting knee.',
      faultCue: 'Tuck lifted foot tight against the supporting knee in a sharp acute fold!',
    },
    liftedHip: {
      jointKey: 'liftedHip',
      name: 'Lifted Hip Abduction/Elevation',
      jointTriple: [11, 23, 25],
      targetDegrees: 122.0,
      acceptableMin: 110.0,
      acceptableMax: 135.0,
      warningTolerance: 18.0,
      description: 'Femur elevation with knee at or above hip crest.',
      faultCue: 'Drive lifted thigh up to horizontal with knee turned outward!',
    },
    rightElbow: {
      jointKey: 'rightElbow',
      name: 'Right Arm High V Elbow Extension',
      jointTriple: [12, 14, 16],
      targetDegrees: 176.8,
      acceptableMin: 165.0,
      acceptableMax: 180.0,
      warningTolerance: 15.0,
      description: 'Locked elbow punch in High V motion.',
      faultCue: 'Lock right elbow completely — strong punch in High V!',
    },
    leftElbow: {
      jointKey: 'leftElbow',
      name: 'Left Arm High V Elbow Extension',
      jointTriple: [11, 13, 15],
      targetDegrees: 166.8,
      acceptableMin: 160.0,
      acceptableMax: 180.0,
      warningTolerance: 15.0,
      description: 'Locked elbow punch in High V motion.',
      faultCue: 'Lock left elbow completely — punch strong into High V!',
    },
    highVAperture: {
      jointKey: 'highVAperture',
      name: 'High V Arm Aperture',
      jointTriple: [16, 12, 15],
      targetDegrees: 95.7,
      acceptableMin: 85.0,
      acceptableMax: 105.0,
      warningTolerance: 15.0,
      description: 'Bilateral High V aperture angle overhead.',
      faultCue: 'Adjust arm spread into a clean High V angle (thumbs forward)!',
    },
    torsoLean: {
      jointKey: 'torsoLean',
      name: 'Torso Alignment',
      jointTriple: [11, 12, 24],
      targetDegrees: 0.0,
      acceptableMin: 0.0,
      acceptableMax: 8.0,
      warningTolerance: 12.0,
      description: 'Vertical spinal alignment stacked over base leg.',
      faultCue: 'Stack shoulders directly over hips — stay vertical without leaning!',
    },
  },
};

/**
 * Calculates normalized Euclidean distance between athlete landmarks and baseline landmarks.
 * Lower distance indicates higher fidelity match.
 */
export function computeBaselinePoseSimilarity(
  athleteLandmarks: LandmarkPoint[],
  baseline: PoseBaselineDataset = LIBERTY_BASELINE
): { similarityScore: number; meanDistance: number } {
  if (!athleteLandmarks || athleteLandmarks.length < 33) {
    return { similarityScore: 0, meanDistance: 1.0 };
  }

  const keyIds = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
  let sumDistSq = 0;
  let count = 0;

  for (const id of keyIds) {
    const ath = athleteLandmarks[id];
    const base = baseline.landmarksArray[id];
    if (!ath || !base) continue;

    const dx = ath.x - base.x;
    const dy = ath.y - base.y;
    sumDistSq += dx * dx + dy * dy;
    count++;
  }

  if (count === 0) return { similarityScore: 0, meanDistance: 1.0 };

  const meanDist = Math.sqrt(sumDistSq / count);
  // Exponential decay similarity: 100% when distance is 0, ~80% at 0.05 mean distance
  const similarityScore = Math.max(0, Math.min(100, Math.round(100 * Math.exp(-4 * meanDist))));

  return { similarityScore, meanDistance: meanDist };
}

/**
 * Standard Cheerleading Heel Stretch Pose Baseline (Right Base, Left Extension)
 * Calibrated against empirical MediaPipe Pose extraction from reference imagery.
 */
export const HEEL_STRETCH_BASELINE: PoseBaselineDataset = {
  poseId: 'heel-stretch',
  poseName: 'Heel Stretch',
  category: 'Stunts / Flexibility',
  metadata: {
    standingLeg: 'right',
    liftedLeg: 'left',
    motion: 'high_v_diagonal',
    coordinateSpace: 'mediapipe_normalized_3d',
    referenceFrame: { width: 517, height: 1024 },
  },
  landmarks: {
    nose: { id: 0, name: 'nose', x: 0.5143, y: 0.2916, z: -0.05, visibility: 0.99 },
    left_shoulder: { id: 11, name: 'left_shoulder', x: 0.547, y: 0.4225, z: -0.03, visibility: 0.99 },
    right_shoulder: { id: 12, name: 'right_shoulder', x: 0.4298, y: 0.3827, z: -0.04, visibility: 0.99 },
    left_elbow: { id: 13, name: 'left_elbow', x: 0.6203, y: 0.371, z: 0.02, visibility: 0.98 },
    right_elbow: { id: 14, name: 'right_elbow', x: 0.2965, y: 0.3139, z: -0.08, visibility: 0.98 },
    left_wrist: { id: 15, name: 'left_wrist', x: 0.6219, y: 0.2527, z: 0.05, visibility: 0.98 },
    right_wrist: { id: 16, name: 'right_wrist', x: 0.1567, y: 0.2304, z: -0.12, visibility: 0.98 },
    left_hip: { id: 23, name: 'left_hip', x: 0.6103, y: 0.5137, z: 0.02, visibility: 0.99 },
    right_hip: { id: 24, name: 'right_hip', x: 0.4847, y: 0.5479, z: 0.0, visibility: 0.99 },
    left_knee: { id: 25, name: 'left_knee', x: 0.6203, y: 0.371, z: 0.06, visibility: 0.98 },
    right_knee: { id: 26, name: 'right_knee', x: 0.5203, y: 0.6829, z: 0.02, visibility: 0.99 },
    left_ankle: { id: 27, name: 'left_ankle', x: 0.6294, y: 0.2206, z: 0.08, visibility: 0.99 },
    right_ankle: { id: 28, name: 'right_ankle', x: 0.5288, y: 0.8694, z: 0.04, visibility: 0.99 },
    left_heel: { id: 29, name: 'left_heel', x: 0.6219, y: 0.2527, z: 0.07, visibility: 0.98 },
    right_heel: { id: 30, name: 'right_heel', x: 0.535, y: 0.88, z: 0.05, visibility: 0.98 },
    left_foot_index: { id: 31, name: 'left_foot_index', x: 0.5839, y: 0.1647, z: 0.06, visibility: 0.98 },
    right_foot_index: { id: 32, name: 'right_foot_index', x: 0.5551, y: 0.8818, z: 0.01, visibility: 0.98 },
  },
  landmarksArray: [
    { id: 0, name: 'nose', x: 0.5143, y: 0.2916, z: -0.05, visibility: 0.99 },
    { id: 11, name: 'left_shoulder', x: 0.547, y: 0.4225, z: -0.03, visibility: 0.99 },
    { id: 12, name: 'right_shoulder', x: 0.4298, y: 0.3827, z: -0.04, visibility: 0.99 },
    { id: 13, name: 'left_elbow', x: 0.6203, y: 0.371, z: 0.02, visibility: 0.98 },
    { id: 14, name: 'right_elbow', x: 0.2965, y: 0.3139, z: -0.08, visibility: 0.98 },
    { id: 15, name: 'left_wrist', x: 0.6219, y: 0.2527, z: 0.05, visibility: 0.98 },
    { id: 16, name: 'right_wrist', x: 0.1567, y: 0.2304, z: -0.12, visibility: 0.98 },
    { id: 23, name: 'left_hip', x: 0.6103, y: 0.5137, z: 0.02, visibility: 0.99 },
    { id: 24, name: 'right_hip', x: 0.4847, y: 0.5479, z: 0.0, visibility: 0.99 },
    { id: 25, name: 'left_knee', x: 0.6203, y: 0.371, z: 0.06, visibility: 0.98 },
    { id: 26, name: 'right_knee', x: 0.5203, y: 0.6829, z: 0.02, visibility: 0.99 },
    { id: 27, name: 'left_ankle', x: 0.6294, y: 0.2206, z: 0.08, visibility: 0.99 },
    { id: 28, name: 'right_ankle', x: 0.5288, y: 0.8694, z: 0.04, visibility: 0.99 },
    { id: 29, name: 'left_heel', x: 0.6219, y: 0.2527, z: 0.07, visibility: 0.98 },
    { id: 30, name: 'right_heel', x: 0.535, y: 0.88, z: 0.05, visibility: 0.98 },
    { id: 31, name: 'left_foot_index', x: 0.5839, y: 0.1647, z: 0.06, visibility: 0.98 },
    { id: 32, name: 'right_foot_index', x: 0.5551, y: 0.8818, z: 0.01, visibility: 0.98 },
  ],
  targetAngles: {
    standingKnee: {
      jointKey: 'standingKnee',
      name: 'Standing Knee Extension',
      jointTriple: [24, 26, 28],
      targetDegrees: 174.0,
      acceptableMin: 168.0,
      acceptableMax: 180.0,
      warningTolerance: 10.0,
      description: 'Fully locked weight-bearing knee.',
      faultCue: 'Lock your standing knee — foundation must be rock solid!',
    },
    liftedKnee: {
      jointKey: 'liftedKnee',
      name: 'Lifted Knee Extension',
      jointTriple: [23, 25, 27],
      targetDegrees: 180.0,
      acceptableMin: 170.0,
      acceptableMax: 180.0,
      warningTolerance: 15.0,
      description: 'Fully locked extension knee without bend.',
      faultCue: 'Lock your extension knee — avoid soft bends in the stretch!',
    },
    verticalSplit: {
      jointKey: 'verticalSplit',
      name: 'Vertical Split Angle',
      jointTriple: [26, 24, 25],
      targetDegrees: 172.0,
      acceptableMin: 160.0,
      acceptableMax: 180.0,
      warningTolerance: 20.0,
      description: 'Oversplit angle between base and elevated legs.',
      faultCue: 'Pull your stretch leg higher toward your ear!',
    },
    torsoLean: {
      jointKey: 'torsoLean',
      name: 'Torso Alignment',
      jointTriple: [11, 12, 24],
      targetDegrees: 0.0,
      acceptableMin: 0.0,
      acceptableMax: 12.0,
      warningTolerance: 18.0,
      description: 'Vertical core alignment with squared hips.',
      faultCue: 'Keep chest tall and hips square — do not lean away!',
    },
  },
};

/**
 * Standard Cheerleading Scorpion Pose Baseline (Right Base, Left Overhead Arch)
 * Calibrated against empirical MediaPipe Pose extraction from reference imagery.
 */
export const SCORPION_BASELINE: PoseBaselineDataset = {
  poseId: 'scorpion',
  poseName: 'Scorpion',
  category: 'Stunts / Flexibility',
  metadata: {
    standingLeg: 'right',
    liftedLeg: 'left',
    motion: 'two_handed_overhead_arch',
    coordinateSpace: 'mediapipe_normalized_3d',
    referenceFrame: { width: 1024, height: 1024 },
  },
  landmarks: {
    nose: { id: 0, name: 'nose', x: 0.4150, y: 0.2832, z: 0.08, visibility: 0.95 },
    left_eye_inner: { id: 1, name: 'left_eye_inner', x: 0.4219, y: 0.2783, z: 0.07, visibility: 0.95 },
    left_eye: { id: 2, name: 'left_eye', x: 0.4277, y: 0.2783, z: 0.07, visibility: 0.95 },
    left_eye_outer: { id: 3, name: 'left_eye_outer', x: 0.4336, y: 0.2793, z: 0.06, visibility: 0.95 },
    right_eye_inner: { id: 4, name: 'right_eye_inner', x: 0.4102, y: 0.2793, z: 0.08, visibility: 0.95 },
    right_eye: { id: 5, name: 'right_eye', x: 0.4063, y: 0.2813, z: 0.08, visibility: 0.95 },
    right_eye_outer: { id: 6, name: 'right_eye_outer', x: 0.4004, y: 0.2832, z: 0.09, visibility: 0.95 },
    left_ear: { id: 7, name: 'left_ear', x: 0.4431, y: 0.2793, z: 0.02, visibility: 0.96 },
    right_ear: { id: 8, name: 'right_ear', x: 0.4043, y: 0.2852, z: 0.06, visibility: 0.96 },
    mouth_left: { id: 9, name: 'mouth_left', x: 0.4238, y: 0.3008, z: 0.07, visibility: 0.95 },
    mouth_right: { id: 10, name: 'mouth_right', x: 0.4102, y: 0.3027, z: 0.08, visibility: 0.95 },
    left_shoulder: { id: 11, name: 'left_shoulder', x: 0.4530, y: 0.3303, z: -0.05, visibility: 0.98 },
    right_shoulder: { id: 12, name: 'right_shoulder', x: 0.4294, y: 0.3564, z: 0.06, visibility: 0.99 },
    left_elbow: { id: 13, name: 'left_elbow', x: 0.3855, y: 0.2709, z: -0.08, visibility: 0.98 },
    right_elbow: { id: 14, name: 'right_elbow', x: 0.4172, y: 0.2062, z: 0.10, visibility: 0.98 },
    left_wrist: { id: 15, name: 'left_wrist', x: 0.5036, y: 0.0816, z: -0.04, visibility: 0.97 },
    right_wrist: { id: 16, name: 'right_wrist', x: 0.4653, y: 0.0924, z: 0.08, visibility: 0.98 },
    left_pinky: { id: 17, name: 'left_pinky', x: 0.5120, y: 0.0650, z: -0.05, visibility: 0.95 },
    right_pinky: { id: 18, name: 'right_pinky', x: 0.4550, y: 0.0750, z: 0.09, visibility: 0.96 },
    left_index: { id: 19, name: 'left_index', x: 0.5180, y: 0.0620, z: -0.05, visibility: 0.95 },
    right_index: { id: 20, name: 'right_index', x: 0.4500, y: 0.0720, z: 0.09, visibility: 0.96 },
    left_thumb: { id: 21, name: 'left_thumb', x: 0.4950, y: 0.0850, z: -0.03, visibility: 0.95 },
    right_thumb: { id: 22, name: 'right_thumb', x: 0.4720, y: 0.0920, z: 0.07, visibility: 0.96 },
    left_hip: { id: 23, name: 'left_hip', x: 0.5637, y: 0.4846, z: -0.05, visibility: 0.99 },
    right_hip: { id: 24, name: 'right_hip', x: 0.5500, y: 0.4724, z: 0.05, visibility: 0.99 },
    left_knee: { id: 25, name: 'left_knee', x: 0.6375, y: 0.2655, z: -0.12, visibility: 0.98 },
    right_knee: { id: 26, name: 'right_knee', x: 0.5622, y: 0.6867, z: 0.06, visibility: 0.99 },
    left_ankle: { id: 27, name: 'left_ankle', x: 0.5377, y: 0.1107, z: -0.06, visibility: 0.99 },
    right_ankle: { id: 28, name: 'right_ankle', x: 0.5361, y: 0.8672, z: 0.05, visibility: 0.99 },
    left_heel: { id: 29, name: 'left_heel', x: 0.5149, y: 0.0754, z: -0.04, visibility: 0.98 },
    right_heel: { id: 30, name: 'right_heel', x: 0.5390, y: 0.8690, z: 0.04, visibility: 0.98 },
    left_foot_index: { id: 31, name: 'left_foot_index', x: 0.4803, y: 0.0483, z: -0.03, visibility: 0.98 },
    right_foot_index: { id: 32, name: 'right_foot_index', x: 0.4902, y: 0.8770, z: 0.08, visibility: 0.98 },
  },
  landmarksArray: [
    { id: 0, name: 'nose', x: 0.4150, y: 0.2832, z: 0.08, visibility: 0.95 },
    { id: 1, name: 'left_eye_inner', x: 0.4219, y: 0.2783, z: 0.07, visibility: 0.95 },
    { id: 2, name: 'left_eye', x: 0.4277, y: 0.2783, z: 0.07, visibility: 0.95 },
    { id: 3, name: 'left_eye_outer', x: 0.4336, y: 0.2793, z: 0.06, visibility: 0.95 },
    { id: 4, name: 'right_eye_inner', x: 0.4102, y: 0.2793, z: 0.08, visibility: 0.95 },
    { id: 5, name: 'right_eye', x: 0.4063, y: 0.2813, z: 0.08, visibility: 0.95 },
    { id: 6, name: 'right_eye_outer', x: 0.4004, y: 0.2832, z: 0.09, visibility: 0.95 },
    { id: 7, name: 'left_ear', x: 0.4431, y: 0.2793, z: 0.02, visibility: 0.96 },
    { id: 8, name: 'right_ear', x: 0.4043, y: 0.2852, z: 0.06, visibility: 0.96 },
    { id: 9, name: 'mouth_left', x: 0.4238, y: 0.3008, z: 0.07, visibility: 0.95 },
    { id: 10, name: 'mouth_right', x: 0.4102, y: 0.3027, z: 0.08, visibility: 0.95 },
    { id: 11, name: 'left_shoulder', x: 0.4530, y: 0.3303, z: -0.05, visibility: 0.98 },
    { id: 12, name: 'right_shoulder', x: 0.4294, y: 0.3564, z: 0.06, visibility: 0.99 },
    { id: 13, name: 'left_elbow', x: 0.3855, y: 0.2709, z: -0.08, visibility: 0.98 },
    { id: 14, name: 'right_elbow', x: 0.4172, y: 0.2062, z: 0.10, visibility: 0.98 },
    { id: 15, name: 'left_wrist', x: 0.5036, y: 0.0816, z: -0.04, visibility: 0.97 },
    { id: 16, name: 'right_wrist', x: 0.4653, y: 0.0924, z: 0.08, visibility: 0.98 },
    { id: 17, name: 'left_pinky', x: 0.5120, y: 0.0650, z: -0.05, visibility: 0.95 },
    { id: 18, name: 'right_pinky', x: 0.4550, y: 0.0750, z: 0.09, visibility: 0.96 },
    { id: 19, name: 'left_index', x: 0.5180, y: 0.0620, z: -0.05, visibility: 0.95 },
    { id: 20, name: 'right_index', x: 0.4500, y: 0.0720, z: 0.09, visibility: 0.96 },
    { id: 21, name: 'left_thumb', x: 0.4950, y: 0.0850, z: -0.03, visibility: 0.95 },
    { id: 22, name: 'right_thumb', x: 0.4720, y: 0.0920, z: 0.07, visibility: 0.96 },
    { id: 23, name: 'left_hip', x: 0.5637, y: 0.4846, z: -0.05, visibility: 0.99 },
    { id: 24, name: 'right_hip', x: 0.5500, y: 0.4724, z: 0.05, visibility: 0.99 },
    { id: 25, name: 'left_knee', x: 0.6375, y: 0.2655, z: -0.12, visibility: 0.98 },
    { id: 26, name: 'right_knee', x: 0.5622, y: 0.6867, z: 0.06, visibility: 0.99 },
    { id: 27, name: 'left_ankle', x: 0.5377, y: 0.1107, z: -0.06, visibility: 0.99 },
    { id: 28, name: 'right_ankle', x: 0.5361, y: 0.8672, z: 0.05, visibility: 0.99 },
    { id: 29, name: 'left_heel', x: 0.5149, y: 0.0754, z: -0.04, visibility: 0.98 },
    { id: 30, name: 'right_heel', x: 0.5390, y: 0.8690, z: 0.04, visibility: 0.98 },
    { id: 31, name: 'left_foot_index', x: 0.4803, y: 0.0483, z: -0.03, visibility: 0.98 },
    { id: 32, name: 'right_foot_index', x: 0.4902, y: 0.8770, z: 0.08, visibility: 0.98 },
  ],
  targetAngles: {
    standingKnee: {
      jointKey: 'standingKnee',
      name: 'Standing Knee Extension',
      jointTriple: [24, 26, 28],
      targetDegrees: 168.5,
      acceptableMin: 162.0,
      acceptableMax: 180.0,
      warningTolerance: 10.0,
      description: 'Standing supporting leg locked straight.',
      faultCue: 'Lock standing supporting leg straight without knee bend!',
    },
    liftedKnee: {
      jointKey: 'liftedKnee',
      name: 'Scorpion Knee Arch Flexion',
      jointTriple: [23, 25, 27],
      targetDegrees: 128.6,
      acceptableMin: 115.0,
      acceptableMax: 145.0,
      warningTolerance: 15.0,
      description: 'Back leg knee fold angle pulling shin over head.',
      faultCue: 'Maintain high knee position and draw shin over head apex.',
    },
    hipSplit: {
      jointKey: 'hipSplit',
      name: 'Sagittal Hip Split Angle',
      jointTriple: [26, 24, 25],
      targetDegrees: 153.8,
      acceptableMin: 140.0,
      acceptableMax: 175.0,
      warningTolerance: 18.0,
      description: 'Split angle between standing femur and elevated back leg femur.',
      faultCue: 'Drive back knee higher toward the ceiling!',
    },
    torsoHyperextension: {
      jointKey: 'torsoHyperextension',
      name: 'Spine / Lumbar Extension Angle',
      jointTriple: [26, 24, 12],
      targetDegrees: 137.1,
      acceptableMin: 125.0,
      acceptableMax: 155.0,
      warningTolerance: 15.0,
      description: 'Lumbar and thoracic spine backward arch relative to standing leg.',
      faultCue: 'Open chest and arch through upper thoracic spine!',
    },
    rightOverheadArm: {
      jointKey: 'rightOverheadArm',
      name: 'Right Overhead Arm Angle',
      jointTriple: [24, 12, 14],
      targetDegrees: 138.5,
      acceptableMin: 125.0,
      acceptableMax: 160.0,
      warningTolerance: 15.0,
      description: 'Right arm overhead backward reach.',
      faultCue: 'Rotate elbows forward and reach overhead for the toe.',
    },
  },
};
