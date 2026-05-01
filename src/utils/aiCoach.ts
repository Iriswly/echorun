import { getCoachMessage } from "./coachMessages.js";
import { getStorageKey } from "./auth.js";

type CoachAlias = "DREDD" | "KIRA" | "TITAN" | "SPECTER";
type RunMode = "standard" | "ghost";
type EventName =
  | "ahead_50"
  | "ahead_100"
  | "ahead_200"
  | "behind_50"
  | "behind_100"
  | "behind_200"
  | "new_lead"
  | "lost_lead"
  | "distance_500m"
  | "distance_1km"
  | "distance_2km"
  | "time_5min"
  | "time_10min";

type CoachRequestContext = {
  coachAlias: CoachAlias | string;
  event: EventName;
  mode: RunMode;
  elapsed: number;
  distance: number;
  pace: number;
  gap?: number;
  ghostName?: string;
};

type CustomPersonaInput = {
  coachAlias: CoachAlias | string;
  coachName: string;
  baseStyle: string;
  userRequest: string;
};

type VoiceStyle = "gentle" | "harsh" | "hype" | "analytic";

const DEEPSEEK_ENDPOINT = "https://api.deepseek.com/chat/completions";
const COACH_STORAGE_KEY = "ECHORUN_COACH";
const GLOBAL_COOLDOWN_MS = 18000;
const EVENT_COOLDOWN_MS: Record<EventName, number> = {
  ahead_50: 45000,
  ahead_100: 45000,
  ahead_200: 60000,
  behind_50: 45000,
  behind_100: 45000,
  behind_200: 60000,
  new_lead: 30000,
  lost_lead: 30000,
  distance_500m: 0,
  distance_1km: 0,
  distance_2km: 0,
  time_5min: 0,
  time_10min: 0,
};

const personaPrompts: Record<string, string> = {
  DREDD: [
    "You are DREDD, a hard-edged running coach inside EchoRun.",
    "Tone: sharp, sarcastic, intimidating, confrontational, but still useful.",
    "Use hard-edged taunts, mock comfort, and challenge weakness directly.",
    "Never sound gentle, reflective, or nurturing.",
    "When the runner falls behind, insult the mistake briefly and give one hard correction.",
    "Preferred texture: sneer, pressure, no sympathy.",
  ].join(" "),
  KIRA: [
    "You are KIRA, a calm mindful running coach inside EchoRun.",
    "Tone: warm, soothing, reassuring, breath-focused, and quietly encouraging.",
    "Speak like a caring guide who notices effort and restores calm confidence.",
    "Use gentle performance guidance, not vague spirituality.",
    "When the runner falls behind, reduce panic and bring them back to breath, rhythm, and trust.",
    "Preferred texture: softness, steadiness, emotional safety.",
  ].join(" "),
  TITAN: [
    "You are TITAN, a high-intensity performance coach inside EchoRun.",
    "Tone: explosive, dominant, loud, adrenaline-heavy, and aggressively motivational.",
    "Sound like a sideline hype coach screaming a comeback into existence.",
    "Use punchy commands, impact words, and momentum language.",
    "When the runner falls behind, frame it as a battle and demand an attack.",
    "Preferred texture: fire, urgency, swagger.",
  ].join(" "),
  SPECTER: [
    "You are SPECTER, a data-driven pacing coach inside EchoRun.",
    "Tone: analytical, efficient, precise, controlled, and emotionally restrained.",
    "Speak like an elite pacing system delivering short tactical updates.",
    "Use measured language, operational framing, and concrete adjustments.",
    "When the runner falls behind, diagnose and prescribe one specific correction.",
    "Preferred texture: telemetry, cadence, split management.",
  ].join(" "),
};

const lifecycleMessages: Record<string, Record<"start_standard" | "start_ghost" | "start_waiting" | "pause" | "resume", string>> = {
  DREDD: {
    start_standard: "Run started. No excuses now. Move.",
    start_ghost: "Ghost run started. Hunt it down.",
    start_waiting: "No GPS yet. Stand still and stop wasting time.",
    pause: "Paused already? Fine. Resume like you mean it.",
    resume: "Back on. Fix your pace and keep moving.",
  },
  KIRA: {
    start_standard: "Your run has started. Settle into a calm rhythm.",
    start_ghost: "Ghost run has started. Breathe and stay with the moment.",
    start_waiting: "Waiting for GPS. Stay still and let the signal settle.",
    pause: "Run paused. Breathe softly and come back when ready.",
    resume: "Welcome back. Reconnect with your stride.",
  },
  TITAN: {
    start_standard: "Run started. Bring the energy now.",
    start_ghost: "Ghost run started. Attack from the first step.",
    start_waiting: "No GPS lock yet. Hold steady and get ready to fire.",
    pause: "Pause is over soon. Come back harder.",
    resume: "Resume. Build momentum and push.",
  },
  SPECTER: {
    start_standard: "Run started. Establish target cadence immediately.",
    start_ghost: "Ghost run started. Compare output and close efficiently.",
    start_waiting: "GPS pending. Hold position for signal stabilization.",
    pause: "Run paused. Maintain control and resume on plan.",
    resume: "Run resumed. Reestablish cadence and pace control.",
  },
};

