export interface PomMotion {
  id: string;
  name: string;
  category: 'Stunts' | 'Arm Motions' | 'Jumps' | 'Flexibility';
  progress: number;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  description: string;
  cues: string[];
  keyPoints: Array<{ name: string; target: 'left' | 'right' | 'both' }>;
  standardHints?: string[];
}

export const pomMotionLibrary: PomMotion[] = [
  {
    id: '1',
    name: 'Liberty',
    category: 'Stunts',
    progress: 0,
    difficulty: 'Advanced',
    description: 'Stand on one leg with the other bent at 90°.',
    cues: ['Balance on one leg', 'Lift the free leg to a bent position', 'Keep hips square'],
    standardHints: ['Standing leg is strong and straight', 'Free leg is bent and lifted to the side or front'],
    keyPoints: [
      { name: 'leftHip', target: 'left' },
      { name: 'rightHip', target: 'right' },
      { name: 'leftKnee', target: 'left' },
      { name: 'rightKnee', target: 'right' },
    ],
  },
  {
    id: '2',
    name: 'High V',
    category: 'Arm Motions',
    progress: 0,
    difficulty: 'Beginner',
    description: 'Arms extended upward in a V shape.',
    cues: ['Raise both arms overhead', 'Open the arms into a wide V', 'Keep shoulders relaxed'],
    standardHints: ['Arms are lifted overhead in a wide open V', 'Wrists should be higher than the shoulders'],
    keyPoints: [
      { name: 'leftShoulder', target: 'left' },
      { name: 'rightShoulder', target: 'right' },
      { name: 'leftElbow', target: 'left' },
      { name: 'rightElbow', target: 'right' },
      { name: 'leftWrist', target: 'left' },
      { name: 'rightWrist', target: 'right' },
    ],
  },
  {
    id: '3',
    name: 'T Motion',
    category: 'Arm Motions',
    progress: 0,
    difficulty: 'Beginner',
    description: 'Arms extended horizontally to the sides.',
    cues: ['Open arms to a straight line', 'Keep shoulders level', 'Avoid leaning'],
    standardHints: ['Arms stay level with the shoulders', 'The body remains tall and centered'],
    keyPoints: [
      { name: 'leftShoulder', target: 'left' },
      { name: 'rightShoulder', target: 'right' },
      { name: 'leftWrist', target: 'left' },
      { name: 'rightWrist', target: 'right' },
    ],
  },
  {
    id: '4',
    name: 'Scorpion',
    category: 'Stunts',
    progress: 0,
    difficulty: 'Advanced',
    description: 'Standing on one leg with the other leg bent back.',
    cues: ['Balance on one leg', 'Arch the free leg back', 'Keep chest lifted'],
    standardHints: ['The lifted leg bends back behind the body', 'Chest stays lifted and core engaged'],
    keyPoints: [
      { name: 'leftHip', target: 'left' },
      { name: 'rightHip', target: 'right' },
      { name: 'leftKnee', target: 'left' },
      { name: 'rightKnee', target: 'right' },
    ],
  },
  {
    id: '5',
    name: 'Bow and Arrow',
    category: 'Arm Motions',
    progress: 0,
    difficulty: 'Intermediate',
    description: 'One arm pulled across, one extended.',
    cues: ['Draw one arm across the body', 'Extend the opposite arm outward', 'Maintain posture'],
    standardHints: ['One arm is pulled across the chest while the other reaches outward', 'Shoulders stay square and tall'],
    keyPoints: [
      { name: 'leftShoulder', target: 'left' },
      { name: 'rightShoulder', target: 'right' },
      { name: 'leftWrist', target: 'left' },
      { name: 'rightWrist', target: 'right' },
    ],
  },
  {
    id: '6',
    name: 'Arabesque',
    category: 'Stunts',
    progress: 0,
    difficulty: 'Intermediate',
    description: 'Standing on one leg with the other extended back.',
    cues: ['Stand tall on one leg', 'Extend the free leg behind you', 'Keep core engaged'],
    standardHints: ['The standing leg stays strong and straight', 'The free leg extends long and behind the body'],
    keyPoints: [
      { name: 'leftHip', target: 'left' },
      { name: 'rightHip', target: 'right' },
      { name: 'leftKnee', target: 'left' },
      { name: 'rightKnee', target: 'right' },
    ],
  },
  {
    id: '7',
    name: 'Heel Stretch',
    category: 'Flexibility',
    progress: 0,
    difficulty: 'Advanced',
    description: 'Hold the leg up vertically by the heel.',
    cues: ['Lift the heel high', 'Keep the standing leg strong', 'Lengthen through the spine'],
    standardHints: ['The standing leg is stable while the free leg is lifted high', 'The free foot is brought close to the body'],
    keyPoints: [
      { name: 'leftHip', target: 'left' },
      { name: 'rightHip', target: 'right' },
      { name: 'leftKnee', target: 'left' },
      { name: 'rightKnee', target: 'right' },
    ],
  },
  {
    id: '8',
    name: 'Pike Jump',
    category: 'Jumps',
    progress: 0,
    difficulty: 'Intermediate',
    description: 'Jump with the legs extended forward.',
    cues: ['Jump explosively', 'Keep legs straight', 'Point toes and land softly'],
    standardHints: ['Legs are straight and extended in front of the body during the jump', 'The body stays compact and controlled'],
    keyPoints: [
      { name: 'leftHip', target: 'left' },
      { name: 'rightHip', target: 'right' },
      { name: 'leftKnee', target: 'left' },
      { name: 'rightKnee', target: 'right' },
    ],
  },
  {
    id: '9',
    name: 'Clap',
    category: 'Arm Motions',
    progress: 0,
    difficulty: 'Beginner',
    description: 'Hands clap together in front of the body.',
    cues: ['Bring hands together', 'Keep shoulders relaxed', 'Maintain posture'],
    standardHints: ['Hands meet directly in front of the chest or face', 'Elbows remain soft and controlled'],
    keyPoints: [
      { name: 'leftWrist', target: 'left' },
      { name: 'rightWrist', target: 'right' },
    ],
  },
  {
    id: '10',
    name: 'Daggers',
    category: 'Arm Motions',
    progress: 0,
    difficulty: 'Intermediate',
    description: 'Arms are held sharply and diagonally from the body.',
    cues: ['Keep arms sharp and clean', 'Use a strong diagonal line', 'Stay tall'],
    standardHints: ['The arms form a strong diagonal line away from the body', 'The posture stays sharp and controlled'],
    keyPoints: [
      { name: 'leftShoulder', target: 'left' },
      { name: 'rightShoulder', target: 'right' },
      { name: 'leftWrist', target: 'left' },
      { name: 'rightWrist', target: 'right' },
    ],
  },
  {
    id: '11',
    name: 'Buckets',
    category: 'Arm Motions',
    progress: 0,
    difficulty: 'Intermediate',
    description: 'Arms curve outward like buckets or scoops.',
    cues: ['Curve the arms outward', 'Keep wrists loose', 'Maintain a clear shape'],
    standardHints: ['The arms form a bucket-like curve', 'The motion stays smooth and rounded'],
    keyPoints: [
      { name: 'leftShoulder', target: 'left' },
      { name: 'rightShoulder', target: 'right' },
      { name: 'leftWrist', target: 'left' },
      { name: 'rightWrist', target: 'right' },
    ],
  },
  {
    id: '12',
    name: 'Candlesticks',
    category: 'Arm Motions',
    progress: 0,
    difficulty: 'Intermediate',
    description: 'Arms are lifted to create a candle-like shape.',
    cues: ['Lift the arms upward', 'Keep the shape clean', 'Avoid shrugging'],
    standardHints: ['Arms are tall and lifted with a smooth curved line', 'The shoulders stay low and relaxed'],
    keyPoints: [
      { name: 'leftShoulder', target: 'left' },
      { name: 'rightShoulder', target: 'right' },
      { name: 'leftWrist', target: 'left' },
      { name: 'rightWrist', target: 'right' },
    ],
  },
  {
    id: '13',
    name: 'T Motion',
    category: 'Arm Motions',
    progress: 0,
    difficulty: 'Beginner',
    description: 'The arms form a straight T shape at shoulder height.',
    cues: ['Open the arms wide', 'Keep the shoulders level', 'Stay centered'],
    standardHints: ['Arms form a straight horizontal line', 'The body remains tall and balanced'],
    keyPoints: [
      { name: 'leftShoulder', target: 'left' },
      { name: 'rightShoulder', target: 'right' },
      { name: 'leftWrist', target: 'left' },
      { name: 'rightWrist', target: 'right' },
    ],
  },
  {
    id: '14',
    name: 'Half T',
    category: 'Arm Motions',
    progress: 0,
    difficulty: 'Beginner',
    description: 'The arms form a shorter T shape halfway between the body and shoulder height.',
    cues: ['Keep the horizontal line shorter', 'Stay centered', 'Keep elbows soft'],
    standardHints: ['The arms form a shorter horizontal line than a full T', 'The posture remains tall and balanced'],
    keyPoints: [
      { name: 'leftShoulder', target: 'left' },
      { name: 'rightShoulder', target: 'right' },
      { name: 'leftWrist', target: 'left' },
      { name: 'rightWrist', target: 'right' },
    ],
  },
  {
    id: '15',
    name: 'Low V',
    category: 'Arm Motions',
    progress: 0,
    difficulty: 'Beginner',
    description: 'The arms form a lower V shape near the chest and waist.',
    cues: ['Open the arms into a lower V', 'Keep the elbows soft', 'Stay centered'],
    standardHints: ['The arms form a lower V shape rather than a high V', 'The body stays lifted and aligned'],
    keyPoints: [
      { name: 'leftShoulder', target: 'left' },
      { name: 'rightShoulder', target: 'right' },
      { name: 'leftWrist', target: 'left' },
      { name: 'rightWrist', target: 'right' },
    ],
  },
];

