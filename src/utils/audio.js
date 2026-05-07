import { getStorageKey } from "./auth.js";

const AUDIO_ENABLED_KEY = "ECHORUN_AUDIO_ENABLED";
const DASHSCOPE_DEFAULT_BASE_URL = import.meta.env.VITE_DASHSCOPE_API_BASE_URL?.trim() || "https://dashscope.aliyuncs.com/api/v1";
const COSYVOICE_TTS_MODEL = "cosyvoice-v3-plus";
const COSYVOICE_ENROLLMENT_MODEL = "voice-enrollment";
const SILENT_AUDIO_DATA_URI = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQQAAAAAAA==";

export const COACH_VOICE_SETTINGS = {
  DREDD: { voice: "longanyang", rate: 1.06, pitch: 0.92, volume: 62 },
  KIRA: { voice: "longanhuan", rate: 0.9, pitch: 1.06, volume: 54 },
  TITAN: { voice: "longanyang", rate: 1.14, pitch: 1.0, volume: 70 },
  SPECTER: { voice: "longanhuan", rate: 0.96, pitch: 0.96, volume: 56 },
};

const CUSTOM_VOICE_STYLE_MAP = {
  gentle: COACH_VOICE_SETTINGS.KIRA,
  harsh: COACH_VOICE_SETTINGS.DREDD,
  hype: COACH_VOICE_SETTINGS.TITAN,
  analytic: COACH_VOICE_SETTINGS.SPECTER,
};

let lastError = null;
let speaking = false;
let audioContext = null;
let currentAudio = null;
let currentUtterance = null;
let audioPlaybackUnlocked = false;
let speechRequestToken = 0;
const listeners = new Set();
const intentionallyStoppedAudio = new Set();

function hasWindow() {
  return typeof window !== "undefined";
}

function getDashScopeConfig() {
  return {
    apiKey: import.meta.env.VITE_DASHSCOPE_API_KEY?.trim(),
    baseUrl: DASHSCOPE_DEFAULT_BASE_URL.replace(/\/$/, ""),
  };
}

function isDashScopeConfigured() {
  return !!getDashScopeConfig().apiKey;
}

function resolveTtsModel(options = {}) {
  return String(options.model || options.targetModel || "").trim() || COSYVOICE_TTS_MODEL;
}

export function isSpeechSupported() {
  return hasWindow() && (
    (typeof window.Audio !== "undefined" && typeof window.fetch !== "undefined") ||
    isNativeSpeechSupported()
  );
}

export function isAudioEnabled() {
  if (!hasWindow()) return true;
  return localStorage.getItem(getStorageKey(AUDIO_ENABLED_KEY)) !== "false";
}

function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function inferPreviewText(voicePrompt) {
  return /[\u4e00-\u9fff]/.test(String(voicePrompt || ""))
    ? "这是你的专属教练声音。"
    : "This is your custom coach voice.";
}

function inferMimeType(format) {
  const value = String(format || "").toLowerCase();
  if (value.includes("wav")) return "audio/wav";
  if (value.includes("ogg")) return "audio/ogg";
  return "audio/mpeg";
}

function readStoredCoachConfig() {
  if (!hasWindow()) return {};
  try {
    return JSON.parse(localStorage.getItem(getStorageKey("ECHORUN_COACH")) || "{}");
  } catch {
    return {};
  }
}

function notifyAudioStatus() {
  const status = getAudioStatus();
  listeners.forEach((listener) => listener(status));
}

function isNativeSpeechSupported() {
  return hasWindow() &&
    typeof window.speechSynthesis !== "undefined" &&
    typeof window.SpeechSynthesisUtterance !== "undefined";
}

export function subscribeAudioStatus(listener) {
  listeners.add(listener);
  listener(getAudioStatus());
  return () => listeners.delete(listener);
}