function hasWindow() {
  return typeof window !== "undefined";
}

function readStoredCoachConfig() {
  if (!hasWindow()) return null;
  try {
    return JSON.parse(localStorage.getItem(getStorageKey(COACH_STORAGE_KEY)) || "{}");
  } catch {
    return null;
  }
}

function getCoachPersonaPrompt(coachAlias: string) {
  const stored = readStoredCoachConfig();
  const basePrompt = personaPrompts[coachAlias] ?? personaPrompts.DREDD;

  if (
    stored?.customPersonaPrompt &&
    (stored?.alias === coachAlias || (stored?.alias === "CUSTOM" && stored?.baseCoachAlias === coachAlias))
  ) {
    return [basePrompt, stored.customPersonaPrompt].join(" ");
  }

  return basePrompt;
}

const eventDescriptions: Record<EventName, string> = {
  ahead_50: "The runner just crossed into a small lead over the ghost.",
  ahead_100: "The runner just crossed into a strong lead over the ghost.",
  ahead_200: "The runner just crossed into a dominant lead over the ghost.",
  behind_50: "The runner just crossed into a small deficit behind the ghost.",
  behind_100: "The runner just crossed into a meaningful deficit behind the ghost.",
  behind_200: "The runner just crossed into a critical deficit behind the ghost.",
  new_lead: "The runner just moved from trailing or even into the lead.",
  lost_lead: "The runner just lost the lead to the ghost.",
  distance_500m: "The runner just passed the 500 meter milestone.",
  distance_1km: "The runner just passed the 1 kilometer milestone.",
  distance_2km: "The runner just passed the 2 kilometer milestone.",
  time_5min: "The run just reached the 5 minute mark.",
  time_10min: "The run just reached the 10 minute mark.",
};

const eventMemory = new Map<string, number>();
let lastAnnouncementAt = 0;
let inFlight = false;

function secondsToPaceText(seconds: number) {
  if (!seconds || !Number.isFinite(seconds) || seconds <= 0) return "unknown";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")} /km`;
}

function metersText(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "n/a";
  const rounded = Math.round(value);
  return rounded > 0 ? `+${rounded}m` : `${rounded}m`;
}

function getApiKey() {
  return import.meta.env.VITE_DEEPSEEK_API_KEY?.trim();
}

function shouldSkipEvent(event: EventName) {
  const now = Date.now();
  const lastForEvent = eventMemory.get(event) ?? 0;
  const eventCooldown = EVENT_COOLDOWN_MS[event] ?? 0;
  if (now - lastAnnouncementAt < GLOBAL_COOLDOWN_MS) return true;
  if (eventCooldown > 0 && now - lastForEvent < eventCooldown) return true;
  return false;
}

function markEvent(event: EventName) {
  const now = Date.now();
  lastAnnouncementAt = now;
  eventMemory.set(event, now);
}

function buildMessages(context: CoachRequestContext) {
  const persona = getCoachPersonaPrompt(context.coachAlias);
  const system = [
    persona,
    "You generate live spoken coaching lines for a running app.",
    "Return plain text only.",
    "Max 18 words.",
    "One or two short sentences.",
    "Do not use quotes, bullet points, markdown, emojis, or hashtags.",
    "Do not say you are an AI.",
    "Do not narrate raw telemetry unless it helps the runner act now.",
    "Do not repeat that the runner is behind unless the event explicitly says so.",
    "Focus only on the newly triggered event, not the whole workout.",
  ].join(" ");

  const user = [
    `Coach alias: ${context.coachAlias}.`,
    `Mode: ${context.mode}.`,
    `Triggered event: ${context.event}.`,
    `Event meaning: ${eventDescriptions[context.event]}.`,
    `Elapsed: ${context.elapsed}s.`,
    `Distance: ${Math.round(context.distance)}m.`,
    `Current pace: ${secondsToPaceText(context.pace)}.`,
    `Gap vs ghost: ${metersText(context.gap)}.`,
    context.ghostName ? `Ghost label: ${context.ghostName}.` : null,
    "Write the next short spoken coaching line now.",
  ]
    .filter(Boolean)
    .join(" ");

  return { system, user };
}

function buildLocalCustomPersona({ coachAlias, coachName, baseStyle, userRequest }: CustomPersonaInput) {
  const basePrompt = personaPrompts[coachAlias] ?? personaPrompts.DREDD;
  const sanitizedRequest = String(userRequest || "").trim();
  const summary = `${coachName}: ${sanitizedRequest}`;
  const prompt = [
    `Adapt this coach to the runner request: ${sanitizedRequest}.`,
    `Keep the original coach identity, especially ${baseStyle}.`,
    "In live coaching, sound personal and specific.",
    "Keep spoken lines short, vivid, and actionable.",
  ].join(" ");

  return {
    summary,
    prompt: [basePrompt, prompt].join(" "),
    voiceStyle: inferVoiceStyle(sanitizedRequest),
  };
}

