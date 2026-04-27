import { motion } from "motion/react";
import { Activity, ArrowRight, Bot, Ghost, Trophy } from "lucide-react";

type LandingScreenProps = {
  onContinue: () => void;
};

export function LandingScreen({ onContinue }: LandingScreenProps) {
  return (
    <div className="relative flex h-full min-w-0 flex-col overflow-hidden" style={{ background: "#07111F" }}>
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 8%, rgba(20,184,166,0.34), transparent 34%), linear-gradient(180deg, #07111F 0%, #0F172A 58%, #111827 100%)",
        }}
      />

      <div className="absolute inset-x-0 top-0 h-[46%] overflow-hidden">
        <div
          className="absolute left-1/2 top-12 h-64 w-64 -translate-x-1/2 rounded-full"
          style={{ border: "1px solid rgba(45,212,191,0.28)" }}
        />
        <div
          className="absolute left-1/2 top-24 h-44 w-44 -translate-x-1/2 rounded-full"
          style={{ border: "1px solid rgba(96,165,250,0.24)" }}
        />
        <motion.div
          animate={{ y: [0, -8, 0], scale: [1, 1.03, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute left-1/2 top-28 flex h-24 w-24 -translate-x-1/2 items-center justify-center rounded-full"
          style={{
            background: "linear-gradient(145deg, #14B8A6, #2563EB)",
            boxShadow: "0 22px 60px rgba(20,184,166,0.35)",
          }}
        >
          <Activity size={38} color="#FFFFFF" strokeWidth={2.6} />
        </motion.div>
      </div>

      <div className="relative z-10 flex flex-1 flex-col px-6 pb-7 pt-12">
        <div className="flex items-center justify-between">
          <div style={{ color: "#5EEAD4", fontSize: "12px", fontWeight: 900, letterSpacing: "0.24em" }}>
            ECHORUN
          </div>
          <div
            className="rounded-full px-3 py-1"
            style={{ color: "#BAE6FD", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(186,230,253,0.18)", fontSize: "9px", fontWeight: 800, letterSpacing: "0.14em" }}
          >
            AI RUN COACH
          </div>
        </div>

        <div className="mt-auto">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1
              style={{
                color: "#FFFFFF",
                fontSize: "42px",
                lineHeight: 0.98,
                fontWeight: 900,
                letterSpacing: "-0.02em",
                fontFamily: "'Archivo Black', sans-serif",
              }}
            >
              Race your past.
              <br />
              Train with voice.
            </h1>
            <p className="mt-4" style={{ color: "#CBD5E1", fontSize: "14px", lineHeight: 1.6 }}>
              Choose a coach, run live, challenge ghost records, and build XP through every session.
            </p>
          </motion.div>

          <div className="mt-6 grid grid-cols-3 gap-2">
            {[
              { icon: Bot, label: "AI Coach", color: "#5EEAD4" },
              { icon: Ghost, label: "Ghost Run", color: "#FDBA74" },
              { icon: Trophy, label: "XP Badges", color: "#FDE68A" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="rounded-xl p-3"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.10)" }}
                >
                  <Icon size={17} color={item.color} />
                  <div className="mt-2" style={{ color: "#E5E7EB", fontSize: "10px", fontWeight: 800, lineHeight: 1.2 }}>
                    {item.label}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={onContinue}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl py-4 active:scale-95"
            style={{
              background: "#FFFFFF",
              color: "#0F172A",
              border: "none",
              boxShadow: "0 18px 40px rgba(15,23,42,0.35)",
            }}
          >
            <span style={{ fontSize: "14px", fontWeight: 900, letterSpacing: "0.08em", fontFamily: "'Archivo Black', sans-serif" }}>
              Get Started
            </span>
            <ArrowRight size={17} />
          </button>

          <button
            onClick={onContinue}
            className="mt-3 w-full py-2"
            style={{ color: "#94A3B8", fontSize: "12px", fontWeight: 700 }}
          >
            I already have an account
          </button>
        </div>
      </div>
    </div>
  );
}
