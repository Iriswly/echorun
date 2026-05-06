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
import { getAudioStatus, playSoundEffect, setAudioEnabled, speakMessage, stopSpeech, subscribeAudioStatus } from "../../utils/audio.js";
import { RUN_STOP_REQUEST_EVENT, setActiveRunStatus } from "../../utils/runSession";
import { LiveRunMap } from "./LiveRunMap";

type LngLatTuple = [number, number];
type DistancePoint = { t: number; d: number };

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
  const coachColor: string = storedCoach.color || "#EF4444";
  const coachEmoji: string = storedCoach.emoji || "C";

  const [phase, setPhase] = useState<"idle" | "running" | "paused" | "done">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [wasBehinDuringRun, setWasBehind] = useState(false);
  const [coachMsg, setCoachMsg] = useState<string | null>(null);
  const [result, setResult] = useState<{ outcome: "win" | "lose" | "tie"; finalGap: number; pointsEarned: number; newBadges: string[] } | null>(null);
  const [standardResult, setStandardResult] = useState<{ pointsEarned: number; newBadges: string[] } | null>(null);
  const [currentPosition, setCurrentPosition] = useState<LngLatTuple | null>(null);
  const [userTrack, setUserTrack] = useState<LngLatTuple[]>([]);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [distanceSeries, setDistanceSeries] = useState<DistancePoint[]>([{ t: 0, d: 0 }]);
  const [audioStatus, setAudioStatus] = useState(getAudioStatus());

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const milestoneRef = useRef({ m500: false, m1k: false, m2k: false, t5: false, t10: false });
  const prevGapRef = useRef(0);
  const gapBucketRef = useRef<ReturnType<typeof getGapBucket>>(null);
  const leadStateRef = useRef<ReturnType<typeof getLeadState>>("even");
  const lastTrackedPositionRef = useRef<LngLatTuple | null>(null);

  const ghostDistance = isGhostMode && ghostRecord ? getDistanceAtTime(ghostRecord.distanceSeries || [], elapsed, ghostRecord.duration, ghostRecord.distance) : 0;
  const gap = distance - ghostDistance;
  const ghostProgress = distance > 0 ? Math.max(0, Math.min(ghostDistance / distance, 1)) : 0;
  const pace = elapsed > 0 && distance > 0 ? elapsed / (distance / 1000) : 0;

  const fmtTime = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
  const fmtDist = (meters: number) => (meters >= 1000 ? `${(meters / 1000).toFixed(2)}km` : `${Math.round(meters)}m`);
  const fmtPace = (seconds: number) => (seconds > 0 ? `${Math.floor(seconds / 60)}'${String(Math.floor(seconds % 60)).padStart(2, "0")}"` : "--'--\"");

  useEffect(() => {
    const unsubscribe = subscribeAudioStatus(setAudioStatus);
    return () => {
      unsubscribe();
      stopSpeech();
      setActiveRunStatus({ isActive: false });
    };
  }, []);

  useEffect(() => {
    setActiveRunStatus({ isActive: (phase === "running" || phase === "paused") && elapsed > 0 });
  }, [phase, elapsed]);

  const announceCoach = useCallback((message: string, soundEffect?: string) => {
    setCoachMsg(message);
    if (soundEffect) playSoundEffect(soundEffect);
    speakMessage(message, { coachAlias: coachVoiceAlias });
  }, [coachVoiceAlias]);

  const triggerMsg = useCallback(async (event: Parameters<typeof generateCoachLine>[0]["event"]) => {
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

    if (msg) {
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

  const handlePositionChange = useCallback(({ lng, lat, accuracy }: { lng: number; lat: number; accuracy?: number; timestamp: number }) => {
    const point: LngLatTuple = [lng, lat];
    setCurrentPosition(point);

    if (phase !== "running") {
      lastTrackedPositionRef.current = point;
      return;
    }

    if (typeof accuracy === "number" && accuracy > 80) return;

    const previousPoint = lastTrackedPositionRef.current;
    lastTrackedPositionRef.current = point;

    if (!previousPoint) {
      setUserTrack([point]);
      return;
    }

    const segmentDistance = calculateSegmentDistanceMeters(previousPoint, point);
    if (segmentDistance < 1 || segmentDistance > 120) return;

    setDistance((value) => value + segmentDistance);
    setUserTrack((track) => (track.length === 0 ? [previousPoint, point] : [...track, point]));
  }, [phase]);

  const handleStart = async () => {
    resetCoachSession();
    resetAiCoachSession();
    stopTimers();
    milestoneRef.current = { m500: false, m1k: false, m2k: false, t5: false, t10: false };
    prevGapRef.current = 0;
    gapBucketRef.current = null;
    leadStateRef.current = "even";
    setElapsed(0);
    setDistance(0);
    setWasBehind(false);
    setResult(null);
    setStandardResult(null);
    setDistanceSeries([{ t: 0, d: 0 }]);
    setUserTrack(currentPosition ? [currentPosition] : []);
    lastTrackedPositionRef.current = currentPosition;
    setPhase("running");
    startTimers();
    const startEvent = currentPosition
      ? (isGhostMode ? "start_ghost" : "start_standard")
      : "start_waiting";
    const startLine = await generateLifecycleLine(coachVoiceAlias, startEvent);
    announceCoach(startLine, "start");
  };

  const handlePause = async () => {
    stopTimers();
    setPhase("paused");
    const pauseLine = await generateLifecycleLine(coachVoiceAlias, "pause");
    announceCoach(pauseLine, "pause");
  };

  const handleResume = async () => {
    lastTrackedPositionRef.current = currentPosition;
    setPhase("running");
    startTimers();
    const resumeLine = await generateLifecycleLine(coachVoiceAlias, "resume");
    announceCoach(resumeLine, "resume");
  };

  const finalizeRun = useCallback(() => {
    stopTimers();
    setPhase("done");

    const profile = getProfile();
    if (isGhostMode) {
      const outcome: "win" | "lose" | "tie" = gap > 3 ? "win" : gap < -3 ? "lose" : "tie";
      const runResult = { mode: "ghost" as const, distance, duration: elapsed, avgPace: pace, finalGap: gap, result: outcome, wasBehinDuringRun };
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
        { coachAlias: coachVoiceAlias },
      );
      return { mode: "ghost" as const, pointsEarned, outcome, finalGap: gap };
    }

    const runResult = { mode: "standard" as const, distance, duration: elapsed, avgPace: pace, finalGap: 0, result: undefined, wasBehinDuringRun: false };
    const pointsEarned = calculateRunPoints(runResult);
    const newBadges = evaluateBadges(profile, { ...runResult, pointsEarned });
    updateProfileAfterRun({ ...runResult, pointsEarned }, newBadges);
    setStandardResult({ pointsEarned, newBadges });
    playSoundEffect(newBadges.length > 0 ? "badge" : "finish");
    speakMessage(`Run complete. You earned ${pointsEarned} points.`, { coachAlias: coachVoiceAlias });
    return { mode: "standard" as const, pointsEarned };
  }, [coachVoiceAlias, distance, elapsed, gap, isGhostMode, pace, stopTimers, wasBehinDuringRun]);

  const persistRunRecord = useCallback((ghostResult?: { outcome: "win" | "lose" | "tie"; finalGap: number; pointsEarned: number } | null, standardPointsEarned?: number | null) => {
    saveRunRecord({
      mode: isGhostMode ? "ghost" : "standard",
      source: "self",
      runnerName: "You",
      title: isGhostMode ? `Ghost Run vs ${ghostRecord?.runnerName || ghostRecord?.title || "Ghost"}` : "My Run",
      distance: Math.round(distance),
      duration: elapsed,
      avgPace: pace,
      distanceSeries,
      date: new Date().toISOString(),
      coachAlias,
      ...(isGhostMode && ghostResult ? { ghostRecordId: ghostRecord?.id, result: ghostResult.outcome, finalGap: ghostResult.finalGap, pointsEarned: ghostResult.pointsEarned } : {}),
      ...(!isGhostMode && typeof standardPointsEarned === "number" ? { pointsEarned: standardPointsEarned } : {}),
    });
  }, [coachAlias, distance, distanceSeries, elapsed, ghostRecord?.id, ghostRecord?.runnerName, ghostRecord?.title, isGhostMode, pace]);

  const handleStop = useCallback(() => {
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
  const canStart = !locationStatus || phase !== "idle";

  return (
    <div className="relative flex flex-col h-full min-w-0 overflow-hidden" style={{ background: "#F7F8FA" }}>
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
              onClick={() => setAudioEnabled(!audioStatus.enabled)}
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
          ghostProgress={ghostProgress}
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
          { label: "DIST", value: fmtDist(distance) },
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
          <div style={{ fontSize: "11px", color: "#92400E", fontWeight: 600, lineHeight: 1.4 }}>{locationStatus}</div>
        </div>
      )}

      {audioStatus.lastError && phase !== "done" && (
        <div className="flex-shrink-0 mx-4 mb-2 px-3 py-2 rounded-xl" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
          <div style={{ fontSize: "11px", color: "#B91C1C", fontWeight: 600, lineHeight: 1.4 }}>{audioStatus.lastError}</div>
        </div>
      )}

      {isGhostMode && phase === "running" && (
        <div className="flex-shrink-0 mx-4 mb-2 px-3 py-2 rounded-xl" style={{ background: "#FFF7ED", border: "1px solid #FDBA74" }}>
          <div style={{ fontSize: "11px", color: "#92400E", fontWeight: 600, lineHeight: 1.4 }}>{ghostStatusText(gap)}</div>
        </div>
      )}

      <AnimatePresence>
        {coachMsg && (
          <motion.div key={coachMsg} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }} className="flex-shrink-0 mx-4 mb-2 p-3 rounded-xl flex items-start gap-2.5" style={{ background: "#FFFFFF", border: `1px solid ${coachColor}30`, boxShadow: "0 2px 8px rgba(15,23,42,0.06)" }}>
            <span style={{ fontSize: "16px", flexShrink: 0 }}>{coachEmoji}</span>
            <div>
              <div style={{ fontSize: "8px", color: coachColor, fontWeight: 700, letterSpacing: "0.12em", marginBottom: "2px" }}>{coachAlias}</div>
              <div style={{ fontSize: "12px", color: "#374151", fontStyle: "italic", lineHeight: 1.45 }}>"{coachMsg}"</div>
            </div>
            <button onClick={() => setCoachMsg(null)} style={{ marginLeft: "auto", color: "#D1D5DB", fontSize: "14px", flexShrink: 0 }}>
              x
            </button>
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
