import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Play, Pause, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { useNavigate } from "react-router";

const coaches = [
  {
    id: 1,
    name: "THE SNARKY COACH",
    alias: "DREDD",
    style: "NO EXCUSES",
    vibe: "STOP BEING SLOW",
    description: "Brutally honest. Zero sympathy. Gets results.",
    color: "#F2403B",
    secondaryColor: "#7a0c09",
    glowColor: "rgba(242,64,59,0.4)",
    gradient: "linear-gradient(160deg, #3d0a09 0%, #1a0404 60%, #0d0e02 100%)",
    borderColor: "rgba(242,64,59,0.5)",
    sample: "You call that a sprint? My grandmother moves faster.",
    avatar: "https://images.unsplash.com/photo-1767066990216-72b1f7c0b320?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400",
    emoji: "😈",
  },
  {
    id: 2,
    name: "ZEN MASTER",
    alias: "KIRA",
    style: "FLOW STATE",
    vibe: "BREATHE & CONQUER",
    description: "Ancient wisdom meets modern performance.",
    color: "#18ACB7",
    secondaryColor: "#0a5c63",
    glowColor: "rgba(24,172,183,0.4)",
    gradient: "linear-gradient(160deg, #061c1f 0%, #041213 60%, #0d0e02 100%)",
    borderColor: "rgba(24,172,183,0.5)",
    sample: "Your breath is the metronome. Let your legs follow.",
    avatar: "https://images.unsplash.com/photo-1616072775440-ca2ea7c7ce13?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400",
    emoji: "🧘",
  },
  {
    id: 3,
    name: "BEAST MODE",
    alias: "TITAN",
    style: "FULL THROTTLE",
    vibe: "PAIN IS TEMPORARY",
    description: "Unleash the monster within. No limits.",
    color: "#FFCD00",
    secondaryColor: "#7a6000",
    glowColor: "rgba(255,205,0,0.4)",
    gradient: "linear-gradient(160deg, #2a1f00 0%, #181200 60%, #0d0e02 100%)",
    borderColor: "rgba(255,205,0,0.5)",
    sample: "Every step is a battle. WIN. EVERY. SINGLE. ONE.",
    avatar: "https://images.unsplash.com/photo-1555577773-ac8657852524?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400",
    emoji: "⚡",
  },
  {
    id: 4,
    name: "PHANTOM PACER",
    alias: "SPECTER",
    style: "DATA DRIVEN",
    vibe: "GHOST YOUR LIMITS",
    description: "Pure analytics. Optimal pacing. Ghost economy.",
    color: "#a855f7",
    secondaryColor: "#4c1d80",
    glowColor: "rgba(168,85,247,0.4)",
    gradient: "linear-gradient(160deg, #1a0a2e 0%, #0f0619 60%, #0d0e02 100%)",
    borderColor: "rgba(168,85,247,0.5)",
    sample: "At 2.4km, increase cadence by 4%. Your data demands it.",
    avatar: "https://images.unsplash.com/photo-1568843287278-8a8a33055de8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400",
    emoji: "👻",
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
          style={{
            width: "2.5px",
            minHeight: "3px",
            backgroundColor: color,
            height: `${h}px`,
          }}
        />
      ))}
    </div>
  );
}