function inferVoiceStyle(text: string): VoiceStyle {
  const content = String(text || "").toLowerCase();
  if (/(gentle|soft|calm|warm|kind|温柔|平静|治愈|鼓励|陪伴)/.test(content)) return "gentle";
  if (/(strict|harsh|snark|sarcastic|cold|毒舌|严厉|冷酷|强硬)/.test(content)) return "harsh";
  if (/(hype|fire|aggressive|battle|爆发|热血|燃|激情|冲刺)/.test(content)) return "hype";
  if (/(data|analytic|precise|tactical|cadence|数据|分析|节奏|理性|策略)/.test(content)) return "analytic";
  return "gentle";
}

export function voiceStyleToCoachAlias(voiceStyle?: string): CoachAlias {
  if (voiceStyle === "harsh") return "DREDD";
  if (voiceStyle === "hype") return "TITAN";
  if (voiceStyle === "analytic") return "SPECTER";
  return "KIRA";
}

function sanitizeMessage(message: string | null | undefined) {
  if (!message) return null;
  const cleaned = message.replace(/^["'\s]+|["'\s]+$/g, "").replace(/\s+/g, " ").trim();
  return cleaned || null;
}

export async function generateCoachLine(context: CoachRequestContext) {
  if (shouldSkipEvent(context.event)) return null;

  const fallback = getCoachMessage(context.coachAlias, context.event);
  const apiKey = getApiKey();

  if (!apiKey || inFlight) {
    if (fallback) markEvent(context.event);
    return fallback;
  }

  inFlight = true;

  try {
    const { system, user } = buildMessages(context);
    const response = await fetch(DEEPSEEK_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        temperature: 1,
        max_tokens: 60,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!response.ok) {
      if (fallback) markEvent(context.event);
      return fallback;
    }

    const data = await response.json();
    const text = sanitizeMessage(data?.choices?.[0]?.message?.content);
    if (!text) {
      if (fallback) markEvent(context.event);
      return fallback;
    }

    markEvent(context.event);
    return text;
  } catch {
    if (fallback) markEvent(context.event);
    return fallback;
  } finally {
    inFlight = false;
  }
}

export async function generateCustomCoachPersona(input: CustomPersonaInput) {
  const fallback = buildLocalCustomPersona(input);
  const apiKey = getApiKey();

  if (!apiKey) {
    return fallback;
  }

  try {
    const response = await fetch(DEEPSEEK_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        temperature: 1,
        max_tokens: 220,
        messages: [
          {
            role: "system",
            content: [
              "You design custom AI running coach personas for a frontend running app.",
              "Return JSON only.",
              'Schema: {"summary":"string","prompt":"string","voiceStyle":"gentle|harsh|hype|analytic"}.',
              "summary: 8 to 18 Chinese or English words, user-facing, concise.",
              "prompt: 60 to 140 words, instruction text for future live spoken coaching.",
              "voiceStyle: pick the closest one from gentle, harsh, hype, analytic.",
              "The prompt must preserve the base coach identity while adapting to the user request.",
              "The prompt must instruct the coach to speak in short live TTS-friendly lines.",
              "Do not include markdown fences.",
            ].join(" "),
          },
          {
            role: "user",
            content: [
              `Coach alias: ${input.coachAlias}.`,
              `Coach name: ${input.coachName}.`,
              `Base style: ${input.baseStyle}.`,
              `Runner request: ${String(input.userRequest || "").trim()}.`,
              "Generate a custom running coach persona now.",
            ].join(" "),
          },
        ],
      }),
    });

    if (!response.ok) {
      return fallback;
    }

    const data = await response.json();
    const raw = data?.choices?.[0]?.message?.content;
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw);
    const summary = sanitizeMessage(parsed?.summary) ?? fallback.summary;
    const prompt = sanitizeMessage(parsed?.prompt) ?? fallback.prompt;
    const voiceStyle = ["gentle", "harsh", "hype", "analytic"].includes(parsed?.voiceStyle) ? parsed.voiceStyle : fallback.voiceStyle;
    return { summary, prompt, voiceStyle };
  } catch {
    return fallback;
  }
}

export function getCoachLifecycleLine(
  coachAlias: string,
  event: "start_standard" | "start_ghost" | "start_waiting" | "pause" | "resume",
) {
  return lifecycleMessages[coachAlias]?.[event] ?? lifecycleMessages.DREDD[event];
}

export function resetAiCoachSession() {
  eventMemory.clear();
  lastAnnouncementAt = 0;
  inFlight = false;
}

export function getGapBucket(gap: number) {
  if (gap >= 200) return "ahead_200";
  if (gap >= 100) return "ahead_100";
  if (gap >= 50) return "ahead_50";
  if (gap <= -200) return "behind_200";
  if (gap <= -100) return "behind_100";
  if (gap <= -50) return "behind_50";
  return null;
}

export function getLeadState(gap: number) {
  if (gap >= 15) return "ahead";
  if (gap <= -15) return "behind";
  return "even";
}
