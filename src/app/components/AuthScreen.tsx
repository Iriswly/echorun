import { useState } from "react";
import type { FormEvent } from "react";
import { motion } from "motion/react";
import { Activity, Lock, Mail, Radio, Shield, User, LogIn, UserPlus } from "lucide-react";
import { loginAccount, registerAccount } from "../../utils/auth.js";

type AuthScreenProps = {
  onAuthenticated: () => void;
};

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const isRegister = mode === "register";

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError("");

    const result = isRegister
      ? registerAccount({ name, email, password })
      : loginAccount({ email, password });

    if (!result.ok) {
      setError(result.error);
      return;
    }

    onAuthenticated();
  };

  return (
    <div className="relative flex h-full min-w-0 flex-col overflow-hidden" style={{ background: "#F7F8FA" }}>
      <div className="relative z-10 flex flex-1 flex-col px-6 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between pt-8 pb-6">
          <div style={{ color: "#EF4444", fontSize: "11px", fontWeight: 700, letterSpacing: "0.2em", fontFamily: "'Archivo', sans-serif" }}>
            ECHORUN
          </div>
          <div
            className="rounded-full px-3 py-1"
            style={{
              color: "#6B7280",
              background: "#F3F4F6",
              border: "1px solid #E5E7EB",
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "0.1em",
            }}
          >
            LIVE PROTOTYPE
          </div>
        </div>

        {/* Hero section with animated icon */}
        <div className="flex flex-col items-center mb-6">
          <motion.div
            animate={{ y: [0, -6, 0], scale: [1, 1.02, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="flex h-20 w-20 items-center justify-center rounded-full mb-4"
            style={{
              background: "linear-gradient(145deg, #EF4444, #DC2626)",
              boxShadow: "0 16px 40px rgba(239,68,68,0.28)",
            }}
          >
            <Activity size={32} color="#FFFFFF" strokeWidth={2.6} />
          </motion.div>
          
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5"
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid #FCA5A5",
              color: "#EF4444",
            }}
          >
            <Activity size={14} color="#EF4444" />
            <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em" }}>RUN PROFILE SYNC</span>
          </div>
        </div>

        {/* Title and description */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="text-center mb-4">
          <h1
            style={{
              fontSize: "28px",
              fontWeight: 800,
              color: "#111827",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              fontFamily: "'Archivo Black', sans-serif",
            }}
          >
            {isRegister ? "Build your run identity." : "Step back into the chase."}
          </h1>
          <p style={{ fontSize: "14px", color: "#6B7280", marginTop: "10px", lineHeight: 1.55 }}>
            {isRegister
              ? "Save your coach, ghost targets, badges, and session history on this device."
              : "Resume your coach setup, ghost sessions, and progress without losing pace."}
          </p>
        </motion.div>

        {/* Feature cards */}
        <div className="grid grid-cols-3 gap-2 mb-6 px-2">
          {[
            { icon: Radio, label: "Voice Coach", tone: "#14B8A6", bgColor: "rgba(20,184,166,0.1)", borderColor: "#99F6E4" },
            { icon: Shield, label: "Local Save", tone: "#3B82F6", bgColor: "rgba(59,130,246,0.1)", borderColor: "#BFDBFE" },
            { icon: Activity, label: "Ghost Pace", tone: "#F59E0B", bgColor: "rgba(245,158,11,0.1)", borderColor: "#FCD34D" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="rounded-xl p-3 flex flex-col items-center text-center"
                style={{ background: item.bgColor, border: `1px solid ${item.borderColor}` }}
              >
                <Icon size={16} color={item.tone} />
                <div className="mt-2" style={{ color: "#374151", fontSize: "10px", fontWeight: 700, lineHeight: 1.3 }}>
                  {item.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Form container */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="mt-auto rounded-2xl p-5"
          style={{
            background: "#FFFFFF",
            border: "1px solid #E5E7EB",
            boxShadow: "0 4px 20px rgba(15,23,42,0.08)",
          }}
        >
          {/* Login/Register tabs */}
          <div className="mb-5 flex rounded-xl p-1.5" style={{ background: "#F3F4F6", border: "1px solid #E5E7EB" }}>
            {[
              { value: "login", label: "Login" },
              { value: "register", label: "Register" },
            ].map((item) => {
              const active = mode === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    setMode(item.value as "login" | "register");
                    setError("");
                  }}
                  className="flex-1 rounded-lg py-2.5 transition-all active:scale-95"
                  style={{
                    background: active ? "#EF4444" : "transparent",
                    color: active ? "#FFFFFF" : "#6B7280",
                    fontSize: "12px",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    boxShadow: active ? "0 4px 12px rgba(239,68,68,0.25)" : "none",
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Form */}
          <motion.form
            key={mode}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            onSubmit={handleSubmit}
            className="flex flex-col gap-3"
          >
            {isRegister && (
              <label
                className="flex items-center gap-3 rounded-xl px-4 py-3"
                style={{ background: "#F9FAFB", border: "1px solid #E5E7EB" }}
              >
                <User size={16} color="#9CA3AF" />
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Runner name"
                  className="min-w-0 flex-1 bg-transparent outline-none"
                  style={{ fontSize: "14px", color: "#111827" }}
                  autoComplete="name"
                />
              </label>
            )}

            <label
              className="flex items-center gap-3 rounded-xl px-4 py-3"
              style={{ background: "#F9FAFB", border: "1px solid #E5E7EB" }}
            >
              <Mail size={16} color="#9CA3AF" />
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email"
                type="email"
                className="min-w-0 flex-1 bg-transparent outline-none"
                style={{ fontSize: "14px", color: "#111827" }}
                autoComplete="email"
              />
            </label>

            <label
              className="flex items-center gap-3 rounded-xl px-4 py-3"
              style={{ background: "#F9FAFB", border: "1px solid #E5E7EB" }}
            >
              <Lock size={16} color="#9CA3AF" />
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={isRegister ? "Create password" : "Password"}
                type="password"
                className="min-w-0 flex-1 bg-transparent outline-none"
                style={{ fontSize: "14px", color: "#111827" }}
                autoComplete={isRegister ? "new-password" : "current-password"}
              />
            </label>

            {error && (
              <div
                className="rounded-xl px-3 py-2.5"
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid #FCA5A5",
                  color: "#DC2626",
                  fontSize: "12px",
                  lineHeight: 1.45,
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 active:scale-95"
              style={{
                background: "#EF4444",
                color: "#FFFFFF",
                border: "none",
                boxShadow: "0 4px 16px rgba(239,68,68,0.3)",
              }}
            >
              {isRegister ? <UserPlus size={17} /> : <LogIn size={17} />}
              <span style={{ fontSize: "14px", fontWeight: 800, letterSpacing: "0.06em", fontFamily: "'Archivo Black', sans-serif" }}>
                {isRegister ? "Create Account" : "Login"}
              </span>
            </button>
          </motion.form>

          {/* Demo access info */}
          <div
            className="mt-4 rounded-xl p-3"
            style={{ background: "#F9FAFB", border: "1px solid #E5E7EB" }}
          >
            <div style={{ fontSize: "10px", color: "#EF4444", fontWeight: 700, letterSpacing: "0.1em", marginBottom: "4px" }}>
              DEMO ACCESS
            </div>
            <div style={{ fontSize: "11px", color: "#6B7280", lineHeight: 1.55 }}>
              Accounts live only in this browser. Quick login: test@echorun.local / test123
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
