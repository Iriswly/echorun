import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Play, Pause, ChevronLeft, ChevronRight, Check, Trophy, Star, Volume2, VolumeX } from "lucide-react";
import { useNavigate } from "react-router";
import { getProfile } from "../../utils/profile.js";
import { getLevelInfo } from "../../utils/scoring.js";
import { ALL_BADGES } from "../../utils/badges.js";
import { getStorageKey } from "../../utils/auth.js";
import { generateCustomCoachPersona, voiceStyleToCoachAlias } from "../../utils/aiCoach";
import { getAudioStatus, setAudioEnabled, speakMessage, stopSpeech, subscribeAudioStatus } from "../../utils/audio.js";

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

const CUSTOM_CARD_ID = 999;

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

async function playCoachSample(
  coach: (typeof coaches)[number],
  setPlayingId: (id: number | null) => void
) {
  const audioStatus = getAudioStatus();
  if (!audioStatus.supported) {
    alert(audioStatus.lastError || "Voice preview is not supported in this browser.");
    return;
  }

  await speakMessage(coach.sample, {
    coachAlias: coach.alias,
    onStart: () => setPlayingId(coach.id),
    onEnd: () => setPlayingId(null),
    onError: () => setPlayingId(null),
  });
}

export function CoachSelection() {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [audioStatus, setAudioStatus] = useState(getAudioStatus());
  const [isScrollingProgrammatically, setIsScrollingProgrammatically] = useState(false);
  const [customRequest, setCustomRequest] = useState("");
  const [customPersonaPrompt, setCustomPersonaPrompt] = useState("");
  const [customPersonaSummary, setCustomPersonaSummary] = useState("");
  const [customVoiceStyle, setCustomVoiceStyle] = useState("gentle");
  const [personaLoading, setPersonaLoading] = useState(false);
  const [personaError, setPersonaError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setProfile(getProfile());
    const unsubscribe = subscribeAudioStatus(setAudioStatus);
    return () => {
      unsubscribe();
      stopSpeech();
    };
  }, []);

  const scrollToCard = useCallback((index: number) => {
    if (!scrollRef.current) return;
    const card = scrollRef.current.children[index] as HTMLElement | null;
    if (!card) return;

    const containerWidth = scrollRef.current.clientWidth;
    const cardLeft = card.offsetLeft;
    const cardWidth = card.offsetWidth;
    const targetLeft = cardLeft - (containerWidth - cardWidth) / 2;
    const maxScrollLeft = Math.max(0, scrollRef.current.scrollWidth - containerWidth);

    setIsScrollingProgrammatically(true);
    scrollRef.current.scrollTo({ left: Math.min(Math.max(0, targetLeft), maxScrollLeft), behavior: "smooth" });
    setTimeout(() => setIsScrollingProgrammatically(false), 600);
    setSelectedIdx(index);
  }, []);

  useEffect(() => {
    setTimeout(() => scrollToCard(0), 100);
  }, [scrollToCard]);

  const handleScroll = () => {
    if (!scrollRef.current || isScrollingProgrammatically) return;

    const containerRect = scrollRef.current.getBoundingClientRect();
    const containerCenter = containerRect.left + containerRect.width / 2;
    let closestIndex = 0;
    let minDistance = Infinity;

    Array.from(scrollRef.current.children).forEach((child, idx) => {
      const childRect = (child as HTMLElement).getBoundingClientRect();
      const childCenter = childRect.left + childRect.width / 2;
      const distance = Math.abs(childCenter - containerCenter);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = idx;
      }
    });

    setSelectedIdx(closestIndex);
  };

  const customBaseCoach = coaches[0];
  const customCard = {
    id: CUSTOM_CARD_ID,
    name: "Your Custom Coach",
    alias: "CUSTOM",
    style: "AI Tailored",
    vibe: "Make It Yours",
    description: "Describe the tone you want and turn it into a dedicated coach personality.",
    color: "#2563EB",
    secondaryColor: "#1D4ED8",
    glowColor: "rgba(37,99,235,0.22)",
    gradient: "linear-gradient(160deg, #EFF6FF 0%, #F7F8FA 100%)",
    borderColor: "#93C5FD",
    sample: customPersonaSummary || "Describe the voice you want, then generate a custom coach persona.",
    avatar: "",
    emoji: "AI",
    isCustom: true,
  };
  const cards = [...coaches, customCard];
  const selectedCoach = cards[selectedIdx];
  const isCustomSelected = selectedCoach.id === CUSTOM_CARD_ID;
  const levelInfo = profile ? getLevelInfo(profile.totalPoints) : null;

  const handleGeneratePersona = async () => {
    const trimmed = customRequest.trim();
    if (!trimmed) {
      setPersonaError("Describe the coach you want first.");
      return;
    }

    setPersonaLoading(true);
    setPersonaError("");

    const generated = await generateCustomCoachPersona({
      coachAlias: customBaseCoach.alias,
      coachName: customBaseCoach.name,
      baseStyle: customBaseCoach.style,
      userRequest: trimmed,
    });

    setCustomPersonaPrompt(generated.prompt);
    setCustomPersonaSummary(generated.summary);
    setCustomVoiceStyle(generated.voiceStyle || "gentle");
    setPersonaLoading(false);
  };

  return (
    <div className="relative flex flex-col h-full min-w-0 overflow-hidden" style={{ background: "#F7F8FA" }}>
      <motion.div
        key={selectedCoach.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="absolute inset-0 pointer-events-none"
        style={{ background: selectedCoach.gradient }}
      />

      {/* Scrollable content */}
      <div
        className="echorun-scroll-hidden relative z-10 flex-1 min-h-0 overflow-y-auto"
        style={{ paddingBottom: "8px", scrollbarWidth: "none", msOverflowStyle: "none" }}
      >

        {/* Header */}
        <div className="px-4 sm:px-6 pt-4 pb-1">
          <div className="flex items-center justify-between mb-1.5">
            <span style={{ fontSize: "11px", letterSpacing: "0.2em", color: selectedCoach.color, fontWeight: 700, fontFamily: "'Archivo', sans-serif" }}>
              ECHORUN
            </span>
            <button
              onClick={() => setAudioEnabled(!audioStatus.enabled)}
              className="px-2 py-1 rounded-full flex items-center gap-1.5 active:scale-95"
              style={{ background: `${selectedCoach.color}18`, border: `1px solid ${selectedCoach.borderColor}`, fontSize: "9px", color: selectedCoach.color, fontWeight: 700, letterSpacing: "0.1em" }}
              aria-label={audioStatus.enabled ? "Mute voice coach" : "Enable voice coach"}
            >
              {audioStatus.enabled ? <Volume2 size={11} /> : <VolumeX size={11} />}
              {audioStatus.enabled ? "VOICE ON" : "MUTED"}
            </button>
          </div>
          <h1 style={{ fontSize: "19px", fontWeight: 800, color: "#111827", letterSpacing: "-0.02em", lineHeight: 1.15, fontFamily: "'Archivo Black', sans-serif" }}>
            Choose Your <span style={{ color: selectedCoach.color }}>Running Coach</span>
          </h1>
          <p style={{ fontSize: "11px", color: "#6B7280", marginTop: "1px" }}>Select a voice style for your run.</p>

          {/* Profile summary strip */}
          {profile && levelInfo && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-2 mt-2 px-2.5 py-1.5 rounded-xl flex-wrap"
              style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", boxShadow: "0 1px 4px rgba(15,23,42,0.06)" }}
            >
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg" style={{ background: `${selectedCoach.color}12`, border: `1px solid ${selectedCoach.borderColor}` }}>
                <Trophy size={9} color={selectedCoach.color} />
                <span style={{ fontSize: "10px", fontWeight: 800, color: selectedCoach.color, fontFamily: "'Archivo Black', sans-serif" }}>
                  LVL {levelInfo.level}
                </span>
              </div>
              <span style={{ fontSize: "10px", color: "#6B7280", fontWeight: 600 }}>{profile.totalPoints} XP</span>
              <div className="flex items-center gap-1">
                <Star size={9} fill="#F59E0B" color="#F59E0B" />
                <span style={{ fontSize: "10px", color: "#6B7280", fontWeight: 600 }}>
                  {profile.badges.length} badge{profile.badges.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex-1" />
              <div className="flex items-center gap-1.5">
                <div className="rounded-full overflow-hidden" style={{ width: "40px", height: "3px", background: "#E5E7EB" }}>
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
        <div className="mt-2">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex gap-4 overflow-x-auto"
            style={{
              scrollSnapType: "x mandatory",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              paddingInline: "max(16px, calc((100% - min(280px, calc(100vw - 48px))) / 2))",
              paddingBottom: "8px",
            }}
          >
            {cards.map((coach, idx) => {
              const isActive = idx === selectedIdx;
              const isPlaying = playingId === coach.id;
              const isCustomCard = coach.id === CUSTOM_CARD_ID;

              return (
                <motion.div
                  key={coach.id}
                  onClick={() => { setSelectedIdx(idx); scrollToCard(idx); }}
                  animate={{ scale: isActive ? 1 : 0.9, opacity: isActive ? 1 : 0.65 }}
                  transition={{ duration: 0.3 }}
                  className="relative flex-shrink-0 rounded-2xl overflow-hidden cursor-pointer"
                  style={{ width: "min(280px, calc(100vw - 48px))", maxWidth: "100%", scrollSnapAlign: "center", background: "#FFFFFF", border: `1.5px solid ${isActive ? coach.borderColor : "#E5E7EB"}`, boxShadow: isActive ? "0 8px 24px rgba(15,23,42,0.10)" : "0 2px 8px rgba(15,23,42,0.06)" }}
                >
                  {!isCustomCard ? (
                    <div className="relative overflow-hidden" style={{ height: "clamp(150px, 24dvh, 200px)" }}>
                      <img src={coach.avatar} alt={coach.name} className="w-full h-full object-cover" style={{ filter: "saturate(0.75) brightness(1.05)" }} />
                      <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 50%, rgba(255,255,255,0.95) 100%)" }} />
                      <div className="absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.9)", border: `1px solid ${coach.borderColor}`, fontSize: "20px" }}>
                        {coach.emoji}
                      </div>
                      {isActive && (
                        <div className="absolute top-3 left-3 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: coach.color, boxShadow: `0 0 10px ${coach.color}` }}>
                          <Check size={14} color="#fff" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="relative overflow-hidden p-4" style={{ height: "clamp(150px, 24dvh, 200px)", background: "radial-gradient(circle at 20% 20%, rgba(37,99,235,0.22) 0%, rgba(255,255,255,0.96) 55%, #FFFFFF 100%)" }}>
                      <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.0) 0%, rgba(255,255,255,0.78) 100%)" }} />
                      <div className="relative flex h-full flex-col justify-between">
                        <div className="flex items-start justify-between">
                          <div className="px-2 py-1 rounded-full" style={{ background: "#FFFFFF", border: `1px solid ${coach.borderColor}`, fontSize: "9px", color: coach.color, fontWeight: 800, letterSpacing: "0.12em" }}>
                            PERSONALIZED
                          </div>
                          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "#FFFFFF", border: `1px solid ${coach.borderColor}`, fontSize: "14px", fontWeight: 900, color: coach.color }}>
                            AI
                          </div>
                        </div>
                        <div className="relative">
                          <div style={{ fontSize: "11px", color: coach.color, fontWeight: 800, letterSpacing: "0.18em", marginBottom: "4px" }}>FIFTH COACH</div>
                          <div style={{ fontSize: "24px", color: "#111827", fontWeight: 900, lineHeight: 1, fontFamily: "'Archivo Black', sans-serif" }}>Built By You</div>
                          <div style={{ fontSize: "12px", color: "#6B7280", marginTop: "6px", lineHeight: 1.35 }}>
                            {customPersonaSummary || "One sentence in. One coach persona out."}
                          </div>
                        </div>
                      </div>
                      {isActive && (
                        <div className="absolute top-3 left-3 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: coach.color, boxShadow: `0 0 10px ${coach.color}` }}>
                          <Check size={14} color="#fff" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="p-4">
                    <div style={{ fontSize: "10px", letterSpacing: "0.2em", color: coach.color, fontWeight: 700, marginBottom: "2px" }}>{coach.alias}</div>
                    <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#111827", letterSpacing: "-0.01em", lineHeight: 1.1, fontFamily: "'Archivo Black', sans-serif", marginBottom: "4px" }}>{coach.name}</h3>
                    <p style={{ fontSize: "12px", color: "#6B7280", marginBottom: "10px", lineHeight: 1.4 }}>{coach.description}</p>

                    <div className="flex flex-wrap gap-2 mb-3">
                      <div className="flex items-center gap-1 px-3 py-1 rounded-full min-w-0" style={{ background: `${coach.color}12`, border: `1px solid ${coach.borderColor}` }}>
                        <span style={{ fontSize: "9px", color: "#9CA3AF", fontWeight: 600, letterSpacing: "0.08em" }}>STYLE</span>
                        <span style={{ fontSize: "12px", color: coach.color, fontWeight: 700 }}>{coach.style}</span>
                      </div>
                      <div className="flex items-center gap-1 px-3 py-1 rounded-full min-w-0" style={{ background: "#F3F4F6", border: "1px solid #E5E7EB" }}>
                        <span style={{ fontSize: "9px", color: "#9CA3AF", fontWeight: 600, letterSpacing: "0.08em" }}>VIBE</span>
                        <span style={{ fontSize: "12px", color: "#374151", fontWeight: 700 }}>{coach.vibe}</span>
                      </div>
                    </div>

                    {!isCustomCard ? (
                      <>
                        <div className="px-3 py-2.5 rounded-xl mb-3" style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", fontSize: "12px", color: "#6B7280", fontStyle: "italic", lineHeight: 1.4 }}>
                          "{coach.sample}"
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isPlaying) {
                              stopSpeech();
                              setPlayingId(null);
                            } else {
                              playCoachSample(coach, setPlayingId);
                            }
                          }}
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl transition-all active:scale-95"
                          style={{ background: `${coach.color}10`, border: `1px solid ${coach.borderColor}`, color: coach.color }}
                        >
                          <motion.div animate={{ scale: isPlaying ? [1, 1.2, 1] : 1 }} transition={{ repeat: isPlaying ? Infinity : 0, duration: 0.8 }}>
                            {isPlaying ? <Pause size={15} /> : <Play size={15} />}
                          </motion.div>
                          <WaveformBars isPlaying={isPlaying} color={coach.color} />
                          <span style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.1em" }}>
                            {isPlaying ? "PLAYING..." : audioStatus.enabled ? "LISTEN TO SAMPLE" : "VOICE MUTED"}
                          </span>
                        </button>
                      </>
                    ) : (
                      <>
                        <textarea
                          value={customRequest}
                          onChange={(event) => setCustomRequest(event.target.value)}
                          onClick={(event) => event.stopPropagation()}
                          placeholder="I want a gentle coach who celebrates progress and gives short practical cues."
                          rows={3}
                          className="w-full rounded-xl px-3 py-3 outline-none resize-none mb-3"
                          style={{ border: "1px solid #E5E7EB", background: "#F9FAFB", fontSize: "12px", color: "#111827", lineHeight: 1.45 }}
                        />

                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            handleGeneratePersona();
                          }}
                          disabled={personaLoading}
                          className="w-full py-3 rounded-xl transition-all active:scale-95"
                          style={{ background: `${coach.color}10`, border: `1px solid ${coach.borderColor}`, color: coach.color, fontSize: "11px", fontWeight: 800, letterSpacing: "0.1em", opacity: personaLoading ? 0.75 : 1 }}
                        >
                          {personaLoading ? "GENERATING..." : "GENERATE CUSTOM PERSONA"}
                        </button>

                        {personaError && isActive && (
                          <div className="mt-3 px-3 py-2 rounded-xl" style={{ background: "#FEF2F2", border: "1px solid #FECACA", fontSize: "11px", color: "#B91C1C", fontWeight: 600 }}>
                            {personaError}
                          </div>
                        )}

                        {customPersonaSummary && (
                          <div className="mt-3 px-3 py-2.5 rounded-xl" style={{ background: `${coach.color}10`, border: `1px solid ${coach.borderColor}` }}>
                            <div style={{ fontSize: "9px", color: coach.color, fontWeight: 800, letterSpacing: "0.12em", marginBottom: "4px" }}>PERSONA READY</div>
                            <div style={{ fontSize: "12px", color: "#111827", fontWeight: 700, lineHeight: 1.35 }}>{customPersonaSummary}</div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Compact controls row: arrow + dots + counter + arrow */}
          <div className="flex items-center justify-between px-4 mt-2">
            <button onClick={() => scrollToCard(Math.max(0, selectedIdx - 1))} disabled={selectedIdx === 0}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
              style={{ background: selectedIdx === 0 ? "#F3F4F6" : "#FFFFFF", border: "1px solid #E5E7EB", color: selectedIdx === 0 ? "#D1D5DB" : "#6B7280" }}>
              <ChevronLeft size={16} />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                {cards.map((_, idx) => (
                  <button key={idx} onClick={() => scrollToCard(idx)} className="transition-all duration-300 rounded-full"
                    style={{ width: selectedIdx === idx ? "16px" : "5px", height: "5px", background: selectedIdx === idx ? selectedCoach.color : "#D1D5DB" }} />
                ))}
              </div>
              <span style={{ fontSize: "10px", color: "#9CA3AF", fontWeight: 600, letterSpacing: "0.1em" }}>
                {selectedIdx + 1}/{cards.length}
              </span>
            </div>

            <button onClick={() => scrollToCard(Math.min(cards.length - 1, selectedIdx + 1))} disabled={selectedIdx === cards.length - 1}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
              style={{ background: selectedIdx === cards.length - 1 ? "#F3F4F6" : "#FFFFFF", border: "1px solid #E5E7EB", color: selectedIdx === cards.length - 1 ? "#D1D5DB" : "#6B7280" }}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Sticky Confirm button — sits above bottom nav */}
      <div
        className="relative z-20 flex-shrink-0 px-4 sm:px-6 py-3"
        style={{ background: "linear-gradient(to top, #F7F8FA 70%, transparent)", borderTop: "1px solid rgba(229,231,235,0.6)" }}
      >
        <AnimatePresence mode="wait">
          {confirmed ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full rounded-xl flex items-center justify-center gap-3"
              style={{ background: `${selectedCoach.color}15`, border: `1.5px solid ${selectedCoach.borderColor}`, height: "52px" }}
            >
              <Check size={18} color={selectedCoach.color} />
              <span style={{ color: selectedCoach.color, fontSize: "14px", fontWeight: 800, letterSpacing: "0.05em" }}>
                {selectedCoach.alias} Selected
              </span>
            </motion.div>
          ) : (
            <motion.button
              initial={{ opacity: 1 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                if (isCustomSelected && !customPersonaPrompt.trim()) {
                  setPersonaError("Generate the custom persona card before confirming it.");
                  return;
                }

                localStorage.setItem(getStorageKey("ECHORUN_COACH"), JSON.stringify(
                  isCustomSelected
                    ? {
                        alias: "CUSTOM",
                        displayAlias: "CUSTOM",
                        baseCoachAlias: voiceStyleToCoachAlias(customVoiceStyle),
                        color: customCard.color,
                        emoji: "AI",
                        borderColor: customCard.borderColor,
                        customStyleRequest: customRequest.trim(),
                        customPersonaPrompt,
                        customPersonaSummary,
                        voiceStyle: customVoiceStyle,
                      }
                    : {
                        alias: selectedCoach.alias,
                        displayAlias: selectedCoach.alias,
                        baseCoachAlias: selectedCoach.alias,
                        color: selectedCoach.color,
                        emoji: selectedCoach.emoji,
                        borderColor: selectedCoach.borderColor,
                      },
                ));
                setConfirmed(true);
                setTimeout(() => navigate("/run"), 800);
              }}
              className="w-full rounded-xl flex items-center justify-center gap-3 transition-all active:scale-97"
              style={{ background: selectedCoach.color, boxShadow: `0 4px 16px ${selectedCoach.glowColor}`, border: "none", height: "52px" }}
            >
              <span style={{ color: "#fff", fontSize: "15px", fontWeight: 800, letterSpacing: "0.06em", fontFamily: "'Archivo Black', sans-serif" }}>
                Confirm Selection
              </span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
