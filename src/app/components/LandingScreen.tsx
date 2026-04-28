import { motion } from "motion/react";
import { Activity, ArrowRight, Bot, Ghost, Trophy } from "lucide-react";
import type { ThemePalette } from "../../utils/theme";

type LandingScreenProps = {
  theme: ThemePalette;
  onContinue: () => void;
};

function RunningPath() {
  return (
    <svg className="absolute left-0 right-0 top-1/4 opacity-[0.04]" viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice">
      <motion.path
        d="M 20 180 Q 60 140 100 160 T 180 120 T 260 140 T 300 100"
        fill="none"
        stroke="#EF4444"
        strokeWidth="3"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 2, ease: "easeInOut" }}
      />
      <motion.circle cx="300" cy="100" r="4" fill="#EF4444">
        <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
      </motion.circle>
    </svg>
  );
}

function FloatingOrbs() {
  return (
    <>
      <motion.div
        className="absolute rounded-full"
        style={{
          width: "60px",
          height: "60px",
          background: "radial-gradient(circle, rgba(239,68,68,0.15) 0%, transparent 70%)",
          top: "25%",
          left: "10%",
        }}
        animate={{ y: [0, -20, 0], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute rounded-full"
        style={{
          width: "40px",
          height: "40px",
          background: "radial-gradient(circle, rgba(20,184,166,0.12) 0%, transparent 70%)",
          top: "45%",
          right: "15%",
        }}
        animate={{ y: [0, -15, 0], x: [0, 10, 0], opacity: [0.2, 0.5, 0.2] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute rounded-full"
        style={{
          width: "50px",
          height: "50px",
          background: "radial-gradient(circle, rgba(249,115,22,0.1) 0%, transparent 70%)",
          bottom: "35%",
          left: "20%",
        }}
        animate={{ y: [0, -18, 0], opacity: [0.25, 0.55, 0.25] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      />
    </>
  );
}

export function LandingScreen({ theme, onContinue }: LandingScreenProps) {
  return (
    <div className="relative flex h-full min-w-0 flex-col overflow-hidden" style={{ background: "#F7F8FA" }}>
      {/* Background gradient layers */}
      <div className="absolute inset-0" style={{
        background: "radial-gradient(ellipse at 50% 10%, rgba(239,68,68,0.06) 0%, transparent 50%), radial-gradient(ellipse at 80% 60%, rgba(20,184,166,0.04) 0%, transparent 40%)"
      }} />
      
      {/* Decorative running path */}
      <RunningPath />
      
      {/* Floating orbs */}
      <FloatingOrbs />

      {/* Animated logo icon - centered and enlarged */}
      <motion.div
        animate={{ y: [0, -8, 0], scale: [1, 1.02, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute left-1/2 top-[26%] flex h-36 w-36 -translate-x-1/2 items-center justify-center rounded-full sm:h-44 sm:w-44 sm:top-[30%]"
        style={{
          background: `linear-gradient(145deg, ${theme.color}, ${theme.secondaryColor})`,
          boxShadow: `0 30px 70px ${theme.glowColor}`,
        }}
      >
        <Activity size={56} color="#FFFFFF" strokeWidth={2.4} />
        {/* Pulse ring effect */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ border: `3px solid ${theme.glowColor}` }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
        />
        {/* Second pulse ring */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ border: `2px solid ${theme.glowColor}` }}
          animate={{ scale: [1, 1.35, 1], opacity: [0.3, 0, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
        />
      </motion.div>

      <div className="relative z-10 flex flex-1 flex-col px-6 pb-7 pt-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div style={{ color: theme.color, fontSize: "11px", fontWeight: 700, letterSpacing: "0.2em", fontFamily: "'Archivo', sans-serif" }}>
            ECHORUN
          </div>
          <div
            className="rounded-full px-3 py-1"
            style={{ color: theme.color, background: theme.glowColor, border: `1px solid ${theme.borderColor}`, fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em" }}
          >
            AI RUN COACH
          </div>
        </div>

        {/* Main content */}
        <div className="mt-4 sm:mt-auto">
          <motion.div 
            initial={{ opacity: 0, y: 16 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <h1
              style={{
                color: "#111827",
                fontSize: "36px",
                lineHeight: 0.98,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                fontFamily: "'Archivo Black', sans-serif",
              }}
            >
              Race your past.
              <br />
              Train with <span style={{ color: theme.color }}>voice</span>.
            </h1>
            <p className="mt-4" style={{ color: "#6B7280", fontSize: "14px", lineHeight: 1.6 }}>
              Choose a coach, run live, challenge ghost records, and build XP through every session.
            </p>
          </motion.div>

          {/* Feature cards */}
          <motion.div 
            initial={{ opacity: 0, y: 12 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-3"
          >
            {[
              { icon: Bot, label: "AI Coach", color: "#14B8A6", bgColor: "rgba(20,184,166,0.12)", borderColor: "#99F6E4" },
              { icon: Ghost, label: "Ghost Run", color: "#F97316", bgColor: "rgba(249,115,22,0.12)", borderColor: "#FDBA74" },
              { icon: Trophy, label: "XP Badges", color: "#F59E0B", bgColor: "rgba(245,158,11,0.12)", borderColor: "#FCD34D" },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.15 + index * 0.05 }}
                  className="rounded-xl p-3 flex flex-col items-center text-center"
                  style={{ 
                    background: item.bgColor, 
                    border: `1px solid ${item.borderColor}`,
                    boxShadow: "0 2px 8px rgba(15,23,42,0.06)"
                  }}
                >
                  <Icon size={18} color={item.color} />
                  <div className="mt-2" style={{ color: "#374151", fontSize: "10px", fontWeight: 700, lineHeight: 1.2 }}>
                    {item.label}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Get Started button */}
          <motion.button
            onClick={onContinue}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl py-4 active:scale-95"
            style={{
              background: theme.color,
              color: "#FFFFFF",
              border: "none",
              boxShadow: `0 6px 20px ${theme.glowColor}`,
            }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            <span style={{ fontSize: "14px", fontWeight: 800, letterSpacing: "0.06em", fontFamily: "'Archivo Black', sans-serif" }}>
              Get Started
            </span>
            <motion.div
              animate={{ x: [0, 3, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <ArrowRight size={17} />
            </motion.div>
          </motion.button>

          {/* Already have account link */}
          <button
            onClick={onContinue}
            className="mt-3 w-full py-2"
            style={{ color: theme.secondaryColor, fontSize: "12px", fontWeight: 600 }}
          >
            I already have an account
          </button>
        </div>
      </div>
    </div>
  );
}