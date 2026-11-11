import { describe, expect, it } from 'vitest';
import { INITIAL_POSES } from '../app/data/poses';
import { getPoseTrainingDrills, recommendTrainingDrill } from '../app/scoring/trainingDrills';
import type { JointEvaluation } from '../app/scoring/scorePose';
import type { Pose } from '../app/types';

describe('training drills', () => {
  it('provides drills for every bundled library pose', () => {
    for (const pose of INITIAL_POSES) {
      expect(getPoseTrainingDrills(pose).length, pose.name).toBeGreaterThan(0);
    }
  });

  it('recommends a drill that targets the most significant off-target joint', () => {
    const pose = INITIAL_POSES.find(({ id }) => id === 'high-v');
    expect(pose).toBeDefined();
    if (!pose) return;

    const evaluations: JointEvaluation[] = [
      {
        jointKey: 'leftElbow',
        name: 'Left Elbow',
        measured: 150,
        target: 180,
        tolerance: 15,
        deviation: 30,
        status: 'error',
        cue: 'Straighten your left elbow.',
      },
      {
        jointKey: 'rightShoulder',
        name: 'Right Shoulder',
        measured: 90,
        target: 135,
        tolerance: 15,
        deviation: 45,
        status: 'error',
        cue: 'Raise your right arm.',
      },
    ];

    const recommendation = recommendTrainingDrill(pose, evaluations);
    expect(recommendation.focusJoints).toContain('rightShoulder');
  });

  it('returns a default practice drill when no joints need correction', () => {
    const pose = INITIAL_POSES[0];
    const correctEvaluation: JointEvaluation = {
      jointKey: 'leftShoulder',
      name: 'Left Shoulder',
      measured: 90,
      target: 90,
      tolerance: 15,
      deviation: 0,
      status: 'correct',
      cue: null,
    };

    expect(recommendTrainingDrill(pose, [correctEvaluation])).toEqual(
      getPoseTrainingDrills(pose)[0]
    );
  });

  it('provides safe generic drills for a custom library pose', () => {
    const customPose: Pose = {
      ...INITIAL_POSES[0],
      id: 'custom-pose',
      practiceTips: [{ text: 'Keep your shoulders level.', type: 'check' }],
    };

    const drills = getPoseTrainingDrills(customPose);
    expect(drills).toHaveLength(2);
    expect(drills[0].instructions).toContain('Keep your shoulders level.');
    expect(recommendTrainingDrill(customPose, []).id).toBe(drills[0].id);
  });
});
