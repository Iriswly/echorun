import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Play, Pause, ChevronLeft, ChevronRight, Check, Trophy, Star } from "lucide-react";
import { useNavigate } from "react-router";
import { getProfile } from "../../utils/profile.js";
import { getLevelInfo } from "../../utils/scoring.js";
import { ALL_BADGES } from "../../utils/badges.js";

const coaches = [
  {
    id: 1,
    name: "The Snarky Coach",
    alias: "DREDD",
    style: "No Excuses",
    vibe: "Push Harder",
    description: "Brutally honest. Zero sympathy. Gets results.",
    color: "#EF4444",
    secondaryColor: "#b91c1c",
    glowColor: "rgba(239,68,68,0.2)",
    gradient: "linear-gradient(160deg, #fff5f5 0%, #F7F8FA 100%)",
    borderColor: "#FCA5A5",
    sample: "You call that a sprint? My grandmother moves faster.",
    avatar: "https://images.unsplash.com/photo-1767066990216-72b1f7c0b320?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400",
    emoji: "😤",
  },
  {
    id: 2,
    name: "Zen Master",
    alias: "KIRA",
    style: "Flow State",
    vibe: "Breathe & Conquer",
    description: "Ancient wisdom meets modern performance.",
    color: "#14B8A6",
    secondaryColor: "#0f766e",
    glowColor: "rgba(20,184,166,0.2)",
    gradient: "linear-gradient(160deg, #f0fdfa 0%, #F7F8FA 100%)",
    borderColor: "#99F6E4",
    sample: "Your breath is the metronome. Let your legs follow.",
    avatar: "https://images.unsplash.com/photo-1616072775440-ca2ea7c7ce13?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400",
    emoji: "🧘",
  },
  {
    id: 3,
    name: "Beast Mode",
    alias: "TITAN",
    style: "Full Throttle",
    vibe: "Pain Is Temporary",
    description: "Unleash your potential. No limits.",
    color: "#F97316",
    secondaryColor: "#c2410c",
    glowColor: "rgba(249,115,22,0.2)",
    gradient: "linear-gradient(160deg, #fff7ed 0%, #F7F8FA 100%)",
    borderColor: "#FDBA74",
    sample: "Every step is a battle. Win every single one.",
    avatar: "https://images.unsplash.com/photo-1555577773-ac8657852524?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400",
    emoji: "⚡",
  },
  {
    id: 4,
    name: "Phantom Pacer",
    alias: "SPECTER",
    style: "Data Driven",
    vibe: "Beat Your Pace",
    description: "Pure analytics. Optimal pacing. Smart economy.",
    color: "#7C3AED",
    secondaryColor: "#5b21b6",
    glowColor: "rgba(124,58,237,0.2)",
    gradient: "linear-gradient(160deg, #f5f3ff 0%, #F7F8FA 100%)",
    borderColor: "#C4B5FD",
    sample: "At 2.4km, increase cadence by 4%. Your data demands it.",
    avatar: "https://images.unsplash.com/photo-1568843287278-8a8a33055de8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400",
    emoji: "📊",
  },
];

function WaveformBars({ isPlaying, color }: { isPlaying: boolean; color: string }) {
  const [heights, setHeights] = useState([4, 8, 12, 7, 5, 10, 8, 4, 6, 9, 5, 7]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setHeights(prev => prev.map(() => Math.random() * 14 + 3));
    }, 120);
    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <div className="flex items-center gap-0.5" style={{ height: "20px" }}>
      {heights.map((h, i) => (
        <motion.div
          key={i}
          animate={{ height: isPlaying ? h : [4, 8, 12, 7, 5, 10, 8, 4][i % 8] }}
          transition={{ duration: 0.1 }}
          className="rounded-full"
          style={{ width: "2.5px", minHeight: "3px", backgroundColor: color, height: `${h}px` }}
        />
      ))}
    </div>
  );
}

