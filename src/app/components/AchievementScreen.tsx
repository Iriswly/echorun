import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Cookie, Star } from "lucide-react";
import { getProfile } from "../../utils/profile.js";
import { ALL_BADGES } from "../../utils/badges.js";

const bitePositions = [
  { top: "14%", right: "10%", size: 76 },
  { top: "38%", right: "-2%", size: 84 },
  { bottom: "18%", right: "8%", size: 74 },
  { bottom: "8%", left: "18%", size: 68 },
  { top: "18%", left: "4%", size: 62 },
];

function CookieProgress({ unlockedCount, totalBadges }: { unlockedCount: number; totalBadges: number }) {
  const allUnlocked = unlockedCount >= totalBadges;

  return (
    <div className="relative flex h-[280px] w-[280px] items-center justify-center sm:h-[320px] sm:w-[320px]">
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 180, damping: 20 }}
        className="absolute inset-0 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(251,191,36,0.18) 0%, rgba(249,115,22,0.08) 50%, transparent 72%)",
          filter: "blur(8px)",
        }}
      />

      {!allUnlocked && (
        <div
          className="relative h-[230px] w-[230px] rounded-full sm:h-[260px] sm:w-[260px]"
          style={{
            background: "radial-gradient(circle at 34% 30%, #FDE68A 0%, #F59E0B 42%, #D97706 100%)",
            border: "6px solid #B45309",
            boxShadow: "0 24px 54px rgba(217,119,6,0.28), inset 0 8px 0 rgba(255,255,255,0.18)",
          }}
        >
          <div
            className="absolute inset-[18px] rounded-full"
            style={{ border: "2px dashed rgba(120,53,15,0.35)" }}
          />
          {[...Array(13)].map((_, index) => {
            const chips = [
              { top: "18%", left: "32%" },
              { top: "26%", right: "24%" },
              { top: "42%", left: "20%" },
              { top: "48%", right: "19%" },
              { top: "62%", left: "38%" },
              { top: "70%", right: "30%" },
              { top: "55%", left: "62%" },
              { top: "30%", left: "52%" },
              { top: "78%", left: "24%" },
              { top: "14%", left: "58%" },
              { top: "64%", right: "14%" },
              { top: "44%", left: "44%" },
              { top: "82%", left: "54%" },
            ][index];

            return (
              <span
                key={index}
                className="absolute rounded-full"
                style={{
                  ...chips,
                  width: index % 3 === 0 ? "12px" : "10px",
                  height: index % 3 === 0 ? "12px" : "10px",
                  background: index % 2 === 0 ? "#78350F" : "#92400E",
                  boxShadow: "inset 0 1px 1px rgba(255,255,255,0.14)",
                }}
              />
            );
          })}

          {bitePositions.slice(0, unlockedCount).map((bite, index) => (
            <motion.div
              key={index}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.08, type: "spring", stiffness: 220, damping: 18 }}
              className="absolute rounded-full"
              style={{
                ...bite,
                width: `${bite.size}px`,
                height: `${bite.size}px`,
                background: "#F7F8FA",
                boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.22)",
              }}
            />
          ))}
        </div>
      )}

      {allUnlocked && (
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative flex h-[230px] w-[230px] items-center justify-center rounded-[38px] sm:h-[260px] sm:w-[260px]"
          style={{
            background: "linear-gradient(160deg, #FFF7ED 0%, #FFFFFF 58%, #FFFBEB 100%)",
            border: "1.5px solid #FDE68A",
            boxShadow: "0 24px 54px rgba(217,119,6,0.16)",
          }}
        >
          {[...Array(16)].map((_, index) => {
            const crumb = [
              { top: "18%", left: "24%" },
              { top: "24%", left: "46%" },
              { top: "30%", right: "22%" },
              { top: "42%", left: "18%" },
              { top: "40%", right: "28%" },
              { top: "54%", left: "36%" },
              { top: "58%", right: "18%" },
              { bottom: "24%", left: "22%" },
              { bottom: "22%", left: "42%" },
              { bottom: "20%", right: "24%" },
              { top: "48%", left: "56%" },
              { top: "34%", left: "62%" },
              { bottom: "34%", right: "36%" },
              { bottom: "36%", left: "30%" },
              { top: "68%", left: "54%" },
              { top: "16%", left: "68%" },
            ][index];
            return (
              <span
                key={index}
                className="absolute rounded-full"
                style={{
                  ...crumb,
                  width: index % 4 === 0 ? "14px" : "9px",
                  height: index % 4 === 0 ? "14px" : "9px",
                  background: index % 2 === 0 ? "#F59E0B" : "#D97706",
                }}
              />
            );
          })}
          <div className="text-center">
            <div className="mb-2 flex items-center justify-center gap-1">
              <Cookie size={16} color="#D97706" />
              <span style={{ fontSize: "10px", color: "#D97706", fontWeight: 800, letterSpacing: "0.18em" }}>COOKIE CLEARED</span>
            </div>
            <div style={{ fontSize: "26px", color: "#111827", fontWeight: 900, letterSpacing: "-0.03em", fontFamily: "'Archivo Black', sans-serif" }}>
              All 5 Badges
            </div>
            <div style={{ fontSize: "12px", color: "#6B7280", marginTop: "6px", lineHeight: 1.45 }}>
              Nothing left but crumbs.
              <br />
              Full achievement board complete.
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export function AchievementScreen() {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    setProfile(getProfile());
  }, []);

  const unlockedBadges = useMemo(() => new Set(profile?.badges || []), [profile]);
  const unlockedCount = unlockedBadges.size;

  return (
    <div className="relative flex h-full min-w-0 flex-col overflow-hidden" style={{ background: "#F7F8FA" }}>
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-6 sm:px-5">
        <div className="w-full rounded-[32px] p-5" style={{ background: "#FFFFFF", border: "1px solid #FDE68A", boxShadow: "0 10px 34px rgba(217,119,6,0.08)" }}>
          <div className="mb-3 flex items-center justify-center gap-2">
            <Cookie size={15} color="#D97706" />
            <span style={{ fontSize: "10px", color: "#D97706", fontWeight: 800, letterSpacing: "0.16em" }}>COOKIE STATUS</span>
          </div>
          <div className="flex justify-center">
            <CookieProgress unlockedCount={unlockedCount} totalBadges={ALL_BADGES.length} />
          </div>
          <div className="mt-2 text-center" style={{ fontSize: "12px", color: "#7C2D12", fontWeight: 700, lineHeight: 1.45 }}>
            {unlockedCount === ALL_BADGES.length
              ? "You finished the whole cookie!"
              : `${ALL_BADGES.length - unlockedCount} more bite${ALL_BADGES.length - unlockedCount === 1 ? "" : "s"} to go.`}
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 px-4 pb-4 sm:px-5">
        <div className="rounded-[28px] p-4" style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", boxShadow: "0 4px 18px rgba(15,23,42,0.06)" }}>
          <div className="mb-3 flex items-center gap-2">
            <Star size={12} color="#F59E0B" fill="#F59E0B" />
            <span style={{ fontSize: "12px", color: "#111827", fontWeight: 700 }}>Badge Shelf</span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {ALL_BADGES.map((badge, index) => {
              const unlocked = unlockedBadges.has(badge.id);
              return (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex min-w-0 flex-col items-center gap-1 rounded-2xl px-2 py-3 text-center"
                  style={{
                    background: unlocked ? "linear-gradient(180deg, #FFFBEB 0%, #FFF7ED 100%)" : "#F9FAFB",
                    border: unlocked ? "1px solid #FDE68A" : "1px solid #E5E7EB",
                    opacity: unlocked ? 1 : 0.48,
                  }}
                >
                  <span style={{ fontSize: "22px", filter: unlocked ? "none" : "grayscale(1)" }}>{badge.icon}</span>
                  <div style={{ fontSize: "8px", fontWeight: 800, color: unlocked ? "#92400E" : "#9CA3AF", lineHeight: 1.15 }}>
                    {badge.name}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}