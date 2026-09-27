import { describe, expect, it } from 'vitest';
import { applyAdminPoseImages } from '../app/utils/poseReferenceImages';
import type { Pose } from '../app/types';

const pose = (id: string, imageUrl: string): Pose =>
  ({
    id,
    name: id,
    category: 'Stunts',
    difficulty: 'Beginner',
    description: '',
    practiceTips: [],
    masteryPercentage: 0,
    imageUrl,
    points: 100,
    idealAngles: {},
    commonMistakes: [],
    icuStandardGuideline: '',
    defaultSkeleton: { joints: [], lines: [] },
    sampleCorrectionMessage: '',
  }) as Pose;

describe('applyAdminPoseImages', () => {
  const library = [pose('t-motion', 'bundled-1'), pose('half-t', 'bundled-2')];

  it('replaces the bundled image with the admin-uploaded one', () => {
    const result = applyAdminPoseImages(library, [
      { pose_key: 't-motion', reference_image_url: 'https://cdn.test/t.png' },
    ]);

    expect(result[0].imageUrl).toBe('https://cdn.test/t.png');
  });

  it('leaves poses without an admin image on their bundled image', () => {
    const result = applyAdminPoseImages(library, [
      { pose_key: 't-motion', reference_image_url: 'https://cdn.test/t.png' },
    ]);

    expect(result[1].imageUrl).toBe('bundled-2');
  });

  it('ignores curriculum-only stunts that have no pose_key', () => {
    const result = applyAdminPoseImages(library, [
      { pose_key: null, reference_image_url: 'https://cdn.test/other.png' },
    ]);

    expect(result).toBe(library);
  });

  it('treats a blank reference image as no image so the bundled one stays', () => {
    const result = applyAdminPoseImages(library, [
      { pose_key: 't-motion', reference_image_url: '   ' },
      { pose_key: 'half-t', reference_image_url: '' },
    ]);

    expect(result).toBe(library);
  });

  it('returns the same array when no pose image actually changes', () => {
    const result = applyAdminPoseImages(library, [
      { pose_key: 't-motion', reference_image_url: 'bundled-1' },
    ]);

    expect(result).toBe(library);
  });

  it('returns the input untouched when there are no stunts', () => {
    expect(applyAdminPoseImages(library, [])).toBe(library);
  });

  it('does not mutate the input poses', () => {
    const original = pose('t-motion', 'bundled-1');
    const result = applyAdminPoseImages([original], [
      { pose_key: 't-motion', reference_image_url: 'https://cdn.test/t.png' },
    ]);

    expect(original.imageUrl).toBe('bundled-1');
    expect(result[0]).not.toBe(original);
  });

  it('preserves every other pose field when swapping the image', () => {
    const result = applyAdminPoseImages(library, [
      { pose_key: 't-motion', reference_image_url: 'https://cdn.test/t.png' },
    ]);

    expect(result[0].name).toBe('t-motion');
    expect(result[0].defaultSkeleton).toBe(library[0].defaultSkeleton);
  });
});
