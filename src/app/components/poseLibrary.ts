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
    description: 'Stand on one leg with the other bent at 90Â°.',
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
    name: 'Toe Touch',
    category: 'Jumps',
    progress: 0,
    difficulty: 'Advanced',
    description: 'Jump into a wide straddle with straight legs and pointed toes.',
    cues: ['Drive both legs out into a wide straddle', 'Keep both knees straight', 'Land softly with control'],
    standardHints: ['Both legs extend wide and high', 'Keep the chest lifted and arms sharp'],
    keyPoints: [
      { name: 'leftHip', target: 'left' },
      { name: 'rightHip', target: 'right' },
      { name: 'leftKnee', target: 'left' },
      { name: 'rightKnee', target: 'right' },
      { name: 'leftAnkle', target: 'left' },
      { name: 'rightAnkle', target: 'right' },
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
  [key: number]: { x: number; y: number; z?: number; visibility?: number };
}

export function calculateJointAngle(
  first: { x: number; y: number },
  vertex: { x: number; y: number },
  last: { x: number; y: number }
) {
  const firstVector = { x: first.x - vertex.x, y: first.y - vertex.y };
  const lastVector = { x: last.x - vertex.x, y: last.y - vertex.y };
  const dotProduct = firstVector.x * lastVector.x + firstVector.y * lastVector.y;
  const firstLength = Math.hypot(firstVector.x, firstVector.y);
  const lastLength = Math.hypot(lastVector.x, lastVector.y);

  if (firstLength === 0 || lastLength === 0) return null;

  const cosine = Math.max(-1, Math.min(1, dotProduct / (firstLength * lastLength)));
  return Math.round((Math.acos(cosine) * 180) / Math.PI);
}

export function calculateMeasuredAngles(landmarks: LandmarkMap) {
  const angleDefinitions = {
    leftElbow: [11, 13, 15],
    rightElbow: [12, 14, 16],
    leftShoulder: [13, 11, 23],
    rightShoulder: [14, 12, 24],
    leftKnee: [23, 25, 27],
    rightKnee: [24, 26, 28],
  } as const;

  return Object.fromEntries(
    Object.entries(angleDefinitions).flatMap(([name, [first, vertex, last]]) => {
      const firstLandmark = landmarks[first];
      const vertexLandmark = landmarks[vertex];
      const lastLandmark = landmarks[last];
      if (!firstLandmark || !vertexLandmark || !lastLandmark) return [];

      const angle = calculateJointAngle(firstLandmark, vertexLandmark, lastLandmark);
      return angle == null ? [] : [[name, angle]];
    })
  ) as Record<string, number>;
}

function getLandmark(landmarks: LandmarkMap, key: number) {
  return landmarks[key];
}

const getMotion = (name: string) => pomMotionLibrary.find((motion) => motion.name === name) ?? null;

const isLandmarkVisible = (landmark?: LandmarkMap[number]): landmark is NonNullable<LandmarkMap[number]> =>
  !!landmark && (landmark.visibility ?? 1) >= 0.35;

const confidenceForRange = (value: number, min: number, max: number): number => {
  if (value >= min && value <= max) return 1;
  const distance = value < min ? min - value : value - max;
  return Math.max(0, 1 - distance / 45);
};

