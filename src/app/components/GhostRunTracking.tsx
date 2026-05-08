import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Pause, Play, Square, Trophy, Volume2, VolumeX } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { calculateRunPoints } from "../../utils/scoring.js";
import { evaluateBadges, ALL_BADGES } from "../../utils/badges.js";
import { updateProfileAfterRun, getProfile } from "../../utils/profile.js";
import { saveRunRecord } from "../../utils/storage.js";
import { getCoachMessage, resetCoachSession } from "../../utils/coachMessages.js";
import { generateCoachLine, generateLifecycleLine, getGapBucket, getLeadState, resetAiCoachSession } from "../../utils/aiCoach";
import { getStorageKey } from "../../utils/auth.js";
import { getAudioStatus, playSoundEffect, setAudioEnabled, speakMessage, stopSpeech, subscribeAudioStatus, unlockAudioPlayback } from "../../utils/audio.js";
import { RUN_STOP_REQUEST_EVENT, setActiveRunStatus } from "../../utils/runSession";
import { LiveRunMap } from "./LiveRunMap";

type LngLatTuple = [number, number];
type DistancePoint = { t: number; d: number };
type PositionSource = "amap" | "browser";
type GpsQuality = "excellent" | "good" | "fair" | "weak" | "poor";
type TrackingDebugStatus = "standby" | "buffering" | "accepted" | "rejected";
type TrackingDebugInfo = {
  accuracy: number | null;
  segmentDistance: number | null;
  speedMps: number | null;
  minTrackedSegmentMeters: number | null;
  bufferDistance: number | null;
  addedDistance: number | null;
  gpsQuality: GpsQuality;
  source: PositionSource | null;
  status: TrackingDebugStatus;
  statusReason: string;
  sampleTime: number | null;
};

const MAX_REASONABLE_ACCURACY_METERS = 300;
const MAX_REASONABLE_RUNNING_SPEED_MPS = 12;
const MAX_TRACKED_SEGMENT_METERS = 300;
const MIN_TRACKED_SEGMENT_METERS = 1.5;
const MIN_RAW_SEGMENT_METERS = 0.75;
const MAX_PENDING_BUFFER_AGE_MS = 8000;
const LIVE_PACE_WINDOW_SECONDS = 10;
const STARTUP_COACH_GUARD_MS = 8000;
const MIN_COACH_ANNOUNCEMENT_MS = 3200;
const MAX_COACH_ANNOUNCEMENT_MS = 8500;

function estimateCoachAnnouncementMs(message: string) {
  const words = String(message || "").trim().split(/\s+/).filter(Boolean).length;
  const units = Math.max(words, Math.ceil(String(message || "").length / 8));
  return Math.min(MAX_COACH_ANNOUNCEMENT_MS, Math.max(MIN_COACH_ANNOUNCEMENT_MS, 1200 + units * 360));
}

