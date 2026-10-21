/**
 * OptiStance Biomechanical Angle Standards & ICU Specifications
 * Supports all 9 bundled cheerleading poses with dynamic tolerances.
 */

export interface JointStandard {
  target: number; // in degrees
  weight: number; // relative weight in overall score (1 - 3)
  toleranceBeginner: number; // e.g. 15°
  toleranceAdvanced: number; // e.g. 8°
  cueLow: string; // cue when angle is too small
  cueHigh: string; // cue when angle is too large
}

export interface PoseKinematicStandard {
  id: string;
  name: string;
  category: 'Pom Motion' | 'Stunts' | 'Jumps' | 'Flexibility';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  isSingleLeg?: boolean;
  isJump?: boolean;
  joints: Record<string, JointStandard>;
}

export const POSE_STANDARDS: Record<string, PoseKinematicStandard> = {
  't-motion': {
    id: 't-motion',
    name: 'T-Motion',
    category: 'Pom Motion',
    difficulty: 'Beginner',
    joints: {
      leftElbow: {
        target: 180,
        weight: 2.5,
        toleranceBeginner: 15,
        toleranceAdvanced: 8,
        cueLow: 'Lock your left elbow — arms must be completely straight!',
        cueHigh: 'Keep left arm straight without hyperextension.',
      },
      rightElbow: {
        target: 180,
        weight: 2.5,
        toleranceBeginner: 15,
        toleranceAdvanced: 8,
        cueLow: 'Lock your right elbow — arms must be completely straight!',
        cueHigh: 'Keep right arm straight without hyperextension.',
      },
      leftShoulder: {
        target: 90,
        weight: 2.0,
        toleranceBeginner: 15,
        toleranceAdvanced: 8,
        cueLow: 'Raise your left arm to shoulder level (90°)!',
        cueHigh: 'Lower left arm — keep it level with your shoulder!',
      },
      rightShoulder: {
        target: 90,
        weight: 2.0,
        toleranceBeginner: 15,
        toleranceAdvanced: 8,
        cueLow: 'Raise your right arm to shoulder level (90°)!',
        cueHigh: 'Lower right arm — keep it level with your shoulder!',
      },
      torsoLean: {
        target: 0,
        weight: 1.0,
        toleranceBeginner: 15,
        toleranceAdvanced: 8,
        cueLow: 'Keep your torso vertical and tall!',
        cueHigh: 'Stand tall — avoid leaning to the side!',
      },
    },
  },

  'high-v': {
    id: 'high-v',
    name: 'High V',
    category: 'Pom Motion',
    difficulty: 'Beginner',
    joints: {
      leftElbow: {
        target: 180,
        weight: 2.5,
        toleranceBeginner: 15,
        toleranceAdvanced: 8,
        cueLow: 'Lock your left elbow — punch strong into the V!',
        cueHigh: 'Maintain straight left arm extension.',
      },
      rightElbow: {
        target: 180,
        weight: 2.5,
        toleranceBeginner: 15,
        toleranceAdvanced: 8,
        cueLow: 'Lock your right elbow — punch strong into the V!',
        cueHigh: 'Maintain straight right arm extension.',
      },
      leftShoulder: {
        target: 135,
        weight: 2.0,
        toleranceBeginner: 15,
        toleranceAdvanced: 8,
        cueLow: 'Punch your left arm higher into a 45° angle overhead!',
        cueHigh: 'Bring left arm down slightly to match standard High-V line.',
      },
      rightShoulder: {
        target: 135,
        weight: 2.0,
        toleranceBeginner: 15,
        toleranceAdvanced: 8,
        cueLow: 'Punch your right arm higher into a 45° angle overhead!',
        cueHigh: 'Bring right arm down slightly to match standard High-V line.',
      },
      torsoLean: {
        target: 0,
        weight: 1.0,
        toleranceBeginner: 15,
        toleranceAdvanced: 8,
        cueLow: 'Stay upright with shoulders locked back!',
        cueHigh: 'Keep torso centered without swaying.',
      },
    },
  },

  'low-v': {
    id: 'low-v',
    name: 'Low V',
    category: 'Pom Motion',
    difficulty: 'Beginner',
    joints: {
      leftElbow: {
        target: 180,
        weight: 2.5,
        toleranceBeginner: 15,
        toleranceAdvanced: 8,
        cueLow: 'Lock your left elbow — strong diagonal downward line!',
        cueHigh: 'Keep left arm locked straight.',
      },
      rightElbow: {
        target: 180,
        weight: 2.5,
        toleranceBeginner: 15,
        toleranceAdvanced: 8,
        cueLow: 'Lock your right elbow — strong diagonal downward line!',
        cueHigh: 'Keep right arm locked straight.',
      },
      leftShoulder: {
        target: 45,
        weight: 2.0,
        toleranceBeginner: 15,
        toleranceAdvanced: 8,
        cueLow: 'Open left arm wider into a clean downward V!',
        cueHigh: 'Keep left arm angled down at 45°, not horizontal.',
      },
      rightShoulder: {
        target: 45,
        weight: 2.0,
        toleranceBeginner: 15,
        toleranceAdvanced: 8,
        cueLow: 'Open right arm wider into a clean downward V!',
        cueHigh: 'Keep right arm angled down at 45°, not horizontal.',
      },
      torsoLean: {
        target: 0,
        weight: 1.0,
        toleranceBeginner: 15,
        toleranceAdvanced: 8,
        cueLow: 'Keep chest lifted and shoulders squared!',
        cueHigh: 'Stand straight without leaning.',
      },
    },
  },

  'half-t': {
    id: 'half-t',
    name: 'Half T',
    category: 'Pom Motion',
    difficulty: 'Beginner',
    joints: {
      leftElbow: {
        target: 90,
        weight: 2.5,
        toleranceBeginner: 15,
        toleranceAdvanced: 8,
        cueLow: 'Bend left elbow to a sharp 90° box angle!',
        cueHigh: 'Pull left forearm in to lock the 90° Half-T angle!',
      },
      rightElbow: {
        target: 90,
        weight: 2.5,
        toleranceBeginner: 15,
        toleranceAdvanced: 8,
        cueLow: 'Bend right elbow to a sharp 90° box angle!',
        cueHigh: 'Pull right forearm in to lock the 90° Half-T angle!',
      },
      leftShoulder: {
        target: 90,
        weight: 2.0,
        toleranceBeginner: 15,
        toleranceAdvanced: 8,
        cueLow: 'Raise left upper arm to shoulder height!',
        cueHigh: 'Lower left shoulder level to 90°.',
      },
      rightShoulder: {
        target: 90,
        weight: 2.0,
        toleranceBeginner: 15,
        toleranceAdvanced: 8,
        cueLow: 'Raise right upper arm to shoulder height!',
        cueHigh: 'Lower right shoulder level to 90°.',
      },
    },
  },

  'liberty': {
    id: 'liberty',
    name: 'Liberty',
    category: 'Stunts',
    difficulty: 'Intermediate',
    isSingleLeg: true,
    joints: {
      standingKnee: {
        target: 180,
        weight: 3.0,
        toleranceBeginner: 15,
        toleranceAdvanced: 8,
        cueLow: 'Lock your standing knee completely — drive heel down!',
        cueHigh: 'Keep standing leg strong and straight.',
      },
      liftedKnee: {
        target: 90,
        weight: 2.5,
        toleranceBeginner: 15,
        toleranceAdvanced: 8,
        cueLow: 'Lift your foot closer to the knee for a sharp Liberty shape!',
        cueHigh: 'Bend lifted knee to 90° at knee level.',
      },
      liftedHip: {
        target: 90,
        weight: 2.0,
        toleranceBeginner: 18,
        toleranceAdvanced: 10,
        cueLow: 'Drive lifted thigh up to horizontal (90°)!',
        cueHigh: 'Keep lifted thigh level at 90°.',
      },
      torsoLean: {
        target: 0,
        weight: 1.5,
        toleranceBeginner: 15,
        toleranceAdvanced: 8,
        cueLow: 'Maintain vertical posture — squeeze your core!',
        cueHigh: 'Stack shoulders directly over hips — stay vertical!',
      },
    },
  },

  'toe-touch': {
    id: 'toe-touch',
    name: 'Toe Touch',
    category: 'Jumps',
    difficulty: 'Intermediate',
    isJump: true,
    joints: {
      hipSpread: {
        target: 135,
        weight: 3.0,
        toleranceBeginner: 20,
        toleranceAdvanced: 12,
        cueLow: 'Whip your legs higher — hit maximum straddle extension!',
        cueHigh: 'Excellent hyperextension straddle!',
      },
      leftKnee: {
        target: 180,
        weight: 2.0,
        toleranceBeginner: 15,
        toleranceAdvanced: 8,
        cueLow: 'Point your left toes and lock your knee!',
        cueHigh: 'Keep left leg locked straight in the air.',
      },
      rightKnee: {
        target: 180,
        weight: 2.0,
        toleranceBeginner: 15,
        toleranceAdvanced: 8,
        cueLow: 'Point your right toes and lock your knee!',
        cueHigh: 'Keep right leg locked straight in the air.',
      },
      leftElbow: {
        target: 180,
        weight: 1.5,
        toleranceBeginner: 15,
        toleranceAdvanced: 8,
        cueLow: 'Lock your left arm into a sharp T-motion!',
        cueHigh: 'Keep left arm locked.',
      },
      rightElbow: {
        target: 180,
        weight: 1.5,
        toleranceBeginner: 15,
        toleranceAdvanced: 8,
        cueLow: 'Lock your right arm into a sharp T-motion!',
        cueHigh: 'Keep right arm locked.',
      },
    },
  },

  'arabesque': {
    id: 'arabesque',
    name: 'Arabesque',
    category: 'Stunts',
    difficulty: 'Intermediate',
    isSingleLeg: true,
    joints: {
      standingKnee: {
        target: 180,
        weight: 3.0,
        toleranceBeginner: 15,
        toleranceAdvanced: 8,
        cueLow: 'Lock your standing knee — maintain firm balance!',
        cueHigh: 'Keep standing leg straight.',
      },
      liftedHip: {
        target: 90,
        weight: 2.5,
        toleranceBeginner: 20,
        toleranceAdvanced: 10,
        cueLow: 'Kick back leg higher behind you — reach for horizontal!',
        cueHigh: 'Superb back leg extension!',
      },
      liftedKnee: {
        target: 180,
        weight: 2.0,
        toleranceBeginner: 15,
        toleranceAdvanced: 8,
        cueLow: 'Lock your back knee and point your toes behind you!',
        cueHigh: 'Keep back leg locked.',
      },
      torsoLean: {
        target: 15,
        weight: 1.5,
        toleranceBeginner: 15,
        toleranceAdvanced: 10,
        cueLow: 'Lift chest tall — do not collapse forward!',
        cueHigh: 'Lift your chest and look straight ahead!',
      },
    },
  },

  'heel-stretch': {
    id: 'heel-stretch',
    name: 'Heel Stretch',
    category: 'Flexibility',
    difficulty: 'Advanced',
    isSingleLeg: true,
    joints: {
      standingKnee: {
        target: 180,
        weight: 3.0,
        toleranceBeginner: 15,
        toleranceAdvanced: 8,
        cueLow: 'Lock your standing knee — foundation must be rock solid!',
        cueHigh: 'Keep standing leg straight.',
      },
      liftedHip: {
        target: 160,
        weight: 3.0,
        toleranceBeginner: 20,
        toleranceAdvanced: 12,
        cueLow: 'Pull your stretch leg higher toward your ear!',
        cueHigh: 'Outstanding vertical extension!',
      },
      liftedKnee: {
        target: 180,
        weight: 2.5,
        toleranceBeginner: 15,
        toleranceAdvanced: 8,
        cueLow: 'Lock your extension knee — avoid soft bends in the stretch!',
        cueHigh: 'Keep extended leg fully locked.',
      },
      torsoLean: {
        target: 0,
        weight: 1.5,
        toleranceBeginner: 15,
        toleranceAdvanced: 8,
        cueLow: 'Keep chest tall and hips square — do not lean away!',
        cueHigh: 'Maintain vertical spine alignment.',
      },
    },
  },

  'scorpion': {
    id: 'scorpion',
    name: 'Scorpion',
    category: 'Flexibility',
    difficulty: 'Advanced',
    isSingleLeg: true,
    joints: {
      standingKnee: {
        target: 180,
        weight: 3.0,
        toleranceBeginner: 15,
        toleranceAdvanced: 8,
        cueLow: 'Lock your standing knee completely!',
        cueHigh: 'Keep standing leg straight.',
      },
      liftedHip: {
        target: 150,
        weight: 3.0,
        toleranceBeginner: 20,
        toleranceAdvanced: 12,
        cueLow: 'Pull your back toe higher over your head!',
        cueHigh: 'Phenomenal needle flexibility!',
      },
      torsoLean: {
        target: 10,
        weight: 2.0,
        toleranceBeginner: 15,
        toleranceAdvanced: 8,
        cueLow: 'Keep chest lifted and shoulders squared to front!',
        cueHigh: 'Keep chest lifted tall while pulling back leg.',
      },
    },
  },
};

