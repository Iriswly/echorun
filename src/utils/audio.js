const AUDIO_ENABLED_KEY = "ECHORUN_AUDIO_ENABLED";

export const COACH_VOICE_SETTINGS = {
  DREDD: { rate: 1.05, pitch: 0.75, volume: 1 },
  KIRA: { rate: 0.85, pitch: 1.05, volume: 0.9 },
  TITAN: { rate: 1.15, pitch: 0.8, volume: 1 },
  SPECTER: { rate: 0.95, pitch: 0.9, volume: 1 },
};

let lastError = null;
let speaking = false;
let audioContext = null;
const listeners = new Set();

function hasWindow() {
  return typeof window !== "undefined";
}

export function isSpeechSupported() {
  return hasWindow() && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

export function isAudioEnabled() {
  if (!hasWindow()) return true;
  return localStorage.getItem(AUDIO_ENABLED_KEY) !== "false";
}

function notifyAudioStatus() {
  const status = getAudioStatus();
  listeners.forEach((listener) => listener(status));
}

export function subscribeAudioStatus(listener) {
  listeners.add(listener);
  listener(getAudioStatus());
  return () => listeners.delete(listener);
}

export function setAudioEnabled(enabled) {
  if (!hasWindow()) return;
  localStorage.setItem(AUDIO_ENABLED_KEY, enabled ? "true" : "false");
  if (!enabled) stopSpeech();
  notifyAudioStatus();
}

export function toggleAudioEnabled() {
  const next = !isAudioEnabled();
  setAudioEnabled(next);
  return next;
}

export function getAudioStatus() {
  return {
    enabled: isAudioEnabled(),
    supported: isSpeechSupported(),
    speaking,
    lastError,
  };
}

export function clearAudioError() {
  lastError = null;
  notifyAudioStatus();
}

export function stopSpeech() {
  if (!isSpeechSupported()) return;
  window.speechSynthesis.cancel();
  speaking = false;
  notifyAudioStatus();
}

export function getEnglishVoice() {
  return new Promise((resolve) => {
    if (!isSpeechSupported()) {
      resolve(null);
      return;
    }

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices.find((voice) => voice.lang.startsWith("en")) ?? null);
      return;
    }

    const onVoicesChanged = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", onVoicesChanged);
      const loaded = window.speechSynthesis.getVoices();
      resolve(loaded.find((voice) => voice.lang.startsWith("en")) ?? null);
    };

    window.speechSynthesis.addEventListener("voiceschanged", onVoicesChanged);
    window.setTimeout(() => {
      window.speechSynthesis.removeEventListener("voiceschanged", onVoicesChanged);
      resolve(null);
    }, 1000);
  });
}

export async function speakMessage(text, options = {}) {
  const { coachAlias = "DREDD", interrupt = true, onStart, onEnd, onError } = options;

  if (!isAudioEnabled()) {
    onEnd?.();
    return false;
  }

  if (!isSpeechSupported()) {
    lastError = "Voice synthesis is not supported in this browser.";
    onError?.(lastError);
    notifyAudioStatus();
    return false;
  }

  try {
    if (interrupt) window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const settings = COACH_VOICE_SETTINGS[coachAlias] ?? COACH_VOICE_SETTINGS.DREDD;
    utterance.rate = settings.rate;
    utterance.pitch = settings.pitch;
    utterance.volume = settings.volume;

    const englishVoice = await getEnglishVoice();
    if (englishVoice) utterance.voice = englishVoice;

    utterance.onstart = () => {
      speaking = true;
      lastError = null;
      onStart?.();
      notifyAudioStatus();
    };
    utterance.onend = () => {
      speaking = false;
      onEnd?.();
      notifyAudioStatus();
    };
    utterance.onerror = (event) => {
      speaking = false;
      lastError = event.error || "Voice playback failed.";
      onError?.(lastError);
      notifyAudioStatus();
    };

    window.speechSynthesis.speak(utterance);
    return true;
  } catch (error) {
    speaking = false;
    lastError = error instanceof Error ? error.message : "Voice playback failed.";
    onError?.(lastError);
    notifyAudioStatus();
    return false;
  }
}

function getAudioContext() {
  if (!hasWindow()) return null;
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) return null;
  if (!audioContext) audioContext = new AudioContextCtor();
  return audioContext;
}

function playTone({ frequency, startTime, duration, type = "sine", gain = 0.035 }) {
  const context = getAudioContext();
  if (!context || !isAudioEnabled()) return;

  const oscillator = context.createOscillator();
  const gainNode = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);
  gainNode.gain.setValueAtTime(0.0001, startTime);
  gainNode.gain.exponentialRampToValueAtTime(gain, startTime + 0.015);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  oscillator.connect(gainNode);
  gainNode.connect(context.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.02);
}

export function playSoundEffect(name) {
  const context = getAudioContext();
  if (!context || !isAudioEnabled()) return;

  if (context.state === "suspended") {
    context.resume().catch(() => {});
  }

  const now = context.currentTime;
  const patterns = {
    start: [
      { frequency: 523, startTime: now, duration: 0.09 },
      { frequency: 659, startTime: now + 0.09, duration: 0.12 },
    ],
    pause: [{ frequency: 330, startTime: now, duration: 0.12, type: "triangle" }],
    resume: [
      { frequency: 440, startTime: now, duration: 0.08 },
      { frequency: 587, startTime: now + 0.08, duration: 0.1 },
    ],
    finish: [
      { frequency: 523, startTime: now, duration: 0.08 },
      { frequency: 659, startTime: now + 0.08, duration: 0.08 },
      { frequency: 784, startTime: now + 0.16, duration: 0.16 },
    ],
    badge: [
      { frequency: 784, startTime: now, duration: 0.07 },
      { frequency: 988, startTime: now + 0.08, duration: 0.13 },
    ],
  };

  (patterns[name] || []).forEach(playTone);
}
