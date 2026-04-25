import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Heart, Wind, Pause, Play, Volume2 } from "lucide-react";

const PATH_POINTS = [
  [30, 240], [50, 220], [80, 210], [110, 200], [130, 185], [140, 165],
  [145, 145], [155, 128], [170, 115], [190, 108], [210, 105], [230, 108],
  [248, 115], [262, 128], [270, 145], [275, 162], [278, 180], [278, 198],
  [272, 215], [260, 226], [245, 232], [228, 235], [210, 236], [192, 234],
  [178, 228], [168, 218], [162, 206], [160, 192], [163, 178], [170, 166],
  [180, 158], [195, 153], [210, 152], [224, 155], [235, 162], [242, 172],
  [244, 184], [242, 196], [235, 206], [225, 212], [213, 215], [200, 214],
];

const TOTAL_PATH_LENGTH = PATH_POINTS.length - 1;

function lerp(a: number[], b: number[], t: number): [number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

function getPointOnPath(progress: number): [number, number] {
  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const rawIndex = clampedProgress * TOTAL_PATH_LENGTH;
  const segIndex = Math.floor(rawIndex);
  const t = rawIndex - segIndex;
  if (segIndex >= TOTAL_PATH_LENGTH) return PATH_POINTS[TOTAL_PATH_LENGTH] as [number, number];
  return lerp(PATH_POINTS[segIndex], PATH_POINTS[segIndex + 1], t);
}

function CityMapSVG({
  userProgress,
  ghostProgress,
}: {
  userProgress: number;
  ghostProgress: number;
}) {
  const userPos = getPointOnPath(userProgress);
  const ghostPos = getPointOnPath(ghostProgress);

  const pathD = PATH_POINTS.map((p, i) =>
    (i === 0 ? "M" : "L") + p[0] + "," + p[1]
  ).join(" ");

  const completedEndIdx = Math.floor(userProgress * TOTAL_PATH_LENGTH);
  const completedPathD = PATH_POINTS.slice(0, completedEndIdx + 1)
    .map((p, i) => (i === 0 ? "M" : "L") + p[0] + "," + p[1])
    .join(" ");

  return (
    <svg viewBox="0 0 310 265" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="glow-cyan" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="glow-yellow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="glow-soft" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <radialGradient id="ghostPulse" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFCD00" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#FFCD00" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="userPulse" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#18ACB7" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#18ACB7" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="pathGrad" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#18ACB7" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#18ACB7" stopOpacity="0.8" />
        </linearGradient>
      </defs>

      {/* Background */}
      <rect width="310" height="265" fill="#080901" />

      {/* Grid */}
      {Array.from({ length: 16 }, (_, i) => (
        <line key={`h${i}`} x1="0" y1={i * 18} x2="310" y2={i * 18}
          stroke="#131501" strokeWidth="1" />
      ))}
      {Array.from({ length: 18 }, (_, i) => (
        <line key={`v${i}`} x1={i * 18} y1="0" x2={i * 18} y2="265"
          stroke="#131501" strokeWidth="1" />
      ))}

      {/* City blocks */}
      {[
        [10, 10, 55, 55], [75, 10, 55, 35], [140, 10, 40, 45],
        [190, 10, 50, 40], [250, 10, 45, 50], [10, 75, 40, 60],
        [60, 55, 40, 40], [115, 65, 35, 45], [165, 58, 45, 35],
        [220, 65, 40, 45], [270, 70, 30, 45], [10, 145, 50, 55],
        [70, 120, 35, 45], [120, 125, 30, 40], [240, 125, 40, 50],
        [10, 210, 55, 45], [80, 195, 40, 55], [155, 225, 35, 35],
        [265, 195, 35, 60], [220, 225, 40, 35],
      ].map(([x, y, w, h], i) => (
        <rect key={i} x={x} y={y} width={w} height={h}
          fill={i % 3 === 0 ? "#101200" : i % 3 === 1 ? "#0c0e01" : "#0e1001"}
          stroke="#1a1d04" strokeWidth="0.5" rx="1" />
      ))}

      {/* Path ghost trail */}
      <path d={pathD} fill="none" stroke="#18ACB7" strokeWidth="2"
        strokeOpacity="0.15" strokeLinecap="round" strokeLinejoin="round" />

      {/* Completed path */}
      {completedPathD.length > 1 && (
        <path d={completedPathD} fill="none" stroke="#18ACB7" strokeWidth="2.5"
          strokeOpacity="0.8" strokeLinecap="round" strokeLinejoin="round"
          filter="url(#glow-soft)" />
      )}

      {/* Ghost pulse aura */}
      <circle cx={ghostPos[0]} cy={ghostPos[1]} r="18" fill="url(#ghostPulse)" />
      {/* Ghost marker */}
      <circle cx={ghostPos[0]} cy={ghostPos[1]} r="8" fill="#FFCD00"
        fillOpacity="0.9" filter="url(#glow-yellow)" />
      <text x={ghostPos[0]} y={ghostPos[1] + 4} textAnchor="middle"
        fontSize="8" fill="#000" fontWeight="900">G</text>

      {/* User pulse aura */}
      <circle cx={userPos[0]} cy={userPos[1]} r="18" fill="url(#userPulse)" />
      {/* User marker */}
      <circle cx={userPos[0]} cy={userPos[1]} r="8" fill="#18ACB7"
        fillOpacity="0.95" filter="url(#glow-cyan)" />
      <circle cx={userPos[0]} cy={userPos[1]} r="12" fill="none"
        stroke="#18ACB7" strokeWidth="1.5" strokeOpacity="0.5" />
      <text x={userPos[0]} y={userPos[1] + 4} textAnchor="middle"
        fontSize="8" fill="#000" fontWeight="900">U</text>

      {/* Start label */}
      <text x={PATH_POINTS[0][0] + 8} y={PATH_POINTS[0][1] - 4}
        fontSize="7" fill="#3a3b2a" fontWeight="700" letterSpacing="1">START</text>
    </svg>
  );
}

const COACH_MESSAGES = [
  "Keep pushing — you're 15 meters ahead! Don't let up!",
  "Pace check: 5'22\" — that's your PR territory. STAY.",
  "Ghost is gaining. 8 meters. ACCELERATE NOW.",
  "Perfect cadence! Lock this rhythm for the final km.",
  "Heart rate optimal. You've trained for this moment.",
];

export function GhostRunTracking() {
  const [isRunning, setIsRunning] = useState(true);
  const [userProgress, setUserProgress] = useState(0.12);
  const [ghostProgress, setGhostProgress] = useState(0.18);
  const [elapsed, setElapsed] = useState(847);
  const [bpm, setBpm] = useState(162);
  const [messageIdx, setMessageIdx] = useState(0);
  const [showPulse, setShowPulse] = useState(false);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  const delta = Math.round((ghostProgress - userProgress) * 400);
  const pace = `5'${String(Math.max(18, 30 - Math.floor(userProgress * 20))).padStart(2, "0")}"`;
  const remaining = (2.4 - userProgress * 2.4).toFixed(1);
  const distance = (userProgress * 2.4).toFixed(2);

  useEffect(() => {
    if (!isRunning) return;

    const tick = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const dt = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      setUserProgress(p => Math.min(0.95, p + dt * 0.012));
      setGhostProgress(p => Math.min(0.98, p + dt * 0.011));
      setElapsed(t => t + dt);
      setBpm(b => Math.max(148, Math.min(178, b + (Math.random() - 0.5) * 3)));

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      lastTimeRef.current = null;
    };
  }, [isRunning]);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIdx(i => (i + 1) % COACH_MESSAGES.length);
      setShowPulse(true);
      setTimeout(() => setShowPulse(false), 600);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <div
      className="relative flex flex-col h-full overflow-hidden"
      style={{ background: "#080901" }}
    >
      {/* Status bar */}
      <div
        className="flex items-center justify-between px-5 py-3 relative z-20"
        style={{ borderBottom: "1px solid rgba(24,172,183,0.1)" }}
      >
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ opacity: isRunning ? [1, 0.3, 1] : 0.3 }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="w-2 h-2 rounded-full"
            style={{ background: "#F2403B", boxShadow: "0 0 6px #F2403B" }}
          />
          <span style={{ fontSize: "10px", color: "#F2403B", fontWeight: 800, letterSpacing: "0.2em" }}>
            LIVE RUN
          </span>
        </div>
        <div style={{ fontSize: "10px", color: "#3a3b2a", fontWeight: 700, letterSpacing: "0.1em" }}>
          GHOST RUN — 2.4KM
        </div>
        <button
          onClick={() => setIsRunning(r => !r)}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full transition-all active:scale-90"
          style={{
            background: isRunning ? "rgba(242,64,59,0.15)" : "rgba(24,172,183,0.15)",
            border: isRunning ? "1px solid rgba(242,64,59,0.4)" : "1px solid rgba(24,172,183,0.4)",
            color: isRunning ? "#F2403B" : "#18ACB7",
          }}
        >
          {isRunning ? <Pause size={10} /> : <Play size={10} />}
          <span style={{ fontSize: "9px", fontWeight: 800, letterSpacing: "0.1em" }}>
            {isRunning ? "PAUSE" : "RESUME"}
          </span>
        </button>
      </div>

      {/* MAP */}
      <div className="relative z-10 flex-shrink-0" style={{ height: "265px" }}>
        <CityMapSVG userProgress={userProgress} ghostProgress={ghostProgress} />

        {/* Map overlay — gradient fade bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, transparent, #080901)" }}
        />

        {/* Delta pill */}
        <AnimatePresence mode="wait">
          <motion.div
            key={Math.round(delta)}
            initial={{ y: -8, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 8, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{
              background: delta > 0 ? "rgba(242,64,59,0.2)" : "rgba(24,172,183,0.2)",
              border: `1.5px solid ${delta > 0 ? "#F2403B" : "#18ACB7"}`,
              boxShadow: `0 0 15px ${delta > 0 ? "rgba(242,64,59,0.3)" : "rgba(24,172,183,0.3)"}`,
              backdropFilter: "blur(10px)",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                fontWeight: 900,
                color: delta > 0 ? "#F2403B" : "#18ACB7",
                letterSpacing: "0.05em",
                fontFamily: "'Archivo Black', sans-serif",
              }}
            >
              ΔD
            </span>
            <span
              style={{
                fontSize: "16px",
                fontWeight: 900,
                color: delta > 0 ? "#F2403B" : "#18ACB7",
                letterSpacing: "-0.02em",
                fontFamily: "'Archivo Black', sans-serif",
              }}
            >
              {delta > 0 ? "+" : ""}{delta}m
            </span>
            <span style={{ fontSize: "9px", color: "#5a5b4a", fontWeight: 700 }}>
              {delta > 0 ? "BEHIND" : "AHEAD"}
            </span>
          </motion.div>
        </AnimatePresence>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: "#FFCD00", boxShadow: "0 0 6px #FFCD00" }} />
            <span style={{ fontSize: "9px", color: "#6a6b50", fontWeight: 700, letterSpacing: "0.1em" }}>GHOST</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: "#18ACB7", boxShadow: "0 0 6px #18ACB7" }} />
            <span style={{ fontSize: "9px", color: "#6a6b50", fontWeight: 700, letterSpacing: "0.1em" }}>YOU</span>
          </div>
        </div>
      </div>

      {/* DATA DASHBOARD */}
      <div className="flex-1 flex flex-col px-5 pt-3 pb-2 relative z-10 overflow-hidden">
        {/* Primary metrics */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {/* PACE */}
          <div
            className="p-4 rounded-xl"
            style={{
              background: "rgba(24,172,183,0.05)",
              border: "1px solid rgba(24,172,183,0.15)",
            }}
          >
            <div style={{ fontSize: "9px", color: "#18ACB7", fontWeight: 800, letterSpacing: "0.25em", marginBottom: "4px" }}>
              PACE /KM
            </div>
            <div
              style={{
                fontSize: "34px",
                fontWeight: 900,
                color: "#e8e8d0",
                letterSpacing: "-0.03em",
                lineHeight: 1,
                fontFamily: "'Archivo Black', sans-serif",
              }}
            >
              {pace}
            </div>
          </div>

          {/* REMAINING */}
          <div
            className="p-4 rounded-xl"
            style={{
              background: "rgba(255,205,0,0.05)",
              border: "1px solid rgba(255,205,0,0.15)",
            }}
          >
            <div style={{ fontSize: "9px", color: "#FFCD00", fontWeight: 800, letterSpacing: "0.25em", marginBottom: "4px" }}>
              REMAINING
            </div>
            <div
              style={{
                fontSize: "34px",
                fontWeight: 900,
                color: "#e8e8d0",
                letterSpacing: "-0.03em",
                lineHeight: 1,
                fontFamily: "'Archivo Black', sans-serif",
              }}
            >
              {remaining}<span style={{ fontSize: "14px", color: "#5a5b4a", fontWeight: 700 }}>km</span>
            </div>
          </div>
        </div>

        {/* Secondary metrics */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {/* Time */}
          <div
            className="p-3 rounded-xl text-center"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div style={{ fontSize: "8px", color: "#4a4b3a", fontWeight: 800, letterSpacing: "0.2em", marginBottom: "3px" }}>TIME</div>
            <div style={{ fontSize: "18px", fontWeight: 900, color: "#c8c8b0", fontFamily: "'Archivo Black', sans-serif", letterSpacing: "-0.02em" }}>
              {formatTime(elapsed)}
            </div>
          </div>

          {/* DIST */}
          <div
            className="p-3 rounded-xl text-center"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div style={{ fontSize: "8px", color: "#4a4b3a", fontWeight: 800, letterSpacing: "0.2em", marginBottom: "3px" }}>DIST</div>
            <div style={{ fontSize: "18px", fontWeight: 900, color: "#c8c8b0", fontFamily: "'Archivo Black', sans-serif", letterSpacing: "-0.02em" }}>
              {distance}<span style={{ fontSize: "10px", color: "#4a4b3a" }}>km</span>
            </div>
          </div>

          {/* BPM */}
          <div
            className="p-3 rounded-xl text-center"
            style={{
              background: "rgba(242,64,59,0.05)",
              border: "1px solid rgba(242,64,59,0.15)",
            }}
          >
            <div className="flex items-center justify-center gap-1 mb-1">
              <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 60 / bpm }}>
                <Heart size={8} fill="#F2403B" color="#F2403B" />
              </motion.div>
              <span style={{ fontSize: "8px", color: "#F2403B", fontWeight: 800, letterSpacing: "0.2em" }}>BPM</span>
            </div>
            <div style={{ fontSize: "18px", fontWeight: 900, color: "#c8c8b0", fontFamily: "'Archivo Black', sans-serif", letterSpacing: "-0.02em" }}>
              {Math.round(bpm)}
            </div>
          </div>
        </div>

        {/* AI Coach Feedback */}
        <div
          className="flex items-center gap-3 p-3 rounded-xl"
          style={{
            background: "rgba(13,14,2,0.8)",
            border: "1px solid rgba(24,172,183,0.2)",
            backdropFilter: "blur(10px)",
          }}
        >
          {/* Coach avatar pulsing */}
          <div className="relative flex-shrink-0">
            <motion.div
              animate={{ scale: showPulse ? [1, 1.3, 1] : 1 }}
              transition={{ duration: 0.4 }}
              className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-lg"
              style={{
                background: "linear-gradient(135deg, #F2403B, #7a0c09)",
                border: "2px solid rgba(242,64,59,0.5)",
                boxShadow: showPulse ? "0 0 20px rgba(242,64,59,0.6)" : "0 0 8px rgba(242,64,59,0.3)",
              }}
            >
              😈
            </motion.div>
            <motion.div
              animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="absolute inset-0 rounded-full"
              style={{ background: "rgba(242,64,59,0.3)" }}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span style={{ fontSize: "8px", color: "#F2403B", fontWeight: 800, letterSpacing: "0.15em" }}>
                DREDD
              </span>
              <Volume2 size={8} color="#3a3b2a" />
            </div>
            <AnimatePresence mode="wait">
              <motion.p
                key={messageIdx}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3 }}
                style={{
                  fontSize: "11px",
                  color: "#8a8b7a",
                  lineHeight: 1.4,
                }}
              >
                "{COACH_MESSAGES[messageIdx]}"
              </motion.p>
            </AnimatePresence>
          </div>

          <Wind size={14} color="#18ACB7" style={{ flexShrink: 0 }} />
        </div>
      </div>
    </div>
  );
}
