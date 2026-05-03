import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { createHashRouter, Outlet, useNavigate, useLocation } from "react-router";
import { CoachSelection } from "./components/CoachSelection";
import { GhostRunTracking } from "./components/GhostRunTracking";
import { PostRunDashboard } from "./components/PostRunDashboard";
import { AchievementScreen } from "./components/AchievementScreen";
import { AuthScreen } from "./components/AuthScreen";
import { LandingScreen } from "./components/LandingScreen";
import { getCurrentUser } from "../utils/auth.js";
import { pickRandomTheme } from "../utils/theme";
import { getActiveRunStatus, RUN_STATUS_EVENT, RUN_STOP_REQUEST_EVENT } from "../utils/runSession";
import { Zap, Radio, Trophy, Star, AlertTriangle, Flag, X } from "lucide-react";

function Root() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [theme] = useState(() => pickRandomTheme());
  const [showAuth, setShowAuth] = useState(false);
  const [hasActiveRun, setHasActiveRun] = useState(() => getActiveRunStatus().isActive);
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  useEffect(() => {
    const updateUser = () => {
      const nextUser = getCurrentUser();
      setCurrentUser(nextUser);
      if (!nextUser) setShowAuth(false);
    };
    window.addEventListener("echorun-auth-change", updateUser);
    window.addEventListener("storage", updateUser);
    return () => {
      window.removeEventListener("echorun-auth-change", updateUser);
      window.removeEventListener("storage", updateUser);
    };
  }, []);

  useEffect(() => {
    const syncRunStatus = (event?: Event) => {
      const detail = (event as CustomEvent<{ isActive: boolean }> | undefined)?.detail;
      setHasActiveRun(detail?.isActive ?? getActiveRunStatus().isActive);
    };

    window.addEventListener(RUN_STATUS_EVENT, syncRunStatus);
    window.addEventListener("storage", syncRunStatus);
    return () => {
      window.removeEventListener(RUN_STATUS_EVENT, syncRunStatus);
      window.removeEventListener("storage", syncRunStatus);
    };
  }, []);

  const handleTabNavigate = (path: string) => {
    if (path === location.pathname) return;

    const isLeavingRun = location.pathname === "/run" && path !== "/run";
    if (isLeavingRun && hasActiveRun) {
      setPendingPath(path);
      return;
    }

    navigate(path);
  };

  const handleCancelStop = () => {
    setPendingPath(null);
  };

  const handleConfirmStop = () => {
    if (!pendingPath) return;
    window.dispatchEvent(new CustomEvent(RUN_STOP_REQUEST_EVENT, { detail: { destination: pendingPath } }));
    setPendingPath(null);
  };

  const tabs = [
    { path: "/", icon: Zap, label: "COACH" },
    { path: "/run", icon: Radio, label: "LIVE RUN" },
    { path: "/achievements", icon: Trophy, label: "BADGES" },
    { path: "/dashboard", icon: Star, label: "HISTORY" },
  ];

  return (
    <div
      className="echorun-root min-h-screen flex items-center justify-center"
      style={{ background: "#F0F2F5" }}
    >
      {/* Mobile phone frame */}
      <div
        className="echorun-app-shell relative overflow-hidden flex flex-col"
        style={{
          background: "#F7F8FA",
          boxShadow: "0 8px 40px rgba(15,23,42,0.12)",
          fontFamily: "'Archivo', sans-serif",
        }}
      >

        {!currentUser ? (
          showAuth ? (
            <AuthScreen theme={theme} onAuthenticated={() => setCurrentUser(getCurrentUser())} />
          ) : (
            <LandingScreen theme={theme} onContinue={() => setShowAuth(true)} />
          )
        ) : (
          <>
            {/* Content area */}
            <div className="flex-1 overflow-hidden">
              <Outlet />
            </div>

            <AnimatePresence>
              {pendingPath && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-[60] flex items-end justify-center px-4 pb-24 pt-8"
                  style={{ background: "linear-gradient(180deg, rgba(15,23,42,0.18) 0%, rgba(15,23,42,0.55) 100%)", backdropFilter: "blur(8px)" }}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 24, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 16, scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 280, damping: 24 }}
                    className="relative w-full max-w-sm overflow-hidden rounded-[28px]"
                    style={{
                      background: "linear-gradient(145deg, #FFF7ED 0%, #FFFFFF 42%, #FEF2F2 100%)",
                      border: "1.5px solid #FDBA74",
                      boxShadow: "0 24px 64px rgba(15,23,42,0.22)",
                    }}
                  >
                    <div
                      className="absolute inset-x-0 top-0 h-24"
                      style={{ background: "radial-gradient(circle at top left, rgba(249,115,22,0.25), transparent 58%), radial-gradient(circle at top right, rgba(239,68,68,0.24), transparent 54%)" }}
                    />
                    <button
                      onClick={handleCancelStop}
                      className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full active:scale-95"
                      style={{ background: "rgba(255,255,255,0.78)", border: "1px solid #FED7AA" }}
                      aria-label="Close stop run prompt"
                    >
                      <X size={16} color="#9A3412" />
                    </button>

                    <div className="relative px-5 pb-5 pt-6">
                      <div className="mb-4 flex items-center gap-3">
                        <div
                          className="flex h-14 w-14 items-center justify-center rounded-2xl"
                          style={{
                            background: "linear-gradient(135deg, #F97316 0%, #EF4444 100%)",
                            boxShadow: "0 12px 28px rgba(239,68,68,0.28)",
                          }}
                        >
                          <AlertTriangle size={24} color="#FFFFFF" />
                        </div>
                        <div>
                          <div style={{ fontSize: "10px", color: "#C2410C", fontWeight: 800, letterSpacing: "0.18em" }}>RUN IN PROGRESS</div>
                          <div style={{ fontSize: "24px", lineHeight: 1, color: "#111827", fontWeight: 900, letterSpacing: "-0.03em", fontFamily: "'Archivo Black', sans-serif" }}>
                            Stop this run?
                          </div>
                        </div>
                      </div>

                      <div
                        className="mb-5 rounded-2xl p-4"
                        style={{ background: "rgba(255,255,255,0.82)", border: "1px solid #FED7AA" }}
                      >
                        <div style={{ fontSize: "13px", color: "#7C2D12", fontWeight: 700, lineHeight: 1.45, marginBottom: "10px" }}>
                          Leaving Live Run will end the current session immediately.
                        </div>
                        <div style={{ fontSize: "12px", color: "#6B7280", lineHeight: 1.5 }}>
                          We will save this run and apply the normal finish logic, including ghost win or loss comparison.
                        </div>
                      </div>

                      <div className="mb-5 flex items-center gap-2 rounded-2xl px-3 py-2.5" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <Flag size={14} color="#FBBF24" />
                        <div style={{ fontSize: "11px", color: "#F9FAFB", fontWeight: 700, letterSpacing: "0.08em" }}>
                          DESTINATION: {pendingPath === "/" ? "COACH" : pendingPath === "/achievements" ? "BADGES" : "HISTORY"}
                        </div>
                      </div>

                      <div className="flex gap-3 max-[340px]:flex-col">
                        <button
                          onClick={handleCancelStop}
                          className="flex-1 rounded-2xl py-3.5 active:scale-95"
                          style={{ background: "#FFFFFF", border: "1.5px solid #E5E7EB", color: "#374151", fontSize: "14px", fontWeight: 800 }}
                        >
                          Keep Running
                        </button>
                        <button
                          onClick={handleConfirmStop}
                          className="flex-1 rounded-2xl py-3.5 active:scale-95"
                          style={{
                            background: "linear-gradient(135deg, #F97316 0%, #EF4444 100%)",
                            border: "none",
                            boxShadow: "0 10px 24px rgba(239,68,68,0.25)",
                            color: "#FFFFFF",
                            fontSize: "14px",
                            fontWeight: 900,
                            letterSpacing: "0.04em",
                            fontFamily: "'Archivo Black', sans-serif",
                          }}
                        >
                          Stop And Leave
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom Navigation */}
            <div
              className="relative z-50 flex"
              style={{
                background: "#FFFFFF",
                borderTop: "1px solid #E5E7EB",
              }}
            >
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = location.pathname === tab.path;
                return (
                  <button
                    key={tab.path}
                    onClick={() => handleTabNavigate(tab.path)}
                    className="relative flex-1 min-w-0 flex flex-col items-center gap-1 py-3 transition-all duration-200 active:scale-95"
                    style={{
                      color: isActive ? "#2563EB" : "#9CA3AF",
                    }}
                  >
                    <Icon size={22} />
                    <span
                      className="uppercase tracking-widest"
                      style={{
                        fontSize: "9px",
                        fontWeight: 700,
                        fontFamily: "'Archivo', sans-serif",
                        letterSpacing: "0.12em",
                      }}
                    >
                      {tab.label}
                    </span>
                    {isActive && (
                      <div
                        className="absolute top-0 h-0.5 w-12 rounded-full"
                        style={{ background: "#2563EB" }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export const router = createHashRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: CoachSelection },
      { path: "run", Component: GhostRunTracking },
      { path: "achievements", Component: AchievementScreen },
      { path: "dashboard", Component: PostRunDashboard },
    ],
  },
]);
