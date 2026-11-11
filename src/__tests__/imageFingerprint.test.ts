import { describe, expect, it } from 'vitest';
import {
  areImageFingerprintsSimilar,
  differenceHashFromGrayscale,
} from '../app/utils/imageFingerprint';

describe('differenceHashFromGrayscale', () => {
  it('creates a 64-bit hash from horizontal pixel comparisons', () => {
    const grayscale = Uint8Array.from({ length: 9 * 8 }, (_, index) => index % 9);

    expect(differenceHashFromGrayscale(grayscale, 9, 8)).toBe('0000000000000000');
  });

  it('rejects image data too small for the hash dimensions', () => {
    expect(() => differenceHashFromGrayscale(new Uint8Array(8 * 8), 8, 8)).toThrow(
      'Image is too small to fingerprint.'
    );
  });
});

describe('areImageFingerprintsSimilar', () => {
  it('accepts equal fingerprints and small differences', () => {
    expect(areImageFingerprintsSimilar('0123456789abcdef', '0123456789abcdef')).toBe(true);
    expect(areImageFingerprintsSimilar('0000000000000000', '000000000000001f')).toBe(true);
  });

  it('rejects fingerprints beyond the Hamming-distance threshold', () => {
    expect(areImageFingerprintsSimilar('0000000000000000', '000000000000003f')).toBe(false);
  });

  it('rejects malformed fingerprints', () => {
    expect(areImageFingerprintsSimilar('not-a-hash', '0000000000000000')).toBe(false);
  });
});
