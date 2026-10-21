import { describe, expect, it } from 'vitest';
import { applyAdminPoseImages, getBundledPoseImage } from '../app/utils/poseReferenceImages';
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

  it('ignores expired legacy Google URLs so bundled images are preserved', () => {
    const result = applyAdminPoseImages(library, [
      {
        pose_key: 't-motion',
        reference_image_url: 'https://lh3.googleusercontent.com/aida/AP1WRLtdvgNi1ZVZHfMBMys...',
      },
    ]);

    // Should not overwrite bundled-1 with the dead Google link
    expect(result).toBe(library);
    expect(result[0].imageUrl).toBe('bundled-1');
  });
});

describe('getBundledPoseImage', () => {
  it('resolves all standard library poses including scorpion and low-v by pose_key', () => {
    expect(getBundledPoseImage('t-motion')).toBe('/poses/t-motion.jpg');
    expect(getBundledPoseImage('high-v')).toBe('/poses/high-v.jpg');
    expect(getBundledPoseImage('low-v')).toBe('/poses/low-v.jpg');
    expect(getBundledPoseImage('half-t')).toBe('/poses/half-t.jpg');
    expect(getBundledPoseImage('liberty')).toBe('/poses/liberty.jpg');
    expect(getBundledPoseImage('toe-touch')).toBe('/poses/toe-touch.jpg');
    expect(getBundledPoseImage('arabesque')).toBe('/poses/arabesque.jpg');
    expect(getBundledPoseImage('heel-stretch')).toBe('/poses/heel-stretch.jpg');
    expect(getBundledPoseImage('scorpion')).toBe('/poses/scorpion.jpg');
  });

  it('resolves poses by display name with spaces and capitalization', () => {
    expect(getBundledPoseImage(null, 'T-Motion')).toBe('/poses/t-motion.jpg');
    expect(getBundledPoseImage(null, 'High V')).toBe('/poses/high-v.jpg');
    expect(getBundledPoseImage(null, 'Low V')).toBe('/poses/low-v.jpg');
    expect(getBundledPoseImage(null, 'Toe Touch')).toBe('/poses/toe-touch.jpg');
    expect(getBundledPoseImage(null, 'Heel Stretch')).toBe('/poses/heel-stretch.jpg');
    expect(getBundledPoseImage(null, 'Scorpion')).toBe('/poses/scorpion.jpg');
  });

  it('returns undefined for unknown stunts', () => {
    expect(getBundledPoseImage('custom-routine')).toBeUndefined();
    expect(getBundledPoseImage(null, 'Random Nonexistent Stunt')).toBeUndefined();
  });
});
