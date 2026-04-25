import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Pause, Play, Square, Trophy } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { calculateRunPoints } from "../../utils/scoring.js";
import { evaluateBadges, ALL_BADGES } from "../../utils/badges.js";
import { updateProfileAfterRun, getProfile } from "../../utils/profile.js";
import { saveRunRecord } from "../../utils/storage.js";
import { getCoachMessage, resetCoachSession, speakMessage } from "../../utils/coachMessages.js";

// ── path data (visual only, not business logic) ──────────────────────────────
const PATH_POINTS = [
  [30,240],[50,220],[80,210],[110,200],[130,185],[140,165],
  [145,145],[155,128],[170,115],[190,108],[210,105],[230,108],
  [248,115],[262,128],[270,145],[275,162],[278,180],[278,198],
  [272,215],[260,226],[245,232],[228,235],[210,236],[192,234],
  [178,228],[168,218],[162,206],[160,192],[163,178],[170,166],
  [180,158],[195,153],[210,152],[224,155],[235,162],[242,172],
  [244,184],[242,196],[235,206],[225,212],[213,215],[200,214],
];
const TOTAL_SEG = PATH_POINTS.length - 1;

function lerp(a: number[], b: number[], t: number): [number,number] {
  return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t];
}
function getPointOnPath(p: number): [number,number] {
  const c = Math.min(Math.max(p,0),1);
  const raw = c * TOTAL_SEG;
  const seg = Math.floor(raw);
  const t = raw - seg;
  if (seg >= TOTAL_SEG) return PATH_POINTS[TOTAL_SEG] as [number,number];
  return lerp(PATH_POINTS[seg], PATH_POINTS[seg+1], t);
}

// ── map SVG ───────────────────────────────────────────────────────────────────
function CityMapSVG({ userProgress, ghostProgress, isGhostMode }: {
  userProgress: number; ghostProgress: number; isGhostMode: boolean;
}) {
  const userPos = getPointOnPath(userProgress);
  const ghostPos = getPointOnPath(ghostProgress);
  const pathD = PATH_POINTS.map((p,i)=>(i===0?"M":"L")+p[0]+","+p[1]).join(" ");
  const endIdx = Math.floor(userProgress * TOTAL_SEG);
  const completedD = PATH_POINTS.slice(0, endIdx+1).map((p,i)=>(i===0?"M":"L")+p[0]+","+p[1]).join(" ");
  const gap = (userProgress - ghostProgress) * 400;
  const ghostDim = gap > 0; // user ahead → ghost behind → dim it

  return (
    <svg viewBox="0 0 310 265" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="glow-cyan" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="glow-yellow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="glow-soft" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <radialGradient id="ghostPulse" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F97316" stopOpacity="0.25"/>
          <stop offset="100%" stopColor="#F97316" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="userPulse" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#2563EB" stopOpacity="0.25"/>
          <stop offset="100%" stopColor="#2563EB" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <rect width="310" height="265" fill="#EFF6FF"/>
      {Array.from({length:16},(_,i)=>(
        <line key={`h${i}`} x1="0" y1={i*18} x2="310" y2={i*18} stroke="#DBEAFE" strokeWidth="1"/>
      ))}
      {Array.from({length:18},(_,i)=>(
        <line key={`v${i}`} x1={i*18} y1="0" x2={i*18} y2="265" stroke="#DBEAFE" strokeWidth="1"/>
      ))}
      {[
        [10,10,55,55],[75,10,55,35],[140,10,40,45],[190,10,50,40],[250,10,45,50],
        [10,75,40,60],[60,55,40,40],[115,65,35,45],[165,58,45,35],[220,65,40,45],
        [270,70,30,45],[10,145,50,55],[70,120,35,45],[120,125,30,40],[240,125,40,50],
        [10,210,55,45],[80,195,40,55],[155,225,35,35],[265,195,35,60],[220,225,40,35],
      ].map(([x,y,w,h],i)=>(
        <rect key={i} x={x} y={y} width={w} height={h}
          fill={i%3===0?"#BFDBFE":i%3===1?"#C7D2FE":"#D1FAE5"}
          stroke="#E0E7FF" strokeWidth="0.5" rx="2"/>
      ))}
      <path d={pathD} fill="none" stroke="#93C5FD" strokeWidth="2.5" strokeOpacity="0.5" strokeLinecap="round" strokeLinejoin="round"/>
      {completedD.length > 1 && (
        <path d={completedD} fill="none" stroke="#2563EB" strokeWidth="3" strokeOpacity="0.9" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow-soft)"/>
      )}
      {/* Ghost marker — only in ghost mode */}
      {isGhostMode && (
        <>
          <circle cx={ghostPos[0]} cy={ghostPos[1]} r="18" fill="url(#ghostPulse)" opacity={ghostDim ? 0.4 : 1}/>
          <circle cx={ghostPos[0]} cy={ghostPos[1]} r="8" fill={ghostDim ? "#9CA3AF" : "#F97316"}
            fillOpacity={ghostDim ? 0.6 : 0.9} filter="url(#glow-yellow)"/>
          <text x={ghostPos[0]} y={ghostPos[1]+4} textAnchor="middle" fontSize="7" fill="#fff" fontWeight="900">
            {ghostDim ? "▼" : "G"}
          </text>
        </>
      )}
      <circle cx={userPos[0]} cy={userPos[1]} r="18" fill="url(#userPulse)"/>
      <circle cx={userPos[0]} cy={userPos[1]} r="8" fill="#2563EB" fillOpacity="0.95" filter="url(#glow-cyan)"/>
      <circle cx={userPos[0]} cy={userPos[1]} r="12" fill="none" stroke="#2563EB" strokeWidth="1.5" strokeOpacity="0.4"/>
      <text x={userPos[0]} y={userPos[1]+4} textAnchor="middle" fontSize="8" fill="#fff" fontWeight="900">U</text>
      <text x={PATH_POINTS[0][0]+8} y={PATH_POINTS[0][1]-4} fontSize="7" fill="#9CA3AF" fontWeight="600" letterSpacing="1">START</text>
    </svg>
  );
}

