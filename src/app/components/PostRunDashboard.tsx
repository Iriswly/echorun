import { useState } from "react";
import { motion } from "motion/react";
import { Download, ChevronRight, Shield, Zap, Users, Globe, Lock, TrendingUp, TrendingDown, Minus, Star, Trophy } from "lucide-react";

const historyRuns = [
  {
    id: 1,
    date: "MON 14 APR",
    time: "06:42 AM",
    distance: "5.2km",
    duration: "27:14",
    pace: "5'14\"",
    calories: 312,
    bpm: 164,
    delta: "+23m",
    deltaTrend: "up",
    ghost: "TITAN_RUN_042",
    sparkline: [20, 35, 28, 45, 38, 50, 42, 58, 48, 62, 54, 68],
    color: "#18ACB7",
  },
  {
    id: 2,
    date: "SAT 12 APR",
    time: "07:15 AM",
    distance: "3.8km",
    duration: "19:44",
    pace: "5'11\"",
    calories: 228,
    bpm: 158,
    delta: "-8m",
    deltaTrend: "down",
    ghost: "SPECTER_V2",
    sparkline: [40, 38, 42, 35, 48, 44, 52, 46, 55, 50, 58, 52],
    color: "#FFCD00",
  },
  {
    id: 3,
    date: "THU 10 APR",
    time: "05:58 AM",
    distance: "8.1km",
    duration: "44:22",
    pace: "5'28\"",
    calories: 486,
    bpm: 172,
    delta: "+0m",
    deltaTrend: "equal",
    ghost: "KIRA_BASELINE_01",
    sparkline: [25, 30, 35, 40, 38, 44, 48, 45, 52, 50, 55, 58],
    color: "#a855f7",
  },
];

