/**
 * OptiStance Jump Apex & Peak Frame Detector
 * Captures the exact peak frame of a jump (e.g. Toe Touch)
 * by tracking hip elevation and maximum hip abduction.
 */

import type { LandmarkPoint } from './angles';

export interface JumpFrameSample {
  timestamp: number;
  landmarks: LandmarkPoint[];
  hipElevation: number; // Inverted Y: higher on screen = higher jump
  hipSpread: number;
}

export class JumpPeakDetector {
  private samples: JumpFrameSample[] = [];
  private isCapturing = false;
  private startTime = 0;
  private maxDurationMs = 2500; // Jump window 2.5 seconds

  start() {
    this.samples = [];
    this.isCapturing = true;
    this.startTime = Date.now();
  }

  addFrame(landmarks: LandmarkPoint[] | undefined | null) {
    if (!this.isCapturing || !landmarks || landmarks.length < 29) return;

    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const leftAnkle = landmarks[27];
    const rightAnkle = landmarks[28];

    if (!leftHip || !rightHip) return;

    // Inverted Y: 1.0 - Y so that higher in air = larger number
    const hipY = (leftHip.y + rightHip.y) / 2;
    const hipElevation = 1.0 - hipY;

    let hipSpread = 0;
    if (leftAnkle && rightAnkle) {
      const dx = leftAnkle.x - rightAnkle.x;
      const dy = leftAnkle.y - rightAnkle.y;
      hipSpread = Math.sqrt(dx * dx + dy * dy);
    }

    this.samples.push({
      timestamp: Date.now(),
      landmarks: landmarks.map((l) => ({ ...l })),
      hipElevation,
      hipSpread,
    });

    if (Date.now() - this.startTime > this.maxDurationMs) {
      this.isCapturing = false;
    }
  }

  /**
   * Evaluates the buffer and returns the apex peak frame.
   * Considers both highest elevation and maximum leg spread.
   */
  getApexFrame(): {
    apexLandmarks: LandmarkPoint[] | null;
    peakElevation: number;
    sampleCount: number;
  } {
    if (this.samples.length === 0) {
      return { apexLandmarks: null, peakElevation: 0, sampleCount: 0 };
    }

    // Score each sample: 70% hip elevation + 30% hip spread
    let bestSample = this.samples[0];
    let maxCombinedScore = -Infinity;

    for (const sample of this.samples) {
      const score = sample.hipElevation * 0.7 + sample.hipSpread * 0.3;
      if (score > maxCombinedScore) {
        maxCombinedScore = score;
        bestSample = sample;
      }
    }

    return {
      apexLandmarks: bestSample.landmarks,
      peakElevation: bestSample.hipElevation,
      sampleCount: this.samples.length,
    };
  }

  reset() {
    this.samples = [];
    this.isCapturing = false;
  }
}