export function CoachSelection() {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setProfile(getProfile());
  }, []);

  const scrollToCard = useCallback((index: number) => {
    if (!scrollRef.current) return;
    const cardWidth = 280 + 16;
    const containerWidth = scrollRef.current.offsetWidth;
    const offset = index * cardWidth - (containerWidth - 280) / 2;
    scrollRef.current.scrollTo({ left: offset, behavior: "smooth" });
    setSelectedIdx(index);
  }, []);

  useEffect(() => {
    setTimeout(() => scrollToCard(0), 100);
  }, [scrollToCard]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const cardWidth = 280 + 16;
    const scrollLeft = scrollRef.current.scrollLeft;
    const clampedIndex = Math.max(0, Math.min(coaches.length - 1, Math.round(scrollLeft / cardWidth)));
    setSelectedIdx(clampedIndex);
  };

  const selectedCoach = coaches[selectedIdx];
  const levelInfo = profile ? getLevelInfo(profile.totalPoints) : null;

  return (
    <div className="relative flex flex-col h-full overflow-hidden" style={{ background: "#F7F8FA" }}>
      <motion.div
        key={selectedCoach.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="absolute inset-0 pointer-events-none"
        style={{ background: selectedCoach.gradient }}
      />

      {/* Header */}
      <div className="relative z-10 px-6 pt-12 pb-3">
        <div className="flex items-center justify-between mb-2">
          <span style={{ fontSize: "11px", letterSpacing: "0.2em", color: selectedCoach.color, fontWeight: 700, fontFamily: "'Archivo', sans-serif" }}>
            ECHORUN
          </span>
          <div className="px-2 py-0.5 rounded-full" style={{ background: `${selectedCoach.color}18`, border: `1px solid ${selectedCoach.borderColor}`, fontSize: "9px", color: selectedCoach.color, fontWeight: 700, letterSpacing: "0.1em" }}>
            AI COACH
          </div>
        </div>
        <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#111827", letterSpacing: "-0.02em", lineHeight: 1.15, fontFamily: "'Archivo Black', sans-serif" }}>
          Choose Your<br />
          <span style={{ color: selectedCoach.color }}>Running Coach</span>
        </h1>
        <p style={{ fontSize: "13px", color: "#6B7280", marginTop: "4px" }}>Select a voice style for your run.</p>

        {/* Profile summary strip */}
        {profile && levelInfo && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2 mt-3 p-2.5 rounded-xl"
            style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", boxShadow: "0 1px 4px rgba(15,23,42,0.06)" }}
          >
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: `${selectedCoach.color}12`, border: `1px solid ${selectedCoach.borderColor}` }}>
              <Trophy size={10} color={selectedCoach.color} />
              <span style={{ fontSize: "11px", fontWeight: 800, color: selectedCoach.color, fontFamily: "'Archivo Black', sans-serif" }}>
                LVL {levelInfo.level}
              </span>
            </div>
            <div style={{ fontSize: "11px", color: "#6B7280", fontWeight: 600 }}>
              {profile.totalPoints} XP
            </div>
            <div className="flex items-center gap-1">
              <Star size={9} fill="#F59E0B" color="#F59E0B" />
              <span style={{ fontSize: "11px", color: "#6B7280", fontWeight: 600 }}>
                {profile.badges.length} badge{profile.badges.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex-1" />
            {/* XP progress bar */}
            <div className="flex items-center gap-1.5">
              <div className="rounded-full overflow-hidden" style={{ width: "48px", height: "4px", background: "#E5E7EB" }}>
                <div className="h-full rounded-full" style={{ width: `${levelInfo.progress * 100}%`, background: selectedCoach.color, transition: "width 0.6s ease" }} />
              </div>
              <span style={{ fontSize: "9px", color: "#9CA3AF", fontWeight: 600 }}>
                {levelInfo.currentLevelPoints}/{levelInfo.nextLevelPoints}
              </span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Carousel */}
      <div className="relative z-10 flex-1 flex flex-col justify-center">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-4 overflow-x-auto pb-4"
          style={{ scrollSnapType: "x mandatory", scrollbarWidth: "none", msOverflowStyle: "none", paddingLeft: "55px", paddingRight: "55px" }}
        >
          {coaches.map((coach, idx) => {
            const isActive = idx === selectedIdx;
            const isPlaying = playingId === coach.id;

            return (
              <motion.div
                key={coach.id}
                onClick={() => { setSelectedIdx(idx); scrollToCard(idx); }}
                animate={{ scale: isActive ? 1 : 0.9, opacity: isActive ? 1 : 0.65 }}
                transition={{ duration: 0.3 }}
                className="relative flex-shrink-0 rounded-2xl overflow-hidden cursor-pointer"
                style={{ width: "280px", scrollSnapAlign: "center", background: "#FFFFFF", border: `1.5px solid ${isActive ? coach.borderColor : "#E5E7EB"}`, boxShadow: isActive ? "0 8px 24px rgba(15,23,42,0.10)" : "0 2px 8px rgba(15,23,42,0.06)" }}
              >
                <div className="relative h-52 overflow-hidden">
                  <img src={coach.avatar} alt={coach.name} className="w-full h-full object-cover" style={{ filter: "saturate(0.75) brightness(1.05)" }} />
                  <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 40%, rgba(255,255,255,0.95) 100%)" }} />
                  <div className="absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center text-xl" style={{ background: "rgba(255,255,255,0.9)", border: `1px solid ${coach.borderColor}` }}>
                    {coach.emoji}
                  </div>
                  {isActive && (
                    <div className="absolute top-3 left-3 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: coach.color, boxShadow: `0 0 12px ${coach.color}` }}>
                      <Check size={14} color="#000" strokeWidth={3} />
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <div style={{ fontSize: "9px", letterSpacing: "0.2em", color: coach.color, fontWeight: 700, marginBottom: "2px" }}>{coach.alias}</div>
                  <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#111827", letterSpacing: "-0.01em", lineHeight: 1, fontFamily: "'Archivo Black', sans-serif", marginBottom: "6px" }}>{coach.name}</h3>
                  <p style={{ fontSize: "12px", color: "#6B7280", marginBottom: "12px", lineHeight: 1.4 }}>{coach.description}</p>

                  <div className="flex gap-2 mb-3">
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full" style={{ background: `${coach.color}12`, border: `1px solid ${coach.borderColor}` }}>
                      <span style={{ fontSize: "8px", color: "#9CA3AF", fontWeight: 600, letterSpacing: "0.08em" }}>STYLE</span>
                      <span style={{ fontSize: "10px", color: coach.color, fontWeight: 700 }}>{coach.style}</span>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full" style={{ background: "#F3F4F6", border: "1px solid #E5E7EB" }}>
                      <span style={{ fontSize: "8px", color: "#9CA3AF", fontWeight: 600, letterSpacing: "0.08em" }}>VIBE</span>
                      <span style={{ fontSize: "10px", color: "#374151", fontWeight: 700 }}>{coach.vibe}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl mb-3" style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", fontSize: "11px", color: "#6B7280", fontStyle: "italic", lineHeight: 1.5 }}>
                    "{coach.sample}"
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); setPlayingId(isPlaying ? null : coach.id); }}
                    className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl transition-all active:scale-95"
                    style={{ background: `${coach.color}10`, border: `1px solid ${coach.borderColor}`, color: coach.color }}
                  >
                    <motion.div animate={{ scale: isPlaying ? [1, 1.2, 1] : 1 }} transition={{ repeat: isPlaying ? Infinity : 0, duration: 0.8 }}>
                      {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                    </motion.div>
                    <WaveformBars isPlaying={isPlaying} color={coach.color} />
                    <span style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.1em" }}>
                      {isPlaying ? "PLAYING..." : "LISTEN TO SAMPLE"}
                    </span>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Dot indicators */}
        <div className="flex justify-center gap-2 mt-2">
          {coaches.map((_, idx) => (
            <button key={idx} onClick={() => scrollToCard(idx)} className="transition-all duration-300 rounded-full"
              style={{ width: selectedIdx === idx ? "20px" : "6px", height: "6px", background: selectedIdx === idx ? selectedCoach.color : "#D1D5DB" }} />
          ))}
        </div>

        {/* Nav arrows */}
        <div className="flex justify-between px-4 mt-3">
          <button onClick={() => scrollToCard(Math.max(0, selectedIdx - 1))} disabled={selectedIdx === 0}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{ background: selectedIdx === 0 ? "#F3F4F6" : "#FFFFFF", border: "1px solid #E5E7EB", color: selectedIdx === 0 ? "#D1D5DB" : "#6B7280" }}>
            <ChevronLeft size={18} />
          </button>
          <span style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 600, letterSpacing: "0.1em", alignSelf: "center" }}>
            {selectedIdx + 1} / {coaches.length}
          </span>
          <button onClick={() => scrollToCard(Math.min(coaches.length - 1, selectedIdx + 1))} disabled={selectedIdx === coaches.length - 1}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{ background: selectedIdx === coaches.length - 1 ? "#F3F4F6" : "#FFFFFF", border: "1px solid #E5E7EB", color: selectedIdx === coaches.length - 1 ? "#D1D5DB" : "#6B7280" }}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Confirm button */}
      <div className="relative z-10 px-6 pb-6 pt-4">
        <AnimatePresence mode="wait">
          {confirmed ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full py-5 rounded-xl flex items-center justify-center gap-3"
              style={{ background: `${selectedCoach.color}15`, border: `1.5px solid ${selectedCoach.borderColor}` }}
            >
              <Check size={20} color={selectedCoach.color} />
              <span style={{ color: selectedCoach.color, fontSize: "15px", fontWeight: 800, letterSpacing: "0.05em" }}>
                {selectedCoach.alias} Selected
              </span>
            </motion.div>
          ) : (
            <motion.button
              initial={{ opacity: 1 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                localStorage.setItem("ECHORUN_COACH", JSON.stringify({ alias: selectedCoach.alias, color: selectedCoach.color, emoji: selectedCoach.emoji, borderColor: selectedCoach.borderColor }));
                setConfirmed(true);
                setTimeout(() => navigate("/run"), 800);
              }}
              className="w-full py-5 rounded-xl flex items-center justify-center gap-3 transition-all active:scale-97"
              style={{ background: selectedCoach.color, boxShadow: `0 4px 16px ${selectedCoach.glowColor}`, border: "none" }}
            >
              <span style={{ color: "#fff", fontSize: "16px", fontWeight: 800, letterSpacing: "0.06em", fontFamily: "'Archivo Black', sans-serif" }}>
                Confirm Selection
              </span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
