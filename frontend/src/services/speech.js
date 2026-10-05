export const missionReadAloudText = 'Ready to sparkle? Today you have three fun missions. Match five colours, find three emotions, and practice saying hello.';

export function speechSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance !== 'undefined';
}

export function stopSpeaking() {
  if (speechSupported()) {
    window.speechSynthesis.cancel();
  }
}

export function speakText(text, options = {}) {
  if (!speechSupported() || !text) {
    return { started: false, reason: 'unsupported' };
  }

  stopSpeaking();
  const utterance = new window.SpeechSynthesisUtterance(text);
  utterance.rate = options.rate || 1;
  utterance.pitch = options.pitch || 1.08;
  utterance.lang = options.lang || 'en-US';
  if (typeof options.onEnd === 'function') utterance.onend = options.onEnd;
  if (typeof options.onError === 'function') utterance.onerror = options.onError;
  window.speechSynthesis.speak(utterance);
  return { started: true };
}