export function setAudioEnabled(enabled) {
  if (!hasWindow()) return;
  localStorage.setItem(getStorageKey(AUDIO_ENABLED_KEY), enabled ? "true" : "false");
  if (enabled) {
    lastError = null;
  }
  if (!enabled) stopSpeech();
  notifyAudioStatus();
}

export function getAudioStatus() {
  return {
    enabled: isAudioEnabled(),
    supported: isSpeechSupported(),
    speaking,
    lastError,
    unlocked: audioPlaybackUnlocked,
  };
}

export function clearAudioError() {
  lastError = null;
  notifyAudioStatus();
}

function beginSpeechRequest(interrupt = true) {
  if (!interrupt) return null;
  stopSpeech();
  return speechRequestToken;
}

function isCurrentSpeechRequest(requestToken) {
  return !requestToken || requestToken === speechRequestToken;
}

function shouldCancelSpeechRequest(requestToken) {
  return !isCurrentSpeechRequest(requestToken) || !isAudioEnabled();
}

function stopAudioElement(audio) {
  if (!audio) return;
  audio._echorunStopped = true;
  intentionallyStoppedAudio.add(audio);
  try {
    audio.pause();
  } catch {
    // Ignore pause failures while force-stopping playback.
  }
  try {
    audio.removeAttribute("src");
    audio.load();
    audio.src = "";
  } catch {
    // Ignore browser-specific cleanup failures.
  }
  audio._echorunCleanup?.();
}

function createAudioCleanup(audio, cleanup) {
  let cleaned = false;
  return () => {
    if (cleaned) return;
    cleaned = true;

    try {
      cleanup?.();
    } catch {
      // Ignore cleanup failures; releasing playback state should continue.
    }

    audio.onplay = null;
    audio.onended = null;
    audio.onerror = null;
    intentionallyStoppedAudio.delete(audio);
    if (currentAudio === audio) currentAudio = null;
  };
}

function stopNativeSpeech() {
  const utterance = currentUtterance;
  currentUtterance = null;
  if (utterance) {
    utterance.onstart = null;
    utterance.onend = null;
    utterance.onerror = null;
  }
  if (isNativeSpeechSupported()) {
    window.speechSynthesis.cancel();
  }
}

export async function unlockAudioPlayback() {
  if (!hasWindow()) return false;

  let unlocked = audioPlaybackUnlocked;
  const context = getAudioContext();

  if (context?.state === "suspended") {
    try {
      await context.resume();
      unlocked = true;
    } catch {
      // Ignore resume failure and try the HTML audio path next.
    }
  } else if (context) {
    unlocked = true;
  }

  if (typeof window.Audio !== "undefined") {
    let probe = null;
    try {
      probe = new Audio(SILENT_AUDIO_DATA_URI);
      probe.muted = true;
      probe.playsInline = true;
      const playPromise = probe.play();
      await Promise.race([
        playPromise,
        new Promise((resolve) => window.setTimeout(resolve, 500)),
      ]);
      probe.pause();
      probe.removeAttribute("src");
      probe.load();
      unlocked = true;
    } catch {
      // Keep graceful fallback behavior if the browser still blocks autoplay.
    } finally {
      try {
        probe?.pause();
        probe?.removeAttribute("src");
        probe?.load();
      } catch {
        // Ignore probe cleanup failures.
      }
    }
  }

  audioPlaybackUnlocked = unlocked;
  notifyAudioStatus();
  return audioPlaybackUnlocked;
}

function stopCurrentAudioElement() {
  if (!currentAudio) return;
  stopAudioElement(currentAudio);
}

export function stopSpeech() {
  speechRequestToken += 1;
  lastError = null;
  speaking = false;
  stopCurrentAudioElement();
  stopNativeSpeech();
  notifyAudioStatus();
}