const ghostPool = [
  {
    id: 1,
    alias: "SHADOW_RUNNER_X",
    stats: { pace: "5'02\"", distance: "5.2km", runs: 48 },
    rating: 4.8,
    downloads: 312,
    badge: "ELITE",
    badgeColor: "#FFCD00",
    avatar: "🏃",
  },
  {
    id: 2,
    alias: "NEON_GHOST_88",
    stats: { pace: "5'18\"", distance: "3.8km", runs: 29 },
    rating: 4.5,
    downloads: 187,
    badge: "RISING",
    badgeColor: "#18ACB7",
    avatar: "👻",
  },
  {
    id: 3,
    alias: "TITAN_RUN_042",
    stats: { pace: "5'09\"", distance: "8.1km", runs: 61 },
    rating: 4.9,
    downloads: 445,
    badge: "LEGEND",
    badgeColor: "#F2403B",
    avatar: "⚡",
  },
  {
    id: 4,
    alias: "WRAITH_PACER",
    stats: { pace: "5'31\"", distance: "6.4km", runs: 15 },
    rating: 4.2,
    downloads: 98,
    badge: "NEW",
    badgeColor: "#a855f7",
    avatar: "🌀",
  },
];

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const h = 32;
  const w = 80;
  const step = w / (data.length - 1);

  const points = data.map((v, i) => [
    i * step,
    h - ((v - min) / range) * h,
  ]);

  const d = points.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
  const fill = points.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ")
    + ` L${w},${h} L0,${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sparkGrad${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#sparkGrad${color.replace("#", "")})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PostRunDashboard() {
  const [isPublic, setIsPublic] = useState(false);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [challenging, setChallenging] = useState<number | null>(null);

  const totalDistance = historyRuns.reduce((sum, r) => sum + parseFloat(r.distance), 0).toFixed(1);
  const totalRuns = historyRuns.length;
  const bestPace = "5'11\"";

  const handleChallenge = (id: number) => {
    setChallenging(id);
    setTimeout(() => setChallenging(null), 1500);
  };

  const handleDownload = (id: number) => {
    setDownloading(id);
    setTimeout(() => setDownloading(null), 1200);
  };

  return (
    <div
      className="relative flex flex-col h-full overflow-hidden"
      style={{ background: "#0d0e02" }}
    >
      {/* Header */}
      <div
        className="flex-shrink-0 px-5 pt-10 pb-4 relative z-10"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div className="flex items-start justify-between">
          <div>
            <div style={{ fontSize: "10px", color: "#18ACB7", fontWeight: 800, letterSpacing: "0.25em", marginBottom: "2px" }}>
              ECHORUN //
            </div>
            <h1
              style={{
                fontSize: "24px",
                fontWeight: 900,
                color: "#e8e8d0",
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
                fontFamily: "'Archivo Black', sans-serif",
              }}
            >
              RUN
              <br />
              <span style={{ color: "#FFCD00", filter: "drop-shadow(0 0 8px rgba(255,205,0,0.5))" }}>
                ARCHIVE
              </span>
            </h1>
          </div>

          {/* Quick stats */}
          <div className="flex flex-col gap-1 items-end">
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{
                background: "rgba(24,172,183,0.08)",
                border: "1px solid rgba(24,172,183,0.2)",
              }}
            >
              <Trophy size={11} color="#FFCD00" />
              <span style={{ fontSize: "10px", color: "#FFCD00", fontWeight: 800, letterSpacing: "0.1em" }}>
                SEASON 3 // LVL 28
              </span>
            </div>
            <div className="flex gap-3">
              {[
                { label: "RUNS", value: totalRuns },
                { label: "KM", value: totalDistance },
              ].map(({ label, value }) => (
                <div key={label} className="text-right">
                  <div style={{ fontSize: "16px", fontWeight: 900, color: "#e8e8d0", lineHeight: 1, fontFamily: "'Archivo Black', sans-serif" }}>
                    {value}
                  </div>
                  <div style={{ fontSize: "7px", color: "#3a3b2a", fontWeight: 800, letterSpacing: "0.2em" }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {/* === BASELINE RUNS === */}
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap size={12} color="#18ACB7" />
              <span style={{ fontSize: "11px", color: "#18ACB7", fontWeight: 800, letterSpacing: "0.2em" }}>
                BASELINE RUNS
              </span>
            </div>
            <button
              className="flex items-center gap-1"
              style={{ fontSize: "9px", color: "#3a3b2a", fontWeight: 700, letterSpacing: "0.15em" }}
            >
              VIEW ALL <ChevronRight size={10} />
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {historyRuns.map((run, idx) => (
              <motion.div
                key={run.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1, duration: 0.4 }}
                className="p-4 rounded-xl"
                style={{
                  background: "rgba(255,255,255,0.025)",
                  border: `1px solid rgba(255,255,255,0.06)`,
                  backdropFilter: "blur(10px)",
                }}
              >
                {/* Top row */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span style={{ fontSize: "12px", fontWeight: 800, color: "#e8e8d0", letterSpacing: "0.05em" }}>
                        {run.date}
                      </span>
                      <span style={{ fontSize: "9px", color: "#3a3b2a", fontWeight: 600 }}>
                        {run.time}
                      </span>
                    </div>
                    <div
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded-sm"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.07)",
                        width: "fit-content",
                      }}
                    >
                      <span style={{ fontSize: "8px", color: "#4a4b3a", fontWeight: 700, letterSpacing: "0.1em" }}>vs</span>
                      <span style={{ fontSize: "8px", color: "#8a8b6a", fontWeight: 700, letterSpacing: "0.05em" }}>
                        {run.ghost}
                      </span>
                    </div>
                  </div>

                  {/* Delta */}
                  <div
                    className="flex items-center gap-1 px-2 py-1 rounded-lg"
                    style={{
                      background: run.deltaTrend === "up"
                        ? "rgba(242,64,59,0.12)"
                        : run.deltaTrend === "down"
                        ? "rgba(24,172,183,0.12)"
                        : "rgba(255,255,255,0.06)",
                      border: `1px solid ${run.deltaTrend === "up" ? "rgba(242,64,59,0.3)" : run.deltaTrend === "down" ? "rgba(24,172,183,0.3)" : "rgba(255,255,255,0.1)"}`,
                    }}
                  >
                    {run.deltaTrend === "up" && <TrendingDown size={10} color="#F2403B" />}
                    {run.deltaTrend === "down" && <TrendingUp size={10} color="#18ACB7" />}
                    {run.deltaTrend === "equal" && <Minus size={10} color="#8a8b6a" />}
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: 900,
                        color: run.deltaTrend === "up" ? "#F2403B" : run.deltaTrend === "down" ? "#18ACB7" : "#8a8b6a",
                        fontFamily: "'Archivo Black', sans-serif",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {run.delta}
                    </span>
                  </div>
                </div>

                {/* Stats row */}
                <div className="flex items-end justify-between">
                  <div className="flex gap-4">
                    {[
                      { label: "DIST", value: run.distance },
                      { label: "TIME", value: run.duration },
                      { label: "PACE", value: run.pace },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <div style={{ fontSize: "7px", color: "#3a3b2a", fontWeight: 800, letterSpacing: "0.2em", marginBottom: "1px" }}>
                          {label}
                        </div>
                        <div
                          style={{
                            fontSize: "14px",
                            fontWeight: 900,
                            color: "#c8c8b0",
                            fontFamily: "'Archivo Black', sans-serif",
                            letterSpacing: "-0.02em",
                            lineHeight: 1,
                          }}
                        >
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Sparkline */}
                  <Sparkline data={run.sparkline} color={run.color} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* === GHOST POOL === */}
        <div className="px-5 pb-3">
          <div
            className="flex items-center justify-between mb-3 pt-2"
            style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
          >
            <div className="flex items-center gap-2">
              <Users size={12} color="#FFCD00" />
              <span style={{ fontSize: "11px", color: "#FFCD00", fontWeight: 800, letterSpacing: "0.2em" }}>
                GHOST POOL
              </span>
              <div
                className="px-1.5 py-0.5 rounded-sm"
                style={{
                  background: "rgba(255,205,0,0.1)",
                  border: "1px solid rgba(255,205,0,0.2)",
                  fontSize: "8px",
                  color: "#FFCD00",
                  fontWeight: 800,
                }}
              >
                {ghostPool.length} LIVE
              </div>
            </div>
            <button style={{ fontSize: "9px", color: "#3a3b2a", fontWeight: 700, letterSpacing: "0.15em" }}
              className="flex items-center gap-1">
              FILTER <ChevronRight size={10} />
            </button>
          </div>

          <div className="flex flex-col gap-2.5">
            {ghostPool.map((ghost, idx) => (
              <motion.div
                key={ghost.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + idx * 0.08, duration: 0.4 }}
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                {/* Avatar */}
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{
                    background: `${ghost.badgeColor}15`,
                    border: `1px solid ${ghost.badgeColor}30`,
                    fontSize: "18px",
                  }}
                >
                  {ghost.avatar}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 800,
                        color: "#c8c8b0",
                        letterSpacing: "0.03em",
                        fontFamily: "'Archivo', sans-serif",
                      }}
                    >
                      {ghost.alias}
                    </span>
                    <div
                      className="px-1.5 py-0.5 rounded-sm"
                      style={{
                        background: `${ghost.badgeColor}18`,
                        border: `1px solid ${ghost.badgeColor}40`,
                        fontSize: "7px",
                        color: ghost.badgeColor,
                        fontWeight: 800,
                        letterSpacing: "0.1em",
                      }}
                    >
                      {ghost.badge}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: "10px", color: "#5a5b4a", fontWeight: 700 }}>
                      {ghost.stats.pace}/km
                    </span>
                    <span style={{ fontSize: "10px", color: "#5a5b4a", fontWeight: 700 }}>
                      {ghost.stats.distance}
                    </span>
                    <div className="flex items-center gap-0.5">
                      <Star size={8} fill="#FFCD00" color="#FFCD00" />
                      <span style={{ fontSize: "9px", color: "#6a6b50", fontWeight: 700 }}>
                        {ghost.rating}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <Download size={8} color="#3a3b2a" />
                      <span style={{ fontSize: "9px", color: "#3a3b2a", fontWeight: 600 }}>
                        {ghost.downloads}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={() => handleChallenge(ghost.id)}
                    className="px-3 py-1.5 rounded-lg transition-all"
                    style={{
                      background: challenging === ghost.id
                        ? "rgba(24,172,183,0.3)"
                        : "rgba(24,172,183,0.12)",
                      border: "1px solid rgba(24,172,183,0.4)",
                      color: "#18ACB7",
                      fontSize: "9px",
                      fontWeight: 800,
                      letterSpacing: "0.1em",
                      minWidth: "70px",
                      textAlign: "center",
                    }}
                  >
                    {challenging === ghost.id ? "QUEUED!" : "CHALLENGE"}
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={() => handleDownload(ghost.id)}
                    className="px-3 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "#5a5b4a",
                      fontSize: "9px",
                      fontWeight: 700,
                    }}
                  >
                    {downloading === ghost.id ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 0.6 }}
                      >
                        <Download size={9} />
                      </motion.div>
                    ) : (
                      <Download size={9} />
                    )}
                    SAVE
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* === PRIVACY TOGGLE === */}
        <div className="px-5 pb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="p-4 rounded-xl"
            style={{
              background: isPublic
                ? "rgba(24,172,183,0.06)"
                : "rgba(255,255,255,0.025)",
              border: isPublic
                ? "1px solid rgba(24,172,183,0.25)"
                : "1px solid rgba(255,255,255,0.06)",
              transition: "all 0.4s ease",
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    background: isPublic ? "rgba(24,172,183,0.15)" : "rgba(255,255,255,0.05)",
                    border: isPublic ? "1px solid rgba(24,172,183,0.3)" : "1px solid rgba(255,255,255,0.08)",
                    transition: "all 0.3s ease",
                  }}
                >
                  {isPublic ? (
                    <Globe size={16} color="#18ACB7" style={{ filter: "drop-shadow(0 0 6px #18ACB7)" }} />
                  ) : (
                    <Lock size={16} color="#4a4b3a" />
                  )}
                </div>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 800, color: "#c8c8b0", letterSpacing: "0.05em" }}>
                    SHARE TO PUBLIC POOL
                  </div>
                  <div style={{ fontSize: "9px", color: "#4a4b3a", fontWeight: 600, marginTop: "1px" }}>
                    {isPublic ? "Your ghost is visible to all runners" : "Ghost data is private"}
                  </div>
                </div>
              </div>

              {/* Toggle */}
              <button
                onClick={() => setIsPublic(p => !p)}
                className="relative flex-shrink-0 rounded-full transition-all duration-300 active:scale-95"
                style={{
                  width: "52px",
                  height: "28px",
                  background: isPublic
                    ? "linear-gradient(135deg, #18ACB7, #0e7a82)"
                    : "rgba(255,255,255,0.08)",
                  border: isPublic ? "1px solid rgba(24,172,183,0.5)" : "1px solid rgba(255,255,255,0.1)",
                  boxShadow: isPublic ? "0 0 12px rgba(24,172,183,0.3)" : "none",
                }}
              >
                <motion.div
                  animate={{ x: isPublic ? 26 : 2 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="absolute top-1 rounded-full"
                  style={{
                    width: "20px",
                    height: "20px",
                    background: isPublic ? "#fff" : "#3a3b2a",
                    boxShadow: isPublic ? "0 0 8px rgba(24,172,183,0.4)" : "none",
                  }}
                />
              </button>
            </div>

            {isPublic && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{
                  background: "rgba(24,172,183,0.08)",
                  border: "1px solid rgba(24,172,183,0.15)",
                }}
              >
                <Shield size={11} color="#18ACB7" />
                <span style={{ fontSize: "10px", color: "#5a8a8f", lineHeight: 1.4 }}>
                  Only anonymized run data is shared. Your identity stays protected.
                </span>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
