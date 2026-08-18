type AudioCue = () => void;

const safeBeep = (frequency: number, durationMs: number, volume = 0.04): AudioCue => () => {
  if (typeof window === 'undefined') return;

  const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return;

  try {
    const context = new AudioContextCtor();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gainNode.gain.value = volume;

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.start();
    setTimeout(() => {
      oscillator.stop();
      void context.close();
    }, durationMs);
  } catch {
    // Ignore browsers that block audio until user interaction.
  }
};

export const audioCoach = {
  stop: () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
  },
  speakCue: (message: string, enabled = true) => {
    if (!enabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = 'en-US';
    utterance.rate = 1;
    utterance.pitch = 1;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  },
  playSuccessBeep: safeBeep(880, 180),
  playWarningBeep: safeBeep(420, 220),
  playShutterSound: safeBeep(660, 120, 0.035)
};