function ghostStatusText(gap: number): string {
  if (gap > 5) return "You're pulling away from the ghost.";
  if (gap > 0) return "You're slightly ahead. Keep the rhythm.";
  if (gap > -5) return "The ghost is just ahead. You can catch it.";
  return "The ghost is escaping. Time to push.";
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function calculateSegmentDistanceMeters(from: LngLatTuple, to: LngLatTuple) {
  const earthRadius = 6371000;
  const lat1 = toRadians(from[1]);
  const lat2 = toRadians(to[1]);
  const deltaLat = toRadians(to[1] - from[1]);
  const deltaLng = toRadians(to[0] - from[0]);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadius * c;
}

function getGpsQuality(accuracy?: number): GpsQuality {
  if (typeof accuracy !== "number" || !Number.isFinite(accuracy)) return "fair";
  if (accuracy <= 10) return "excellent";
  if (accuracy <= 25) return "good";
  if (accuracy <= 50) return "fair";
  if (accuracy <= 80) return "weak";
  return "poor";
}

function getDistanceAtOrBeforeTime(series: DistancePoint[], targetTime: number) {
  if (!series.length) return 0;
  if (targetTime <= series[0].t) return series[0].d;

  for (let index = 1; index < series.length; index += 1) {
    const previous = series[index - 1];
    const current = series[index];
    if (targetTime === current.t) return current.d;
    if (targetTime < current.t) {
      const span = current.t - previous.t || 1;
      const progress = (targetTime - previous.t) / span;
      return previous.d + (current.d - previous.d) * progress;
    }
  }

  return series[series.length - 1].d;
}

function getDistanceAtTime(series: DistancePoint[] = [], targetTime: number, fallbackDuration = 0, fallbackDistance = 0) {
  if (!series.length) {
    if (fallbackDuration <= 0) return 0;
    return Math.min(fallbackDistance, (targetTime / fallbackDuration) * fallbackDistance);
  }

  if (targetTime <= series[0].t) return series[0].d;

  for (let index = 1; index < series.length; index += 1) {
    const previous = series[index - 1];
    const current = series[index];

    if (targetTime === current.t) return current.d;
    if (targetTime < current.t) {
      const span = current.t - previous.t || 1;
      const progress = (targetTime - previous.t) / span;
      return previous.d + (current.d - previous.d) * progress;
    }
  }

  return series[series.length - 1].d;
}

function getRollingPace(distanceSeries: DistancePoint[], elapsed: number, currentDistance: number, windowSeconds: number) {
  if (elapsed <= 0 || currentDistance <= 0) return 0;

  const safeWindow = Math.max(4, windowSeconds);
  const startTime = Math.max(0, elapsed - safeWindow);
  const startDistance = getDistanceAtOrBeforeTime(distanceSeries, startTime);
  const distanceDelta = currentDistance - startDistance;
  const timeDelta = elapsed - startTime;

  if (distanceDelta >= 20 && timeDelta > 0) {
    return timeDelta / (distanceDelta / 1000);
  }

  return elapsed / (currentDistance / 1000);
}

function ResultCard({
  result,
  finalGap,
  pointsEarned,
  newBadges,
  coachAlias,
  coachColor,
  onSave,
}: {
  result: "win" | "lose" | "tie";
  finalGap: number;
  pointsEarned: number;
  newBadges: string[];
  coachAlias: string;
  coachColor: string;
  onSave: () => void;
}) {
  const cfg = {
    win: { emoji: "W", label: "You beat the ghost!", color: "#10B981", bg: "#F0FDF4", border: "#6EE7B7" },
    lose: { emoji: "L", label: "The ghost beat you.", color: "#F97316", bg: "#FFF7ED", border: "#FDBA74" },
    tie: { emoji: "=", label: "Neck and neck! Almost a tie.", color: "#7C3AED", bg: "#F5F3FF", border: "#C4B5FD" },
  }[result];

  const absFinalGap = Math.abs(Math.round(finalGap));
  const gapLabel =
    result === "win"
      ? `You beat the ghost by ${absFinalGap}m`
      : result === "lose"
        ? `The ghost beat you by ${absFinalGap}m`
        : "Gap within 3m, almost identical.";

  const badgeObjs = newBadges.map((id) => ALL_BADGES.find((badge) => badge.id === id)).filter(Boolean);

  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="absolute inset-0 z-30 flex flex-col items-center justify-center overflow-y-auto px-4 sm:px-5" style={{ background: "rgba(247,248,250,0.97)", paddingTop: "24px", paddingBottom: "24px" }}>
      <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 20 }} className="text-5xl mb-3">
        {cfg.emoji}
      </motion.div>
      <div style={{ fontSize: "22px", fontWeight: 800, color: cfg.color, fontFamily: "'Archivo Black', sans-serif", letterSpacing: "-0.02em", marginBottom: "4px" }}>
        {cfg.label}
      </div>
      <div style={{ fontSize: "13px", color: "#6B7280", marginBottom: "20px" }}>{gapLabel}</div>

      <div className="w-full rounded-2xl p-4 mb-4" style={{ background: cfg.bg, border: `1.5px solid ${cfg.border}`, maxWidth: "100%" }}>
        <div className="flex items-center justify-between mb-3">
          <span style={{ fontSize: "11px", color: cfg.color, fontWeight: 700, letterSpacing: "0.1em" }}>POINTS EARNED</span>
          <span style={{ fontSize: "28px", fontWeight: 900, color: cfg.color, fontFamily: "'Archivo Black', sans-serif" }}>+{pointsEarned}</span>
        </div>
        {badgeObjs.length > 0 && (
          <div>
            <div style={{ fontSize: "10px", color: "#9CA3AF", fontWeight: 600, letterSpacing: "0.1em", marginBottom: "8px" }}>NEW BADGES</div>
            <div className="flex flex-wrap gap-2">
              {badgeObjs.map((badge) => (
                <div key={badge!.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl" style={{ background: "#FFFFFF", border: `1px solid ${cfg.border}` }}>
                  <span style={{ fontSize: "16px" }}>{badge!.icon}</span>
                  <div>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: "#111827" }}>{badge!.name}</div>
                    <div style={{ fontSize: "9px", color: "#9CA3AF" }}>{badge!.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="w-full p-3 rounded-xl mb-4" style={{ background: "#F9FAFB", border: "1px solid #E5E7EB" }}>
        <div style={{ fontSize: "10px", color: coachColor, fontWeight: 700, letterSpacing: "0.1em", marginBottom: "4px" }}>{coachAlias} SAYS</div>
        <div style={{ fontSize: "12px", color: "#374151", fontStyle: "italic", lineHeight: 1.5 }}>
          {result === "win" && `"Ghost defeated. Strong run."`}
          {result === "lose" && `"The ghost had this one. Go again."`}
          {result === "tie" && `"Almost identical. One more run decides it."`}
        </div>
      </div>

      <button onClick={onSave} className="w-full py-4 rounded-xl flex items-center justify-center gap-2" style={{ background: coachColor, border: "none" }}>
        <Trophy size={16} color="#fff" />
        <span style={{ color: "#fff", fontSize: "15px", fontWeight: 800, letterSpacing: "0.06em", fontFamily: "'Archivo Black', sans-serif" }}>Save & Continue</span>
      </button>
    </motion.div>
  );
}

function StandardResultCard({
  distance,
  elapsed,
  pointsEarned,
  newBadges,
  coachColor,
  onSave,
}: {
  distance: number;
  elapsed: number;
  pointsEarned: number;
  newBadges: string[];
  coachColor: string;
  onSave: () => void;
}) {
  const mins = Math.floor(elapsed / 60);
  const secs = Math.floor(elapsed % 60);
  const paceSecPerKm = distance > 0 ? elapsed / (distance / 1000) : 0;
  const paceMins = Math.floor(paceSecPerKm / 60);
  const paceSecs = Math.floor(paceSecPerKm % 60);
  const badgeObjs = newBadges.map((id) => ALL_BADGES.find((badge) => badge.id === id)).filter(Boolean);

  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="absolute inset-0 z-30 flex flex-col items-center justify-center overflow-y-auto px-4 sm:px-5" style={{ background: "rgba(247,248,250,0.97)", paddingTop: "24px", paddingBottom: "24px" }}>
      <div className="text-5xl mb-3">R</div>
      <div style={{ fontSize: "22px", fontWeight: 800, color: "#2563EB", fontFamily: "'Archivo Black', sans-serif", letterSpacing: "-0.02em", marginBottom: "16px" }}>
        Run Complete!
      </div>
      <div className="w-full rounded-2xl p-4 mb-4" style={{ background: "#EFF6FF", border: "1.5px solid #BFDBFE", maxWidth: "100%" }}>
        <div className="grid grid-cols-3 gap-3 mb-3">
          {[
            { label: "DIST", value: `${(distance / 1000).toFixed(2)}km` },
            { label: "TIME", value: `${mins}:${String(secs).padStart(2, "0")}` },
            { label: "PACE", value: `${paceMins}'${String(paceSecs).padStart(2, "0")}"` },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <div style={{ fontSize: "8px", color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.15em", marginBottom: "2px" }}>{label}</div>
              <div style={{ fontSize: "16px", fontWeight: 900, color: "#111827", fontFamily: "'Archivo Black', sans-serif", letterSpacing: "-0.02em" }}>{value}</div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between pt-3" style={{ borderTop: "1px solid #BFDBFE" }}>
          <span style={{ fontSize: "11px", color: "#2563EB", fontWeight: 700, letterSpacing: "0.1em" }}>POINTS EARNED</span>
          <span style={{ fontSize: "28px", fontWeight: 900, color: "#2563EB", fontFamily: "'Archivo Black', sans-serif" }}>+{pointsEarned}</span>
        </div>
      </div>
      {badgeObjs.length > 0 && (
        <div className="w-full rounded-xl p-3 mb-4" style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}>
          <div style={{ fontSize: "10px", color: "#D97706", fontWeight: 700, letterSpacing: "0.1em", marginBottom: "8px" }}>NEW BADGES</div>
          <div className="flex flex-wrap gap-2">
            {badgeObjs.map((badge) => (
              <div key={badge!.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl" style={{ background: "#FFFFFF", border: "1px solid #FDE68A" }}>
                <span style={{ fontSize: "16px" }}>{badge!.icon}</span>
                <div>
                  <div style={{ fontSize: "10px", fontWeight: 700, color: "#111827" }}>{badge!.name}</div>
                  <div style={{ fontSize: "9px", color: "#9CA3AF" }}>{badge!.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <button onClick={onSave} className="w-full py-4 rounded-xl flex items-center justify-center gap-2" style={{ background: coachColor, border: "none" }}>
        <Trophy size={16} color="#fff" />
        <span style={{ color: "#fff", fontSize: "15px", fontWeight: 800, letterSpacing: "0.06em", fontFamily: "'Archivo Black', sans-serif" }}>Save & Continue</span>
      </button>
    </motion.div>
  );
}

export function GhostRunTracking() {
  const location = useLocation();
  const navigate = useNavigate();

  const ghostRecord: any = location.state?.ghostRecord ?? null;
  const isGhostMode = !!ghostRecord;

  const storedCoach = (() => {
    try {
      return JSON.parse(localStorage.getItem(getStorageKey("ECHORUN_COACH")) || "{}");
    } catch {
      return {};
    }
  })();
  const coachAlias: string = storedCoach.displayAlias || storedCoach.alias || "DREDD";
  const coachVoiceAlias: string = storedCoach.baseCoachAlias || storedCoach.alias || "DREDD";
  const speechCoachAlias: string = storedCoach.alias === "CUSTOM" ? "CUSTOM" : coachVoiceAlias;
  const coachColor: string = storedCoach.color || "#EF4444";
  const coachEmoji: string = storedCoach.emoji || "C";

  const [phase, setPhase] = useState<"idle" | "running" | "paused" | "done">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [displayDistance, setDisplayDistance] = useState(0);
  const [wasBehinDuringRun, setWasBehind] = useState(false);
  const [coachMsg, setCoachMsg] = useState<string | null>(null);
  const [result, setResult] = useState<{ outcome: "win" | "lose" | "tie"; finalGap: number; pointsEarned: number; newBadges: string[] } | null>(null);
  const [standardResult, setStandardResult] = useState<{ pointsEarned: number; newBadges: string[] } | null>(null);
  const [currentPosition, setCurrentPosition] = useState<LngLatTuple | null>(null);
  const [userTrack, setUserTrack] = useState<LngLatTuple[]>([]);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [distanceSeries, setDistanceSeries] = useState<DistancePoint[]>([{ t: 0, d: 0 }]);
  const [audioStatus, setAudioStatus] = useState(getAudioStatus());
  const [, setTrackingDebug] = useState<TrackingDebugInfo>({
    accuracy: null,
    segmentDistance: null,
    speedMps: null,
    minTrackedSegmentMeters: null,
    bufferDistance: null,
    addedDistance: null,
    gpsQuality: "fair",
    source: null,
    status: "standby",
    statusReason: "Waiting for location samples.",
    sampleTime: null,
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const milestoneRef = useRef({ m500: false, m1k: false, m2k: false, t5: false, t10: false });
  const prevGapRef = useRef(0);
  const gapBucketRef = useRef<ReturnType<typeof getGapBucket>>(null);
  const leadStateRef = useRef<ReturnType<typeof getLeadState>>("even");
  const lastTrackedPositionRef = useRef<LngLatTuple | null>(null);
  const lastAcceptedTimestampRef = useRef<number | null>(null);
  const lastRawPositionRef = useRef<LngLatTuple | null>(null);
  const lastRawTimestampRef = useRef<number | null>(null);
  const pendingDistanceRef = useRef(0);
  const pendingStartedAtRef = useRef<number | null>(null);
  const pendingLastPointRef = useRef<LngLatTuple | null>(null);
  const isStartingRef = useRef(false);
  const coachAnnouncementIdRef = useRef(0);
  const coachAnnouncementBusyRef = useRef(false);
  const coachAnnouncementTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressCoachEventsUntilRef = useRef(0);

  const ghostDistance = isGhostMode && ghostRecord ? getDistanceAtTime(ghostRecord.distanceSeries || [], elapsed, ghostRecord.duration, ghostRecord.distance) : 0;
  const gap = distance - ghostDistance;
  const pace = getRollingPace(distanceSeries, elapsed, distance, LIVE_PACE_WINDOW_SECONDS);
  const avgPace = elapsed > 0 && distance > 0 ? elapsed / (distance / 1000) : 0;

  const fmtTime = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
  const fmtDist = (meters: number) => (meters >= 1000 ? `${(meters / 1000).toFixed(2)}km` : `${Math.round(meters)}m`);
  const fmtPace = (seconds: number) => (seconds > 0 ? `${Math.floor(seconds / 60)}'${String(Math.floor(seconds % 60)).padStart(2, "0")}"` : "--'--\"");

  useEffect(() => {
    if (phase === "idle") {
      setDisplayDistance(0);
      return;
    }

    if (phase === "done") {
      setDisplayDistance(distance);
      return;
    }

    if (Math.abs(distance - displayDistance) < 0.2) {
      if (displayDistance !== distance) {
        setDisplayDistance(distance);
      }
      return;
    }

    const animation = window.setTimeout(() => {
      const delta = distance - displayDistance;
      const step = Math.min(Math.max(Math.abs(delta) * 0.22, 0.4), 2.4);
      setDisplayDistance((value) => value + Math.sign(delta) * Math.min(Math.abs(delta), step));
    }, 80);

    return () => window.clearTimeout(animation);
  }, [displayDistance, distance, phase]);

  useEffect(() => {
    const unsubscribe = subscribeAudioStatus(setAudioStatus);
    return () => {
      unsubscribe();
      if (coachAnnouncementTimerRef.current) {
        clearTimeout(coachAnnouncementTimerRef.current);
        coachAnnouncementTimerRef.current = null;
      }
      stopSpeech();
      setActiveRunStatus({ isActive: false });
    };
  }, []);

  useEffect(() => {
    setActiveRunStatus({ isActive: (phase === "running" || phase === "paused") && elapsed > 0 });
  }, [phase, elapsed]);

  const announceCoach = useCallback((message: string, soundEffect?: string) => {
    const canInterrupt = Boolean(soundEffect);
    const isStartupAnnouncement = soundEffect === "start";
    if (!canInterrupt && coachAnnouncementBusyRef.current) return;

    const announcementId = coachAnnouncementIdRef.current + 1;
    coachAnnouncementIdRef.current = announcementId;
    coachAnnouncementBusyRef.current = true;
    let hasShownMessage = false;

    const releaseCurrentAnnouncement = () => {
      if (coachAnnouncementIdRef.current !== announcementId) return;
      coachAnnouncementBusyRef.current = false;
      if (isStartupAnnouncement) {
        suppressCoachEventsUntilRef.current = 0;
      }
      if (coachAnnouncementTimerRef.current) {
        clearTimeout(coachAnnouncementTimerRef.current);
        coachAnnouncementTimerRef.current = null;
      }
    };

    const scheduleRelease = (durationMs = estimateCoachAnnouncementMs(message)) => {
      if (coachAnnouncementTimerRef.current) {
        clearTimeout(coachAnnouncementTimerRef.current);
      }
      coachAnnouncementTimerRef.current = setTimeout(releaseCurrentAnnouncement, durationMs);
    };

    const showCurrentMessage = () => {
      if (coachAnnouncementIdRef.current !== announcementId) return;
      hasShownMessage = true;
      setCoachMsg(message);
    };

    if (soundEffect) playSoundEffect(soundEffect);
    const audioStatusNow = getAudioStatus();
    if (!audioStatusNow.enabled || !audioStatusNow.supported) {
      showCurrentMessage();
      scheduleRelease();
      return;
    }

    void speakMessage(message, {
      coachAlias: speechCoachAlias,
      onStart: showCurrentMessage,
      onEnd: releaseCurrentAnnouncement,
      onError: () => {
        showCurrentMessage();
        scheduleRelease();
      },
    }).then((played) => {
      if (coachAnnouncementIdRef.current !== announcementId) return;
      if (played && !hasShownMessage) {
        showCurrentMessage();
      }
      if (!played) {
        showCurrentMessage();
        scheduleRelease();
        return;
      }
      scheduleRelease(MAX_COACH_ANNOUNCEMENT_MS);
    }).catch(() => {
      showCurrentMessage();
      scheduleRelease();
    });
  }, [coachVoiceAlias]);

  const triggerMsg = useCallback(async (event: Parameters<typeof generateCoachLine>[0]["event"]) => {
    if (coachAnnouncementBusyRef.current) return;
    if (getAudioStatus().speaking) return;
    if (Date.now() < suppressCoachEventsUntilRef.current) return;

    const msg =
      await generateCoachLine({
        coachAlias: coachVoiceAlias,
        event,
        mode: isGhostMode ? "ghost" : "standard",
        elapsed,
        distance,
        pace,
        gap: isGhostMode ? gap : undefined,
        ghostName: ghostRecord?.runnerName || ghostRecord?.title || "Ghost",
      }) ?? getCoachMessage(coachVoiceAlias, event);

    if (Date.now() < suppressCoachEventsUntilRef.current) return;
    if (getAudioStatus().speaking) return;
    if (msg && !coachAnnouncementBusyRef.current) {
      announceCoach(msg);
    }
  }, [announceCoach, coachVoiceAlias, distance, elapsed, gap, ghostRecord?.runnerName, ghostRecord?.title, isGhostMode, pace]);

  useEffect(() => {
    if (phase !== "running") return;

    const milestone = milestoneRef.current;
    if (!milestone.m500 && distance >= 50) {
      milestone.m500 = true;
      triggerMsg("distance_500m");
    }
    if (!milestone.m1k && distance >= 100) {
      milestone.m1k = true;
      triggerMsg("distance_1km");
    }
    if (!milestone.m2k && distance >= 200) {
      milestone.m2k = true;
      triggerMsg("distance_2km");
    }
    if (!milestone.t5 && elapsed >= 30) {
      milestone.t5 = true;
      triggerMsg("time_5min");
    }
    if (!milestone.t10 && elapsed >= 60) {
      milestone.t10 = true;
      triggerMsg("time_10min");
    }

    if (isGhostMode) {
      const previousLeadState = leadStateRef.current;
      const nextLeadState = getLeadState(gap);
      const previousBucket = gapBucketRef.current;
      const nextBucket = getGapBucket(gap);

      if (previousLeadState !== nextLeadState) {
        if (nextLeadState === "ahead" && previousLeadState !== "ahead") triggerMsg("new_lead");
        if (nextLeadState === "behind" && previousLeadState === "ahead") triggerMsg("lost_lead");
        leadStateRef.current = nextLeadState;
      }

      if (nextBucket && nextBucket !== previousBucket) {
        triggerMsg(nextBucket);
        gapBucketRef.current = nextBucket;
      }

      if (!nextBucket) {
        gapBucketRef.current = null;
      }

      if (gap < 0) setWasBehind(true);
      prevGapRef.current = gap;
    }
  }, [distance, elapsed, gap, isGhostMode, phase, triggerMsg]);

  useEffect(() => {
    if (phase !== "running") return;

    setDistanceSeries((series) => {
      const lastPoint = series[series.length - 1];
      if (lastPoint?.t === elapsed) {
        const nextSeries = [...series];
        nextSeries[nextSeries.length - 1] = { t: elapsed, d: distance };
        return nextSeries;
      }
      return [...series, { t: elapsed, d: distance }];
    });
  }, [distance, elapsed, phase]);

  const startTimers = useCallback(() => {
    timerRef.current = setInterval(() => setElapsed((value) => value + 1), 1000);
  }, []);

  const stopTimers = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handlePositionChange = useCallback(({ lng, lat, accuracy, timestamp, source }: { lng: number; lat: number; accuracy?: number; timestamp: number; source: PositionSource }) => {
    const point: LngLatTuple = [lng, lat];
    setCurrentPosition(point);
    const gpsQuality = getGpsQuality(accuracy);

    const updateTrackingDebug = ({
      status,
      statusReason,
      segmentDistance = null,
      speedMps = null,
      minTrackedSegmentMeters = null,
      bufferDistance = null,
      addedDistance = null,
    }: {
      status: TrackingDebugStatus;
      statusReason: string;
      segmentDistance?: number | null;
      speedMps?: number | null;
      minTrackedSegmentMeters?: number | null;
      bufferDistance?: number | null;
      addedDistance?: number | null;
    }) => {
      setTrackingDebug({
        accuracy: typeof accuracy === "number" ? accuracy : null,
        segmentDistance,
        speedMps,
        minTrackedSegmentMeters,
        bufferDistance,
        addedDistance,
        gpsQuality,
        source,
        status,
        statusReason,
        sampleTime: timestamp,
      });
    };

    if (phase !== "running") {
      lastTrackedPositionRef.current = point;
      lastAcceptedTimestampRef.current = timestamp;
      lastRawPositionRef.current = point;
      lastRawTimestampRef.current = timestamp;
      pendingDistanceRef.current = 0;
      pendingStartedAtRef.current = null;
      pendingLastPointRef.current = null;
      updateTrackingDebug({
        status: "standby",
        statusReason: "Standby sample received. Run not started.",
      });
      return;
    }

    if (typeof accuracy === "number" && accuracy > MAX_REASONABLE_ACCURACY_METERS) {
      pendingDistanceRef.current = 0;
      pendingStartedAtRef.current = null;
      pendingLastPointRef.current = null;
      updateTrackingDebug({
        status: "rejected",
        statusReason: `Dropped: accuracy ${Math.round(accuracy)}m > ${MAX_REASONABLE_ACCURACY_METERS}m limit.`,
      });
      return;
    }

    const previousAcceptedPoint = lastTrackedPositionRef.current;
    const previousAcceptedTimestamp = lastAcceptedTimestampRef.current;
    const previousRawPoint = lastRawPositionRef.current;
    const previousRawTimestamp = lastRawTimestampRef.current;

    if (!previousAcceptedPoint) {
      lastTrackedPositionRef.current = point;
      lastAcceptedTimestampRef.current = timestamp;
      lastRawPositionRef.current = point;
      lastRawTimestampRef.current = timestamp;
      setUserTrack([point]);
      updateTrackingDebug({
        status: "accepted",
        statusReason: "Accepted baseline point. Waiting for next movement sample.",
        addedDistance: 0,
        bufferDistance: 0,
      });
      return;
    }

    if (!previousRawPoint) {
      lastRawPositionRef.current = point;
      lastRawTimestampRef.current = timestamp;
      updateTrackingDebug({
        status: "buffering",
        statusReason: "Collecting raw GPS samples.",
        bufferDistance: pendingDistanceRef.current,
      });
      return;
    }

    const rawSegmentDistance = calculateSegmentDistanceMeters(previousRawPoint, point);
    const deltaSeconds = previousRawTimestamp ? Math.max((timestamp - previousRawTimestamp) / 1000, 0.001) : 1;
    const speedMps = rawSegmentDistance / deltaSeconds;
    const minTrackedSegmentMeters = MIN_TRACKED_SEGMENT_METERS;
    const bufferAgeMs = pendingStartedAtRef.current ? timestamp - pendingStartedAtRef.current : 0;

    lastRawPositionRef.current = point;
    lastRawTimestampRef.current = timestamp;

    if (rawSegmentDistance > MAX_TRACKED_SEGMENT_METERS || speedMps > MAX_REASONABLE_RUNNING_SPEED_MPS) {
      pendingDistanceRef.current = 0;
      pendingStartedAtRef.current = null;
      pendingLastPointRef.current = null;
      lastTrackedPositionRef.current = point;
      lastAcceptedTimestampRef.current = timestamp;
      setUserTrack((track) => (track.length === 0 ? [point] : track));
      updateTrackingDebug({
        status: "rejected",
        segmentDistance: rawSegmentDistance,
        speedMps,
        minTrackedSegmentMeters,
        bufferDistance: 0,
        statusReason:
          rawSegmentDistance > MAX_TRACKED_SEGMENT_METERS
            ? `Dropped: segment ${rawSegmentDistance.toFixed(1)}m > ${MAX_TRACKED_SEGMENT_METERS}m limit.`
            : `Dropped: speed ${speedMps.toFixed(2)} m/s > ${MAX_REASONABLE_RUNNING_SPEED_MPS} m/s limit.`,
      });
      return;
    }

    if (!pendingStartedAtRef.current) {
      pendingStartedAtRef.current = timestamp;
    }
    pendingLastPointRef.current = point;
    pendingDistanceRef.current = calculateSegmentDistanceMeters(previousAcceptedPoint, point);

    if (rawSegmentDistance < MIN_RAW_SEGMENT_METERS && pendingDistanceRef.current < minTrackedSegmentMeters && bufferAgeMs < MAX_PENDING_BUFFER_AGE_MS) {
      updateTrackingDebug({
        status: "buffering",
        statusReason: `Buffering: raw movement below noise floor (${MIN_RAW_SEGMENT_METERS.toFixed(2)}m).`,
        segmentDistance: rawSegmentDistance,
        speedMps,
        minTrackedSegmentMeters,
        bufferDistance: pendingDistanceRef.current,
      });
      return;
    }

    if (pendingDistanceRef.current < minTrackedSegmentMeters && bufferAgeMs < MAX_PENDING_BUFFER_AGE_MS) {
      updateTrackingDebug({
        status: "buffering",
        segmentDistance: rawSegmentDistance,
        speedMps,
        minTrackedSegmentMeters,
        bufferDistance: pendingDistanceRef.current,
        statusReason: `Buffering: ${(minTrackedSegmentMeters - pendingDistanceRef.current).toFixed(2)}m more needed before counting.`,
      });
      return;
    }

    const committedDistance = pendingDistanceRef.current;
    const acceptedPoint = pendingLastPointRef.current ?? point;

    lastTrackedPositionRef.current = acceptedPoint;
    lastAcceptedTimestampRef.current = timestamp;
    pendingDistanceRef.current = 0;
    pendingStartedAtRef.current = null;
    pendingLastPointRef.current = null;

    setDistance((value) => value + committedDistance);
    setUserTrack((track) => (track.length === 0 ? [previousAcceptedPoint, acceptedPoint] : [...track, acceptedPoint]));
    updateTrackingDebug({
      status: "accepted",
      segmentDistance: rawSegmentDistance,
      speedMps,
      minTrackedSegmentMeters,
      bufferDistance: 0,
      addedDistance: committedDistance,
      statusReason: "Accepted: buffered movement counted toward distance.",
    });
  }, [phase]);

  const handleStart = async () => {
    if (isStartingRef.current || phase !== "idle") return;
    isStartingRef.current = true;
    let announcedStart = false;

    try {
      await unlockAudioPlayback().catch(() => false);
      stopSpeech();
      setCoachMsg(null);
      coachAnnouncementBusyRef.current = true;
      suppressCoachEventsUntilRef.current = Date.now() + STARTUP_COACH_GUARD_MS;
      resetCoachSession();
      resetAiCoachSession();
      stopTimers();
      milestoneRef.current = { m500: false, m1k: false, m2k: false, t5: false, t10: false };
      prevGapRef.current = 0;
      gapBucketRef.current = null;
      leadStateRef.current = "even";
      setElapsed(0);
      setDistance(0);
      setDisplayDistance(0);
      setWasBehind(false);
      setResult(null);
      setStandardResult(null);
      setDistanceSeries([{ t: 0, d: 0 }]);
      setUserTrack(currentPosition ? [currentPosition] : []);
      setTrackingDebug({
        accuracy: null,
        segmentDistance: null,
        speedMps: null,
        minTrackedSegmentMeters: null,
        bufferDistance: null,
        addedDistance: null,
        gpsQuality: "fair",
        source: null,
        status: "standby",
        statusReason: "Run started. Waiting for movement sample.",
        sampleTime: null,
      });
      lastTrackedPositionRef.current = currentPosition;
      lastAcceptedTimestampRef.current = Date.now();
      lastRawPositionRef.current = currentPosition;
      lastRawTimestampRef.current = Date.now();
      pendingDistanceRef.current = 0;
      pendingStartedAtRef.current = null;
      pendingLastPointRef.current = null;
      setPhase("running");
      startTimers();
      const startEvent = currentPosition
        ? (isGhostMode ? "start_ghost" : "start_standard")
        : "start_waiting";
      const startLine = await generateLifecycleLine(coachVoiceAlias, startEvent);
      announceCoach(startLine, "start");
      announcedStart = true;
    } finally {
      if (!announcedStart) {
        coachAnnouncementBusyRef.current = false;
        suppressCoachEventsUntilRef.current = 0;
      }
      isStartingRef.current = false;
    }
  };

  const handlePause = async () => {
    unlockAudioPlayback().catch(() => {});
    stopSpeech();
    stopTimers();
    setPhase("paused");
    const pauseLine = await generateLifecycleLine(coachVoiceAlias, "pause");
    announceCoach(pauseLine, "pause");
  };

  const handleResume = async () => {
    unlockAudioPlayback().catch(() => {});
    stopSpeech();
    lastTrackedPositionRef.current = currentPosition;
    lastAcceptedTimestampRef.current = Date.now();
    lastRawPositionRef.current = currentPosition;
    lastRawTimestampRef.current = Date.now();
    pendingDistanceRef.current = 0;
    pendingStartedAtRef.current = null;
    pendingLastPointRef.current = null;
    setPhase("running");
    startTimers();
    const resumeLine = await generateLifecycleLine(coachVoiceAlias, "resume");
    announceCoach(resumeLine, "resume");
  };

  const finalizeRun = useCallback(() => {
    stopTimers();
    stopSpeech();
    setPhase("done");

    const profile = getProfile();
    if (isGhostMode) {
      const outcome: "win" | "lose" | "tie" = gap > 3 ? "win" : gap < -3 ? "lose" : "tie";
      const runResult = { mode: "ghost" as const, distance, duration: elapsed, avgPace, finalGap: gap, result: outcome, wasBehinDuringRun };
      const pointsEarned = calculateRunPoints(runResult);
      const newBadges = evaluateBadges(profile, { ...runResult, pointsEarned });
      updateProfileAfterRun({ ...runResult, pointsEarned }, newBadges);
      setResult({ outcome, finalGap: gap, pointsEarned, newBadges });
      playSoundEffect(newBadges.length > 0 ? "badge" : "finish");
      speakMessage(
        outcome === "win"
          ? `Ghost defeated. You earned ${pointsEarned} points.`
          : outcome === "lose"
            ? `Run complete. The ghost won this time. You earned ${pointsEarned} points.`
            : `Run complete. It was almost a tie. You earned ${pointsEarned} points.`,
        { coachAlias: speechCoachAlias },
      );
      return { mode: "ghost" as const, pointsEarned, outcome, finalGap: gap };
    }

    const runResult = { mode: "standard" as const, distance, duration: elapsed, avgPace, finalGap: 0, result: undefined, wasBehinDuringRun: false };
    const pointsEarned = calculateRunPoints(runResult);
    const newBadges = evaluateBadges(profile, { ...runResult, pointsEarned });
    updateProfileAfterRun({ ...runResult, pointsEarned }, newBadges);
    setStandardResult({ pointsEarned, newBadges });
    playSoundEffect(newBadges.length > 0 ? "badge" : "finish");
    speakMessage(`Run complete. You earned ${pointsEarned} points.`, { coachAlias: speechCoachAlias });
    return { mode: "standard" as const, pointsEarned };
  }, [avgPace, coachVoiceAlias, distance, elapsed, gap, isGhostMode, speechCoachAlias, stopTimers, wasBehinDuringRun]);

  const persistRunRecord = useCallback((ghostResult?: { outcome: "win" | "lose" | "tie"; finalGap: number; pointsEarned: number } | null, standardPointsEarned?: number | null) => {
    saveRunRecord({
      mode: isGhostMode ? "ghost" : "standard",
      source: "self",
      runnerName: "You",
      title: isGhostMode ? `Ghost Run vs ${ghostRecord?.runnerName || ghostRecord?.title || "Ghost"}` : "My Run",
      distance: Math.round(distance),
      duration: elapsed,
      avgPace,
      distanceSeries,
      date: new Date().toISOString(),
      coachAlias,
      ...(isGhostMode && ghostResult ? { ghostRecordId: ghostRecord?.id, result: ghostResult.outcome, finalGap: ghostResult.finalGap, pointsEarned: ghostResult.pointsEarned } : {}),
      ...(!isGhostMode && typeof standardPointsEarned === "number" ? { pointsEarned: standardPointsEarned } : {}),
    });
  }, [avgPace, coachAlias, distance, distanceSeries, elapsed, ghostRecord?.id, ghostRecord?.runnerName, ghostRecord?.title, isGhostMode]);

  const handleStop = useCallback(() => {
    unlockAudioPlayback().catch(() => {});
    finalizeRun();
  }, [finalizeRun]);

  const handleSave = () => {
    persistRunRecord(result, standardResult?.pointsEarned ?? null);
    navigate("/dashboard");
  };

  useEffect(() => {
    const handleExternalStop = (event: Event) => {
      if (phase !== "running" && phase !== "paused") return;

      const destination = (event as CustomEvent<{ destination?: string }>).detail?.destination || "/dashboard";
      const finalized = finalizeRun();
      if (finalized.mode === "ghost") {
        persistRunRecord(
          { outcome: finalized.outcome, finalGap: finalized.finalGap, pointsEarned: finalized.pointsEarned },
          null,
        );
      } else {
        persistRunRecord(null, finalized.pointsEarned);
      }
      navigate(destination);
    };

    window.addEventListener(RUN_STOP_REQUEST_EVENT, handleExternalStop);
    return () => window.removeEventListener(RUN_STOP_REQUEST_EVENT, handleExternalStop);
  }, [finalizeRun, navigate, persistRunRecord, phase]);

  const deltaLabel = isGhostMode ? (gap === 0 ? "EVEN" : gap > 0 ? `+${Math.round(gap)}m` : `${Math.round(gap)}m`) : phase === "idle" ? "READY" : "LIVE";
  const deltaColor = isGhostMode ? (gap > 0 ? "#10B981" : gap < 0 ? "#F97316" : "#9CA3AF") : "#2563EB";
  const isLocationBlocking =
    !!locationStatus &&
    locationStatus !== "Locating..." &&
    locationStatus !== "GPS pending. You can start and wait for the lock.";
  const canStart = phase !== "idle" || !isLocationBlocking;
  return (
    <div className="relative flex h-full min-w-0 flex-col overflow-y-auto overflow-x-hidden" style={{ background: "#F7F8FA" }}>
      {phase === "done" && isGhostMode && result && (
        <ResultCard result={result.outcome} finalGap={result.finalGap} pointsEarned={result.pointsEarned} newBadges={result.newBadges} coachAlias={coachAlias} coachColor={coachColor} onSave={handleSave} />
      )}
      {phase === "done" && !isGhostMode && standardResult && (
        <StandardResultCard distance={distance} elapsed={elapsed} pointsEarned={standardResult.pointsEarned} newBadges={standardResult.newBadges} coachColor={coachColor} onSave={handleSave} />
      )}

      <div className="flex-shrink-0 px-4 sm:px-5 pt-10 pb-3 relative z-10" style={{ background: "#FFFFFF", borderBottom: "1px solid #E5E7EB" }}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div style={{ fontSize: "10px", color: coachColor, fontWeight: 700, letterSpacing: "0.2em", marginBottom: "2px" }}>ECHORUN</div>
            <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#111827", letterSpacing: "-0.02em", lineHeight: 1.1, fontFamily: "'Archivo Black', sans-serif" }}>
              {isGhostMode ? "Ghost Run" : "Standard Run"}
            </h1>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            <button
              onClick={() => {
                const nextEnabled = !getAudioStatus().enabled;
                setAudioEnabled(nextEnabled);
                if (nextEnabled) {
                  void unlockAudioPlayback().catch(() => false);
                }
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full active:scale-95"
              style={{ background: audioStatus.enabled ? `${coachColor}12` : "#F3F4F6", border: `1px solid ${audioStatus.enabled ? `${coachColor}30` : "#E5E7EB"}` }}
              aria-label={audioStatus.enabled ? "Mute voice coach" : "Enable voice coach"}
            >
              {audioStatus.enabled ? <Volume2 size={12} color={coachColor} /> : <VolumeX size={12} color="#9CA3AF" />}
              <span style={{ fontSize: "9px", color: audioStatus.enabled ? coachColor : "#9CA3AF", fontWeight: 700, letterSpacing: "0.08em" }}>
                {audioStatus.enabled ? "ON" : "OFF"}
              </span>
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: `${coachColor}12`, border: `1px solid ${coachColor}30` }}>
              <span style={{ fontSize: "14px" }}>{coachEmoji}</span>
              <span style={{ fontSize: "10px", color: coachColor, fontWeight: 700, letterSpacing: "0.08em" }}>{coachAlias}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 relative" style={{ height: "clamp(180px, 30dvh, 240px)", background: "#EFF6FF" }}>
        <LiveRunMap
          phase={phase}
          isGhostMode={isGhostMode}
          deltaLabel={deltaLabel}
          deltaColor={deltaColor}
          gapMeters={gap}
          userDistance={distance}
          ghostDistance={ghostDistance}
          ghostName={ghostRecord?.runnerName || ghostRecord?.title || "Ghost"}
          currentPosition={currentPosition}
          userTrack={userTrack}
          onPositionChange={handlePositionChange}
          onLocationStatusChange={setLocationStatus}
        />
      </div>

      <div className="flex-shrink-0 px-3 sm:px-4 py-3 grid grid-cols-3 gap-2">
        {[
          { label: "TIME", value: fmtTime(elapsed) },
          { label: "DIST", value: fmtDist(displayDistance) },
          { label: "PACE", value: fmtPace(pace) },
        ].map(({ label, value }) => (
          <div key={label} className="min-w-0 rounded-xl p-2.5 sm:p-3 text-center" style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", boxShadow: "0 1px 4px rgba(15,23,42,0.05)" }}>
            <div style={{ fontSize: "7px", color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.15em", marginBottom: "3px" }}>{label}</div>
            <div style={{ fontSize: "17px", fontWeight: 900, color: "#111827", fontFamily: "'Archivo Black', sans-serif", letterSpacing: "-0.02em", lineHeight: 1 }}>{value}</div>
          </div>
        ))}
      </div>

      {locationStatus && phase !== "done" && (
        <div className="flex-shrink-0 mx-4 mb-2 px-3 py-2 rounded-xl" style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}>
          <div style={{ fontSize: "11px", color: "#92400E", fontWeight: 600, lineHeight: 1.4 }}>
            {locationStatus === "Locating..." ? "GPS pending. You can start and wait for the lock." : locationStatus}
          </div>
        </div>
      )}

      {audioStatus.lastError && phase !== "done" && (
        <div className="flex-shrink-0 mx-4 mb-2 px-3 py-2 rounded-xl" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
          <div style={{ fontSize: "11px", color: "#B91C1C", fontWeight: 600, lineHeight: 1.4 }}>{audioStatus.lastError}</div>
        </div>
      )}

      <AnimatePresence>
        {coachMsg && (
          <motion.div
            key={coachMsg}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="flex-shrink-0 mx-4 mb-2 flex items-end gap-2.5"
          >
            <div
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
              style={{ background: `${coachColor}16`, border: `1px solid ${coachColor}30`, color: coachColor, boxShadow: "0 4px 12px rgba(15,23,42,0.08)" }}
            >
              <span style={{ fontSize: "16px", lineHeight: 1 }}>{coachEmoji}</span>
            </div>
            <div className="relative min-w-0 max-w-[min(85vw,420px)]">
              <div
                className="absolute left-[-6px] bottom-3 h-3 w-3 rotate-45"
                style={{ background: "#FFFFFF", borderLeft: `1px solid ${coachColor}30`, borderBottom: `1px solid ${coachColor}30` }}
              />
              <div
                className="relative rounded-[20px] rounded-bl-md px-4 py-3"
                style={{ background: "#FFFFFF", border: `1px solid ${coachColor}30`, boxShadow: "0 8px 20px rgba(15,23,42,0.08)" }}
              >
                <div className="mb-1 flex items-center gap-2">
                  <div style={{ fontSize: "8px", color: coachColor, fontWeight: 700, letterSpacing: "0.14em" }}>{coachAlias}</div>
                  <div style={{ fontSize: "8px", color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.12em" }}>COACH</div>
                </div>
                <div style={{ fontSize: "12px", color: "#374151", fontStyle: "italic", lineHeight: 1.5 }}>"{coachMsg}"</div>
                <button
                  onClick={() => setCoachMsg(null)}
                  className="absolute right-2 top-2 h-5 w-5 rounded-full"
                  style={{ color: "#D1D5DB", fontSize: "11px", lineHeight: 1 }}
                  aria-label="Dismiss coach message"
                >
                  x
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1" />

      <div className="flex-shrink-0 px-4 sm:px-5 pb-5 pt-2">
        {phase === "idle" && (
          <motion.button whileTap={{ scale: 0.96 }} onClick={handleStart} disabled={!canStart} className="w-full py-5 rounded-xl flex items-center justify-center gap-3" style={{ background: canStart ? coachColor : "#CBD5E1", border: "none", boxShadow: canStart ? `0 4px 16px ${coachColor}40` : "none" }}>
            <Play size={20} color="#fff" fill="#fff" />
            <span style={{ color: "#fff", fontSize: "16px", fontWeight: 800, letterSpacing: "0.06em", fontFamily: "'Archivo Black', sans-serif" }}>
              {isGhostMode ? "Start Ghost Run" : "Start Run"}
            </span>
          </motion.button>
        )}
        {phase === "running" && (
          <div className="flex gap-3 max-[340px]:flex-col">
            <motion.button whileTap={{ scale: 0.95 }} onClick={handlePause} className="flex-1 py-4 rounded-xl flex items-center justify-center gap-2" style={{ background: "#FFFFFF", border: "1.5px solid #E5E7EB" }}>
              <Pause size={18} color="#374151" />
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#374151" }}>Pause</span>
            </motion.button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleStop} className="flex-1 py-4 rounded-xl flex items-center justify-center gap-2" style={{ background: "#FEF2F2", border: "1.5px solid #FECACA" }}>
              <Square size={18} color="#EF4444" />
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#EF4444" }}>Stop</span>
            </motion.button>
          </div>
        )}
        {phase === "paused" && (
          <div className="flex gap-3 max-[340px]:flex-col">
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleResume} className="flex-1 py-4 rounded-xl flex items-center justify-center gap-2" style={{ background: coachColor, border: "none" }}>
              <Play size={18} color="#fff" fill="#fff" />
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#fff" }}>Resume</span>
            </motion.button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleStop} className="flex-1 py-4 rounded-xl flex items-center justify-center gap-2" style={{ background: "#FEF2F2", border: "1.5px solid #FECACA" }}>
              <Square size={18} color="#EF4444" />
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#EF4444" }}>Stop</span>
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
}



