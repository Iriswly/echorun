import { createBrowserRouter, Outlet, useNavigate, useLocation } from "react-router";
import { CoachSelection } from "./components/CoachSelection";
import { GhostRunTracking } from "./components/GhostRunTracking";
import { PostRunDashboard } from "./components/PostRunDashboard";
import { Zap, Radio, Trophy } from "lucide-react";

function Root() {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { path: "/", icon: Zap, label: "COACH" },
    { path: "/run", icon: Radio, label: "LIVE RUN" },
    { path: "/dashboard", icon: Trophy, label: "HISTORY" },
  ];

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "linear-gradient(135deg, #0a0b02 0%, #050601 100%)" }}
    >
      {/* Scanline overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-50"
        style={{
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)",
        }}
      />

      {/* Mobile phone frame */}
      <div
        className="relative w-full overflow-hidden flex flex-col"
        style={{
          maxWidth: "390px",
          height: "100dvh",
          maxHeight: "844px",
          background: "#0d0e02",
          boxShadow: "0 0 60px rgba(24,172,183,0.12), 0 0 120px rgba(0,0,0,0.8)",
          fontFamily: "'Archivo', sans-serif",
        }}
      >
        {/* Noise texture overlay */}
        <div
          className="absolute inset-0 pointer-events-none z-40"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
            opacity: 0.4,
          }}
        />

        {/* Content area */}
        <div className="flex-1 overflow-hidden">
          <Outlet />
        </div>

        {/* Bottom Navigation */}
        <div
          className="relative z-50 flex"
          style={{
            background: "rgba(10,11,2,0.95)",
            borderTop: "1px solid rgba(24,172,183,0.2)",
            backdropFilter: "blur(20px)",
          }}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = location.pathname === tab.path;
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className="relative flex-1 flex flex-col items-center gap-1 py-3 transition-all duration-200 active:scale-95"
                style={{
                  color: isActive ? "#18ACB7" : "#4a4f1a",
                }}
              >
                <Icon
                  size={22}
                  style={{
                    filter: isActive ? "drop-shadow(0 0 8px #18ACB7)" : "none",
                  }}
                />
                <span
                  className="uppercase tracking-widest"
                  style={{
                    fontSize: "9px",
                    fontWeight: 800,
                    fontFamily: "'Archivo', sans-serif",
                    letterSpacing: "0.15em",
                  }}
                >
                  {tab.label}
                </span>
                {isActive && (
                  <div
                    className="absolute top-0 h-0.5 w-16 rounded-full"
                    style={{
                      background: "linear-gradient(90deg, transparent, #18ACB7, transparent)",
                      boxShadow: "0 0 8px #18ACB7",
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: CoachSelection },
      { path: "run", Component: GhostRunTracking },
      { path: "dashboard", Component: PostRunDashboard },
    ],
  },
]);