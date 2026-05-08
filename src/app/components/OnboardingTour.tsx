import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import { getStorageKey } from "../../utils/auth.js";

type TourStep = {
  target: string;
  fallbackTarget?: string;
  eyebrow: string;
  title: string;
  body: string;
  placement: "top" | "bottom";
};

type TargetBox = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const STORAGE_KEY = "ECHORUN_ONBOARDING_TOUR_DONE_V1";

const TOUR_STEPS: TourStep[] = [
  {
    target: "coach-carousel",
    fallbackTarget: "nav-coach",
    eyebrow: "Coach",
    title: "Choose a coach voice",
    body: "Swipe through coach cards, preview voices, or build a custom coach before your run.",
    placement: "bottom",
  },
  {
    target: "confirm-coach",
    fallbackTarget: "nav-coach",
    eyebrow: "Ready",
    title: "Confirm your pick",
    body: "This saves the selected coach and takes you into the live run screen.",
    placement: "top",
  },
  {
    target: "nav-run",
    eyebrow: "Live Run",
    title: "Track a real run",
    body: "Open Live Run to start GPS tracking, hear coaching, and race a saved ghost route.",
    placement: "top",
  },
  {
    target: "nav-achievements",
    eyebrow: "Badges",
    title: "Watch progress unlock",
    body: "Badges turn your running milestones into visible progress and cookie status.",
    placement: "top",
  },
  {
    target: "nav-dashboard",
    eyebrow: "History",
    title: "Review and rematch",
    body: "Run Archive stores completed runs, friend demo targets, and ghost challenges.",
    placement: "top",
  },
];

function getStoredCompletion() {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(getStorageKey(STORAGE_KEY)) === "true";
  } catch {
    return true;
  }
}

function storeCompletion() {
  try {
    localStorage.setItem(getStorageKey(STORAGE_KEY), "true");
  } catch {
    // Storage can fail in private browsing; the tour should still be dismissible.
  }
}

function measureTarget(target: string): TargetBox | null {
  const shell = document.querySelector<HTMLElement>(".echorun-app-shell");
  const element = document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
  if (!shell || !element) return null;

  const shellRect = shell.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  return {
    top: elementRect.top - shellRect.top,
    left: elementRect.left - shellRect.left,
    width: elementRect.width,
    height: elementRect.height,
  };
}

export function OnboardingTour({ disabled = false }: { disabled?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetBox, setTargetBox] = useState<TargetBox | null>(null);
  const step = TOUR_STEPS[stepIndex];
  const progressText = `${stepIndex + 1}/${TOUR_STEPS.length}`;

  const cardPosition = useMemo(() => {
    if (!targetBox) {
      return { left: 16, right: 16, top: 92 };
    }

    const cardTop =
      step.placement === "top"
        ? Math.max(16, targetBox.top - 184)
        : Math.min(targetBox.top + targetBox.height + 16, window.innerHeight - 236);

    return {
      left: 16,
      right: 16,
      top: cardTop,
    };
  }, [step.placement, targetBox]);

  useEffect(() => {
    if (disabled || getStoredCompletion()) return;
    const timer = window.setTimeout(() => setIsOpen(true), 450);
    return () => window.clearTimeout(timer);
  }, [disabled]);

  useEffect(() => {
    if (!isOpen) return;

    const updateBox = () => {
      window.requestAnimationFrame(() => setTargetBox(measureTarget(step.target) ?? (step.fallbackTarget ? measureTarget(step.fallbackTarget) : null)));
    };

    updateBox();
    window.addEventListener("resize", updateBox);
    window.addEventListener("scroll", updateBox, true);
    return () => {
      window.removeEventListener("resize", updateBox);
      window.removeEventListener("scroll", updateBox, true);
    };
  }, [isOpen, step.fallbackTarget, step.target]);

  if (!isOpen || disabled) return null;

  const closeTour = () => {
    storeCompletion();
    setIsOpen(false);
  };

  const goBack = () => setStepIndex((value) => Math.max(0, value - 1));
  const goNext = () => {
    if (stepIndex >= TOUR_STEPS.length - 1) {
      closeTour();
      return;
    }
    setStepIndex((value) => value + 1);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-[80]"
        aria-live="polite"
        aria-label="First use guide"
      >
        <div className="absolute inset-0 pointer-events-none" style={{ background: "rgba(15,23,42,0.28)" }} />

        {targetBox && (
          <motion.div
            layout
            className="absolute pointer-events-none rounded-2xl"
            style={{
              top: targetBox.top - 6,
              left: targetBox.left - 6,
              width: targetBox.width + 12,
              height: targetBox.height + 12,
              border: "2px solid #38BDF8",
              boxShadow: "0 0 0 999px rgba(15,23,42,0.18), 0 12px 32px rgba(14,165,233,0.28)",
            }}
          />
        )}

        <motion.div
          key={step.target}
          initial={{ opacity: 0, y: step.placement === "top" ? 8 : -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          className="absolute rounded-2xl p-4"
          style={{
            ...cardPosition,
            background: "#FFFFFF",
            border: "1px solid #BFDBFE",
            boxShadow: "0 18px 48px rgba(15,23,42,0.22)",
          }}
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div style={{ fontSize: "10px", color: "#2563EB", fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase" }}>
                {step.eyebrow} guide
              </div>
              <h2 style={{ marginTop: "3px", fontSize: "18px", lineHeight: 1.15, color: "#111827", fontWeight: 900, fontFamily: "'Archivo Black', sans-serif" }}>
                {step.title}
              </h2>
            </div>
            <button
              onClick={closeTour}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full active:scale-95"
              style={{ background: "#F8FAFC", border: "1px solid #E5E7EB" }}
              aria-label="Skip first use guide"
            >
              <X size={14} color="#64748B" />
            </button>
          </div>

          <p style={{ fontSize: "13px", color: "#475569", lineHeight: 1.5, marginBottom: "14px" }}>
            {step.body}
          </p>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              {TOUR_STEPS.map((item, index) => (
                <span
                  key={item.target}
                  className="rounded-full"
                  style={{
                    width: index === stepIndex ? "18px" : "6px",
                    height: "6px",
                    background: index === stepIndex ? "#2563EB" : "#CBD5E1",
                    transition: "all 180ms ease",
                  }}
                />
              ))}
              <span style={{ marginLeft: "6px", fontSize: "10px", color: "#94A3B8", fontWeight: 700, letterSpacing: "0.08em" }}>
                {progressText}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={goBack}
                disabled={stepIndex === 0}
                className="flex h-9 w-9 items-center justify-center rounded-full active:scale-95 disabled:opacity-40"
                style={{ background: "#F8FAFC", border: "1px solid #E5E7EB" }}
                aria-label="Previous guide note"
              >
                <ChevronLeft size={15} color="#334155" />
              </button>
              <button
                onClick={goNext}
                className="flex h-9 items-center justify-center gap-1.5 rounded-full px-3 active:scale-95"
                style={{ background: "#2563EB", border: "1px solid #1D4ED8", color: "#FFFFFF" }}
              >
                {stepIndex === TOUR_STEPS.length - 1 ? <Check size={15} /> : <ChevronRight size={15} />}
                <span style={{ fontSize: "11px", fontWeight: 900, letterSpacing: "0.08em" }}>
                  {stepIndex === TOUR_STEPS.length - 1 ? "DONE" : "NEXT"}
                </span>
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
