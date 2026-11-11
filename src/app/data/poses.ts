import { Pose } from '../types';

export const INITIAL_POSES: Pose[] = [
  {
    id: 't-motion',
    name: 'T-Motion',
    category: 'Pom Motion',
    difficulty: 'Beginner',
    description: 'Extend your arms comfortably out to the sides, near shoulder height. Keep a relaxed, centered posture.',
    practiceTips: [
      { text: 'Reach your arms outward toward shoulder height.', type: 'check' },
      { text: 'Keep your shoulders relaxed and level.', type: 'check' },
      { text: 'Stay centered without forcing a rigid pose.', type: 'warning' }
    ],
    masteryPercentage: 0,
    imageUrl: '/poses/t-motion.jpg',
    points: 100,
    idealAngles: {
      armSpread: 'Near horizontal, around shoulder height',
      elbowAngle: 'Comfortably extended',
      torsoAngle: 'Upright and centered'
    },
    commonMistakes: [
      'Dropping arms below shoulder height',
      'Hyperextending wrists outward',
      'Hunching upper traps'
    ],
    icuStandardGuideline: 'Beginner practice target: reach both arms out near shoulder height while maintaining a comfortable, centered posture.',
    defaultSkeleton: {
      joints: [
        { id: 'neck', name: 'Neck', x: 50, y: 28, status: 'correct' },
        { id: 'r_shoulder', name: 'Right Shoulder', x: 38, y: 32, status: 'correct' },
        { id: 'r_elbow', name: 'Right Elbow', x: 24, y: 32, status: 'correct' },
        { id: 'r_wrist', name: 'Right Wrist', x: 10, y: 32, status: 'correct' },
        { id: 'l_shoulder', name: 'Left Shoulder', x: 62, y: 32, status: 'correct' },
        { id: 'l_elbow', name: 'Left Elbow', x: 76, y: 32, status: 'correct' },
        { id: 'l_wrist', name: 'Left Wrist', x: 90, y: 32, status: 'correct' },
        { id: 'pelvis', name: 'Pelvis', x: 50, y: 55, status: 'correct' },
        { id: 'r_knee', name: 'Right Knee', x: 47, y: 72, status: 'correct' },
        { id: 'r_ankle', name: 'Right Ankle', x: 46, y: 88, status: 'correct' },
        { id: 'l_knee', name: 'Left Knee', x: 53, y: 72, status: 'correct' },
        { id: 'l_ankle', name: 'Left Ankle', x: 54, y: 88, status: 'correct' }
      ],
      lines: [
        { from: 'neck', to: 'pelvis', status: 'correct' },
        { from: 'neck', to: 'r_shoulder', status: 'correct' },
        { from: 'r_shoulder', to: 'r_elbow', status: 'correct' },
        { from: 'r_elbow', to: 'r_wrist', status: 'correct' },
        { from: 'neck', to: 'l_shoulder', status: 'correct' },
        { from: 'l_shoulder', to: 'l_elbow', status: 'correct' },
        { from: 'l_elbow', to: 'l_wrist', status: 'correct' },
        { from: 'pelvis', to: 'r_knee', status: 'correct' },
        { from: 'r_knee', to: 'r_ankle', status: 'correct' },
        { from: 'pelvis', to: 'l_knee', status: 'correct' },
        { from: 'l_knee', to: 'l_ankle', status: 'correct' }
      ]
    },
    sampleCorrectionMessage: 'Flawless T-Motion line! Keep core engaged.'
  },
  {
    id: 'high-v',
    name: 'High V',
    category: 'Pom Motion',
    difficulty: 'Beginner',
    description: 'Arms extended upward in a wide V shape, keeping shoulders relaxed and wrists higher than shoulders. Maintain a tight core and strong posture throughout the motion.',
    practiceTips: [
      { text: 'Keep wrists sharp and locked.', type: 'check' },
      { text: 'Lock elbows completely.', type: 'check' },
      { text: 'Check alignment in a mirror.', type: 'check' }
    ],
    masteryPercentage: 0,
    imageUrl: '/poses/high-v.jpg',
    videoUrl: '/poses/videos/high-v.mp4',
    points: 100,
    idealAngles: {
      armSpread: '45° from vertical',
      elbowAngle: '180° locked',
      torsoAngle: '90° vertical posture'
    },
    commonMistakes: [
      'Bending wrists backward (broken wrists)',
      'Widening arms past 90° total aperture',
      'Shoulders creeping up to ears'
    ],
    icuStandardGuideline: 'ICU Motion Sharpness Guide: V angles must maintain 45° elevation from sagittal midline.',
    defaultSkeleton: {
      joints: [
        { id: 'neck', name: 'Neck', x: 50, y: 30, status: 'correct' },
        { id: 'r_shoulder', name: 'Right Shoulder', x: 40, y: 33, status: 'correct' },
        { id: 'r_elbow', name: 'Right Elbow', x: 30, y: 22, status: 'correct' },
        { id: 'r_wrist', name: 'Right Wrist', x: 22, y: 12, status: 'correct' },
        { id: 'l_shoulder', name: 'Left Shoulder', x: 60, y: 33, status: 'correct' },
        { id: 'l_elbow', name: 'Left Elbow', x: 70, y: 22, status: 'correct' },
        { id: 'l_wrist', name: 'Left Wrist', x: 78, y: 12, status: 'correct' },
        { id: 'pelvis', name: 'Pelvis', x: 50, y: 56, status: 'correct' },
        { id: 'r_knee', name: 'Right Knee', x: 47, y: 74, status: 'correct' },
        { id: 'r_ankle', name: 'Right Ankle', x: 46, y: 90, status: 'correct' },
        { id: 'l_knee', name: 'Left Knee', x: 53, y: 74, status: 'correct' },
        { id: 'l_ankle', name: 'Left Ankle', x: 54, y: 90, status: 'correct' }
      ],
      lines: [
        { from: 'neck', to: 'pelvis', status: 'correct' },
        { from: 'neck', to: 'r_shoulder', status: 'correct' },
        { from: 'r_shoulder', to: 'r_elbow', status: 'correct' },
        { from: 'r_elbow', to: 'r_wrist', status: 'correct' },
        { from: 'neck', to: 'l_shoulder', status: 'correct' },
        { from: 'l_shoulder', to: 'l_elbow', status: 'correct' },
        { from: 'l_elbow', to: 'l_wrist', status: 'correct' },
        { from: 'pelvis', to: 'r_knee', status: 'correct' },
        { from: 'r_knee', to: 'r_ankle', status: 'correct' },
        { from: 'pelvis', to: 'l_knee', status: 'correct' },
        { from: 'l_knee', to: 'l_ankle', status: 'correct' }
      ]
    },
    sampleCorrectionMessage: 'Lock your elbows completely and align wrists with fists inward.'
  },
  {
    id: 'low-v',
    name: 'Low V',
    category: 'Pom Motion',
    difficulty: 'Beginner',
    description: 'Arms extended downward in an inverted V shape at roughly 45° from the body. Maintain locked elbows, tight wrists with thumbs facing forward, and an upright core.',
    practiceTips: [
      { text: 'Lock elbows straight and tight.', type: 'check' },
      { text: 'Keep thumbs facing forward on clean fists.', type: 'check' },
      { text: 'Depress shoulders away from ears.', type: 'check' }
    ],
    masteryPercentage: 0,
    imageUrl: '/poses/low-v.jpg',
    videoUrl: '/poses/videos/low-v.mp4',
    points: 100,
    idealAngles: {
      armSpread: '45° downward from torso',
      elbowAngle: '180° locked',
      torsoAngle: '90° vertical posture'
    },
    commonMistakes: [
      'Bending wrists backward (broken wrists)',
      'Soft or bent elbows',
      'Shoulders creeping up to ears',
      'Holding arms too close to hips or too wide'
    ],
    icuStandardGuideline: 'ICU Motion Sharpness Guide: V angles must maintain 45° downward trajectory from coronal midline with locked joints.',
    defaultSkeleton: {
      joints: [
        { id: 'neck', name: 'Neck', x: 50, y: 30, status: 'correct' },
        { id: 'r_shoulder', name: 'Right Shoulder', x: 40, y: 33, status: 'correct' },
        { id: 'r_elbow', name: 'Right Elbow', x: 32, y: 46, status: 'correct' },
        { id: 'r_wrist', name: 'Right Wrist', x: 24, y: 60, status: 'correct' },
        { id: 'l_shoulder', name: 'Left Shoulder', x: 60, y: 33, status: 'correct' },
        { id: 'l_elbow', name: 'Left Elbow', x: 68, y: 46, status: 'correct' },
        { id: 'l_wrist', name: 'Left Wrist', x: 76, y: 60, status: 'correct' },
        { id: 'pelvis', name: 'Pelvis', x: 50, y: 56, status: 'correct' },
        { id: 'r_knee', name: 'Right Knee', x: 47, y: 74, status: 'correct' },
        { id: 'r_ankle', name: 'Right Ankle', x: 46, y: 90, status: 'correct' },
        { id: 'l_knee', name: 'Left Knee', x: 53, y: 74, status: 'correct' },
        { id: 'l_ankle', name: 'Left Ankle', x: 54, y: 90, status: 'correct' }
      ],
      lines: [
        { from: 'neck', to: 'pelvis', status: 'correct' },
        { from: 'neck', to: 'r_shoulder', status: 'correct' },
        { from: 'r_shoulder', to: 'r_elbow', status: 'correct' },
        { from: 'r_elbow', to: 'r_wrist', status: 'correct' },
        { from: 'neck', to: 'l_shoulder', status: 'correct' },
        { from: 'l_shoulder', to: 'l_elbow', status: 'correct' },
        { from: 'l_elbow', to: 'l_wrist', status: 'correct' },
        { from: 'pelvis', to: 'r_knee', status: 'correct' },
        { from: 'r_knee', to: 'r_ankle', status: 'correct' },
        { from: 'pelvis', to: 'l_knee', status: 'correct' },
        { from: 'l_knee', to: 'l_ankle', status: 'correct' }
      ]
    },
    sampleCorrectionMessage: 'Crisp Low V motion! Lock elbows and align fists.'
  },
  {
    id: 'half-t',
    name: 'Half-T',
    category: 'Pom Motion',
    difficulty: 'Beginner',
    description: 'Keep upper arms level with the shoulders, bend both elbows, and bring fists inward toward the chest.',
    practiceTips: [
      { text: 'Keep elbows lifted and pointed outward at shoulder height.', type: 'check' },
      { text: 'Bend both elbows and pull fists inward toward the chest.', type: 'check' },
      { text: 'Keep wrists firm and shoulders level.', type: 'check' }
    ],
    masteryPercentage: 0,
    imageUrl: '/poses/half-t.jpg',
    points: 100,
    idealAngles: {
      armSpread: 'Bent 90° at elbows inward',
      elbowAngle: '90° acute',
      torsoAngle: '90° vertical posture'
    },
    commonMistakes: [
      'Elbows flaring too far back',
      'Letting fists drift away from the chest',
      'Dropping shoulders forward'
    ],
    icuStandardGuideline: 'Keep upper arms level with the shoulders and draw both fists inward toward the chest.',
    defaultSkeleton: {
      joints: [
        { id: 'neck', name: 'Neck', x: 50, y: 30, status: 'correct' },
        { id: 'r_shoulder', name: 'Right Shoulder', x: 38, y: 33, status: 'correct' },
        { id: 'r_elbow', name: 'Right Elbow', x: 26, y: 33, status: 'correct' },
        { id: 'r_wrist', name: 'Right Wrist', x: 34, y: 33, status: 'correct' },
        { id: 'l_shoulder', name: 'Left Shoulder', x: 62, y: 33, status: 'correct' },
        { id: 'l_elbow', name: 'Left Elbow', x: 74, y: 33, status: 'correct' },
        { id: 'l_wrist', name: 'Left Wrist', x: 66, y: 33, status: 'correct' },
        { id: 'pelvis', name: 'Pelvis', x: 50, y: 56, status: 'correct' },
        { id: 'r_knee', name: 'Right Knee', x: 47, y: 74, status: 'correct' },
        { id: 'r_ankle', name: 'Right Ankle', x: 46, y: 90, status: 'correct' },
        { id: 'l_knee', name: 'Left Knee', x: 53, y: 74, status: 'correct' },
        { id: 'l_ankle', name: 'Left Ankle', x: 54, y: 90, status: 'correct' }
      ],
      lines: [
        { from: 'neck', to: 'pelvis', status: 'correct' },
        { from: 'neck', to: 'r_shoulder', status: 'correct' },
        { from: 'r_shoulder', to: 'r_elbow', status: 'correct' },
        { from: 'r_elbow', to: 'r_wrist', status: 'correct' },
        { from: 'neck', to: 'l_shoulder', status: 'correct' },
        { from: 'l_shoulder', to: 'l_elbow', status: 'correct' },
        { from: 'l_elbow', to: 'l_wrist', status: 'correct' },
        { from: 'pelvis', to: 'r_knee', status: 'correct' },
        { from: 'r_knee', to: 'r_ankle', status: 'correct' },
        { from: 'pelvis', to: 'l_knee', status: 'correct' },
        { from: 'l_knee', to: 'l_ankle', status: 'correct' }
      ]
    },
    sampleCorrectionMessage: 'Lift your elbows to shoulder height and pull both fists in toward your chest.'
  },
  {
    id: 'liberty',
    name: 'Liberty',
    category: 'Stunts',
    difficulty: 'Intermediate',
    description: 'A classic body position where the athlete balances on one fully extended standing leg while holding the other leg bent at a 90° angle, foot tucked adjacent to the supporting knee, arms in High V.',
    practiceTips: [
      { text: 'Keep your standing leg completely locked straight.', type: 'check' },
      { text: 'Lift your bent knee higher towards your chest.', type: 'check' },
      { text: 'Squeeze glutes and core to eliminate wobble.', type: 'check' },
      { text: 'Do not drop your chest forward.', type: 'warning' }
    ],
    masteryPercentage: 0,
    imageUrl: '/poses/liberty.jpg',
    points: 150,
    idealAngles: {
      standingLeg: '175°–180° vertical lock',
      liftKnee: '60°–70° acute fold at knee',
      liftedThigh: '90° horizontal to torso',
      highVAperture: '90°–100° overhead spread',
      torsoAngle: '90° vertical posture'
    },
    commonMistakes: [
      'Standing knee slightly bent, causing base strain',
      'Hitchhiker foot away from supporting knee',
      'Dropping High V arm aperture'
    ],
    icuStandardGuideline: 'ICU Stunts Level 3-5: Standing knee locked with zero hyperextension wobble; bent knee at or above hip crest.',
    defaultSkeleton: {
      joints: [
        { id: 'neck', name: 'Neck', x: 47, y: 36, status: 'correct' },
        { id: 'r_shoulder', name: 'Right Shoulder', x: 41, y: 44, status: 'correct' },
        { id: 'r_elbow', name: 'Right Elbow', x: 36, y: 37, status: 'correct' },
        { id: 'r_wrist', name: 'Right Wrist', x: 31, y: 29, status: 'correct' },
        { id: 'l_shoulder', name: 'Left Shoulder', x: 54, y: 44, status: 'correct' },
        { id: 'l_elbow', name: 'Left Elbow', x: 57, y: 40, status: 'correct' },
        { id: 'l_wrist', name: 'Left Wrist', x: 62, y: 36, status: 'correct' },
        { id: 'pelvis', name: 'Pelvis', x: 48, y: 59, status: 'correct' },
        { id: 'r_knee', name: 'Standing Knee', x: 46, y: 71, status: 'correct' },
        { id: 'r_ankle', name: 'Standing Ankle', x: 47, y: 81, status: 'correct' },
        { id: 'l_knee', name: 'Lifted Knee', x: 63, y: 65, status: 'correct' },
        { id: 'l_ankle', name: 'Lifted Ankle', x: 50, y: 70, status: 'correct' }









      ],
      lines: [
        { from: 'neck', to: 'pelvis', status: 'correct' },
        { from: 'neck', to: 'r_shoulder', status: 'correct' },
        { from: 'r_shoulder', to: 'r_elbow', status: 'correct' },
        { from: 'r_elbow', to: 'r_wrist', status: 'correct' },
        { from: 'neck', to: 'l_shoulder', status: 'correct' },
        { from: 'l_shoulder', to: 'l_elbow', status: 'correct' },
        { from: 'l_elbow', to: 'l_wrist', status: 'correct' },
        { from: 'pelvis', to: 'r_knee', status: 'correct' },
        { from: 'r_knee', to: 'r_ankle', status: 'correct' },
        { from: 'pelvis', to: 'l_knee', status: 'correct' },
        { from: 'l_knee', to: 'l_ankle', status: 'correct' }
      ]
    },
    sampleCorrectionMessage: 'Keep your standing leg straight. Lift your bent knee higher towards your chest.'
  },
  {
    id: 'toe-touch',
    name: 'Toe Touch',
    category: 'Jumps',
    difficulty: 'Advanced',
    description: 'The definitive cheerleading jump requiring maximum hip flexibility and explosive power. Legs whip up and back into a straddle parallel to the floor, arms in sharp T-motion, chest upright.',
    practiceTips: [
      { text: 'Roll hips back to get maximum straddle elevation.', type: 'check' },
      { text: 'Snap arms into strong T-Motion on prep count.', type: 'check' },
      { text: 'Point toes hard all the way through landing.', type: 'check' },
      { text: 'Never drop chest to reach for toes.', type: 'warning' }
    ],
    masteryPercentage: 0,
    imageUrl: '/poses/toe-touch.jpg',
    points: 200,
    idealAngles: {
      legElevation: 'Hyperextended 190° straddle',
      torsoAngle: '85° vertical posture',
      armSpread: '180° locked T'
    },
    commonMistakes: [
      'Reaching down with hands instead of kicking legs up',
      'Bent knees during straddle peak',
      'Flexed feet on descent'
    ],
    icuStandardGuideline: 'ICU Jumps Rulebook: Full leg extension in transverse plane with toes pointed and chest vertical at peak apex.',
    defaultSkeleton: {
      joints: [
        { id: 'neck', name: 'Neck', x: 50, y: 25, status: 'correct' },
        { id: 'r_shoulder', name: 'Right Shoulder', x: 36, y: 28, status: 'correct' },
        { id: 'r_wrist', name: 'Right Wrist', x: 18, y: 28, status: 'correct' },
        { id: 'l_shoulder', name: 'Left Shoulder', x: 64, y: 28, status: 'correct' },
        { id: 'l_wrist', name: 'Left Wrist', x: 82, y: 28, status: 'correct' },
        { id: 'pelvis', name: 'Pelvis', x: 50, y: 48, status: 'correct' },
        { id: 'r_knee', name: 'Right Knee', x: 26, y: 46, status: 'correct' },
        { id: 'r_ankle', name: 'Right Ankle', x: 12, y: 44, status: 'correct' },
        { id: 'l_knee', name: 'Left Knee', x: 74, y: 46, status: 'correct' },
        { id: 'l_ankle', name: 'Left Ankle', x: 88, y: 44, status: 'correct' }
      ],
      lines: [
        { from: 'neck', to: 'pelvis', status: 'correct' },
        { from: 'neck', to: 'r_shoulder', status: 'correct' },
        { from: 'r_shoulder', to: 'r_elbow', status: 'correct' },
        { from: 'r_elbow', to: 'r_wrist', status: 'correct' },
        { from: 'neck', to: 'l_shoulder', status: 'correct' },
        { from: 'l_shoulder', to: 'l_elbow', status: 'correct' },
        { from: 'l_elbow', to: 'l_wrist', status: 'correct' },
        { from: 'pelvis', to: 'r_knee', status: 'correct' },
        { from: 'r_knee', to: 'r_ankle', status: 'correct' },
        { from: 'pelvis', to: 'l_knee', status: 'correct' },
        { from: 'l_knee', to: 'l_ankle', status: 'correct' }
      ]
    },
    sampleCorrectionMessage: 'Great height! Keep chest tall and point toes on the snap-down.'
  },
  {
    id: 'arabesque',
    name: 'Arabesque',
    category: 'Stunts',
    difficulty: 'Intermediate',
    description: 'An elegant stunt body position balancing on one leg with the rear leg extended straight backward at a 90°+ angle, torso lifted, arms in a crisp T-Motion or diagonal.',
    practiceTips: [
      { text: 'Squeeze glute of back leg to drive heel to ceiling.', type: 'check' },
      { text: 'Keep chest lifted and gaze forward.', type: 'check' },
      { text: 'Do not drop the rear knee or turn hip outward.', type: 'warning' }
    ],
    masteryPercentage: 0,
    imageUrl: '/poses/arabesque.jpg',
    videoUrl: '/poses/videos/arabesque.mp4',
    points: 160,
    idealAngles: {
      standingLeg: '180° lock',
      rearLegElevation: '90° horizontal extension',
      chestLift: '45° forward upright angle'
    },
    commonMistakes: [
      'Dropping chest below parallel',
      'Bending rear leg knee',
      'Opening rear hip causing spine twist'
    ],
    icuStandardGuideline: 'ICU Elite Body Positions: Rear leg minimum 90° parallel to stunt floor, hips squared.',
    defaultSkeleton: {
      joints: [
        { id: 'neck', name: 'Neck', x: 45, y: 32, status: 'correct' },
        { id: 'r_shoulder', name: 'Right Shoulder', x: 38, y: 34, status: 'correct' },
        { id: 'r_wrist', name: 'Right Wrist', x: 20, y: 34, status: 'correct' },
        { id: 'l_shoulder', name: 'Left Shoulder', x: 55, y: 34, status: 'correct' },
        { id: 'l_wrist', name: 'Left Wrist', x: 70, y: 34, status: 'correct' },
        { id: 'pelvis', name: 'Pelvis', x: 46, y: 52, status: 'correct' },
        { id: 'r_knee', name: 'Standing Knee', x: 46, y: 70, status: 'correct' },
        { id: 'r_ankle', name: 'Standing Ankle', x: 46, y: 88, status: 'correct' },



        { id: 'l_knee', name: 'Rear Knee', x: 68, y: 52, status: 'correct' },
        { id: 'l_ankle', name: 'Rear Ankle', x: 86, y: 50, status: 'correct' }
      ],
      lines: [
        { from: 'neck', to: 'pelvis', status: 'correct' },
        { from: 'neck', to: 'r_shoulder', status: 'correct' },
        { from: 'r_shoulder', to: 'r_elbow', status: 'correct' },
        { from: 'r_elbow', to: 'r_wrist', status: 'correct' },
        { from: 'neck', to: 'l_shoulder', status: 'correct' },
        { from: 'l_shoulder', to: 'l_elbow', status: 'correct' },
        { from: 'l_elbow', to: 'l_wrist', status: 'correct' },
        { from: 'pelvis', to: 'r_knee', status: 'correct' },
        { from: 'r_knee', to: 'r_ankle', status: 'correct' },
        { from: 'pelvis', to: 'l_knee', status: 'correct' },
        { from: 'l_knee', to: 'l_ankle', status: 'correct' }
      ]
    },
    sampleCorrectionMessage: 'Lift chest 5 degrees higher and lock back knee completely.'
  },
  {
    id: 'heel-stretch',
    name: 'Heel Stretch',
    category: 'Stunts',
    difficulty: 'Advanced',
    description: 'An advanced flyer flexibility position where the athlete pulls one leg straight vertical alongside the torso with the same or opposite hand, other arm in High V or T.',
    practiceTips: [
      { text: 'Grab bottom arch or heel firmly.', type: 'check' },
      { text: 'Keep supporting leg and base ankle solid.', type: 'check' },
      { text: 'Pull leg directly to ear, keeping hips square.', type: 'check' },
      { text: 'Do not lean torso sideways to compensate.', type: 'warning' }
    ],
    masteryPercentage: 0,
    imageUrl: '/poses/heel-stretch.jpg',
    videoUrl: '/poses/videos/heel-stretch.mp4',
    points: 220,
    idealAngles: {
      verticalStretch: '175° vertical split',
      standingLeg: '180° locked',
      torsoAngle: '90° vertical posture'
    },
    commonMistakes: [
      'Bent bottom leg absorbing flyer balance',
      'Shoulders tilted heavily to the stretch side',
      'Flexed foot on the extended leg'
    ],
    icuStandardGuideline: 'ICU Level 5/6 Standards: 180 degree line from standing foot to heel stretch apex without pelvic tilt.',
    defaultSkeleton: {
      joints: [
        { id: 'neck', name: 'Neck', x: 51, y: 39, status: 'correct' },
        { id: 'r_shoulder', name: 'Right Shoulder', x: 43, y: 38, status: 'correct' },
        { id: 'r_elbow', name: 'Right Elbow', x: 30, y: 31, status: 'correct' },
        { id: 'r_wrist', name: 'Right Wrist', x: 16, y: 23, status: 'correct' },
        { id: 'l_shoulder', name: 'Left Shoulder', x: 55, y: 42, status: 'correct' },
        { id: 'l_elbow', name: 'Left Elbow', x: 62, y: 37, status: 'correct' },
        { id: 'l_wrist', name: 'Left Wrist', x: 62, y: 25, status: 'correct' },
        { id: 'pelvis', name: 'Pelvis', x: 53, y: 54, status: 'correct' },
        { id: 'r_knee', name: 'Standing Knee', x: 52, y: 68, status: 'correct' },
        { id: 'r_ankle', name: 'Standing Ankle', x: 53, y: 87, status: 'correct' },
        { id: 'l_knee', name: 'Stretch Knee', x: 62, y: 37, status: 'correct' },
        { id: 'l_ankle', name: 'Stretch Ankle', x: 63, y: 22, status: 'correct' },










      ],
      lines: [
        { from: 'neck', to: 'pelvis', status: 'correct' },
        { from: 'neck', to: 'r_shoulder', status: 'correct' },
        { from: 'r_shoulder', to: 'r_elbow', status: 'correct' },
        { from: 'r_elbow', to: 'r_wrist', status: 'correct' },
        { from: 'neck', to: 'l_shoulder', status: 'correct' },
        { from: 'l_shoulder', to: 'l_elbow', status: 'correct' },
        { from: 'l_elbow', to: 'l_wrist', status: 'correct' },
        { from: 'pelvis', to: 'r_knee', status: 'correct' },
        { from: 'r_knee', to: 'r_ankle', status: 'correct' },
        { from: 'pelvis', to: 'l_knee', status: 'correct' },
        { from: 'l_knee', to: 'l_ankle', status: 'correct' }
      ]
    },
    sampleCorrectionMessage: 'Pull stretch heel closer to the ear while maintaining upright shoulder square.'
  },
  {
    id: 'scorpion',
    name: 'Scorpion',
    category: 'Stunts',
    difficulty: 'Advanced',
    description: 'An elite flyer flexibility stunt position. The athlete balances on one locked standing leg, reaches backward over the head with both hands to grip the back foot, and pulls the leg into a high vertical arch with toes pointing toward the ceiling.',
    practiceTips: [
      { text: 'Keep standing leg completely locked straight.', type: 'check' },
      { text: 'Grab toe or sneaker with both hands and rotate elbows forward.', type: 'check' },
      { text: 'Squeeze back and glutes to drive foot towards the ceiling.', type: 'check' },
      { text: 'Do not bend the supporting standing knee.', type: 'warning' }
    ],
    masteryPercentage: 0,
    imageUrl: '/poses/scorpion.jpg',
    points: 250,
    idealAngles: {
      standingLeg: '180° locked vertical',
      scorpionArch: '110° lumbar extension',
      rearFootApex: 'Directly overhead in sagittal plane'
    },
    commonMistakes: [
      'Bending the supporting knee (causes base wobble)',
      'Dropping chest excessively downward',
      'Flaring the back knee outward instead of tracking upward'
    ],
    icuStandardGuideline: 'ICU Stunts Level 5/6 Standards: Standing knee locked without wobble; rear foot pulled over head height in continuous sagittal plane with toes pointed.',
    defaultSkeleton: {
      joints: [
        { id: 'neck', name: 'Neck', x: 44, y: 34, status: 'correct' },
        { id: 'r_shoulder', name: 'Right Shoulder', x: 43, y: 36, status: 'correct' },
        { id: 'r_elbow', name: 'Right Elbow', x: 42, y: 21, status: 'correct' },
        { id: 'r_wrist', name: 'Right Wrist', x: 47, y: 9, status: 'correct' },
        { id: 'l_shoulder', name: 'Left Shoulder', x: 45, y: 33, status: 'correct' },
        { id: 'l_elbow', name: 'Left Elbow', x: 39, y: 27, status: 'correct' },
        { id: 'l_wrist', name: 'Left Wrist', x: 50, y: 8, status: 'correct' },

        { id: 'pelvis', name: 'Pelvis', x: 48, y: 52, status: 'correct' },
        { id: 'r_knee', name: 'Standing Knee', x: 56, y: 69, status: 'correct' },
        { id: 'r_ankle', name: 'Standing Ankle', x: 54, y: 87, status: 'correct' },
        { id: 'l_knee', name: 'Scorpion Knee', x: 64, y: 27, status: 'correct' },
        { id: 'l_ankle', name: 'Scorpion Ankle', x: 54, y: 11, status: 'correct' }
      ],
      lines: [
        { from: 'neck', to: 'pelvis', status: 'correct' },
        { from: 'neck', to: 'r_shoulder', status: 'correct' },
        { from: 'r_shoulder', to: 'r_elbow', status: 'correct' },
        { from: 'r_elbow', to: 'r_wrist', status: 'correct' },
        { from: 'neck', to: 'l_shoulder', status: 'correct' },
        { from: 'l_shoulder', to: 'l_elbow', status: 'correct' },
        { from: 'l_elbow', to: 'l_wrist', status: 'correct' },
        { from: 'pelvis', to: 'r_knee', status: 'correct' },
        { from: 'r_knee', to: 'r_ankle', status: 'correct' },
        { from: 'pelvis', to: 'l_knee', status: 'correct' },
        { from: 'l_knee', to: 'l_ankle', status: 'correct' }
      ]
    },
    sampleCorrectionMessage: 'Drive your scorpion foot higher over your head and lock the standing knee.'
  }
];
