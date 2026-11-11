import type { Pose } from '../types';
import type { JointEvaluation } from './scorePose';
import { POSE_STANDARDS } from './standards';

export interface TrainingDrill {
  id: string;
  title: string;
  instructions: string;
  dosage: string;
  focusJoints: string[];
}

const POSE_DRILLS: Record<string, TrainingDrill[]> = {
  't-motion': [
    {
      id: 't-motion-arm-line',
      title: 'T-Line Holds',
      instructions: 'Open both arms to shoulder height, keep elbows long, and check that your wrists and shoulders form one level line.',
      dosage: 'Hold 8 seconds, reset, and repeat 5 times.',
      focusJoints: ['leftShoulder', 'rightShoulder', 'leftElbow', 'rightElbow'],
    },
    {
      id: 't-motion-shoulder-reset',
      title: 'Shoulder-Level Resets',
      instructions: 'From a relaxed stance, snap both arms out to a T and keep your torso tall without shrugging.',
      dosage: 'Practice 2 sets of 6 controlled repetitions.',
      focusJoints: ['torsoLean', 'leftShoulder', 'rightShoulder'],
    },
  ],
  'high-v': [
    {
      id: 'high-v-sharp-punches',
      title: 'High-V Sharp Punches',
      instructions: 'From a relaxed stance, punch both straight arms into a comfortable High V, keeping shoulders relaxed.',
      dosage: 'Practice 2 sets of 6 repetitions; pause briefly at the top.',
      focusJoints: ['leftShoulder', 'rightShoulder', 'leftElbow', 'rightElbow'],
    },
    {
      id: 'high-v-static-hold',
      title: 'High-V Form Holds',
      instructions: 'Hold a strong High V with a long neck, steady torso, and straight arms. Do not force your shoulder range.',
      dosage: 'Hold 8 seconds, reset, and repeat 5 times.',
      focusJoints: ['torsoLean', 'leftShoulder', 'rightShoulder'],
    },
  ],
  'low-v': [
    {
      id: 'low-v-sharp-punches',
      title: 'Low-V Sharp Punches',
      instructions: 'Snap both straight arms into a comfortable Low V while keeping your chest lifted and torso centered.',
      dosage: 'Practice 2 sets of 6 repetitions.',
      focusJoints: ['leftShoulder', 'rightShoulder', 'leftElbow', 'rightElbow'],
    },
    {
      id: 'low-v-line-holds',
      title: 'Low-V Line Holds',
      instructions: 'Hold the Low-V line without bending your elbows or leaning forward.',
      dosage: 'Hold 8 seconds, reset, and repeat 5 times.',
      focusJoints: ['torsoLean', 'leftElbow', 'rightElbow'],
    },
  ],
  'half-t': [
    {
      id: 'half-t-box-shapes',
      title: 'Half-T Box Shapes',
      instructions: 'Bring elbows close to shoulder height, bend them comfortably, and keep forearms level and wrists firm.',
      dosage: 'Practice 2 sets of 6 controlled repetitions.',
      focusJoints: ['leftElbow', 'rightElbow'],
    },
    {
      id: 'half-t-posture-hold',
      title: 'Half-T Posture Holds',
      instructions: 'Set the Half-T arm position and hold your chest tall with shoulders level.',
      dosage: 'Hold 8 seconds, reset, and repeat 5 times.',
      focusJoints: ['leftShoulder', 'rightShoulder', 'torsoLean'],
    },
  ],
  liberty: [
    {
      id: 'liberty-supported-knee-lift',
      title: 'Supported Knee-Lift Balance',
      instructions: 'Stand beside a stable support, lightly hold it, and lift one knee only as high as you can while staying balanced.',
      dosage: 'Hold 5 seconds per side for 4 repetitions.',
      focusJoints: ['liftedKnee', 'liftedHip', 'standingKnee'],
    },
    {
      id: 'liberty-single-leg-balance',
      title: 'Single-Leg Balance Prep',
      instructions: 'Near a stable support, balance on one foot with hips level and standing knee comfortably straight.',
      dosage: 'Hold 8 seconds per side for 3 repetitions.',
      focusJoints: ['standingKnee', 'torsoLean'],
    },
  ],
  'toe-touch': [
    {
      id: 'toe-touch-seated-straddle',
      title: 'Seated Straddle Reaches',
      instructions: 'Sit in a comfortable wide straddle and reach forward gently with a long, upright spine. Stay within a pain-free range.',
      dosage: 'Reach for 10 seconds, rest, and repeat 4 times.',
      focusJoints: ['hipSpread'],
    },
    {
      id: 'toe-touch-straight-leg-lifts',
      title: 'Seated Straight-Leg Lifts',
      instructions: 'Sit tall with legs comfortably apart and lift one straight leg a small distance, keeping the knee relaxed but extended.',
      dosage: 'Practice 2 sets of 6 lifts per side.',
      focusJoints: ['leftKnee', 'rightKnee'],
    },
  ],
  arabesque: [
    {
      id: 'arabesque-supported-leg-reaches',
      title: 'Supported Back-Leg Reaches',
      instructions: 'Stand beside a stable support, keep your torso tall, and reach one straight leg gently behind you without arching your back.',
      dosage: 'Practice 2 sets of 6 small reaches per side.',
      focusJoints: ['liftedHip', 'liftedKnee', 'torsoLean'],
    },
    {
      id: 'arabesque-balance-prep',
      title: 'Arabesque Balance Prep',
      instructions: 'Near a stable support, balance on one foot with hips level and the free leg reaching only slightly behind you.',
      dosage: 'Hold 5 seconds per side for 4 repetitions.',
      focusJoints: ['standingKnee', 'torsoLean'],
    },
  ],
  'heel-stretch': [
    {
      id: 'heel-stretch-seated-leg-raises',
      title: 'Seated Active Leg Raises',
      instructions: 'Sit tall and slowly raise one straight leg only to a comfortable height; do not pull or force the leg higher.',
      dosage: 'Practice 2 sets of 5 controlled raises per side.',
      focusJoints: ['liftedHip', 'liftedKnee'],
    },
    {
      id: 'heel-stretch-supported-balance',
      title: 'Supported Upright Balance',
      instructions: 'Stand near a stable support, keep your standing knee comfortably straight, and maintain a tall, steady torso.',
      dosage: 'Hold 8 seconds per side for 3 repetitions.',
      focusJoints: ['standingKnee', 'torsoLean'],
    },
  ],
  scorpion: [
    {
      id: 'scorpion-supported-quad-mobility',
      title: 'Supported Quad Mobility',
      instructions: 'Stand beside a stable support and gently bend one knee, keeping your chest lifted. Stop before discomfort; do not pull the foot overhead.',
      dosage: 'Hold 10 seconds per side for 3 repetitions.',
      focusJoints: ['liftedHip', 'torsoLean'],
    },
    {
      id: 'scorpion-prone-leg-reaches',
      title: 'Prone Back-Leg Reaches',
      instructions: 'Lie on your stomach and gently lift one straight leg a small distance while keeping your hips on the floor.',
      dosage: 'Practice 2 sets of 6 small lifts per side.',
      focusJoints: ['liftedHip', 'standingKnee'],
    },
  ],
};