// ── ghost status text ─────────────────────────────────────────────────────────
function ghostStatusText(gap: number): string {
  if (gap > 50)  return "You're pulling away from the ghost.";
  if (gap > 0)   return "You're slightly ahead. Keep the rhythm.";
  if (gap > -50) return "The ghost is just ahead. You can catch it.";
  return "The ghost is escaping. Time to push.";
}

// ── result card ───────────────────────────────────────────────────────────────
function ResultCard({ result, finalGap, pointsEarned, newBadges, coachAlias, coachColor, onSave }: {
  result: "win"|"lose"|"tie"; finalGap: number; pointsEarned: number;
  newBadges: string[]; coachAlias: string; coachColor: string; onSave: ()=>void;
}) {
  const cfg = {
    win:  { emoji:"🏆", label:"You beat the ghost!", color:"#10B981", bg:"#F0FDF4", border:"#6EE7B7" },
    lose: { emoji:"👻", label:"The ghost beat you.", color:"#F97316", bg:"#FFF7ED", border:"#FDBA74" },
    tie:  { emoji:"🤝", label:"Neck and neck! Almost a tie.", color:"#7C3AED", bg:"#F5F3FF", border:"#C4B5FD" },
  }[result];

  const absFinalGap = Math.abs(Math.round(finalGap));
  const gapLabel = result === "win"
    ? `You beat the ghost by ${absFinalGap}m`
    : result === "lose"
    ? `The ghost beat you by ${absFinalGap}m`
    : "Gap within 5m — almost identical!";

  const badgeObjs = newBadges.map(id => ALL_BADGES.find(b => b.id === id)).filter(Boolean);

  return (
    <motion.div
      initial={{ opacity:0, y:30 }}
      animate={{ opacity:1, y:0 }}
      className="absolute inset-0 z-30 flex flex-col items-center justify-center px-5"
      style={{ background:"rgba(247,248,250,0.97)" }}
    >
      <motion.div initial={{ scale:0.8 }} animate={{ scale:1 }} transition={{ type:"spring", stiffness:300, damping:20 }}
        className="text-5xl mb-3">{cfg.emoji}</motion.div>
      <div style={{ fontSize:"22px", fontWeight:800, color:cfg.color, fontFamily:"'Archivo Black', sans-serif", letterSpacing:"-0.02em", marginBottom:"4px" }}>
        {cfg.label}
      </div>
      <div style={{ fontSize:"13px", color:"#6B7280", marginBottom:"20px" }}>{gapLabel}</div>

      <div className="w-full rounded-2xl p-4 mb-4" style={{ background:cfg.bg, border:`1.5px solid ${cfg.border}` }}>
        <div className="flex items-center justify-between mb-3">
          <span style={{ fontSize:"11px", color:cfg.color, fontWeight:700, letterSpacing:"0.1em" }}>POINTS EARNED</span>
          <span style={{ fontSize:"28px", fontWeight:900, color:cfg.color, fontFamily:"'Archivo Black', sans-serif" }}>+{pointsEarned}</span>
        </div>
        {badgeObjs.length > 0 && (
          <div>
            <div style={{ fontSize:"10px", color:"#9CA3AF", fontWeight:600, letterSpacing:"0.1em", marginBottom:"8px" }}>NEW BADGES</div>
            <div className="flex flex-wrap gap-2">
              {badgeObjs.map(b => (
                <div key={b!.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
                  style={{ background:"#FFFFFF", border:`1px solid ${cfg.border}` }}>
                  <span style={{ fontSize:"16px" }}>{b!.icon}</span>
                  <div>
                    <div style={{ fontSize:"10px", fontWeight:700, color:"#111827" }}>{b!.name}</div>
                    <div style={{ fontSize:"9px", color:"#9CA3AF" }}>{b!.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="w-full p-3 rounded-xl mb-4" style={{ background:"#F9FAFB", border:"1px solid #E5E7EB" }}>
        <div style={{ fontSize:"10px", color:coachColor, fontWeight:700, letterSpacing:"0.1em", marginBottom:"4px" }}>
          {coachAlias} SAYS
        </div>
        <div style={{ fontSize:"12px", color:"#374151", fontStyle:"italic", lineHeight:1.5 }}>
          {result === "win"  && coachAlias === "DREDD"   && '"Not bad. Don\'t let it go to your head."'}
          {result === "win"  && coachAlias === "KIRA"    && '"You ran your race. The ghost could not follow."'}
          {result === "win"  && coachAlias === "TITAN"   && '"THAT\'S HOW IT\'S DONE! You crushed it!"'}
          {result === "win"  && coachAlias === "SPECTER" && '"Ghost defeated. Performance data logged."'}
          {result === "lose" && coachAlias === "DREDD"   && '"Ghost won. Study it. Come back harder."'}
          {result === "lose" && coachAlias === "KIRA"    && '"The ghost was faster today. Tomorrow is yours."'}
          {result === "lose" && coachAlias === "TITAN"   && '"Ghost took this one. Next time — no mercy."'}
          {result === "lose" && coachAlias === "SPECTER" && '"Deficit recorded. Adjust pace strategy for next run."'}
          {result === "tie"  && coachAlias === "DREDD"   && '"A tie. Means you can beat it. Go again."'}
          {result === "tie"  && coachAlias === "KIRA"    && '"Perfect balance. You and the ghost ran as one."'}
          {result === "tie"  && coachAlias === "TITAN"   && '"SO CLOSE! Next time you finish it!"'}
          {result === "tie"  && coachAlias === "SPECTER" && '"Statistical tie. Marginal improvement needed."'}
        </div>
      </div>

      <button onClick={onSave}
        className="w-full py-4 rounded-xl flex items-center justify-center gap-2"
        style={{ background:coachColor, border:"none" }}>
        <Trophy size={16} color="#fff"/>
        <span style={{ color:"#fff", fontSize:"15px", fontWeight:800, letterSpacing:"0.06em", fontFamily:"'Archivo Black', sans-serif" }}>
          Save & Continue
        </span>
      </button>
    </motion.div>
  );
}

// ── standard run result card ──────────────────────────────────────────────────
function StandardResultCard({ distance, elapsed, pointsEarned, newBadges, coachColor, onSave }: {
  distance: number; elapsed: number; pointsEarned: number;
  newBadges: string[]; coachColor: string; onSave: ()=>void;
}) {
  const mins = Math.floor(elapsed/60);
  const secs = Math.floor(elapsed%60);
  const paceSecPerKm = distance > 0 ? (elapsed / (distance/1000)) : 0;
  const paceMins = Math.floor(paceSecPerKm/60);
  const paceSecs = Math.floor(paceSecPerKm%60);
  const badgeObjs = newBadges.map(id => ALL_BADGES.find(b => b.id === id)).filter(Boolean);

  return (
    <motion.div initial={{ opacity:0, y:30 }} animate={{ opacity:1, y:0 }}
      className="absolute inset-0 z-30 flex flex-col items-center justify-center px-5"
      style={{ background:"rgba(247,248,250,0.97)" }}>
      <div className="text-5xl mb-3">🏃</div>
      <div style={{ fontSize:"22px", fontWeight:800, color:"#2563EB", fontFamily:"'Archivo Black', sans-serif", letterSpacing:"-0.02em", marginBottom:"16px" }}>
        Run Complete!
      </div>
      <div className="w-full rounded-2xl p-4 mb-4" style={{ background:"#EFF6FF", border:"1.5px solid #BFDBFE" }}>
        <div className="grid grid-cols-3 gap-3 mb-3">
          {[
            { label:"DIST", value:`${(distance/1000).toFixed(2)}km` },
            { label:"TIME", value:`${mins}:${String(secs).padStart(2,"0")}` },
            { label:"PACE", value:`${paceMins}'${String(paceSecs).padStart(2,"0")}"` },
          ].map(({label,value})=>(
            <div key={label} className="text-center">
              <div style={{ fontSize:"8px", color:"#9CA3AF", fontWeight:700, letterSpacing:"0.15em", marginBottom:"2px" }}>{label}</div>
              <div style={{ fontSize:"16px", fontWeight:900, color:"#111827", fontFamily:"'Archivo Black', sans-serif", letterSpacing:"-0.02em" }}>{value}</div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between pt-3" style={{ borderTop:"1px solid #BFDBFE" }}>
          <span style={{ fontSize:"11px", color:"#2563EB", fontWeight:700, letterSpacing:"0.1em" }}>POINTS EARNED</span>
          <span style={{ fontSize:"28px", fontWeight:900, color:"#2563EB", fontFamily:"'Archivo Black', sans-serif" }}>+{pointsEarned}</span>
        </div>
      </div>
      {badgeObjs.length > 0 && (
        <div className="w-full rounded-xl p-3 mb-4" style={{ background:"#FFFBEB", border:"1px solid #FDE68A" }}>
          <div style={{ fontSize:"10px", color:"#D97706", fontWeight:700, letterSpacing:"0.1em", marginBottom:"8px" }}>NEW BADGES</div>
          <div className="flex flex-wrap gap-2">
            {badgeObjs.map(b => (
              <div key={b!.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
                style={{ background:"#FFFFFF", border:"1px solid #FDE68A" }}>
                <span style={{ fontSize:"16px" }}>{b!.icon}</span>
                <div>
                  <div style={{ fontSize:"10px", fontWeight:700, color:"#111827" }}>{b!.name}</div>
                  <div style={{ fontSize:"9px", color:"#9CA3AF" }}>{b!.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <button onClick={onSave} className="w-full py-4 rounded-xl flex items-center justify-center gap-2"
        style={{ background:coachColor, border:"none" }}>
        <Trophy size={16} color="#fff"/>
        <span style={{ color:"#fff", fontSize:"15px", fontWeight:800, letterSpacing:"0.06em", fontFamily:"'Archivo Black', sans-serif" }}>
          Save & Continue
        </span>
      </button>
    </motion.div>
  );
}

// ── main component ────────────────────────────────────────────────────────────
export function GhostRunTracking() {
  const location = useLocation();
  const navigate = useNavigate();

  const ghostRecord: any = location.state?.ghostRecord ?? null;
  const isGhostMode = !!ghostRecord;

  const storedCoach = (() => {
    try { return JSON.parse(localStorage.getItem("ECHORUN_COACH") || "{}"); } catch { return {}; }
  })();
  const coachAlias: string = storedCoach.alias || "DREDD";
  const coachColor: string = storedCoach.color || "#EF4444";
  const coachEmoji: string = storedCoach.emoji || "😤";

  const [phase, setPhase] = useState<"idle"|"running"|"paused"|"done">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [wasBehinDuringRun, setWasBehind] = useState(false);
  const [coachMsg, setCoachMsg] = useState<string|null>(null);
  const [result, setResult] = useState<{outcome:"win"|"lose"|"tie"; finalGap:number; pointsEarned:number; newBadges:string[]}|null>(null);
  const [standardResult, setStandardResult] = useState<{pointsEarned:number; newBadges:string[]}|null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const distRef  = useRef<ReturnType<typeof setInterval>|null>(null);
  const milestoneRef = useRef({ m500:false, m1k:false, m2k:false, t5:false, t10:false });
  const prevGapRef = useRef(0);

  const ghostDistance = isGhostMode && ghostRecord
    ? Math.min(ghostRecord.distance, (elapsed / ghostRecord.duration) * ghostRecord.distance)
    : 0;
  const gap = distance - ghostDistance;

  const MAX_VISUAL_DIST = 2000;
  const userProgress  = Math.min(distance / MAX_VISUAL_DIST, 1);
  const ghostProgress = Math.min(ghostDistance / MAX_VISUAL_DIST, 1);
  const pace = elapsed > 0 && distance > 0 ? elapsed / (distance / 1000) : 0;

  const fmtTime = (s: number) => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(Math.floor(s%60)).padStart(2,"0")}`;
  const fmtDist = (m: number) => m >= 1000 ? `${(m/1000).toFixed(2)}km` : `${Math.round(m)}m`;
  const fmtPace = (s: number) => s > 0 ? `${Math.floor(s/60)}'${String(Math.floor(s%60)).padStart(2,"0")}"` : "--'--\"";

  const triggerMsg = useCallback((event: string) => {
    const msg = getCoachMessage(coachAlias, event);
    if (msg) { setCoachMsg(msg); speakMessage(msg); }
  }, [coachAlias]);

  useEffect(() => {
    if (phase !== "running") return;
    const m = milestoneRef.current;
    if (!m.m500 && distance >= 500)  { m.m500 = true; triggerMsg("distance_500m"); }
    if (!m.m1k  && distance >= 1000) { m.m1k  = true; triggerMsg("distance_1km"); }
    if (!m.m2k  && distance >= 2000) { m.m2k  = true; triggerMsg("distance_2km"); }
    if (!m.t5   && elapsed >= 300)   { m.t5   = true; triggerMsg("time_5min"); }
    if (!m.t10  && elapsed >= 600)   { m.t10  = true; triggerMsg("time_10min"); }
    if (isGhostMode) {
      const prev = prevGapRef.current;
      if (gap > 0 && prev <= 0) triggerMsg("new_lead");
      if (gap < 0 && prev >= 0) triggerMsg("lost_lead");
      if (gap < 0) setWasBehind(true);
      if (gap > prev && gap < 0) triggerMsg("closing_gap");
      if (gap < prev && gap > 0) triggerMsg("gap_widening");
      prevGapRef.current = gap;
    }
  }, [elapsed, distance, phase, isGhostMode, gap, triggerMsg]);

  const startTimers = useCallback(() => {
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    distRef.current  = setInterval(() => setDistance(d => d + 2.5 + (Math.random() - 0.5) * 0.8), 1000);
  }, []);

  const stopTimers = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (distRef.current)  { clearInterval(distRef.current);  distRef.current  = null; }
  }, []);

  const handleStart = () => {
    resetCoachSession();
    milestoneRef.current = { m500:false, m1k:false, m2k:false, t5:false, t10:false };
    prevGapRef.current = 0;
    setPhase("running");
    startTimers();
    setCoachMsg(isGhostMode ? "Ghost run started. Let's go." : "Standard run started. Find your pace.");
  };

  const handlePause  = () => { stopTimers(); setPhase("paused"); };
  const handleResume = () => { setPhase("running"); startTimers(); };

  const handleStop = () => {
    stopTimers();
    setPhase("done");
    const profile = getProfile();
    if (isGhostMode) {
      const outcome: "win"|"lose"|"tie" = gap > 5 ? "win" : gap < -5 ? "lose" : "tie";
      const runResult = { mode:"ghost" as const, distance, duration:elapsed, avgPace:pace, finalGap:gap, result:outcome, wasBehinDuringRun };
      const pts = calculateRunPoints(runResult);
      const newBadges = evaluateBadges(profile, { ...runResult, pointsEarned:pts });
      updateProfileAfterRun({ ...runResult, pointsEarned:pts }, newBadges);
      setResult({ outcome, finalGap:gap, pointsEarned:pts, newBadges });
    } else {
      const runResult = { mode:"standard" as const, distance, duration:elapsed, avgPace:pace, finalGap:0, result:undefined, wasBehinDuringRun:false };
      const pts = calculateRunPoints(runResult);
      const newBadges = evaluateBadges(profile, { ...runResult, pointsEarned:pts });
      updateProfileAfterRun({ ...runResult, pointsEarned:pts }, newBadges);
      setStandardResult({ pointsEarned:pts, newBadges });
    }
  };

  const handleSave = () => {
    saveRunRecord({
      mode: isGhostMode ? "ghost" : "standard",
      distance: Math.round(distance),
      duration: elapsed,
      avgPace: pace,
      date: new Date().toISOString(),
      coachAlias,
      ...(isGhostMode && result ? { ghostRecordId:ghostRecord?.id, result:result.outcome, finalGap:result.finalGap, pointsEarned:result.pointsEarned } : {}),
      ...(!isGhostMode && standardResult ? { pointsEarned:standardResult.pointsEarned } : {}),
    });
    navigate("/dashboard");
  };

  const deltaLabel = isGhostMode
    ? gap === 0 ? "EVEN" : gap > 0 ? `+${Math.round(gap)}m` : `${Math.round(gap)}m`
    : phase === "idle" ? "FIRST RUN" : "STANDARD";
  const deltaColor = isGhostMode ? (gap > 0 ? "#10B981" : gap < 0 ? "#F97316" : "#9CA3AF") : "#9CA3AF";

  return (
    <div className="relative flex flex-col h-full overflow-hidden" style={{ background:"#F7F8FA" }}>
      {phase === "done" && isGhostMode && result && (
        <ResultCard result={result.outcome} finalGap={result.finalGap} pointsEarned={result.pointsEarned}
          newBadges={result.newBadges} coachAlias={coachAlias} coachColor={coachColor} onSave={handleSave} />
      )}
      {phase === "done" && !isGhostMode && standardResult && (
        <StandardResultCard distance={distance} elapsed={elapsed} pointsEarned={standardResult.pointsEarned}
          newBadges={standardResult.newBadges} coachColor={coachColor} onSave={handleSave} />
      )}

      {/* Header */}
      <div className="flex-shrink-0 px-5 pt-10 pb-3 relative z-10" style={{ background:"#FFFFFF", borderBottom:"1px solid #E5E7EB" }}>
        <div className="flex items-center justify-between">
          <div>
            <div style={{ fontSize:"10px", color:coachColor, fontWeight:700, letterSpacing:"0.2em", marginBottom:"2px" }}>ECHORUN</div>
            <h1 style={{ fontSize:"22px", fontWeight:800, color:"#111827", letterSpacing:"-0.02em", lineHeight:1.1, fontFamily:"'Archivo Black', sans-serif" }}>
              {isGhostMode ? "Ghost Run" : "Standard Run"}
            </h1>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background:`${coachColor}12`, border:`1px solid ${coachColor}30` }}>
            <span style={{ fontSize:"14px" }}>{coachEmoji}</span>
            <span style={{ fontSize:"10px", color:coachColor, fontWeight:700, letterSpacing:"0.08em" }}>{coachAlias}</span>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-shrink-0 relative" style={{ height:"200px", background:"#EFF6FF" }}>
        <CityMapSVG userProgress={userProgress} ghostProgress={ghostProgress} isGhostMode={isGhostMode} />
        <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full flex items-center gap-1.5"
          style={{ background:"rgba(255,255,255,0.92)", border:`1.5px solid ${deltaColor}40`, backdropFilter:"blur(4px)" }}>
          <div className="w-2 h-2 rounded-full" style={{ background:deltaColor }} />
          <span style={{ fontSize:"12px", fontWeight:800, color:deltaColor, fontFamily:"'Archivo Black', sans-serif", letterSpacing:"-0.01em" }}>
            {deltaLabel}
          </span>
        </div>
        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full"
          style={{ background:"rgba(255,255,255,0.9)", border:"1px solid #E5E7EB", fontSize:"8px", color:"#6B7280", fontWeight:700, letterSpacing:"0.12em" }}>
          {isGhostMode ? "👻 GHOST MODE" : "🏃 STANDARD"}
        </div>
      </div>

      {/* Stats */}
      <div className="flex-shrink-0 px-4 py-3 grid grid-cols-3 gap-2.5">
        {[{ label:"TIME", value:fmtTime(elapsed) }, { label:"DIST", value:fmtDist(distance) }, { label:"PACE", value:fmtPace(pace) }].map(({label,value})=>(
          <div key={label} className="rounded-xl p-3 text-center" style={{ background:"#FFFFFF", border:"1px solid #E5E7EB", boxShadow:"0 1px 4px rgba(15,23,42,0.05)" }}>
            <div style={{ fontSize:"7px", color:"#9CA3AF", fontWeight:700, letterSpacing:"0.15em", marginBottom:"3px" }}>{label}</div>
            <div style={{ fontSize:"17px", fontWeight:900, color:"#111827", fontFamily:"'Archivo Black', sans-serif", letterSpacing:"-0.02em", lineHeight:1 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Ghost status */}
      {isGhostMode && phase === "running" && (
        <div className="flex-shrink-0 mx-4 mb-2 px-3 py-2 rounded-xl" style={{ background:"#FFF7ED", border:"1px solid #FDBA74" }}>
          <div style={{ fontSize:"11px", color:"#92400E", fontWeight:600, lineHeight:1.4 }}>{ghostStatusText(gap)}</div>
        </div>
      )}

      {/* Coach feedback */}
      <AnimatePresence>
        {coachMsg && (
          <motion.div key={coachMsg} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }} transition={{ duration:0.3 }}
            className="flex-shrink-0 mx-4 mb-2 p-3 rounded-xl flex items-start gap-2.5"
            style={{ background:"#FFFFFF", border:`1px solid ${coachColor}30`, boxShadow:"0 2px 8px rgba(15,23,42,0.06)" }}>
            <span style={{ fontSize:"16px", flexShrink:0 }}>{coachEmoji}</span>
            <div>
              <div style={{ fontSize:"8px", color:coachColor, fontWeight:700, letterSpacing:"0.12em", marginBottom:"2px" }}>{coachAlias}</div>
              <div style={{ fontSize:"12px", color:"#374151", fontStyle:"italic", lineHeight:1.45 }}>"{coachMsg}"</div>
            </div>
            <button onClick={()=>setCoachMsg(null)} style={{ marginLeft:"auto", color:"#D1D5DB", fontSize:"14px", flexShrink:0 }}>×</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1" />

      {/* Controls */}
      <div className="flex-shrink-0 px-5 pb-5 pt-2">
        {phase === "idle" && (
          <motion.button whileTap={{ scale:0.96 }} onClick={handleStart}
            className="w-full py-5 rounded-xl flex items-center justify-center gap-3"
            style={{ background:coachColor, border:"none", boxShadow:`0 4px 16px ${coachColor}40` }}>
            <Play size={20} color="#fff" fill="#fff"/>
            <span style={{ color:"#fff", fontSize:"16px", fontWeight:800, letterSpacing:"0.06em", fontFamily:"'Archivo Black', sans-serif" }}>
              {isGhostMode ? "Start Ghost Run" : "Start Run"}
            </span>
          </motion.button>
        )}
        {phase === "running" && (
          <div className="flex gap-3">
            <motion.button whileTap={{ scale:0.95 }} onClick={handlePause}
              className="flex-1 py-4 rounded-xl flex items-center justify-center gap-2"
              style={{ background:"#FFFFFF", border:"1.5px solid #E5E7EB" }}>
              <Pause size={18} color="#374151"/>
              <span style={{ fontSize:"14px", fontWeight:700, color:"#374151" }}>Pause</span>
            </motion.button>
            <motion.button whileTap={{ scale:0.95 }} onClick={handleStop}
              className="flex-1 py-4 rounded-xl flex items-center justify-center gap-2"
              style={{ background:"#FEF2F2", border:"1.5px solid #FECACA" }}>
              <Square size={18} color="#EF4444"/>
              <span style={{ fontSize:"14px", fontWeight:700, color:"#EF4444" }}>Stop</span>
            </motion.button>
          </div>
        )}
        {phase === "paused" && (
          <div className="flex gap-3">
            <motion.button whileTap={{ scale:0.95 }} onClick={handleResume}
              className="flex-1 py-4 rounded-xl flex items-center justify-center gap-2"
              style={{ background:coachColor, border:"none" }}>
              <Play size={18} color="#fff" fill="#fff"/>
              <span style={{ fontSize:"14px", fontWeight:700, color:"#fff" }}>Resume</span>
            </motion.button>
            <motion.button whileTap={{ scale:0.95 }} onClick={handleStop}
              className="flex-1 py-4 rounded-xl flex items-center justify-center gap-2"
              style={{ background:"#FEF2F2", border:"1.5px solid #FECACA" }}>
              <Square size={18} color="#EF4444"/>
              <span style={{ fontSize:"14px", fontWeight:700, color:"#EF4444" }}>Stop</span>
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
}