async function requestDashScopeJson(path, payload) {
  const { apiKey, baseUrl } = getDashScopeConfig();
  if (!apiKey) {
    throw new Error("DASHSCOPE_API_KEY is missing.");
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail =
      data?.message ||
      data?.error?.message ||
      data?.code ||
      (data ? JSON.stringify(data) : "");
    throw new Error(detail || `DASHSCOPE_${response.status}`);
  }

  return data;
}

async function playAudioUrl(audioUrl, options = {}) {
  const { onStart, onEnd, onError, cleanup, requestToken } = options;
  if (shouldCancelSpeechRequest(requestToken)) {
    try {
      cleanup?.();
    } catch {
      // Ignore cleanup failures for audio that was canceled before playback.
    }
    return false;
  }

  const audio = new Audio(audioUrl);
  audio._echorunStopped = false;
  currentAudio = audio;
  const isIntentionalAudioStop = () => intentionallyStoppedAudio.has(audio) || audio._echorunStopped === true;
  const cleanupAudio = createAudioCleanup(audio, cleanup);
  audio._echorunCleanup = cleanupAudio;

  audio.onplay = () => {
    if (shouldCancelSpeechRequest(requestToken)) {
      stopAudioElement(audio);
      return;
    }

    intentionallyStoppedAudio.delete(audio);
    speaking = true;
    lastError = null;
    onStart?.();
    notifyAudioStatus();
  };

  audio.onended = () => {
    speaking = false;
    cleanupAudio();
    onEnd?.();
    notifyAudioStatus();
  };

  audio.onerror = () => {
    const intentional = isIntentionalAudioStop();
    speaking = false;
    cleanupAudio();
    if (intentional) {
      lastError = null;
      onEnd?.();
      notifyAudioStatus();
      return;
    }
    lastError = "Audio playback failed.";
    onError?.(lastError);
    notifyAudioStatus();
  };

  try {
    await audio.play();
    if (shouldCancelSpeechRequest(requestToken)) {
      stopAudioElement(audio);
      return false;
    }
    return true;
  } catch (error) {
    const intentional = isIntentionalAudioStop();
    speaking = false;
    cleanupAudio();
    if (intentional) {
      lastError = null;
      onEnd?.();
      notifyAudioStatus();
      return false;
    }
    const rawMessage = error instanceof Error ? error.message : "Audio playback failed.";
    const message = /user gesture/i.test(rawMessage)
      ? "Audio is blocked until you tap the page again."
      : rawMessage;
    lastError = message;
    onError?.(lastError);
    notifyAudioStatus();
    return false;
  }
}

async function playAudioBytes(audioBytes, mimeType = "audio/mpeg", options = {}) {
  const blob = new Blob([audioBytes], { type: mimeType });
  const audioUrl = URL.createObjectURL(blob);
  return playAudioUrl(audioUrl, {
    ...options,
    cleanup: () => URL.revokeObjectURL(audioUrl),
  });
}

export async function playSynthesizedAudio(synthesis, options = {}) {
  const { interrupt = true, ...playOptions } = options;
  if (!synthesis) return false;
  const requestToken = beginSpeechRequest(interrupt);
  if (synthesis.audioUrl) {
    return playAudioUrl(synthesis.audioUrl, { ...playOptions, requestToken });
  }
  if (synthesis.audioData) {
    return playAudioBytes(base64ToUint8Array(synthesis.audioData), inferMimeType(synthesis.responseFormat), {
      ...playOptions,
      requestToken,
    });
  }
  return false;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeInstruction(text) {
  const value = String(text || "").trim();
  return value || undefined;
}

function normalizeVoicePrefix(value) {
  const normalized = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 10);

  return normalized || "echorun";
}

function inferLanguageHints(text) {
  const value = String(text || "");
  const hasChinese = /[\u4e00-\u9fff]/.test(value);
  const hasLatin = /[A-Za-z]/.test(value);
  if (hasChinese && hasLatin) {
    const latinCount = (value.match(/[A-Za-z]/g) || []).length;
    const chineseCount = (value.match(/[\u4e00-\u9fff]/g) || []).length;
    return [latinCount >= chineseCount ? "en" : "zh"];
  }
  if (hasChinese) return ["zh"];
  return ["en"];
}