const GENERAL_DRILLS: TrainingDrill[] = [
  {
    id: 'general-pose-reset',
    title: 'Pose Set-and-Reset',
    instructions: 'Use the pose tips as a guide: set the position slowly, check your alignment, then relax and reset.',
    dosage: 'Practice 5 slow repetitions, staying in a comfortable range.',
    focusJoints: [],
  },
  {
    id: 'general-posture-hold',
    title: 'Posture and Control Holds',
    instructions: 'Practice the pose at a comfortable level while keeping your breathing steady and your body controlled.',
    dosage: 'Hold 5 seconds, reset, and repeat 4 times.',
    focusJoints: [],
  },
];

export function getPoseTrainingDrills(pose: Pose): TrainingDrill[] {
  const drills = POSE_DRILLS[pose.id];
  if (drills) return drills;

  const poseTip = pose.practiceTips[0]?.text ?? pose.description;
  return GENERAL_DRILLS.map((drill) => ({
    ...drill,
    id: `${pose.id}-${drill.id}`,
    instructions: `${poseTip} ${drill.instructions}`,
  }));
}

export function recommendTrainingDrill(
  pose: Pose,
  evaluations: JointEvaluation[]
): TrainingDrill {
  const drills = getPoseTrainingDrills(pose);
  const jointWeights = POSE_STANDARDS[pose.id]?.joints;
  const offTargetEvaluations = evaluations
    .filter((evaluation) => evaluation.status !== 'correct')
    .sort(
      (a, b) =>
        (b.deviation / Math.max(b.tolerance, 1)) * (jointWeights?.[b.jointKey]?.weight ?? 1) -
        (a.deviation / Math.max(a.tolerance, 1)) * (jointWeights?.[a.jointKey]?.weight ?? 1)
    );

  for (const evaluation of offTargetEvaluations) {
    const matchingDrill = drills.find((drill) =>
      drill.focusJoints.includes(evaluation.jointKey)
    );
    if (matchingDrill) return matchingDrill;
  }

  return drills[0];
}
