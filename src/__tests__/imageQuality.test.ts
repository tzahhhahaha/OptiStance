import { describe, expect, it } from 'vitest';
import { analyzeImagePixels } from '../app/utils/imageQuality';

describe('Image Quality & Blur Detection', () => {
  it('detects a completely blurry/flat image', () => {
    const width = 20;
    const height = 20;
    // Flat gray image (zero edge variance)
    const pixels = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = 120;     // R
      pixels[i + 1] = 120; // G
      pixels[i + 2] = 120; // B
      pixels[i + 3] = 255; // A
    }

    const report = analyzeImagePixels(pixels, width, height);
    expect(report.isBlurry).toBe(true);
    expect(report.sharpness).toBe('blurry');
    expect(report.feedbackTips.some((tip) => tip.includes('blurry'))).toBe(true);
  });

  it('detects sharp high-frequency edges in a high-contrast pattern', () => {
    const width = 20;
    const height = 20;
    const pixels = new Uint8ClampedArray(width * height * 4);
    // Checkerboard pattern with high contrast edges
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const val = (x + y) % 2 === 0 ? 255 : 0;
        pixels[idx] = val;
        pixels[idx + 1] = val;
        pixels[idx + 2] = val;
        pixels[idx + 3] = 255;
      }
    }

    const report = analyzeImagePixels(pixels, width, height);
    expect(report.isBlurry).toBe(false);
    expect(report.sharpness).toBe('sharp');
    expect(report.variance).toBeGreaterThan(200);
  });

  it('detects underexposed / dark images', () => {
    const width = 10;
    const height = 10;
    const pixels = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = 20;     // R
      pixels[i + 1] = 20; // G
      pixels[i + 2] = 20; // B
      pixels[i + 3] = 255;
    }

    const report = analyzeImagePixels(pixels, width, height);
    expect(report.lighting).toBe('low');
    expect(report.feedbackTips.some((tip) => tip.includes('dark'))).toBe(true);
  });

  it('detects overexposed / bright images', () => {
    const width = 10;
    const height = 10;
    const pixels = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = 245;
      pixels[i + 1] = 245;
      pixels[i + 2] = 245;
      pixels[i + 3] = 255;
    }

    const report = analyzeImagePixels(pixels, width, height);
    expect(report.lighting).toBe('overexposed');
  });
});