function normalizeEnglishForTts(text) {
  return String(text || "")
    .replace(/\b([A-Z]{2,8})\b/g, (match) => match.toLowerCase())
    .replace(/\/km\b/gi, " per kilometer")
    .replace(/\bkm\b/gi, " kilometers")
    .replace(/\bm\b/g, " meters")
    .replace(/(\d)\+(\d)/g, "$1 plus $2")
    .replace(/(\d)-(\d)/g, "$1 to $2");
}

function prepareSpeechText(text, voiceProfile) {
  const raw = String(text || "").trim();
  const instruction = String(voiceProfile.instruction || "");
  const shouldPreferEnglish = !/[\u4e00-\u9fff]/.test(raw) && !/[\u4e00-\u9fff]/.test(instruction);
  return shouldPreferEnglish ? normalizeEnglishForTts(raw) : raw;
}

function resolveVoiceProfile(coachAlias, options = {}) {
  const stored = readStoredCoachConfig();

  if (options.voice) {
    return {
      voice: options.voice,
      rate: options.rate ?? 1,
      pitch: options.pitch ?? 1,
      volume: options.volume ?? 50,
      instruction: normalizeInstruction(options.instruction),
    };
  }

  if (coachAlias === "CUSTOM" && stored?.customVoiceName) {
    const baseProfile = CUSTOM_VOICE_STYLE_MAP[stored.voiceStyle] || CUSTOM_VOICE_STYLE_MAP.gentle;
    return {
      voice: stored.customVoiceName,
      rate: baseProfile.rate,
      pitch: baseProfile.pitch,
      volume: baseProfile.volume,
      instruction: normalizeInstruction(stored.customPersonaSummary || baseProfile.instruction),
    };
  }

  if (coachAlias === "CUSTOM" && stored?.alias === "CUSTOM" && stored?.voiceStyle && CUSTOM_VOICE_STYLE_MAP[stored.voiceStyle]) {
    return CUSTOM_VOICE_STYLE_MAP[stored.voiceStyle];
  }

  return COACH_VOICE_SETTINGS[coachAlias] ?? COACH_VOICE_SETTINGS.DREDD;
}

export function getCoachVoiceCacheSignature(coachAlias, options = {}) {
  const voiceProfile = resolveVoiceProfile(coachAlias, options);
  return {
    model: resolveTtsModel(options),
    voiceId: voiceProfile.voice || "default",
  };
}

async function requestSpeechAudio(text, voiceProfile, options = {}) {
  const preparedText = prepareSpeechText(text, voiceProfile);
  const response = await requestDashScopeJson("/services/audio/tts/SpeechSynthesizer", {
    model: resolveTtsModel(options),
    input: {
      text: preparedText,
      voice: voiceProfile.voice,
      format: "mp3",
      sample_rate: 24000,
      rate: clamp(Number(voiceProfile.rate ?? 1), 0.5, 2),
      pitch: clamp(Number(voiceProfile.pitch ?? 1), 0.5, 2),
      volume: clamp(Number(voiceProfile.volume ?? 50), 0, 100),
      instruction: normalizeInstruction(voiceProfile.instruction),
      language_hints: inferLanguageHints(preparedText),
    },
  });

  const output = response?.output ?? {};
  const audio = output.audio ?? {};
  return {
    audioUrl: audio.url || "",
    audioData: audio.data || "",
    responseFormat: audio.response_format || output.response_format || "mp3",
  };
}

export async function synthesizeCoachSpeech(text, coachAlias, options = {}) {
  const voiceProfile = resolveVoiceProfile(coachAlias, options);
  return requestSpeechAudio(text, voiceProfile, options);
}

