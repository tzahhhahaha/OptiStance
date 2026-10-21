import { describe, expect, it, vi, beforeEach } from 'vitest';
import { audioCoach } from '../app/utils/audio';

describe('audioCoach utility', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('speaks cue when audio is enabled', () => {
    const cancelMock = vi.fn();
    const speakMock = vi.fn();

    class MockSpeechSynthesisUtterance {
      lang = '';
      rate = 1;
      pitch = 1;
      constructor(public text: string) {}
    }

    // Mock window.speechSynthesis and window.SpeechSynthesisUtterance
    window.speechSynthesis = {
      cancel: cancelMock,
      speak: speakMock,
    } as unknown as SpeechSynthesis;
    (window as unknown as { SpeechSynthesisUtterance: typeof MockSpeechSynthesisUtterance }).SpeechSynthesisUtterance =
      MockSpeechSynthesisUtterance;

    audioCoach.speakCue('Punch arms up at 45 degrees', true);

    expect(cancelMock).toHaveBeenCalled();
    expect(speakMock).toHaveBeenCalled();
  });

  it('does not speak when audio is disabled', () => {
    const cancelMock = vi.fn();
    const speakMock = vi.fn();

    window.speechSynthesis = {
      cancel: cancelMock,
      speak: speakMock,
    } as unknown as SpeechSynthesis;

    audioCoach.speakCue('This should not play', false);

    expect(cancelMock).not.toHaveBeenCalled();
    expect(speakMock).not.toHaveBeenCalled();
  });

  it('stops ongoing speech on audioCoach.stop()', () => {
    const cancelMock = vi.fn();

    window.speechSynthesis = {
      cancel: cancelMock,
      speak: vi.fn(),
    } as unknown as SpeechSynthesis;

    audioCoach.stop();

    expect(cancelMock).toHaveBeenCalled();
  });

  it('plays sounds safely without throwing errors', () => {
    expect(() => {
      audioCoach.playSuccessBeep();
      audioCoach.playWarningBeep();
      audioCoach.playShutterSound();
    }).not.toThrow();
  });
});
