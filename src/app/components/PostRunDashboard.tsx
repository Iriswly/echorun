import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trash2, Shield, Globe, Lock, Star, Trophy, Zap, Ghost, LogOut, UserPlus, Users, X, ChevronDown, ChevronUp } from "lucide-react";
import { useNavigate } from "react-router";
import { getProfile } from "../../utils/profile.js";
import { getLevelInfo } from "../../utils/scoring.js";
import { getRunHistory, saveRunRecord } from "../../utils/storage.js";
import { getCurrentUser, getStorageKey, logoutAccount } from "../../utils/auth.js";

const FRIENDS_KEY = "ECHORUN_FRIENDS";

const friendThemes = [
  { accent: "#7C3AED", soft: "#F5F3FF", border: "#D8B4FE", city: "Shanghai" },
  { accent: "#EC4899", soft: "#FDF2F8", border: "#F9A8D4", city: "Seoul" },
  { accent: "#14B8A6", soft: "#F0FDFA", border: "#99F6E4", city: "Tokyo" },
  { accent: "#F97316", soft: "#FFF7ED", border: "#FDBA74", city: "Singapore" },
];

function getStoredFriends() {
  try {
    const raw = localStorage.getItem(getStorageKey(FRIENDS_KEY));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredFriends(friends: any[]) {
  localStorage.setItem(getStorageKey(FRIENDS_KEY), JSON.stringify(friends));
}

function createDemoFriendRun(name: string, accent: string) {
  const now = Date.now();
  const presets = [
    { title: `${name}'s Test Dash 120m`, distance: 120, duration: 36, avgPace: 300 },
    { title: `${name}'s Test Tempo 180m`, distance: 180, duration: 54, avgPace: 300 },
    { title: `${name}'s Test Sprint 240m`, distance: 240, duration: 66, avgPace: 275 },
  ];
  const preset = presets[now % presets.length];
  return {
    mode: "standard",
    source: "friend",
    runnerName: name,
    title: preset.title,
    distance: preset.distance,
    duration: preset.duration,
    avgPace: preset.avgPace,
    distanceSeries: [
      { t: 0, d: 0 },
      { t: Math.round(preset.duration * 0.33), d: Math.round(preset.distance * 0.31) },
      { t: Math.round(preset.duration * 0.66), d: Math.round(preset.distance * 0.68) },
      { t: preset.duration, d: preset.distance },
    ],
    date: new Date(now - 1000 * 60 * ((now % 180) + 30)).toISOString(),
    pointsEarned: 0,
    friendAccent: accent,
  };
}

function deleteFriendById(id: number) {
  const nextFriends = getStoredFriends().filter((friend: any) => friend.id !== id);
  saveStoredFriends(nextFriends);
  return nextFriends;
}

function deleteRunRecord(id: number) {
  try {
    const raw = localStorage.getItem(getStorageKey("ECHORUN_RUNS"));
    const runs = raw ? JSON.parse(raw) : [];
    localStorage.setItem(getStorageKey("ECHORUN_RUNS"), JSON.stringify(runs.filter((r: any) => r.id !== id)));
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

function getFriendRunTheme(run: any) {
  const accent = run.friendAccent || "#7C3AED";
  if (accent === "#EC4899") {
    return { accent, soft: "#FDF2F8", border: "#F9A8D4", shadow: "rgba(236,72,153,0.10)" };
  }
  if (accent === "#14B8A6") {
    return { accent, soft: "#F0FDFA", border: "#99F6E4", shadow: "rgba(20,184,166,0.10)" };
  }
  if (accent === "#F97316") {
    return { accent, soft: "#FFF7ED", border: "#FDBA74", shadow: "rgba(249,115,22,0.10)" };
  }
  return { accent: "#7C3AED", soft: "#F8F5FF", border: "#D8B4FE", shadow: "rgba(124,58,237,0.08)" };
}

function getInitials(name: string) {
  return String(name)
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
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
  const [user, setUser] = useState<any>(getCurrentUser());
  const [isPublic, setIsPublic] = useState(false);
  const [deletingId, setDeletingId] = useState<number|null>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [friendName, setFriendName] = useState("");
  const [friendNotice, setFriendNotice] = useState<string | null>(null);
  const [friendsExpanded, setFriendsExpanded] = useState(false);

  useEffect(() => {
    setRuns(getRunHistory());
    setProfile(getProfile());
    setUser(getCurrentUser());
    setFriends(getStoredFriends());
  }, []);

  const handleDelete = (id: number) => {
    deleteRunRecord(id);
    setRuns(prev => prev.filter(r => r.id !== id));
    setProfile(getProfile());
  };

  const handleChallenge = (run: any) => {
    navigate("/run", { state: { mode:"ghost", ghostRecord: run } });
  };

  const handleLogout = () => {
    logoutAccount();
  };

  const handleAddFriend = () => {
    const trimmed = friendName.trim();
    if (!trimmed) {
      setFriendNotice("Enter a name first.");
      return;
    }

    const alreadyExists = friends.some((friend) => String(friend.name).toLowerCase() === trimmed.toLowerCase());
    if (alreadyExists) {
      setFriendNotice("That friend is already in your list.");
      return;
    }

    const theme = friendThemes[friends.length % friendThemes.length];
    const newFriend = {
      id: Date.now(),
      name: trimmed,
      initials: getInitials(trimmed),
      accent: theme.accent,
      soft: theme.soft,
      border: theme.border,
      city: theme.city,
    };
    const nextFriends = [newFriend, ...friends];
    saveStoredFriends(nextFriends);
    setFriends(nextFriends);
    saveRunRecord(createDemoFriendRun(trimmed, theme.accent));
    setRuns(getRunHistory());
    setFriendName("");
    setFriendNotice(`${trimmed} added with a demo ghost target.`);
  };

  const handleRemoveFriend = (id: number) => {
    setFriends(deleteFriendById(id));
  };

  const levelInfo = profile ? getLevelInfo(profile.totalPoints) : null;
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
            {user && (
              <div style={{ fontSize:"10px", color:"#6B7280", fontWeight:600, marginTop:"4px" }}>
                {user.name}
              </div>
            )}
          </div>
          {profile && levelInfo && (
            <div className="flex flex-col items-end gap-2 min-w-0">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ background: "#2563EB", boxShadow: "0 10px 22px rgba(37,99,235,0.22)" }}>
                  {getInitials(user?.name || "YOU")}
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background:"#EFF6FF", border:"1px solid #BFDBFE" }}>
                  <Trophy size={10} color="#2563EB" />
                  <span style={{ fontSize:"10px", color:"#2563EB", fontWeight:700, letterSpacing:"0.05em" }}>
                    LVL {levelInfo.level}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-7 h-7 rounded-full flex items-center justify-center active:scale-95"
                  style={{ background:"#F9FAFB", border:"1px solid #E5E7EB" }}
                  aria-label="Logout"
                >
                  <LogOut size={12} color="#6B7280" />
                </button>
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
        <div className="px-4 sm:px-5 pt-4 pb-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Users size={12} color="#7C3AED" />
              <span style={{ fontSize:"12px", color:"#111827", fontWeight:700 }}>Friends</span>
              <span style={{ fontSize:"10px", color:"#9CA3AF", fontWeight:600 }}>{friends.length} connected</span>
            </div>
            <button
              onClick={() => setFriendsExpanded((value) => !value)}
              className="flex items-center gap-1 rounded-full px-2.5 py-1 active:scale-95"
              style={{ background:"#FFFFFF", border:"1px solid #DDD6FE" }}
            >
              <span style={{ fontSize:"9px", color:"#7C3AED", fontWeight:800, letterSpacing:"0.1em" }}>
                {friendsExpanded ? "HIDE" : "SHOW"}
              </span>
              {friendsExpanded ? <ChevronUp size={12} color="#7C3AED" /> : <ChevronDown size={12} color="#7C3AED" />}
            </button>
          </div>

          <div className="rounded-2xl p-4" style={{ background:"linear-gradient(160deg, #FAF5FF 0%, #FFFFFF 60%, #F8FAFC 100%)", border:"1px solid #E9D5FF", boxShadow:"0 4px 18px rgba(124,58,237,0.08)" }}>
            <div className="flex gap-2 max-[340px]:flex-col">
              <input
                value={friendName}
                onChange={(event) => {
                  setFriendName(event.target.value);
                  if (friendNotice) setFriendNotice(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleAddFriend();
                }}
                placeholder="Add a demo friend by name"
                className="flex-1 rounded-2xl px-4 py-3 outline-none"
                style={{ background:"#FFFFFF", border:"1px solid #DDD6FE", fontSize:"13px", color:"#111827" }}
              />
              <motion.button
                whileTap={{ scale:0.96 }}
                onClick={handleAddFriend}
                className="rounded-2xl px-4 py-3 flex items-center justify-center gap-2"
                style={{ background:"linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)", border:"none", boxShadow:"0 10px 20px rgba(124,58,237,0.20)" }}
              >
                <UserPlus size={14} color="#fff" />
                <span style={{ fontSize:"12px", color:"#fff", fontWeight:800, letterSpacing:"0.06em", fontFamily:"'Archivo Black', sans-serif" }}>Add Friend</span>
              </motion.button>
            </div>

            <div style={{ fontSize:"10px", color: friendNotice?.includes("added") ? "#7C3AED" : "#9CA3AF", fontWeight:600, marginTop:"10px", minHeight:"14px" }}>
              {friendNotice || "Demo only: adding a friend also creates one local friend run for rematch testing."}
            </div>

            <AnimatePresence initial={false}>
              {friendsExpanded && (
                <motion.div
                  initial={{ opacity:0, height:0 }}
                  animate={{ opacity:1, height:"auto" }}
                  exit={{ opacity:0, height:0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 flex flex-col gap-2">
                    {friends.length === 0 ? (
                      <div className="w-full rounded-2xl px-4 py-4 text-center" style={{ background:"#FFFFFF", border:"1px dashed #D8B4FE" }}>
                        <div style={{ fontSize:"12px", fontWeight:700, color:"#374151", marginBottom:"4px" }}>No friends yet</div>
                        <div style={{ fontSize:"11px", color:"#9CA3AF", lineHeight:1.45 }}>Add one to create a local demo friend target.</div>
                      </div>
                    ) : (
                      friends.map((friend) => (
                        <div
                          key={friend.id}
                          className="relative flex items-center gap-3 rounded-2xl px-3 py-2.5"
                          style={{ background:friend.soft, border:`1px solid ${friend.border}` }}
                        >
                          <div
                            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white"
                            style={{ background:friend.accent, boxShadow:`0 6px 14px ${friend.accent}33` }}
                          >
                            {friend.initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div style={{ fontSize:"11px", color:"#111827", fontWeight:800, marginBottom:"2px", lineHeight:1.1 }}>{friend.name}</div>
                            <div style={{ fontSize:"9px", color:"#6B7280", lineHeight:1.3 }}>
                              Demo target from <span style={{ color:friend.accent, fontWeight:800 }}>{friend.city}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveFriend(friend.id)}
                            className="h-7 w-7 flex-shrink-0 rounded-full flex items-center justify-center active:scale-95"
                            style={{ background:"rgba(255,255,255,0.7)", border:`1px solid ${friend.border}` }}
                            aria-label={`Remove ${friend.name}`}
                          >
                            <X size={10} color={friend.accent} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* === RUN HISTORY === */}
        <div className="px-4 sm:px-5 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
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
                    (() => {
                      const friendTheme = run.source === "friend" ? getFriendRunTheme(run) : null;
                      return (
                    <motion.div
                      initial={{ opacity:0, x:-20 }}
                      animate={{ opacity:1, x:0 }}
                      exit={{ opacity:0, x:20, height:0 }}
                      transition={{ delay: idx * 0.05, duration:0.3 }}
                      className="p-4 rounded-xl"
                      style={{
                        background: run.source === "friend" ? friendTheme!.soft : "#FFFFFF",
                        border: run.source === "friend" ? `1px solid ${friendTheme!.border}` : "1px solid #E5E7EB",
                        boxShadow: run.source === "friend" ? `0 4px 18px ${friendTheme!.shadow}` : "0 2px 8px rgba(15,23,42,0.06)",
                        borderLeft: run.source === "friend" ? `6px solid ${friendTheme!.accent}` : "6px solid #2563EB",
                      }}>

                      {/* Top row */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0">
                          <div style={{ fontSize:"8px", color: run.source === "friend" ? friendTheme!.accent : "#2563EB", fontWeight:700, letterSpacing:"0.14em", marginBottom:"4px" }}>
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
                            <div className="px-1.5 py-0.5 rounded-full" style={{ background: run.mode === "ghost" ? "#FFF7ED" : run.source === "friend" ? `${friendTheme!.accent}12` : "#EFF6FF", border: run.mode === "ghost" ? "1px solid #FDBA74" : run.source === "friend" ? `1px solid ${friendTheme!.border}` : "1px solid #BFDBFE", fontSize:"8px", color: run.mode === "ghost" ? "#F97316" : run.source === "friend" ? friendTheme!.accent : "#2563EB", fontWeight:700, letterSpacing:"0.08em" }}>
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
                      );
                    })()
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
