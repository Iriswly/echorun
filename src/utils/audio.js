import { getStorageKey } from "./auth.js";

const AUDIO_ENABLED_KEY = "ECHORUN_AUDIO_ENABLED";
const XFYUN_TTS_URL = "wss://tts-api.xfyun.cn/v2/tts";
const DASHSCOPE_DEFAULT_BASE_URL = import.meta.env.VITE_DASHSCOPE_API_BASE_URL?.trim() || "https://dashscope.aliyuncs.com/api/v1";
const QWEN_VOICE_DESIGN_MODEL = "qwen-voice-design";
const QWEN_TTS_VD_MODEL = "qwen3-tts-vd-2026-01-26";

export const COACH_VOICE_SETTINGS = {
  DREDD: { vcn: "x4_enuk_george_assist", rate: 50, pitch: 45, volume: 70 },
  KIRA: { vcn: "x4_EnUs_Laura_education", rate: 40, pitch: 55, volume: 65 },
  TITAN: { vcn: "x4_enus_gavin_assist", rate: 55, pitch: 48, volume: 75 },
  SPECTER: { vcn: "x4_EnUs_Lindsay_assist", rate: 40, pitch: 50, volume: 65 },
};

const CUSTOM_VOICE_STYLE_MAP = {
  gentle: COACH_VOICE_SETTINGS.KIRA.vcn,
  harsh: COACH_VOICE_SETTINGS.DREDD.vcn,
  hype: COACH_VOICE_SETTINGS.TITAN.vcn,
  analytic: COACH_VOICE_SETTINGS.SPECTER.vcn,
};

let lastError = null;
let speaking = false;
let audioContext = null;
let currentAudio = null;
let activeSocket = null;
const listeners = new Set();
const intentionallyClosedSockets = new Set();
const intentionallyStoppedAudio = new Set();

function hasWindow() {
  return typeof window !== "undefined";
}

function getXfyunConfig() {
  return {
    appId: import.meta.env.VITE_XFYUN_APP_ID?.trim(),
    apiKey: import.meta.env.VITE_XFYUN_API_KEY?.trim(),
    apiSecret: import.meta.env.VITE_XFYUN_API_SECRET?.trim(),
  };
}

function getDashScopeConfig() {
  return {
    apiKey: import.meta.env.VITE_DASHSCOPE_API_KEY?.trim(),
    baseUrl: DASHSCOPE_DEFAULT_BASE_URL.replace(/\/$/, ""),
  };
}

function isXfyunConfigured() {
  const { appId, apiKey, apiSecret } = getXfyunConfig();
  return !!(appId && apiKey && apiSecret);
}

function isDashScopeConfigured() {
  return !!getDashScopeConfig().apiKey;
}

export function isSpeechSupported() {
  return hasWindow() && typeof window.WebSocket !== "undefined" && typeof window.Audio !== "undefined";
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

function inferLanguageType(text) {
  const value = String(text || "");
  if (/[\u4e00-\u9fff]/.test(value)) return "Chinese";
  if (/[ぁ-んァ-ン]/.test(value)) return "Japanese";
  if (/[가-힣]/.test(value)) return "Korean";
  return "English";
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
    throw new Error(data?.message || data?.error?.message || `DASHSCOPE_${response.status}`);
  }

  return data;
}

