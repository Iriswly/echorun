import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trash2, Shield, Globe, Lock, Star, Trophy, Zap, Ghost } from "lucide-react";
import { useNavigate } from "react-router";
import { getProfile } from "../../utils/profile.js";
import { getLevelInfo } from "../../utils/scoring.js";
import { ALL_BADGES } from "../../utils/badges.js";
import { getRunHistory } from "../../utils/storage.js";

function deleteRunRecord(id: number) {
  try {
    const raw = localStorage.getItem("ECHORUN_RUNS");
    const runs = raw ? JSON.parse(raw) : [];
    localStorage.setItem("ECHORUN_RUNS", JSON.stringify(runs.filter((r: any) => r.id !== id)));
  } catch {}
}

function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { weekday:"short", day:"numeric", month:"short" }).toUpperCase();
  } catch { return "—"; }
}

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit" });
  } catch { return "—"; }
}

function fmtDuration(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function fmtPace(avgPace: number) {
  if (!avgPace || avgPace <= 0) return "--'--\"";
  return `${Math.floor(avgPace / 60)}'${String(Math.floor(avgPace % 60)).padStart(2, "0")}"`;
}

function fmtDist(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(2)}km` : `${Math.round(m)}m`;
}

function getRunSourceLabel(run: any) {
  if (run.source === "friend") return run.runnerName ? `FRIEND • ${String(run.runnerName).toUpperCase()}` : "FRIEND";
  if (run.source === "self") return "YOU";
  return "RUN";
}

function ResultPill({ result }: { result: "win"|"lose"|"tie" }) {
  const cfg = {
    win:  { label:"WIN",  bg:"#F0FDF4", border:"#6EE7B7", color:"#10B981" },
    lose: { label:"LOSE", bg:"#FFF7ED", border:"#FDBA74", color:"#F97316" },
    tie:  { label:"TIE",  bg:"#F5F3FF", border:"#C4B5FD", color:"#7C3AED" },
  }[result];
  return (
    <span className="px-2 py-0.5 rounded-full text-center"
      style={{ background:cfg.bg, border:`1px solid ${cfg.border}`, fontSize:"8px", color:cfg.color, fontWeight:700, letterSpacing:"0.08em" }}>
      {cfg.label}
    </span>
  );
}

export function PostRunDashboard() {
  const navigate = useNavigate();
  const [runs, setRuns] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [deletingId, setDeletingId] = useState<number|null>(null);

  useEffect(() => {
    setRuns(getRunHistory());
    setProfile(getProfile());
  }, []);

  const handleDelete = (id: number) => {
    deleteRunRecord(id);
    setRuns(prev => prev.filter(r => r.id !== id));
    setProfile(getProfile());
  };

  const handleChallenge = (run: any) => {
    navigate("/run", { state: { mode:"ghost", ghostRecord: run } });
  };

  const levelInfo = profile ? getLevelInfo(profile.totalPoints) : null;
  const unlockedBadges = new Set(profile?.badges || []);

  return (
    <div className="relative flex flex-col h-full min-w-0 overflow-hidden" style={{ background:"#F7F8FA" }}>
      {/* Header */}
      <div className="flex-shrink-0 px-4 sm:px-5 pt-10 pb-4 relative z-10 bg-white" style={{ borderBottom:"1px solid #E5E7EB" }}>
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <div style={{ fontSize:"10px", color:"#2563EB", fontWeight:700, letterSpacing:"0.2em", marginBottom:"2px" }}>ECHORUN</div>
            <h1 style={{ fontSize:"24px", fontWeight:800, color:"#111827", letterSpacing:"-0.02em", lineHeight:1.1, fontFamily:"'Archivo Black', sans-serif" }}>
              Run Archive
            </h1>
          </div>
          {profile && levelInfo && (
            <div className="flex flex-col items-end gap-1 min-w-0">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background:"#EFF6FF", border:"1px solid #BFDBFE" }}>
                <Trophy size={10} color="#2563EB" />
                <span style={{ fontSize:"10px", color:"#2563EB", fontWeight:700, letterSpacing:"0.05em" }}>
                  LVL {levelInfo.level}
                </span>
              </div>
              <div className="flex flex-wrap justify-end gap-3">
                {[
                  { label:"RUNS",  value: profile.totalRuns },
                  { label:"KM",    value: (profile.totalDistance / 1000).toFixed(1) },
                  { label:"WINS",  value: profile.ghostWins },
                ].map(({ label, value }) => (
                  <div key={label} className="text-right">
                    <div style={{ fontSize:"15px", fontWeight:800, color:"#111827", lineHeight:1, fontFamily:"'Archivo Black', sans-serif" }}>{value}</div>
                    <div style={{ fontSize:"7px", color:"#9CA3AF", fontWeight:600, letterSpacing:"0.15em" }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* XP bar */}
        {levelInfo && (
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-full overflow-hidden" style={{ height:"4px", background:"#E5E7EB" }}>
              <div className="h-full rounded-full" style={{ width:`${levelInfo.progress * 100}%`, background:"#2563EB", transition:"width 0.6s ease" }} />
            </div>
            <span style={{ fontSize:"9px", color:"#9CA3AF", fontWeight:600 }}>
              {profile?.totalPoints} XP
            </span>
          </div>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth:"none", msOverflowStyle:"none" }}>

        {/* === BADGE SHELF === */}
        <div className="px-4 sm:px-5 pt-4 pb-3">
          <div className="flex items-center gap-2 mb-3">
            <Star size={12} color="#F59E0B" fill="#F59E0B" />
            <span style={{ fontSize:"12px", color:"#111827", fontWeight:700 }}>Badges</span>
            <span style={{ fontSize:"10px", color:"#9CA3AF", fontWeight:600 }}>
              {unlockedBadges.size}/{ALL_BADGES.length}
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth:"none" }}>
            {ALL_BADGES.map(badge => {
              const unlocked = unlockedBadges.has(badge.id);
              return (
                <div key={badge.id} className="flex-shrink-0 flex flex-col items-center gap-1 p-2.5 rounded-xl"
                  style={{ background: unlocked ? "#FFFBEB" : "#F9FAFB", border: unlocked ? "1px solid #FDE68A" : "1px solid #E5E7EB", minWidth:"72px", opacity: unlocked ? 1 : 0.45 }}>
                  <span style={{ fontSize:"22px", filter: unlocked ? "none" : "grayscale(1)" }}>{badge.icon}</span>
                  <div style={{ fontSize:"9px", fontWeight:700, color: unlocked ? "#92400E" : "#9CA3AF", textAlign:"center", lineHeight:1.2 }}>{badge.name}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* === RUN HISTORY === */}
        <div className="px-4 sm:px-5 pb-3">
          <div className="flex items-center justify-between mb-3 pt-1" style={{ borderTop:"1px solid #E5E7EB" }}>
            <div className="flex items-center gap-2 pt-3">
              <Zap size={12} color="#2563EB" />
              <span style={{ fontSize:"12px", color:"#111827", fontWeight:700 }}>Recent Runs</span>
            </div>
          </div>

          {runs.length === 0 ? (
            <div className="py-10 flex flex-col items-center gap-3">
              <div style={{ fontSize:"36px" }}>🏃</div>
              <div style={{ fontSize:"14px", fontWeight:700, color:"#374151", textAlign:"center" }}>No runs yet</div>
              <div style={{ fontSize:"12px", color:"#9CA3AF", textAlign:"center", lineHeight:1.5 }}>
                Complete your first standard run to unlock Ghost Run.
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {runs.map((run, idx) => (
                <AnimatePresence key={run.id}>
                  {deletingId !== run.id && (
                    <motion.div
                      initial={{ opacity:0, x:-20 }}
                      animate={{ opacity:1, x:0 }}
                      exit={{ opacity:0, x:20, height:0 }}
                      transition={{ delay: idx * 0.05, duration:0.3 }}
                      className="p-4 rounded-xl"
                      style={{ background:"#FFFFFF", border:"1px solid #E5E7EB", boxShadow:"0 2px 8px rgba(15,23,42,0.06)" }}>

                      {/* Top row */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0">
                          <div style={{ fontSize:"8px", color:"#9CA3AF", fontWeight:700, letterSpacing:"0.14em", marginBottom:"4px" }}>
                            {getRunSourceLabel(run)}
                          </div>
                          {run.title && (
                            <div style={{ fontSize:"13px", fontWeight:700, color:"#111827", marginBottom:"4px", lineHeight:1.2 }}>
                              {run.title}
                            </div>
                          )}
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span style={{ fontSize:"12px", fontWeight:700, color:"#111827" }}>{fmtDate(run.date)}</span>
                            <span style={{ fontSize:"10px", color:"#9CA3AF" }}>{fmtTime(run.date)}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <div className="px-1.5 py-0.5 rounded-full" style={{ background: run.mode === "ghost" ? "#FFF7ED" : "#EFF6FF", border: run.mode === "ghost" ? "1px solid #FDBA74" : "1px solid #BFDBFE", fontSize:"8px", color: run.mode === "ghost" ? "#F97316" : "#2563EB", fontWeight:700, letterSpacing:"0.08em" }}>
                              {run.mode === "ghost" ? "👻 GHOST" : "🏃 STANDARD"}
                            </div>
                            {run.result && <ResultPill result={run.result} />}
                          </div>
                        </div>
                        {/* Points */}
                        {run.pointsEarned != null && (
                          <div className="flex flex-shrink-0 items-center gap-1 px-2 py-1 rounded-full" style={{ background:"#FFFBEB", border:"1px solid #FDE68A" }}>
                            <Star size={9} fill="#F59E0B" color="#F59E0B" />
                            <span style={{ fontSize:"11px", fontWeight:800, color:"#D97706", fontFamily:"'Archivo Black', sans-serif" }}>+{run.pointsEarned}</span>
                          </div>
                        )}
                      </div>

                      {/* Stats row */}
                      <div className="flex flex-wrap gap-x-4 gap-y-3 mb-3">
                        {[
                          { label:"DIST", value: fmtDist(run.distance) },
                          { label:"TIME", value: fmtDuration(run.duration) },
                          { label:"PACE", value: fmtPace(run.avgPace) },
                        ].map(({ label, value }) => (
                          <div key={label}>
                            <div style={{ fontSize:"7px", color:"#9CA3AF", fontWeight:700, letterSpacing:"0.15em", marginBottom:"1px" }}>{label}</div>
                            <div style={{ fontSize:"14px", fontWeight:800, color:"#111827", fontFamily:"'Archivo Black', sans-serif", letterSpacing:"-0.02em", lineHeight:1 }}>{value}</div>
                          </div>
                        ))}
                        {run.mode === "ghost" && run.finalGap != null && (
                          <div>
                            <div style={{ fontSize:"7px", color:"#9CA3AF", fontWeight:700, letterSpacing:"0.15em", marginBottom:"1px" }}>GAP</div>
                            <div style={{ fontSize:"14px", fontWeight:800, color: run.finalGap > 0 ? "#10B981" : run.finalGap < 0 ? "#F97316" : "#9CA3AF", fontFamily:"'Archivo Black', sans-serif", letterSpacing:"-0.02em", lineHeight:1 }}>
                              {run.finalGap > 0 ? "+" : ""}{Math.round(run.finalGap)}m
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 max-[340px]:flex-col">
                        <motion.button whileTap={{ scale:0.95 }} onClick={() => handleChallenge(run)}
                          className="flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5"
                          style={{ background:"#EFF6FF", border:"1px solid #BFDBFE" }}>
                          <Ghost size={12} color="#2563EB" />
                          <span style={{ fontSize:"10px", fontWeight:700, color:"#2563EB", letterSpacing:"0.05em" }}>
                            {run.mode === "ghost" ? "Rematch" : "Challenge"}
                          </span>
                        </motion.button>
                        <motion.button whileTap={{ scale:0.95 }}
                          onClick={() => { setDeletingId(run.id); setTimeout(() => { handleDelete(run.id); setDeletingId(null); }, 300); }}
                          className="w-9 h-9 rounded-xl flex items-center justify-center"
                          style={{ background:"#FEF2F2", border:"1px solid #FECACA" }}>
                          <Trash2 size={13} color="#EF4444" />
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              ))}
            </div>
          )}
        </div>

        {/* === GHOST POOL (mock / coming soon) === */}
        <div className="px-4 sm:px-5 pb-3">
          <div className="flex items-center gap-2 mb-3 pt-2" style={{ borderTop:"1px solid #E5E7EB" }}>
            <Ghost size={12} color="#7C3AED" />
            <span style={{ fontSize:"12px", color:"#111827", fontWeight:700 }}>Ghost Pool</span>
            <div className="px-2 py-0.5 rounded-full" style={{ background:"#F3F4F6", border:"1px solid #E5E7EB", fontSize:"8px", color:"#6B7280", fontWeight:600 }}>
              Coming soon
            </div>
          </div>
          <div className="p-4 rounded-xl" style={{ background:"#FFFFFF", border:"1px dashed #E5E7EB" }}>
            <div style={{ fontSize:"12px", color:"#9CA3AF", textAlign:"center", lineHeight:1.5 }}>
              Community ghost runs will appear here.<br/>Challenge other runners' best times.
            </div>
          </div>
        </div>

        {/* === PRIVACY TOGGLE === */}
        <div className="px-4 sm:px-5 pb-8">
          <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.4 }}
            className="p-4 rounded-xl"
            style={{ background:"#FFFFFF", border: isPublic ? "1px solid #BFDBFE" : "1px solid #E5E7EB", boxShadow:"0 2px 8px rgba(15,23,42,0.06)", transition:"all 0.4s ease" }}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: isPublic ? "#EFF6FF" : "#F3F4F6", border: isPublic ? "1px solid #BFDBFE" : "1px solid #E5E7EB", transition:"all 0.3s ease" }}>
                  {isPublic ? <Globe size={16} color="#2563EB" /> : <Lock size={16} color="#9CA3AF" />}
                </div>
                <div className="min-w-0">
                  <div style={{ fontSize:"12px", fontWeight:700, color:"#111827" }}>Share to community</div>
                  <div style={{ fontSize:"10px", color:"#6B7280", fontWeight:500, marginTop:"1px" }}>
                    {isPublic ? "Your pace data is visible to others" : "Run data is private"}
                  </div>
                </div>
              </div>
              <button onClick={() => setIsPublic(p => !p)}
                className="relative flex-shrink-0 rounded-full transition-all duration-300 active:scale-95"
                style={{ width:"52px", height:"28px", background: isPublic ? "#2563EB" : "#E5E7EB", border:"none" }}>
                <motion.div animate={{ x: isPublic ? 26 : 2 }} transition={{ type:"spring", stiffness:400, damping:25 }}
                  className="absolute top-1 rounded-full"
                  style={{ width:"20px", height:"20px", background:"#FFFFFF", boxShadow:"0 1px 4px rgba(15,23,42,0.15)" }} />
              </button>
            </div>
            {isPublic && (
              <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }} exit={{ opacity:0, height:0 }}
                className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{ background:"#EFF6FF", border:"1px solid #BFDBFE" }}>
                <Shield size={11} color="#2563EB" />
                <span style={{ fontSize:"10px", color:"#3B82F6", lineHeight:1.4 }}>
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