function analyzeLowerBodyMotion(landmarks: LandmarkMap) {
  const leftHip = getLandmark(landmarks, 23);
  const rightHip = getLandmark(landmarks, 24);
  const leftKnee = getLandmark(landmarks, 25);
  const rightKnee = getLandmark(landmarks, 26);
  const leftAnkle = getLandmark(landmarks, 27);
  const rightAnkle = getLandmark(landmarks, 28);
  const lowerBody = [leftHip, rightHip, leftKnee, rightKnee, leftAnkle, rightAnkle];

  if (!lowerBody.every(isLandmarkVisible)) return null;

  const hipWidth = Math.max(Math.abs(leftHip.x - rightHip.x), 0.01);
  const ankleSpread = Math.abs(leftAnkle.x - rightAnkle.x);
  const averageHipY = (leftHip.y + rightHip.y) / 2;
  const averageAnkleY = (leftAnkle.y + rightAnkle.y) / 2;
  const leftKneeAngle = calculateJointAngle(leftHip, leftKnee, leftAnkle);
  const rightKneeAngle = calculateJointAngle(rightHip, rightKnee, rightAnkle);

  if (leftKneeAngle === null || rightKneeAngle === null) return null;

  const toeTouchConfidence =
    (ankleSpread >= hipWidth * 2.2 ? 0.4 : 0) +
    (averageAnkleY < averageHipY - 0.02 ? 0.3 : 0) +
    (leftKneeAngle >= 145 && rightKneeAngle >= 145 ? 0.3 : 0);
  const candidates: Array<{ name: string; confidence: number }> = [];
  if (toeTouchConfidence >= 0.8) {
    candidates.push({ name: 'Toe Touch', confidence: toeTouchConfidence });
  }

  const baseLeg = leftAnkle.y >= rightAnkle.y ? 'left' : 'right';
  const liftedLeg = baseLeg === 'left' ? 'right' : 'left';
  const baseKneeAngle = baseLeg === 'left' ? leftKneeAngle : rightKneeAngle;
  const liftedHip = liftedLeg === 'left' ? leftHip : rightHip;
  const liftedKnee = liftedLeg === 'left' ? leftKnee : rightKnee;
  const liftedAnkle = liftedLeg === 'left' ? leftAnkle : rightAnkle;
  const liftedKneeAngle = liftedLeg === 'left' ? leftKneeAngle : rightKneeAngle;
  const hipCenterX = (leftHip.x + rightHip.x) / 2;
  const baseAnkle = baseLeg === 'left' ? leftAnkle : rightAnkle;

  if (Math.abs(baseAnkle.y - liftedAnkle.y) >= 0.08 && baseKneeAngle >= 140) {
    const liftedAnkleAboveKnee = liftedKnee.y - liftedAnkle.y;
    const liftedKneeAboveHip = liftedHip.y - liftedKnee.y;
    const liftedFootOffset = Math.abs(liftedAnkle.x - hipCenterX) / hipWidth;

    if (
      liftedKneeAngle >= 50 &&
      liftedKneeAngle <= 135 &&
      liftedKneeAboveHip > -0.08 &&
      liftedAnkleAboveKnee < 0.08
    ) {
      candidates.push({
        name: 'Liberty',
        confidence:
          0.45 +
          0.3 * confidenceForRange(liftedKneeAngle, 65, 115) +
          0.15 * confidenceForRange(liftedKneeAboveHip, 0.02, 0.3) +
          0.1 * confidenceForRange(liftedAnkleAboveKnee, -0.02, 0.16),
      });
    }

    if (
      liftedKneeAngle >= 50 &&
      liftedKneeAngle <= 150 &&
      liftedAnkleAboveKnee > 0.08
    ) {
      candidates.push({
        name: 'Scorpion',
        confidence:
          0.45 +
          0.25 * confidenceForRange(liftedKneeAngle, 65, 135) +
          0.2 * confidenceForRange(liftedAnkleAboveKnee, 0.1, 0.35) +
          0.1 * confidenceForRange(liftedFootOffset, 0, 0.8),
      });
    }

    if (
      liftedKneeAngle >= 145 &&
      liftedFootOffset >= 0.9 &&
      liftedAnkle.y >= liftedHip.y - 0.18
    ) {
      candidates.push({
        name: 'Arabesque',
        confidence:
          0.45 +
          0.3 * confidenceForRange(liftedKneeAngle, 155, 180) +
          0.25 * confidenceForRange(liftedFootOffset, 1, 2.2),
      });
    }

    if (
      liftedKneeAngle >= 145 &&
      liftedAnkle.y < liftedHip.y - 0.2
    ) {
      candidates.push({
        name: 'Heel Stretch',
        confidence:
          0.45 +
          0.3 * confidenceForRange(liftedKneeAngle, 155, 180) +
          0.25 * confidenceForRange(liftedHip.y - liftedAnkle.y, 0.25, 0.6),
      });
    }
  }

  const best = candidates.reduce<{ name: string; confidence: number } | null>(
    (current, candidate) => !current || candidate.confidence > current.confidence ? candidate : current,
    null
  );
  const pose = best && best.confidence >= 0.8 ? getMotion(best.name) : null;

  return pose && best
    ? { pose, confidence: best.confidence, feedback: pose.cues }
    : null;
}