export function CoachSelection() {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

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
    const containerWidth = scrollRef.current.offsetWidth;
    const scrollLeft = scrollRef.current.scrollLeft;
    const index = Math.round((scrollLeft + (containerWidth - 280) / 2) / cardWidth - (containerWidth - 280) / 2 / cardWidth);
    const clampedIndex = Math.max(0, Math.min(coaches.length - 1, Math.round(scrollLeft / cardWidth)));
    setSelectedIdx(clampedIndex);
  };

  const selectedCoach = coaches[selectedIdx];

  return (
    <div
      className="relative flex flex-col h-full overflow-hidden"
      style={{ background: "#0d0e02" }}
    >
      {/* Background gradient that shifts per coach */}
      <motion.div
        key={selectedCoach.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="absolute inset-0 pointer-events-none"
        style={{ background: selectedCoach.gradient }}
      />

      {/* Header */}
      <div className="relative z-10 px-6 pt-12 pb-4">
        <div className="flex items-center justify-between mb-1">
          <span
            style={{
              fontSize: "10px",
              letterSpacing: "0.3em",
              color: selectedCoach.color,
              fontWeight: 800,
              fontFamily: "'Archivo', sans-serif",
              filter: `drop-shadow(0 0 6px ${selectedCoach.color})`,
            }}
          >
            ECHORUN //
          </span>
          <div
            className="px-2 py-0.5 rounded-sm"
            style={{
              background: "rgba(24,172,183,0.1)",
              border: "1px solid rgba(24,172,183,0.3)",
              fontSize: "9px",
              color: "#18ACB7",
              fontWeight: 800,
              letterSpacing: "0.15em",
            }}
          >
            AI COACH
          </div>
        </div>
        <h1
          style={{
            fontSize: "28px",
            fontWeight: 900,
            color: "#e8e8d0",
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            fontFamily: "'Archivo Black', sans-serif",
          }}
        >
          CHOOSE YOUR
          <br />
          <span style={{ color: selectedCoach.color, filter: `drop-shadow(0 0 10px ${selectedCoach.color})` }}>
            COACH
          </span>
        </h1>
      </div>

      {/* Carousel */}
      <div className="relative z-10 flex-1 flex flex-col justify-center">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-4 overflow-x-auto pb-4"
          style={{
            scrollSnapType: "x mandatory",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            paddingLeft: "55px",
            paddingRight: "55px",
          }}
        >
          {coaches.map((coach, idx) => {
            const isActive = idx === selectedIdx;
            const isPlaying = playingId === coach.id;

            return (
              <motion.div
                key={coach.id}
                onClick={() => {
                  setSelectedIdx(idx);
                  scrollToCard(idx);
                }}
                animate={{
                  scale: isActive ? 1 : 0.9,
                  opacity: isActive ? 1 : 0.6,
                }}
                transition={{ duration: 0.3 }}
                className="relative flex-shrink-0 rounded-2xl overflow-hidden cursor-pointer"
                style={{
                  width: "280px",
                  scrollSnapAlign: "center",
                  background: "rgba(13,14,2,0.6)",
                  backdropFilter: "blur(20px)",
                  border: `1.5px solid ${isActive ? coach.borderColor : "rgba(255,255,255,0.06)"}`,
                  boxShadow: isActive
                    ? `0 0 30px ${coach.glowColor}, inset 0 0 40px rgba(0,0,0,0.4)`
                    : "0 4px 20px rgba(0,0,0,0.4)",
                }}
              >
                {/* Avatar image */}
                <div className="relative h-52 overflow-hidden">
                  <img
                    src={coach.avatar}
                    alt={coach.name}
                    className="w-full h-full object-cover"
                    style={{ filter: `saturate(0.3) hue-rotate(${idx * 20}deg)` }}
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(to bottom, transparent 40%, ${coach.gradient.split("(")[1].split(",")[0]} 100%)`,
                    }}
                  />
                  {/* Coach emoji overlay */}
                  <div
                    className="absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center text-xl"
                    style={{
                      background: `rgba(13,14,2,0.7)`,
                      border: `1px solid ${coach.borderColor}`,
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    {coach.emoji}
                  </div>

                  {/* Selection indicator */}
                  {isActive && (
                    <div
                      className="absolute top-3 left-3 w-6 h-6 rounded-full flex items-center justify-center"
                      style={{
                        background: coach.color,
                        boxShadow: `0 0 12px ${coach.color}`,
                      }}
                    >
                      <Check size={14} color="#000" strokeWidth={3} />
                    </div>
                  )}
                </div>

                {/* Card body */}
                <div className="p-4">
                  {/* Name */}
                  <div
                    style={{
                      fontSize: "8px",
                      letterSpacing: "0.25em",
                      color: coach.color,
                      fontWeight: 800,
                      marginBottom: "2px",
                      filter: `drop-shadow(0 0 4px ${coach.color})`,
                    }}
                  >
                    {coach.alias}
                  </div>
                  <h3
                    style={{
                      fontSize: "18px",
                      fontWeight: 900,
                      color: "#e8e8d0",
                      letterSpacing: "-0.01em",
                      lineHeight: 1,
                      fontFamily: "'Archivo Black', sans-serif",
                      marginBottom: "8px",
                    }}
                  >
                    {coach.name}
                  </h3>
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#6a6b50",
                      marginBottom: "12px",
                      lineHeight: 1.4,
                    }}
                  >
                    {coach.description}
                  </p>

                  {/* Tags */}
                  <div className="flex gap-2 mb-3">
                    <div
                      className="flex items-center gap-1 px-2 py-1 rounded-sm"
                      style={{
                        background: `${coach.color}18`,
                        border: `1px solid ${coach.color}40`,
                      }}
                    >
                      <span style={{ fontSize: "8px", color: "#6a6b50", fontWeight: 700, letterSpacing: "0.1em" }}>STYLE</span>
                      <span style={{ fontSize: "10px", color: coach.color, fontWeight: 800, letterSpacing: "0.05em" }}>{coach.style}</span>
                    </div>
                    <div
                      className="flex items-center gap-1 px-2 py-1 rounded-sm"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <span style={{ fontSize: "8px", color: "#6a6b50", fontWeight: 700, letterSpacing: "0.1em" }}>VIBE</span>
                      <span style={{ fontSize: "10px", color: "#e8e8d0", fontWeight: 800, letterSpacing: "0.02em" }}>{coach.vibe}</span>
                    </div>
                  </div>

                  {/* Sample quote */}
                  <div
                    className="p-3 rounded-lg mb-3"
                    style={{
                      background: "rgba(0,0,0,0.3)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      fontSize: "11px",
                      color: "#8a8b6a",
                      fontStyle: "italic",
                      lineHeight: 1.4,
                    }}
                  >
                    "{coach.sample}"
                  </div>

                  {/* Listen to Sample */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPlayingId(isPlaying ? null : coach.id);
                    }}
                    className="w-full flex items-center justify-center gap-3 py-2.5 rounded-lg transition-all active:scale-95"
                    style={{
                      background: `${coach.color}15`,
                      border: `1px solid ${coach.color}50`,
                      color: coach.color,
                    }}
                  >
                    <motion.div
                      animate={{ scale: isPlaying ? [1, 1.2, 1] : 1 }}
                      transition={{ repeat: isPlaying ? Infinity : 0, duration: 0.8 }}
                    >
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
            <button
              key={idx}
              onClick={() => scrollToCard(idx)}
              className="transition-all duration-300 rounded-full"
              style={{
                width: selectedIdx === idx ? "20px" : "6px",
                height: "6px",
                background: selectedIdx === idx ? selectedCoach.color : "rgba(255,255,255,0.15)",
                boxShadow: selectedIdx === idx ? `0 0 8px ${selectedCoach.color}` : "none",
              }}
            />
          ))}
        </div>

        {/* Nav arrows */}
        <div className="flex justify-between px-4 mt-3">
          <button
            onClick={() => scrollToCard(Math.max(0, selectedIdx - 1))}
            disabled={selectedIdx === 0}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{
              background: selectedIdx === 0 ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: selectedIdx === 0 ? "#2a2b1a" : "#8a8b6a",
            }}
          >
            <ChevronLeft size={18} />
          </button>
          <span
            style={{
              fontSize: "10px",
              color: "#3a3b2a",
              fontWeight: 700,
              letterSpacing: "0.2em",
              alignSelf: "center",
            }}
          >
            {selectedIdx + 1} / {coaches.length}
          </span>
          <button
            onClick={() => scrollToCard(Math.min(coaches.length - 1, selectedIdx + 1))}
            disabled={selectedIdx === coaches.length - 1}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{
              background: selectedIdx === coaches.length - 1 ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: selectedIdx === coaches.length - 1 ? "#2a2b1a" : "#8a8b6a",
            }}
          >
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
              style={{
                background: "linear-gradient(135deg, rgba(24,172,183,0.2) 0%, rgba(24,172,183,0.1) 100%)",
                border: "1.5px solid rgba(24,172,183,0.5)",
                boxShadow: "0 0 20px rgba(24,172,183,0.2)",
              }}
            >
              <Check size={20} color="#18ACB7" />
              <span style={{ color: "#18ACB7", fontSize: "15px", fontWeight: 900, letterSpacing: "0.1em" }}>
                {selectedCoach.alias} SELECTED
              </span>
            </motion.div>
          ) : (
            <motion.button
              initial={{ opacity: 1 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                setConfirmed(true);
                setTimeout(() => navigate("/run"), 800);
              }}
              className="w-full py-5 rounded-xl flex items-center justify-center gap-3 transition-all active:scale-97"
              style={{
                background: "linear-gradient(135deg, #F2403B 0%, #c4261f 100%)",
                boxShadow: "0 0 25px rgba(242,64,59,0.4), 0 4px 15px rgba(0,0,0,0.4)",
                border: "1px solid rgba(242,64,59,0.3)",
              }}
            >
              <span
                style={{
                  color: "#fff",
                  fontSize: "16px",
                  fontWeight: 900,
                  letterSpacing: "0.12em",
                  fontFamily: "'Archivo Black', sans-serif",
                }}
              >
                CONFIRM SELECTION
              </span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