export interface LandmarkMap {
  [key: number]: { x: number; y: number; z?: number };
}

function getLandmark(landmarks: LandmarkMap, key: number) {
  return landmarks[key];
}

export function filterPoses(poses: PomMotion[], query: string, category: string) {
  const normalizedQuery = query.trim().toLowerCase();
  return poses.filter((pose) => {
    const matchesCategory = category === 'All' || pose.category === category;
    const matchesQuery =
      normalizedQuery.length === 0 ||
      pose.name.toLowerCase().includes(normalizedQuery) ||
      pose.description.toLowerCase().includes(normalizedQuery);

    return matchesCategory && matchesQuery;
  });
}

export function analyzePomMotion(landmarks: LandmarkMap) {
  const leftShoulder = getLandmark(landmarks, 11);
  const rightShoulder = getLandmark(landmarks, 12);
  const leftElbow = getLandmark(landmarks, 13);
  const rightElbow = getLandmark(landmarks, 14);
  const leftWrist = getLandmark(landmarks, 15);
  const rightWrist = getLandmark(landmarks, 16);

  if (!leftShoulder || !rightShoulder || !leftWrist || !rightWrist) {
    return {
      pose: null,
      confidence: 0,
      feedback: ['Position your arms and shoulders clearly in the frame for a better comparison.'],
    };
  }

  const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
  const wristY = (leftWrist.y + rightWrist.y) / 2;
  const shoulderXSpread = Math.abs(leftShoulder.x - rightShoulder.x);
  const wristXSpread = Math.abs(leftWrist.x - rightWrist.x);
  const wristYSpread = Math.abs(leftWrist.y - rightWrist.y);
  const elbowYSpread = leftElbow && rightElbow ? Math.abs(leftElbow.y - rightElbow.y) : 0.2;
  const wristHeight = wristY - shoulderY;

  const motions = [
    {
      name: 'Clap',
      score: (
        (wristXSpread < 0.16 ? 0.45 : 0) +
        (wristYSpread < 0.12 ? 0.35 : 0) +
        (Math.abs(wristHeight) < 0.08 ? 0.2 : 0)
      ),
      feedback: ['Bring the hands together in front of the chest', 'Keep the elbows soft and close to the body'],
    },
    {
      name: 'High V',
      score: (
        (shoulderXSpread < 0.15 ? 0.2 : 0) +
        (wristXSpread > 0.25 ? 0.3 : 0) +
        (wristYSpread < 0.12 ? 0.2 : 0) +
        (wristHeight < -0.08 ? 0.2 : 0) +
        (elbowYSpread < 0.12 ? 0.1 : 0)
      ),
      feedback: ['Raise the arms to a wide V', 'Keep the wrists higher than the shoulders', 'Stay relaxed through the upper body'],
    },
    {
      name: 'T Motion',
      score: (
        (shoulderXSpread < 0.15 ? 0.15 : 0) +
        (wristXSpread > 0.25 ? 0.25 : 0) +
        (wristYSpread < 0.12 ? 0.2 : 0) +
        (Math.abs(wristHeight) < 0.06 ? 0.2 : 0) +
        (elbowYSpread < 0.12 ? 0.2 : 0)
      ),
      feedback: ['Open the arms into a straight horizontal line', 'Keep the shoulders level and the posture tall'],
    },
    {
      name: 'Half T',
      score: (
        (shoulderXSpread < 0.15 ? 0.1 : 0) +
        (wristXSpread > 0.12 && wristXSpread < 0.24 ? 0.25 : 0) +
        (wristYSpread < 0.12 ? 0.2 : 0) +
        (Math.abs(wristHeight) < 0.06 ? 0.2 : 0) +
        (elbowYSpread < 0.12 ? 0.25 : 0)
      ),
      feedback: ['Keep the arms in a shorter horizontal line', 'Stay centered and keep the elbows soft'],
    },
    {
      name: 'Low V',
      score: (
        (shoulderXSpread < 0.15 ? 0.1 : 0) +
        (wristXSpread > 0.22 ? 0.25 : 0) +
        (wristYSpread < 0.12 ? 0.15 : 0) +
        (wristHeight > 0.04 ? 0.25 : 0) +
        (elbowYSpread < 0.12 ? 0.25 : 0)
      ),
      feedback: ['Open the arms into a lower V shape', 'Keep the line lower than a high V while staying tall'],
    },
  ];

  const bestMatch = motions.reduce((best, motion) => (motion.score > best.score ? motion : best));
  const pose = bestMatch.score > 0.45 ? pomMotionLibrary.find((item) => item.name === bestMatch.name) ?? null : null;

  return {
    pose,
    confidence: Math.min(1, Math.max(0, bestMatch.score)),
    feedback: pose
      ? [
          ...bestMatch.feedback,
          ...(pose.standardHints ?? []).slice(0, 2),
        ]
      : ['Try to open the arms into a clearer shape and keep the shoulders relaxed'],
  };
}