async function requestDashScopeVoiceDesign({ voicePrompt, preferredName, previewText, targetModel = COSYVOICE_TTS_MODEL }) {
  const resolvedPreviewText = previewText || inferPreviewText(voicePrompt);
  const response = await requestDashScopeJson("/services/audio/tts/customization", {
    model: COSYVOICE_ENROLLMENT_MODEL,
    input: {
      action: "create_voice",
      target_model: targetModel,
      voice_prompt: voicePrompt,
      preview_text: resolvedPreviewText,
      prefix: normalizeVoicePrefix(preferredName || "echorun"),
      language_hints: inferLanguageHints(resolvedPreviewText),
    },
    parameters: {
      sample_rate: 24000,
      response_format: "wav",
    },
  });

  const output = response?.output ?? {};
  const previewAudio = output.preview_audio ?? {};
  return {
    voiceName: output.voice_id || "",
    targetModel: output.target_model || targetModel,
    previewText: resolvedPreviewText,
    previewAudioData: previewAudio.data || output.data || "",
    responseFormat: previewAudio.response_format || output.response_format || "wav",
    sampleRate: previewAudio.sample_rate || output.sample_rate || 24000,
  };
}

async function requestDashScopeSynthesis(text, voiceName, options = {}) {
  const profile = resolveVoiceProfile("CUSTOM", { voice: voiceName, instruction: options.instruction });
  return requestSpeechAudio(text, {
    ...profile,
    voice: voiceName,
    rate: options.rate ?? profile.rate,
    pitch: options.pitch ?? profile.pitch,
    volume: options.volume ?? profile.volume,
    instruction: options.instruction ?? profile.instruction,
  }, { model: options.model });
}

export async function designCustomVoice({ voicePrompt, preferredName, previewText, targetModel }) {
  return requestDashScopeVoiceDesign({ voicePrompt, preferredName, previewText, targetModel });
}

export async function synthesizeCustomVoice(text, voiceName, options = {}) {
  return requestDashScopeSynthesis(text, voiceName, options);
}

export async function playCustomVoicePreview(previewAudioData, responseFormat = "wav", options = {}) {
  const { interrupt = true, ...playOptions } = options;
  if (!previewAudioData) return false;
  if (!isAudioEnabled()) {
    playOptions.onEnd?.();
    return false;
  }
  const requestToken = beginSpeechRequest(interrupt);
  return playAudioBytes(base64ToUint8Array(previewAudioData), inferMimeType(responseFormat), {
    ...playOptions,
    requestToken,
  });
}

function speakNativeMessage(text, options = {}) {
  const { onStart, onEnd, onError, requestToken } = options;
  if (!isNativeSpeechSupported() || !String(text || "").trim()) return false;
  if (shouldCancelSpeechRequest(requestToken)) return false;
  stopNativeSpeech();

  const utterance = new window.SpeechSynthesisUtterance(String(text));
  currentUtterance = utterance;
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = 1;

  utterance.onstart = () => {
    if (shouldCancelSpeechRequest(requestToken)) {
      stopNativeSpeech();
      return;
    }

    speaking = true;
    lastError = null;
    onStart?.();
    notifyAudioStatus();
  };

  utterance.onend = () => {
    speaking = false;
    if (currentUtterance === utterance) currentUtterance = null;
    onEnd?.();
    notifyAudioStatus();
  };

  utterance.onerror = (event) => {
    speaking = false;
    if (currentUtterance === utterance) currentUtterance = null;
    lastError = event?.error ? `Browser speech failed: ${event.error}` : "Browser speech failed.";
    onError?.(lastError);
    notifyAudioStatus();
  };

  window.speechSynthesis.speak(utterance);
  return true;
}

function fallbackToNativeSpeech(text, options = {}) {
  if (shouldCancelSpeechRequest(options.requestToken)) return false;
  const played = speakNativeMessage(text, options);
  if (played) {
    lastError = null;
    notifyAudioStatus();
  }
  return played;
}

