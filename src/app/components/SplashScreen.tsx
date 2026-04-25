import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";

function CornerMarker({ position }: { position: "tl" | "tr" | "bl" | "br" }) {
  const isTop = position.startsWith("t");
  const isLeft = position.endsWith("l");

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3, duration: 0.5, ease: "easeOut" }}
      className="absolute w-8 h-8"
      style={{
        top: isTop ? "24px" : undefined,
        bottom: !isTop ? "24px" : undefined,
        left: isLeft ? "24px" : undefined,
        right: !isLeft ? "24px" : undefined,
      }}
    >
      {/* Horizontal bar */}
      <div
        className="absolute"
        style={{
          width: "20px",
          height: "2px",
          background: "#18ACB7",
          top: isTop ? 0 : undefined,
          bottom: !isTop ? 0 : undefined,
          left: isLeft ? 0 : undefined,
          right: !isLeft ? 0 : undefined,
          boxShadow: "0 0 8px #18ACB7",
        }}
      />
      {/* Vertical bar */}
      <div
        className="absolute"
        style={{
          width: "2px",
          height: "20px",
          background: "#18ACB7",
          top: isTop ? 0 : undefined,
          bottom: !isTop ? 0 : undefined,
          left: isLeft ? 0 : undefined,
          right: !isLeft ? 0 : undefined,
          boxShadow: "0 0 8px #18ACB7",
        }}
      />
    </motion.div>
  );
}

