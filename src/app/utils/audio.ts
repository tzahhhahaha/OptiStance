type AudioCue = () => void;
let lastSpokenMessage = '';
let lastSpokenAt = 0;
const SPEECH_DEBOUNCE_MS = 4000;
const activeAudioContexts = new Set<AudioContext>();

/**
 * Clean audio synthesis using Web Audio API with smooth gain envelope (attack/decay)
 * to prevent harsh electronic speaker clicks or distortions on mobile devices.
 */
const safeBeep = (frequency: number, durationMs: number, volume = 0.035, type: OscillatorType = 'sine'): AudioCue => () => {
  if (typeof window === 'undefined') return;

  const AudioContextCtor =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return;

  try {
    const context = new AudioContextCtor();
    activeAudioContexts.add(context);
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;

    const now = context.currentTime;
    const durSec = durationMs / 1000;
    const attack = 0.015;

    // Smooth envelope avoids abrupt DC pops on mobile speakers
    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + attack);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + durSec);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.start(now);
    oscillator.stop(now + durSec + 0.05);

    setTimeout(() => {
      activeAudioContexts.delete(context);
      void context.close().catch(() => {});
    }, durationMs + 100);
  } catch {
    // Ignore environments where audio context is blocked
  }
};

export const audioCoach = {
  stop: () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    }

    activeAudioContexts.forEach((context) => {
      activeAudioContexts.delete(context);
      void context.close().catch(() => {});
    });
  },

  /**
   * Speaks coaching feedback cleanly without robotic stutter, mid-word cutoff,
   * or overlapping loops on mobile browsers.
   */
  speakCue: (message: string, enabled = true, force = false) => {
    if (!enabled || !message || typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const trimmed = message.trim();
    if (!trimmed) return;

    const now = Date.now();

    // Prevent flooding the speech engine if the same phrase was just spoken
    // or if a cue was spoken within the debounce window (unless forced).
    if (!force) {
      if (trimmed === lastSpokenMessage && now - lastSpokenAt < 7000) {
        return;
      }
      if (now - lastSpokenAt < SPEECH_DEBOUNCE_MS) {
        return;
      }
      if (window.speechSynthesis.speaking) {
        return;
      }
    }

    const UtteranceCtor =
      window.SpeechSynthesisUtterance ||
      (globalThis as unknown as { SpeechSynthesisUtterance?: typeof SpeechSynthesisUtterance }).SpeechSynthesisUtterance;
    if (!UtteranceCtor) return;

    try {
      // Cancel previous speech safely before starting new one
      window.speechSynthesis.cancel();

      const utterance = new UtteranceCtor(trimmed);
      utterance.lang = 'en-US';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      lastSpokenMessage = trimmed;
      lastSpokenAt = now;

      window.speechSynthesis.speak(utterance);
    } catch {
      // Voice cues are optional when the browser's speech engine is unavailable.
    }
  },

  playSuccessBeep: safeBeep(784, 160, 0.03, 'sine'), // G5 gentle chime
  playWarningBeep: safeBeep(392, 180, 0.025, 'sine'), // G4 subtle alert
  playShutterSound: safeBeep(523, 90, 0.03, 'triangle') // C5 crisp shutter snap
};
