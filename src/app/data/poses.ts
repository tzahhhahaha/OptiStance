import { Pose, PracticeSession } from '../types';

export const INITIAL_POSES: Pose[] = [
  {
    id: 't-motion',
    name: 'T-Motion',
    category: 'Pom Motion',
    difficulty: 'Beginner',
    description: 'Arms extended horizontally to the sides in a straight line. Maintain a tall posture and keep shoulders level.',
    practiceTips: [
      { text: 'Open arms to a straight line.', type: 'check' },
      { text: 'Keep shoulders level.', type: 'check' },
      { text: 'Avoid leaning.', type: 'warning' }
    ],
    masteryPercentage: 100,
    imageUrl: 'https://lh3.googleusercontent.com/aida/AP1WRLtdvgNi1ZVZHfMBMys_LSZk_v9lssaxwkN3vuvkrR4RjY9k-C7Vw-LBKyLxzFWVX_EoBpM4T5mHYETOF_Kx0N85PQ-R8o9Um6-v99g31U7UWJbGNmKc3IZPwlQSnsS3PzcQ156VXIHE-RQn-5G7Ag5P0ciqtC7gX8MFC47OlE3fPcTdfC5En_tFQaiDNIIbztEGAouXzvHxBDnSWofuqoVj430gFEHu2hLj0QaumpFCXFMhDvwE7JszMQ',
    points: 100,
    idealAngles: {
      armSpread: '180° horizontal',
      elbowAngle: '180° locked',
      torsoAngle: '90° vertical'
    },
    commonMistakes: [
      'Dropping arms below shoulder height',
      'Hyperextending wrists outward',
      'Hunching upper traps'
    ],
    icuStandardGuideline: 'ICU Pom & Cheer Rule 4.2: Arms must form a continuous 180° plane without deviation along coronal axis.',
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
    imageUrl: 'https://lh3.googleusercontent.com/aida/AP1WRLtLDIqveNFWJolAhMnHzrJdPTZtXjFkp3UHwarqlyTUlY1yDHFFvJtI5RoTB-U3U3ZaQ8xQnS9myaoG5wh7VMBC4WsSMKD3ZSsVg0PYmjGYUzutFe7XsEz8wL5hVndgW7w6e4iwVoV8ZY2jLlDJUXk19rVYu2MoYtaNtiG6es6nb7Zfp0qNwuhGLt_0R4CeDD1YG0Y6XE3C2eww_k0NWbsZvdLzeLgb2xXGO7sDmIsVmk_Ikft411my1A',
    points: 100,
    idealAngles: {
      armSpread: '45° from vertical',
      elbowAngle: '180° locked',
      torsoAngle: '90° vertical'
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
    id: 'half-t',
    name: 'Half-T',
    category: 'Pom Motion',
    difficulty: 'Beginner',
    description: 'The arms form a shorter T shape halfway between the body and shoulder height. Maintain rigid wrists and sharp motion.',
    practiceTips: [
      { text: 'Keep the horizontal line shorter.', type: 'check' },
      { text: 'Stay centered. Engage core muscles for balance.', type: 'check' },
      { text: 'Keep elbows soft but energy extending through the fists.', type: 'check' }
    ],
    masteryPercentage: 0,
    imageUrl: 'https://lh3.googleusercontent.com/aida/AP1WRLubIdCuB_p61rpv-9NS9WA14073gjJVQV8kyjCnynlHPQ_V5txECaKmp3kuGFpD2eJY9NwRT2AsEMGcnv4mT_xQH0u0VVlTP60qDm8eb2AdoNtrU0EMtORsIZuXfVyvOVp8Qi5IzZBRXbTQJTsTO4Bd_iYLotkIcARXRZlbulzuKDFUFS2mtPIYAfLqiBf2QB7dCPhzLeWOmMPN-omA8w1tWvLM2ilwA4hMOzt1ZHAfrzKzL6yJe5DXA6g',
    points: 100,
    idealAngles: {
      armSpread: 'Bent 90° at elbows inward',
      elbowAngle: '90° acute',
      torsoAngle: '90° vertical'
    },
    commonMistakes: [
      'Elbows flaring too far back',
      'Wrists bending in front of chest',
      'Dropping shoulders forward'
    ],
    icuStandardGuideline: 'ICU Motion Sharpness Guide: Forearms parallel to chest line with thumb knuckles facing outward.',
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
    sampleCorrectionMessage: 'Tuck forearms parallel to chest line and snap motion sharply.'
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
    masteryPercentage: 85,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCUcl56_A7zfok-a9F75sAwf6ISLbllV6eTPFBZR_VP7xn8MYh6GmHudSm2Vwcabvgtgvef2iAs7eMfiigTQDsuzSyYMMU-Eaaxp5TOj-UeCii2ig7C_FIXi_J7DbZRgCQdGkMDAn83oM3zY_XxVkyc_vK19_mQhRdOj8gLv44dKv8ZRQh_RYg01qB1SDhhYz1V4cb5FcljezfrudsLepB51YCAVCJXFXXytEspfOm1rZBkrTBULute',
    points: 150,
    idealAngles: {
      standingLeg: '180° vertical lock',
      liftKnee: '90° horizontal thigh',
      torsoAngle: '90° vertical'
    },
    commonMistakes: [
      'Standing knee slightly bent, causing base strain',
      'Hitchhiker foot away from supporting knee',
      'Dropping High V arm aperture'
    ],
    icuStandardGuideline: 'ICU Stunts Level 3-5: Standing knee locked with zero hyperextension wobble; bent knee at or above hip crest.',
    defaultSkeleton: {
      joints: [
        { id: 'neck', name: 'Neck', x: 50, y: 31, status: 'correct' },
        { id: 'r_shoulder', name: 'Right Shoulder', x: 40, y: 25, status: 'correct' },
        { id: 'r_wrist', name: 'Right Wrist', x: 37, y: 15, status: 'correct' },
        { id: 'l_shoulder', name: 'Left Shoulder', x: 65, y: 29, status: 'correct' },
        { id: 'l_wrist', name: 'Left Wrist', x: 67, y: 19, status: 'correct' },
        { id: 'pelvis', name: 'Pelvis', x: 50, y: 50, status: 'correct' },
        { id: 'r_knee', name: 'Standing Knee', x: 48, y: 69, status: 'correct' },
        { id: 'r_ankle', name: 'Standing Ankle', x: 46, y: 88, status: 'correct' },
        { id: 'l_knee', name: 'Lifted Knee', x: 65, y: 56, status: 'error' },
        { id: 'l_ankle', name: 'Lifted Ankle', x: 52, y: 66, status: 'error' }
      ],
      lines: [
        { from: 'neck', to: 'pelvis', status: 'correct' },
        { from: 'neck', to: 'r_shoulder', status: 'correct' },
        { from: 'r_shoulder', to: 'r_wrist', status: 'correct' },
        { from: 'neck', to: 'l_shoulder', status: 'correct' },
        { from: 'l_shoulder', to: 'l_wrist', status: 'correct' },
        { from: 'pelvis', to: 'r_knee', status: 'correct' },
        { from: 'r_knee', to: 'r_ankle', status: 'correct' },
        { from: 'pelvis', to: 'l_knee', status: 'error' },
        { from: 'l_knee', to: 'l_ankle', status: 'error' }
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
    masteryPercentage: 70,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC4f4-XM04Nh_vtE89eqzbrorhjaX2Of8IOIPRBqRUWItNidDhk_5ySyd8CLuRZOGft2AY6oKLlvw52sEg1P3Q3qEI76kWVqDW14mNKyogfJqhVMX4KJc5l_srPDGx9VZ8A92AF-Tzk_rHez4QU8V7bbh4TZiAdiOep8_gCOyMq2ntW7omLlBONO-n_pg4eOHq9eXxSUmeMjOe5I3czHVCYXocTUPvObdxZgFrpSg90WCcSbByppoi5',
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
        { from: 'r_shoulder', to: 'r_wrist', status: 'correct' },
        { from: 'neck', to: 'l_shoulder', status: 'correct' },
        { from: 'l_shoulder', to: 'l_wrist', status: 'correct' },
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
    masteryPercentage: 90,
    imageUrl: 'https://lh3.googleusercontent.com/aida/AP1WRLtdvgNi1ZVZHfMBMys_LSZk_v9lssaxwkN3vuvkrR4RjY9k-C7Vw-LBKyLxzFWVX_EoBpM4T5mHYETOF_Kx0N85PQ-R8o9Um6-v99g31U7UWJbGNmKc3IZPwlQSnsS3PzcQ156VXIHE-RQn-5G7Ag5P0ciqtC7gX8MFC47OlE3fPcTdfC5En_tFQaiDNIIbztEGAouXzvHxBDnSWofuqoVj430gFEHu2hLj0QaumpFCXFMhDvwE7JszMQ',
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
        { from: 'r_shoulder', to: 'r_wrist', status: 'correct' },
        { from: 'neck', to: 'l_shoulder', status: 'correct' },
        { from: 'l_shoulder', to: 'l_wrist', status: 'correct' },
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
    masteryPercentage: 60,
    imageUrl: 'https://lh3.googleusercontent.com/aida/AP1WRLtLDIqveNFWJolAhMnHzrJdPTZtXjFkp3UHwarqlyTUlY1yDHFFvJtI5RoTB-U3U3ZaQ8xQnS9myaoG5wh7VMBC4WsSMKD3ZSsVg0PYmjGYUzutFe7XsEz8wL5hVndgW7w6e4iwVoV8ZY2jLlDJUXk19rVYu2MoYtaNtiG6es6nb7Zfp0qNwuhGLt_0R4CeDD1YG0Y6XE3C2eww_k0NWbsZvdLzeLgb2xXGO7sDmIsVmk_Ikft411my1A',
    points: 220,
    idealAngles: {
      verticalStretch: '175° vertical split',
      standingLeg: '180° locked',
      torsoAngle: '90° vertical'
    },
    commonMistakes: [
      'Bent bottom leg absorbing flyer balance',
      'Shoulders tilted heavily to the stretch side',
      'Flexed foot on the extended leg'
    ],
    icuStandardGuideline: 'ICU Level 5/6 Standards: 180 degree line from standing foot to heel stretch apex without pelvic tilt.',
    defaultSkeleton: {
      joints: [
        { id: 'neck', name: 'Neck', x: 48, y: 28, status: 'correct' },
        { id: 'r_shoulder', name: 'Right Shoulder', x: 38, y: 30, status: 'correct' },
        { id: 'r_wrist', name: 'Right Wrist', x: 26, y: 16, status: 'correct' },
        { id: 'l_shoulder', name: 'Left Shoulder', x: 58, y: 30, status: 'correct' },
        { id: 'l_wrist', name: 'Left Wrist', x: 62, y: 14, status: 'correct' },
        { id: 'pelvis', name: 'Pelvis', x: 48, y: 52, status: 'correct' },
        { id: 'r_knee', name: 'Standing Knee', x: 46, y: 70, status: 'correct' },
        { id: 'r_ankle', name: 'Standing Ankle', x: 45, y: 88, status: 'correct' },
        { id: 'l_knee', name: 'Stretch Knee', x: 58, y: 32, status: 'correct' },
        { id: 'l_ankle', name: 'Stretch Ankle', x: 62, y: 15, status: 'correct' }
      ],
      lines: [
        { from: 'neck', to: 'pelvis', status: 'correct' },
        { from: 'neck', to: 'r_shoulder', status: 'correct' },
        { from: 'r_shoulder', to: 'r_wrist', status: 'correct' },
        { from: 'neck', to: 'l_shoulder', status: 'correct' },
        { from: 'l_shoulder', to: 'l_wrist', status: 'correct' },
        { from: 'pelvis', to: 'r_knee', status: 'correct' },
        { from: 'r_knee', to: 'r_ankle', status: 'correct' },
        { from: 'pelvis', to: 'l_knee', status: 'correct' },
        { from: 'l_knee', to: 'l_ankle', status: 'correct' }
      ]
    },
    sampleCorrectionMessage: 'Pull stretch heel closer to the ear while maintaining upright shoulder square.'
  }
];

export const INITIAL_SESSIONS: PracticeSession[] = [
  {
    id: 'sess-001',
    poseId: 't-motion',
    poseName: 'T-Motion',
    timestamp: 'Today, 4:15 PM',
    accuracyScore: 98,
    durationSeconds: 124,
    corrections: ['Perfect horizontal arm leveling', 'Held continuous 180° alignment'],
    icuScore: 9.8,
    feedbackSummary: 'Mastery verified under ICU standard 4.2.'
  },
  {
    id: 'sess-002',
    poseId: 'liberty',
    poseName: 'Liberty',
    timestamp: 'Today, 2:40 PM',
    accuracyScore: 85,
    durationSeconds: 180,
    corrections: ['Lift bent knee 4cm higher', 'Lock standing knee firmly'],
    icuScore: 8.5,
    feedbackSummary: 'Solid balance hold; minor knee elevation adjustment needed.'
  },
  {
    id: 'sess-003',
    poseId: 'toe-touch',
    poseName: 'Toe Touch',
    timestamp: 'Yesterday, 6:00 PM',
    accuracyScore: 72,
    durationSeconds: 95,
    corrections: ['Point toes on snap down', 'Keep chest upright at apex'],
    icuScore: 7.2,
    feedbackSummary: 'Good explosive jump height, improve hip rotation.'
  },
  {
    id: 'sess-004',
    poseId: 'arabesque',
    poseName: 'Arabesque',
    timestamp: 'Aug 11, 2026',
    accuracyScore: 90,
    durationSeconds: 140,
    corrections: ['Chest posture stable', 'Rear leg elevated 92°'],
    icuScore: 9.0,
    feedbackSummary: 'Excellent form and square hip alignment.'
  }
];