export async function speakMessage(text, options = {}) {
  const { coachAlias = "DREDD", interrupt = true, onStart, onEnd, onError, preferStoredCustomVoice = true } = options;
  const stored = readStoredCoachConfig();
  const shouldUseCustomDashScopeVoice =
    !!stored?.customVoiceName && (coachAlias === "CUSTOM" || (preferStoredCustomVoice && stored?.alias === "CUSTOM"));
  let requestToken = null;

  if (!isAudioEnabled()) {
    onEnd?.();
    return false;
  }

  if (!isSpeechSupported()) {
    lastError = "Audio playback is not supported in this browser.";
    onError?.(lastError);
    notifyAudioStatus();
    return false;
  }

  try {
    requestToken = beginSpeechRequest(interrupt);

    if (!isDashScopeConfigured()) {
      if (fallbackToNativeSpeech(text, { onStart, onEnd, onError, requestToken })) {
        return true;
      }
      lastError = "DASHSCOPE_API_KEY is missing.";
      onError?.(lastError);
      notifyAudioStatus();
      return false;
    }

    if (shouldUseCustomDashScopeVoice) {
      const synthesis = await requestDashScopeSynthesis(text, stored.customVoiceName, {
        instruction: stored.customPersonaSummary,
        model: stored.customTtsModel,
      });

      if (shouldCancelSpeechRequest(requestToken)) return false;

      if (synthesis.audioUrl) {
        const played = await playAudioUrl(synthesis.audioUrl, { onStart, onEnd, onError, requestToken });
        if (played || shouldCancelSpeechRequest(requestToken)) return played;
        return fallbackToNativeSpeech(text, { onStart, onEnd, onError, requestToken });
      }

      if (synthesis.audioData) {
        const played = await playAudioBytes(base64ToUint8Array(synthesis.audioData), inferMimeType(synthesis.responseFormat), {
          onStart,
          onEnd,
          onError,
          requestToken,
        });
        if (played || shouldCancelSpeechRequest(requestToken)) return played;
        return fallbackToNativeSpeech(text, { onStart, onEnd, onError, requestToken });
      }

      throw new Error("DASHSCOPE_AUDIO_EMPTY");
    }

    const voiceProfile = resolveVoiceProfile(coachAlias, options);
    const synthesis = await requestSpeechAudio(text, voiceProfile, options);

    if (shouldCancelSpeechRequest(requestToken)) return false;

    if (synthesis.audioUrl) {
      const played = await playAudioUrl(synthesis.audioUrl, { onStart, onEnd, onError, requestToken });
      if (played || shouldCancelSpeechRequest(requestToken)) return played;
      return fallbackToNativeSpeech(text, { onStart, onEnd, onError, requestToken });
    }

    if (synthesis.audioData) {
      const played = await playAudioBytes(base64ToUint8Array(synthesis.audioData), inferMimeType(synthesis.responseFormat), {
        onStart,
        onEnd,
        onError,
        requestToken,
      });
      if (played || shouldCancelSpeechRequest(requestToken)) return played;
      return fallbackToNativeSpeech(text, { onStart, onEnd, onError, requestToken });
    }

    throw new Error("DASHSCOPE_AUDIO_EMPTY");
  } catch (error) {
    if (shouldCancelSpeechRequest(requestToken)) {
      speaking = false;
      notifyAudioStatus();
      return false;
    }

    speaking = false;
    const message = error instanceof Error ? error.message : "DASHSCOPE TTS failed.";
    const isExpectedInterrupt =
      message === "The play() request was interrupted by a call to pause()." ||
      (error instanceof DOMException && error.name === "AbortError");
    if (isExpectedInterrupt) {
      lastError = null;
      onEnd?.();
      notifyAudioStatus();
      return false;
    }
    if (fallbackToNativeSpeech(text, { onStart, onEnd, onError, requestToken })) {
      return true;
    }
    lastError = message;
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
