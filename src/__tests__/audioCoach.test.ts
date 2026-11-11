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

  it('closes active sound effects on audioCoach.stop()', () => {
    const closeMock = vi.fn(() => Promise.resolve());
    const oscillator = {
      type: 'sine',
      frequency: { value: 0 },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
    const gainNode = {
      gain: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    };
    const context = {
      currentTime: 0,
      destination: {},
      createOscillator: vi.fn(() => oscillator),
      createGain: vi.fn(() => gainNode),
      close: closeMock,
    };
    class MockAudioContext {
      constructor() {
        return context as unknown as MockAudioContext;
      }
    }
    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      value: MockAudioContext,
    });

    audioCoach.playSuccessBeep();
    audioCoach.stop();

    expect(closeMock).toHaveBeenCalled();
  });

  it('plays sounds safely without throwing errors', () => {
    expect(() => {
      audioCoach.playSuccessBeep();
      audioCoach.playWarningBeep();
      audioCoach.playShutterSound();
    }).not.toThrow();
  });
});