export function filterPoses(poses: PomMotion[], query: string, category: string) {
  const normalizedQuery = query.trim().toLowerCase();
  const cleanQ = normalizedQuery.replace(/[-_\s]+/g, ' ');
  return poses.filter((pose) => {
    const matchesCategory = category === 'All' || pose.category === category;
    const cleanName = pose.name.toLowerCase().replace(/[-_\s]+/g, ' ');
    const matchesQuery =
      normalizedQuery.length === 0 ||
      pose.name.toLowerCase().includes(normalizedQuery) ||
      cleanName.includes(cleanQ) ||
      pose.description.toLowerCase().includes(normalizedQuery) ||
      pose.difficulty.toLowerCase().includes(normalizedQuery);

    return matchesCategory && matchesQuery;
  });
}

export function analyzePomMotion(landmarks: LandmarkMap) {
  const lowerBodyAnalysis = analyzeLowerBodyMotion(landmarks);
  const leftShoulder = getLandmark(landmarks, 11);
  const rightShoulder = getLandmark(landmarks, 12);
  const leftElbow = getLandmark(landmarks, 13);
  const rightElbow = getLandmark(landmarks, 14);
  const leftWrist = getLandmark(landmarks, 15);
  const rightWrist = getLandmark(landmarks, 16);

  if (!leftShoulder || !rightShoulder || !leftElbow || !rightElbow || !leftWrist || !rightWrist) {
    if (lowerBodyAnalysis) return lowerBodyAnalysis;
    return {
      pose: null,
      confidence: 0,
      feedback: ['Show both arms for arm-motion detection, or include your hips, knees, and ankles for stunt detection.'],
    };
  }
  const proximalLandmarks = [leftShoulder, rightShoulder, leftElbow, rightElbow];
  const wristLandmarks = [leftWrist, rightWrist];
  if (
    proximalLandmarks.some((landmark) => (landmark.visibility ?? 1) < 0.05) ||
    wristLandmarks.some((landmark) => (landmark.visibility ?? 1) < 0.05)
  ) {
    if (lowerBodyAnalysis) return lowerBodyAnalysis;
    return {
      pose: null,
      confidence: 0,
      feedback: ['Show both arms for arm-motion detection, or include your hips, knees, and ankles for stunt detection.'],
    };
  }

  const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
  const wristY = (leftWrist.y + rightWrist.y) / 2;
  const shoulderCenterX = (leftShoulder.x + rightShoulder.x) / 2;
  const shoulderXSpread = Math.abs(leftShoulder.x - rightShoulder.x);
  const shoulderWidth = Math.max(shoulderXSpread, 0.01);
  const wristXSpread = Math.abs(leftWrist.x - rightWrist.x);
  const wristYSpread = Math.abs(leftWrist.y - rightWrist.y);
  const elbowYSpread = leftElbow && rightElbow ? Math.abs(leftElbow.y - rightElbow.y) : 0.2;
  const wristHeight = wristY - shoulderY;
  const wristSpreadRatio = wristXSpread / shoulderWidth;
  const wristYSpreadRatio = wristYSpread / shoulderWidth;
  const elbowYSpreadRatio = elbowYSpread / shoulderWidth;
  const wristHeightRatio = wristHeight / shoulderWidth;
  const averageArmReach = (
    Math.hypot(leftElbow.x - leftShoulder.x, leftElbow.y - leftShoulder.y) +
    Math.hypot(leftWrist.x - leftElbow.x, leftWrist.y - leftElbow.y) +
    Math.hypot(rightElbow.x - rightShoulder.x, rightElbow.y - rightShoulder.y) +
    Math.hypot(rightWrist.x - rightElbow.x, rightWrist.y - rightElbow.y)
  ) / 2;
  const screenLeft = leftShoulder.x < rightShoulder.x
    ? { shoulder: leftShoulder, elbow: leftElbow, wrist: leftWrist }
    : { shoulder: rightShoulder, elbow: rightElbow, wrist: rightWrist };
  const screenRight = leftShoulder.x < rightShoulder.x
    ? { shoulder: rightShoulder, elbow: rightElbow, wrist: rightWrist }
    : { shoulder: leftShoulder, elbow: leftElbow, wrist: leftWrist };
  const armsOpenOutward = [screenLeft, screenRight].every(({ shoulder, elbow, wrist }, index) => {
    const direction = index === 0 ? -1 : 1;
    const elbowOutward = (elbow.x - shoulder.x) * direction;
    const wristOutward = (wrist.x - shoulder.x) * direction;
    const wristBeyondElbow = (wrist.x - elbow.x) * direction;
    return elbowOutward > shoulderWidth * 0.35 &&
      wristOutward > shoulderWidth * 1.25 &&
      wristBeyondElbow > shoulderWidth * 0.25;
  });
  const segmentAngleFromHorizontal = (
    first: { x: number; y: number },
    last: { x: number; y: number }
  ) => Math.atan2(Math.abs(last.y - first.y), Math.abs(last.x - first.x)) * (180 / Math.PI);
  const armsExtendHorizontally = armsOpenOutward && [screenLeft, screenRight].every(
    ({ shoulder, elbow, wrist }) =>
      segmentAngleFromHorizontal(shoulder, elbow) <= 10 &&
      segmentAngleFromHorizontal(elbow, wrist) <= 10
  );
  const wristsRaisedRelativeToShoulders = leftWrist.y < leftShoulder.y - shoulderWidth * 0.55 &&
    rightWrist.y < rightShoulder.y - shoulderWidth * 0.55;
  const wristsCentered = Math.abs(shoulderCenterX - (leftWrist.x + rightWrist.x) / 2) < shoulderWidth * 0.8;
  const halfTShape = [screenLeft, screenRight].every(({ shoulder, elbow, wrist }, index) => {
    const direction = index === 0 ? -1 : 1;
    const elbowOutward = (elbow.x - shoulder.x) * direction;
    const wristInwardFromElbow = (elbow.x - wrist.x) * direction;
    return elbowOutward > shoulderWidth * 0.35 &&
      wristInwardFromElbow > shoulderWidth * 0.25 &&
      Math.abs(wrist.x - shoulderCenterX) < shoulderWidth * 0.85 &&
      Math.abs(elbow.y - shoulder.y) < shoulderWidth * 0.7 &&
      Math.abs(wrist.y - shoulder.y) < shoulderWidth * 0.7;
  });

  // Directional arm angle metrics for High V and Low V detection
  const leftWristUpward = screenLeft.shoulder.y - screenLeft.wrist.y;
  const rightWristUpward = screenRight.shoulder.y - screenRight.wrist.y;
  const leftWristDownward = screenLeft.wrist.y - screenLeft.shoulder.y;
  const rightWristDownward = screenRight.wrist.y - screenRight.shoulder.y;

  const leftWristOutwardFromShoulder = screenLeft.shoulder.x - screenLeft.wrist.x;
  const rightWristOutwardFromShoulder = screenRight.wrist.x - screenRight.shoulder.x;
  const leftWristOutwardFromCenter = shoulderCenterX - screenLeft.wrist.x;
  const rightWristOutwardFromCenter = screenRight.wrist.x - shoulderCenterX;

  const leftElbowAngle = calculateJointAngle(screenLeft.shoulder, screenLeft.elbow, screenLeft.wrist) ?? 180;
  const rightElbowAngle = calculateJointAngle(screenRight.shoulder, screenRight.elbow, screenRight.wrist) ?? 180;
  const elbowsStraight = leftElbowAngle >= 95 && rightElbowAngle >= 95;

  // High V: Arms extended upward forming a V or punched up overhead
  // Angle with upward vertical (0° = straight overhead punch, 90° = horizontal)
  // Center-referenced metrics allow narrow overhead punch up to be recognized cleanly
  const leftHighVAngleFromCenter = leftWristUpward > 0
    ? Math.atan2(Math.max(0, leftWristOutwardFromCenter), leftWristUpward) * (180 / Math.PI)
    : 0;
  const rightHighVAngleFromCenter = rightWristUpward > 0
    ? Math.atan2(Math.max(0, rightWristOutwardFromCenter), rightWristUpward) * (180 / Math.PI)
    : 0;
  const leftHighVAngleFromShoulder = leftWristUpward > 0
    ? Math.atan2(leftWristOutwardFromShoulder, leftWristUpward) * (180 / Math.PI)
    : 0;
  const rightHighVAngleFromShoulder = rightWristUpward > 0
    ? Math.atan2(rightWristOutwardFromShoulder, rightWristUpward) * (180 / Math.PI)
    : 0;

  const wristsTooCloseForHighV = wristsCentered &&
    wristSpreadRatio <= 0.55 &&
    wristHeight > -averageArmReach * 0.95;

  // Both wrists are above shoulders, on their respective sides of the body, separated
  // Allows arm punch up overhead (0° to 35°) as well as wide High V (35° to 82°)
  const isHighVAngle =
    !armsExtendHorizontally &&
    !wristsTooCloseForHighV &&
    elbowsStraight &&
    leftWristUpward > shoulderWidth * 0.10 &&
    rightWristUpward > shoulderWidth * 0.10 &&
    screenLeft.wrist.x <= shoulderCenterX + shoulderWidth * 0.12 &&
    screenRight.wrist.x >= shoulderCenterX - shoulderWidth * 0.12 &&
    wristXSpread >= shoulderWidth * 0.20 &&
    leftHighVAngleFromCenter >= 0 && leftHighVAngleFromCenter <= 85 &&
    rightHighVAngleFromCenter >= 0 && rightHighVAngleFromCenter <= 85 &&
    leftHighVAngleFromShoulder <= 82 &&
    rightHighVAngleFromShoulder <= 82;

  const highVAngleDiff = Math.abs(leftHighVAngleFromCenter - rightHighVAngleFromCenter);
  const highVScore = isHighVAngle
    ? (
        0.85 +
        (elbowsStraight ? 0.08 : 0.03) +
        (highVAngleDiff < 30 ? 0.07 : highVAngleDiff < 45 ? 0.03 : 0)
      )
    : (
        !armsExtendHorizontally && wristsRaisedRelativeToShoulders && armsOpenOutward
          ? 0.88
          : 0
      );

  // Low V: Arms extended downward and outward forming an inverted V or punched down
  const leftLowVAngleFromCenter = leftWristDownward > 0
    ? Math.atan2(Math.max(0, leftWristOutwardFromCenter), leftWristDownward) * (180 / Math.PI)
    : 0;
  const rightLowVAngleFromCenter = rightWristDownward > 0
    ? Math.atan2(Math.max(0, rightWristOutwardFromCenter), rightWristDownward) * (180 / Math.PI)
    : 0;
  const leftLowVAngleFromShoulder = leftWristDownward > 0
    ? Math.atan2(leftWristOutwardFromShoulder, leftWristDownward) * (180 / Math.PI)
    : 0;
  const rightLowVAngleFromShoulder = rightWristDownward > 0
    ? Math.atan2(rightWristOutwardFromShoulder, rightWristDownward) * (180 / Math.PI)
    : 0;

  // Relaxed arms hanging straight down at the sides have:
  // - angle from center < 10°
  // - both wrists inside shoulder line
  // - both elbows inside shoulder line
  const armsAreRelaxedAtSides =
    leftLowVAngleFromCenter < 10 &&
    rightLowVAngleFromCenter < 10 &&
    leftWristOutwardFromShoulder <= 0 &&
    rightWristOutwardFromShoulder <= 0 &&
    screenLeft.elbow.x >= screenLeft.shoulder.x &&
    screenRight.elbow.x <= screenRight.shoulder.x;

  // Both wrists below shoulders, on their respective sides, punched down into Low V
  // Allows punch down beside hips (10° to 35°) as well as wide Low V (35° to 82°)
  const isLowVAngle =
    !armsExtendHorizontally &&
    !armsAreRelaxedAtSides &&
    leftElbowAngle >= 135 &&
    rightElbowAngle >= 135 &&
    leftWristDownward > shoulderWidth * 0.12 &&
    rightWristDownward > shoulderWidth * 0.12 &&
    screenLeft.wrist.x < shoulderCenterX &&
    screenRight.wrist.x > shoulderCenterX &&
    wristXSpread >= shoulderWidth * 0.25 &&
    leftLowVAngleFromCenter >= 10 && leftLowVAngleFromCenter <= 70 &&
    rightLowVAngleFromCenter >= 10 && rightLowVAngleFromCenter <= 70 &&
    leftLowVAngleFromShoulder <= 70 &&
    rightLowVAngleFromShoulder <= 70;

  const lowVAngleDiff = Math.abs(leftLowVAngleFromCenter - rightLowVAngleFromCenter);
  const lowVScore = isLowVAngle
    ? 0.85 + (lowVAngleDiff < 30 ? 0.07 : lowVAngleDiff < 45 ? 0.03 : 0)
    : 0;

  const motions = [
    {
      name: 'High V',
      score: highVScore,
      feedback: ['Raise the arms to a wide V', 'Keep the wrists higher than the shoulders', 'Stay relaxed through the upper body'],
    },
    {
      name: 'T Motion',
      score: armsExtendHorizontally ? (
        (wristSpreadRatio > 2.5 ? 0.25 : 0) +
        (wristYSpreadRatio < 0.8 ? 0.15 : 0) +
        (elbowYSpreadRatio < 0.8 ? 0.15 : 0) +
        0.45
      ) : 0,
      feedback: ['Open the arms into a straight horizontal line', 'Keep the shoulders level and the posture tall'],
    },
    {
      name: 'Half T',
      score: halfTShape ? (
        (wristSpreadRatio > 0.9 && wristSpreadRatio < 2.5 ? 0.25 : 0) +
        (wristYSpreadRatio < 0.8 ? 0.15 : 0) +
        (Math.abs(wristHeightRatio) < 0.7 ? 0.15 : 0) +
        (elbowYSpreadRatio < 0.8 ? 0.2 : 0) +
        0.25
      ) : 0,
      feedback: ['Keep elbows lifted at shoulder height', 'Bend your elbows and pull fists inward toward your chest'],
    },
    {
      name: 'Low V',
      score: lowVScore,
      feedback: ['Open the arms into a lower V shape', 'Keep the line lower than a high V while staying tall'],
    },
  ];

  const bestMatch = motions.reduce((best, motion) => (motion.score > best.score ? motion : best));
  const pose = bestMatch.score >= 0.60 ? pomMotionLibrary.find((item) => item.name === bestMatch.name) ?? null : null;

  const armAnalysis = {
    pose,
    confidence: Math.min(1, Math.max(0, bestMatch.score)),
    feedback: pose
      ? [
          ...bestMatch.feedback,
          ...(pose.standardHints ?? []).slice(0, 2),
        ]
      : ['Try to open the arms into a clearer shape and keep the shoulders relaxed'],
  };
  return lowerBodyAnalysis && lowerBodyAnalysis.confidence > armAnalysis.confidence
    ? lowerBodyAnalysis
    : armAnalysis;
}