export function SplashScreen() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => navigate("/auth"), 4200);
    const interval = setInterval(() => {
      setProgress((p) => Math.min(100, p + 100 / 42));
    }, 100);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [navigate]);

  const letters = ["E", "C", "H", "O"];

  return (
    <div
      className="relative h-full flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "#0d0e02" }}
    >
      {/* Animated background grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="absolute inset-0 pointer-events-none"
      >
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          {Array.from({ length: 22 }, (_, i) => (
            <line
              key={`h${i}`}
              x1="0"
              y1={i * 40}
              x2="390"
              y2={i * 40}
              stroke="#141602"
              strokeWidth="1"
            />
          ))}
          {Array.from({ length: 12 }, (_, i) => (
            <line
              key={`v${i}`}
              x1={i * 40}
              y1="0"
              x2={i * 40}
              y2="844"
              stroke="#141602"
              strokeWidth="1"
            />
          ))}
        </svg>
      </motion.div>

      {/* Light trail 1 — teal horizontal sweep */}
      <motion.div
        initial={{ x: "-100%", opacity: 0 }}
        animate={{ x: "200%", opacity: [0, 1, 1, 0] }}
        transition={{ delay: 0.8, duration: 1.2, ease: "easeInOut" }}
        className="absolute pointer-events-none"
        style={{
          top: "38%",
          width: "160px",
          height: "1px",
          background: "linear-gradient(90deg, transparent, #18ACB7, transparent)",
          boxShadow: "0 0 12px #18ACB7, 0 0 30px rgba(24,172,183,0.3)",
        }}
      />

      {/* Light trail 2 — yellow diagonal */}
      <motion.div
        initial={{ x: "-100%", y: "100%", opacity: 0 }}
        animate={{ x: "200%", y: "-100%", opacity: [0, 0.8, 0.8, 0] }}
        transition={{ delay: 1.1, duration: 1.4, ease: "easeInOut" }}
        className="absolute pointer-events-none"
        style={{
          top: "50%",
          left: "20%",
          width: "200px",
          height: "1px",
          transform: "rotate(-30deg)",
          background: "linear-gradient(90deg, transparent, #FFCD00, transparent)",
          boxShadow: "0 0 8px #FFCD00",
        }}
      />

      {/* Light trail 3 — teal bottom diagonal */}
      <motion.div
        initial={{ x: "150%", opacity: 0 }}
        animate={{ x: "-150%", opacity: [0, 0.7, 0.7, 0] }}
        transition={{ delay: 1.4, duration: 1.1, ease: "easeInOut" }}
        className="absolute pointer-events-none"
        style={{
          top: "62%",
          width: "120px",
          height: "1px",
          background: "linear-gradient(90deg, transparent, #18ACB7, transparent)",
          boxShadow: "0 0 10px #18ACB7",
        }}
      />

      {/* Corner markers */}
      <CornerMarker position="tl" />
      <CornerMarker position="tr" />
      <CornerMarker position="bl" />
      <CornerMarker position="br" />

      {/* Center dot flash */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 3, 0], opacity: [0, 0.6, 0] }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="absolute rounded-full pointer-events-none"
        style={{
          width: "4px",
          height: "4px",
          background: "#18ACB7",
          boxShadow: "0 0 30px #18ACB7",
        }}
      />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* System tag */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.5 }}
          className="flex items-center gap-2 mb-8"
        >
          <div
            style={{
              width: "20px",
              height: "1px",
              background: "#18ACB7",
              boxShadow: "0 0 6px #18ACB7",
            }}
          />
          <span
            style={{
              fontSize: "9px",
              color: "#18ACB7",
              fontWeight: 800,
              letterSpacing: "0.35em",
              fontFamily: "'Archivo', sans-serif",
            }}
          >
            SYSTEM INIT
          </span>
          <div
            style={{
              width: "20px",
              height: "1px",
              background: "#18ACB7",
              boxShadow: "0 0 6px #18ACB7",
            }}
          />
        </motion.div>

        {/* ECHO letters */}
        <div className="flex items-center gap-1 mb-1">
          {letters.map((letter, i) => (
            <motion.span
              key={letter}
              initial={{ opacity: 0, y: 40, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{
                delay: 1.2 + i * 0.12,
                duration: 0.5,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              style={{
                fontSize: "76px",
                fontWeight: 900,
                color: "#e8e8d0",
                letterSpacing: "-0.04em",
                lineHeight: 1,
                fontFamily: "'Archivo Black', sans-serif",
                textShadow: `0 0 40px rgba(24,172,183,0.2)`,
              }}
            >
              {letter}
            </motion.span>
          ))}
        </div>

        {/* RUN */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.8, duration: 0.6, ease: "easeOut" }}
          className="self-end mr-1"
          style={{ marginTop: "-8px" }}
        >
          <span
            style={{
              fontSize: "28px",
              fontWeight: 900,
              color: "#FFCD00",
              letterSpacing: "0.25em",
              fontFamily: "'Archivo Black', sans-serif",
              filter: "drop-shadow(0 0 12px rgba(255,205,0,0.7))",
            }}
          >
            RUN
          </span>
        </motion.div>

        {/* Divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 2.1, duration: 0.6 }}
          className="w-48 h-px mt-6 mb-5"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(24,172,183,0.5), transparent)",
            boxShadow: "0 0 8px rgba(24,172,183,0.3)",
          }}
        />

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.3, duration: 0.5 }}
          style={{
            fontSize: "11px",
            color: "#4a4b3a",
            letterSpacing: "0.3em",
            fontWeight: 700,
            fontFamily: "'Archivo', sans-serif",
          }}
        >
          AI-POWERED GHOST RACING
        </motion.p>
      </div>

      {/* Version tag */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5 }}
        className="absolute"
        style={{
          bottom: "80px",
          fontSize: "8px",
          color: "#2a2b1a",
          letterSpacing: "0.3em",
          fontWeight: 700,
        }}
      >
        v2.4.0 // SEASON 3
      </motion.div>

      {/* Progress bar */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{ height: "2px", background: "rgba(255,255,255,0.04)" }}
      >
        <motion.div
          style={{
            height: "100%",
            width: `${progress}%`,
            background: "linear-gradient(90deg, #18ACB7, #FFCD00)",
            boxShadow: "0 0 8px #18ACB7",
            transition: "width 0.1s linear",
          }}
        />
      </div>

      {/* Tap to skip */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.8 }}
        onClick={() => navigate("/auth")}
        className="absolute"
        style={{
          bottom: "12px",
          fontSize: "9px",
          color: "#2a2b1a",
          letterSpacing: "0.2em",
          fontWeight: 700,
        }}
      >
        TAP TO SKIP
      </motion.button>
    </div>
  );
}
