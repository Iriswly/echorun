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
      style={{ background: "#F0F2F5" }}
    >
      {/* Mobile phone frame */}
      <div
        className="relative w-full overflow-hidden flex flex-col"
        style={{
          maxWidth: "390px",
          height: "100dvh",
          maxHeight: "844px",
          background: "#F7F8FA",
          boxShadow: "0 8px 40px rgba(15,23,42,0.12)",
          fontFamily: "'Archivo', sans-serif",
        }}
      >

        {/* Content area */}
        <div className="flex-1 overflow-hidden">
          <Outlet />
        </div>

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
                onClick={() => navigate(tab.path)}
                className="relative flex-1 flex flex-col items-center gap-1 py-3 transition-all duration-200 active:scale-95"
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