async function playAudioUrl(audioUrl, options = {}) {
  const { onStart, onEnd, onError, cleanup } = options;
  const audio = new Audio(audioUrl);
  currentAudio = audio;
  const isIntentionalAudioStop = () => intentionallyStoppedAudio.has(audio);

  audio.onplay = () => {
    intentionallyStoppedAudio.delete(audio);
    speaking = true;
    lastError = null;
    onStart?.();
    notifyAudioStatus();
  };

  audio.onended = () => {
    intentionallyStoppedAudio.delete(audio);
    speaking = false;
    cleanup?.();
    if (currentAudio === audio) currentAudio = null;
    onEnd?.();
    notifyAudioStatus();
  };

  audio.onerror = () => {
    const intentional = isIntentionalAudioStop();
    intentionallyStoppedAudio.delete(audio);
    speaking = false;
    cleanup?.();
    if (currentAudio === audio) currentAudio = null;
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
    return true;
  } catch (error) {
    const intentional = isIntentionalAudioStop();
    cleanup?.();
    intentionallyStoppedAudio.delete(audio);
    speaking = false;
    if (currentAudio === audio) currentAudio = null;
    if (intentional) {
      lastError = null;
      onEnd?.();
      notifyAudioStatus();
      return false;
    }
    const message = error instanceof Error ? error.message : "Audio playback failed.";
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

export function subscribeAudioStatus(listener) {
  listeners.add(listener);
  listener(getAudioStatus());
  return () => listeners.delete(listener);
}

export function setAudioEnabled(enabled) {
  if (!hasWindow()) return;
  localStorage.setItem(getStorageKey(AUDIO_ENABLED_KEY), enabled ? "true" : "false");
  if (!enabled) stopSpeech();
  notifyAudioStatus();
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

function stopCurrentAudioElement() {
  if (!currentAudio) return;
  intentionallyStoppedAudio.add(currentAudio);
  currentAudio.pause();
  currentAudio.removeAttribute("src");
  currentAudio.load();
  currentAudio.src = "";
  currentAudio = null;
}

function stopCurrentSocket() {
  if (!activeSocket) return;
  try {
    intentionallyClosedSockets.add(activeSocket);
    activeSocket.close();
  } catch {}
  activeSocket = null;
}

export function stopSpeech() {
  lastError = null;
  speaking = false;
  stopCurrentSocket();
  stopCurrentAudioElement();
  notifyAudioStatus();
}

function stringToUint8Array(input) {
  return new TextEncoder().encode(input);
}

function toBase64(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function hmacSha256Base64(secret, content) {
  const key = await crypto.subtle.importKey(
    "raw",
    stringToUint8Array(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, stringToUint8Array(content));
  return toBase64(new Uint8Array(signature));
}

async function buildAuthorizedUrl() {
  const { apiKey, apiSecret } = getXfyunConfig();
  const host = "tts-api.xfyun.cn";
  const date = new Date().toUTCString();
  const requestLine = "GET /v2/tts HTTP/1.1";
  const signatureOrigin = `host: ${host}\ndate: ${date}\n${requestLine}`;
  const signature = await hmacSha256Base64(apiSecret, signatureOrigin);
  const authorizationOrigin = `api_key="${apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
  const authorization = btoa(authorizationOrigin);
  return `${XFYUN_TTS_URL}?authorization=${encodeURIComponent(authorization)}&date=${encodeURIComponent(date)}&host=${host}`;
}

function concatUint8Arrays(chunks) {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;
  chunks.forEach((chunk) => {
    merged.set(chunk, offset);
    offset += chunk.length;
  });
  return merged;
}

function decodeBase64Chunk(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function resolveVoiceProfile(coachAlias, options = {}) {
  const stored = readStoredCoachConfig();
  if (options.ttsVcn) {
    return {
      vcn: options.ttsVcn,
      rate: options.rate ?? 40,
      pitch: options.pitch ?? 50,
      volume: options.volume ?? 70,
    };
  }

  if (coachAlias === "CUSTOM" && stored?.ttsVcn) {
    return {
      vcn: stored.ttsVcn,
      rate: options.rate ?? 40,
      pitch: options.pitch ?? 50,
      volume: options.volume ?? 70,
    };
  }

  if (coachAlias === "CUSTOM" && stored?.alias === "CUSTOM" && stored?.voiceStyle && CUSTOM_VOICE_STYLE_MAP[stored.voiceStyle]) {
    return {
      vcn: CUSTOM_VOICE_STYLE_MAP[stored.voiceStyle],
      rate: 38,
      pitch: 50,
      volume: 70,
    };
  }

  return COACH_VOICE_SETTINGS[coachAlias] ?? COACH_VOICE_SETTINGS.DREDD;
}

async function requestSpeechAudio(text, voiceProfile) {
  const url = await buildAuthorizedUrl();

  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    activeSocket = socket;
    const audioChunks = [];
    let settled = false;
    const isIntentionalClose = () => intentionallyClosedSockets.has(socket);

    socket.onopen = () => {
      socket.send(JSON.stringify({
        common: { app_id: getXfyunConfig().appId },
        business: {
          aue: "lame",
          auf: "audio/L16;rate=16000",
          vcn: voiceProfile.vcn,
          speed: voiceProfile.rate,
          pitch: voiceProfile.pitch,
          volume: voiceProfile.volume,
          sfl: 1,
        },
        data: {
          status: 2,
          text: btoa(unescape(encodeURIComponent(text))),
        },
      }));
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.code !== 0) {
          reject(new Error(payload.message || `XFYUN_TTS_${payload.code}`));
          socket.close();
          return;
        }

        const chunk = payload?.data?.audio;
        if (chunk) {
          audioChunks.push(decodeBase64Chunk(chunk));
        }

        if (payload?.data?.status === 2) {
          settled = true;
          socket.close();
          resolve(concatUint8Arrays(audioChunks));
        }
      } catch (error) {
        settled = true;
        reject(error);
        socket.close();
      }
    };

    socket.onerror = () => {
      if (isIntentionalClose()) return;
      settled = true;
      reject(new Error("Failed to connect to XFYUN TTS."));
    };

    socket.onclose = () => {
      const intentional = isIntentionalClose();
      intentionallyClosedSockets.delete(socket);
      if (activeSocket === socket) {
        activeSocket = null;
      }
      if (intentional) {
        settled = true;
        return;
      }
      if (!settled && audioChunks.length === 0) {
        reject(new Error("XFYUN TTS request was interrupted."));
      }
    };
  });
}

async function requestDashScopeVoiceDesign({ voicePrompt, preferredName, previewText, targetModel = QWEN_TTS_VD_MODEL }) {
  const response = await requestDashScopeJson("/services/audio/tts/customization", {
    model: QWEN_VOICE_DESIGN_MODEL,
    input: {
      action: "create",
      target_model: targetModel,
      voice_prompt: voicePrompt,
      preview_text: previewText || inferPreviewText(voicePrompt),
      preferred_name: preferredName || "EchoRun Custom Voice",
    },
    parameters: {
      sample_rate: 24000,
      response_format: "wav",
    },
  });

  const output = response?.output ?? {};
  const previewAudio = output.preview_audio ?? {};
  return {
    voiceName: output.voice || output.voice_name || "",
    targetModel: output.target_model || targetModel,
    previewText: previewText || inferPreviewText(voicePrompt),
    previewAudioData: previewAudio.data || output.data || "",
    responseFormat: previewAudio.response_format || output.response_format || "wav",
    sampleRate: previewAudio.sample_rate || output.sample_rate || 24000,
  };
}

async function requestDashScopeSynthesis(text, voiceName, options = {}) {
  const response = await requestDashScopeJson("/services/aigc/multimodal-generation/generation", {
    model: options.model || QWEN_TTS_VD_MODEL,
    input: {
      text,
      voice: voiceName,
      language_type: options.languageType || inferLanguageType(text),
    },
  });

  const output = response?.output ?? {};
  const audio = output.audio ?? {};
  return {
    audioUrl: audio.url || "",
    audioData: audio.data || "",
    responseFormat: audio.response_format || output.response_format || "",
  };
}

export async function designCustomVoice({ voicePrompt, preferredName, previewText, targetModel }) {
  return requestDashScopeVoiceDesign({ voicePrompt, preferredName, previewText, targetModel });
}

export async function synthesizeCustomVoice(text, voiceName, options = {}) {
  return requestDashScopeSynthesis(text, voiceName, options);
}

export async function playCustomVoicePreview(previewAudioData, responseFormat = "wav", options = {}) {
  if (!previewAudioData) return false;
  if (!isAudioEnabled()) {
    options.onEnd?.();
    return false;
  }
  return playAudioBytes(base64ToUint8Array(previewAudioData), inferMimeType(responseFormat), options);
}

export async function speakMessage(text, options = {}) {
  const { coachAlias = "DREDD", interrupt = true, onStart, onEnd, onError } = options;
  const stored = readStoredCoachConfig();
  const shouldUseCustomDashScopeVoice =
    !!stored?.customVoiceName && (coachAlias === "CUSTOM" || stored?.alias === "CUSTOM");

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
    if (interrupt) stopSpeech();

    if (shouldUseCustomDashScopeVoice) {
      if (!isDashScopeConfigured()) {
        lastError = "DASHSCOPE_API_KEY is missing.";
        onError?.(lastError);
        notifyAudioStatus();
        return false;
      }

      const synthesis = await requestDashScopeSynthesis(text, stored.customVoiceName, {
        model: stored.customTtsModel || QWEN_TTS_VD_MODEL,
      });

      if (synthesis.audioUrl) {
        return playAudioUrl(synthesis.audioUrl, { onStart, onEnd, onError });
      }

      if (synthesis.audioData) {
        return playAudioBytes(base64ToUint8Array(synthesis.audioData), inferMimeType(synthesis.responseFormat), {
          onStart,
          onEnd,
          onError,
        });
      }

      throw new Error("DASHSCOPE_AUDIO_EMPTY");
    }

    if (!isXfyunConfigured()) {
      lastError = "XFYUN TTS credentials are missing.";
      onError?.(lastError);
      notifyAudioStatus();
      return false;
    }

    const voiceProfile = resolveVoiceProfile(coachAlias, options);
    const audioBytes = await requestSpeechAudio(text, voiceProfile);
    return playAudioBytes(audioBytes, "audio/mpeg", { onStart, onEnd, onError });
  } catch (error) {
    speaking = false;
    const message = error instanceof Error ? error.message : shouldUseCustomDashScopeVoice ? "DASHSCOPE TTS failed." : "XFYUN TTS failed.";
    const isExpectedInterrupt =
      message === "XFYUN TTS request was interrupted." ||
      message === "The play() request was interrupted by a call to pause()." ||
      (error instanceof DOMException && error.name === "AbortError");
    if (isExpectedInterrupt) {
      lastError = null;
      onEnd?.();
      notifyAudioStatus();
      return false;
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