/**
 * Automatically detects which leg is on the ground (base leg)
 * for single-leg stunts by comparing ankle vertical coordinates.
 */
export function detectBaseLeg(landmarks: any[] | undefined | null): {
  baseLeg: 'left' | 'right';
  liftedLeg: 'left' | 'right';
  confidence: number;
} {
  if (!landmarks || landmarks.length < 29) {
    return { baseLeg: 'left', liftedLeg: 'right', confidence: 0.5 };
  }

  const leftAnkle = landmarks[27];
  const rightAnkle = landmarks[28];

  if (!leftAnkle || !rightAnkle) {
    return { baseLeg: 'left', liftedLeg: 'right', confidence: 0.5 };
  }

  // In normalized camera coordinates, Y=0 is top, Y=1 is bottom.
  // The leg on the floor has a LARGER Y value (lower down).
  const yDiff = leftAnkle.y - rightAnkle.y;

  if (yDiff > 0.05) {
    // Left ankle is noticeably lower -> standing on left leg
    return { baseLeg: 'left', liftedLeg: 'right', confidence: 0.9 };
  } else if (yDiff < -0.05) {
    // Right ankle is noticeably lower -> standing on right leg
    return { baseLeg: 'right', liftedLeg: 'left', confidence: 0.9 };
  }

  // Fallback: check knees
  const leftKnee = landmarks[25];
  const rightKnee = landmarks[26];
  if (leftKnee && rightKnee) {
    if (leftKnee.y > rightKnee.y) {
      return { baseLeg: 'left', liftedLeg: 'right', confidence: 0.75 };
    } else {
      return { baseLeg: 'right', liftedLeg: 'left', confidence: 0.75 };
    }
  }

  return { baseLeg: 'left', liftedLeg: 'right', confidence: 0.5 };
}

/**
 * Normalizes pose name/ID to match standard keys.
 */
export function normalizePoseKey(
  rawIdOrName: string | { id?: string; name?: string } | null | undefined
): string {
  if (!rawIdOrName) return '';
  const str =
    typeof rawIdOrName === 'string'
      ? rawIdOrName
      : rawIdOrName.id || rawIdOrName.name || '';
  const clean = str.toLowerCase().replace(/[^a-z0-9]/g, '-');
  if (clean.includes('high') || clean.includes('high-v')) return 'high-v';
  if (clean.includes('low') || clean.includes('low-v')) return 'low-v';
  if (clean.includes('half') || clean.includes('half-t')) return 'half-t';
  if (clean.includes('t-motion') || clean === 't' || clean.includes('t-pose')) return 't-motion';
  if (clean.includes('liberty')) return 'liberty';
  if (clean.includes('toe') || clean.includes('jump')) return 'toe-touch';
  if (clean.includes('arabesque')) return 'arabesque';
  if (clean.includes('heel') || clean.includes('stretch')) return 'heel-stretch';
  if (clean.includes('scorpion')) return 'scorpion';
  return clean;
}
