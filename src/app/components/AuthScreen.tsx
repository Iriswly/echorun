import { useState } from "react";
import type { FormEvent } from "react";
import { motion } from "motion/react";
import { Lock, Mail, User, LogIn, UserPlus } from "lucide-react";
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
  const accent = isRegister ? "#14B8A6" : "#2563EB";

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
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(160deg, #EFF6FF 0%, #F0FDFA 55%, #F7F8FA 100%)" }}
      />

      <div className="relative z-10 flex flex-1 flex-col px-6 pt-12 pb-6">
        <div className="mb-8">
          <div style={{ fontSize: "11px", letterSpacing: "0.22em", color: accent, fontWeight: 800 }}>
            ECHORUN
          </div>
          <h1
            className="mt-3"
            style={{
              fontSize: "30px",
              fontWeight: 900,
              color: "#111827",
              lineHeight: 1.05,
              fontFamily: "'Archivo Black', sans-serif",
            }}
          >
            {isRegister ? "Create Account" : "Welcome Back"}
          </h1>
          <p style={{ fontSize: "13px", color: "#6B7280", marginTop: "8px", lineHeight: 1.5 }}>
            {isRegister ? "Save your coach, XP, badges, and run history on this device." : "Log in to continue your running progress."}
          </p>
        </div>

        <div className="mb-5 flex rounded-xl p-1" style={{ background: "#FFFFFF", border: "1px solid #E5E7EB" }}>
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
                className="flex-1 rounded-lg py-2.5 transition-all"
                style={{
                  background: active ? accent : "transparent",
                  color: active ? "#FFFFFF" : "#6B7280",
                  fontSize: "12px",
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <motion.form
          key={mode}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="flex flex-col gap-3"
        >
          {isRegister && (
            <label className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: "#FFFFFF", border: "1px solid #E5E7EB" }}>
              <User size={16} color="#9CA3AF" />
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Name"
                className="min-w-0 flex-1 bg-transparent outline-none"
                style={{ fontSize: "14px", color: "#111827" }}
                autoComplete="name"
              />
            </label>
          )}

          <label className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: "#FFFFFF", border: "1px solid #E5E7EB" }}>
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

          <label className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: "#FFFFFF", border: "1px solid #E5E7EB" }}>
            <Lock size={16} color="#9CA3AF" />
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              type="password"
              className="min-w-0 flex-1 bg-transparent outline-none"
              style={{ fontSize: "14px", color: "#111827" }}
              autoComplete={isRegister ? "new-password" : "current-password"}
            />
          </label>

          {error && (
            <div className="rounded-xl px-3 py-2" style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C", fontSize: "12px", lineHeight: 1.4 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-4 active:scale-95"
            style={{ background: accent, color: "#FFFFFF", border: "none" }}
          >
            {isRegister ? <UserPlus size={17} /> : <LogIn size={17} />}
            <span style={{ fontSize: "14px", fontWeight: 900, letterSpacing: "0.08em", fontFamily: "'Archivo Black', sans-serif" }}>
              {isRegister ? "Create Account" : "Login"}
            </span>
          </button>
        </motion.form>

        <div className="mt-auto rounded-xl p-3" style={{ background: "#FFFFFF", border: "1px solid #E5E7EB" }}>
          <div style={{ fontSize: "10px", color: "#9CA3AF", fontWeight: 700, letterSpacing: "0.12em", marginBottom: "4px" }}>
            LOCAL PROTOTYPE
          </div>
          <div style={{ fontSize: "11px", color: "#6B7280", lineHeight: 1.5 }}>
            Accounts are stored in this browser only. Use a test password for demos.
          </div>
        </div>
      </div>
    </div>
  );
}
