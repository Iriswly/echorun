import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Cookie, Star } from "lucide-react";
import { getProfile } from "../../utils/profile.js";
import { ALL_BADGES } from "../../utils/badges.js";
import cookie0 from "../../assets/cookie-states/cookie-0.png";
import cookie1 from "../../assets/cookie-states/cookie-1.png";
import cookie2 from "../../assets/cookie-states/cookie-2.png";
import cookie3 from "../../assets/cookie-states/cookie-3.png";
import cookie4 from "../../assets/cookie-states/cookie-4.png";
import cookie5 from "../../assets/cookie-states/cookie-5.png";

const COOKIE_IMAGES = [cookie0, cookie1, cookie2, cookie3, cookie4, cookie5];

function CookieProgress({ unlockedCount, totalBadges }: { unlockedCount: number; totalBadges: number }) {
  const stage = Math.max(0, Math.min(unlockedCount, totalBadges));

  return (
    <div className="relative flex h-[280px] w-[280px] items-center justify-center sm:h-[320px] sm:w-[320px]">
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 180, damping: 20 }}
        className="absolute inset-0 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(251,191,36,0.16) 0%, rgba(249,115,22,0.08) 42%, transparent 72%)",
          filter: "blur(8px)",
        }}
      />

      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 180, damping: 18 }}
        className="relative flex items-center justify-center"
      >
        <img
          src={COOKIE_IMAGES[stage]}
          alt={`Cookie stage ${stage} of ${totalBadges}`}
          className="block h-[240px] w-[240px] select-none object-contain sm:h-[272px] sm:w-[272px]"
          draggable={false}
        />
      </motion.div>
    </div>
  );
}

export function AchievementScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [previewCount, setPreviewCount] = useState<number | null>(null);

  useEffect(() => {
    setProfile(getProfile());
  }, []);

  const unlockedBadges = useMemo(() => new Set(profile?.badges || []), [profile]);
  const unlockedCount = unlockedBadges.size;
  const visibleCount = previewCount ?? unlockedCount;
  const visibleRemaining = Math.max(0, ALL_BADGES.length - visibleCount);

  return (
    <div className="relative flex h-full min-w-0 flex-col overflow-y-auto overflow-x-hidden" style={{ background: "#F7F8FA" }}>
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-6 sm:px-5">
        <div className="w-full rounded-[32px] p-5" style={{ background: "#FFFFFF", border: "1px solid #FDE68A", boxShadow: "0 10px 34px rgba(217,119,6,0.08)" }}>
          <div className="mb-3 flex items-center justify-center gap-2">
            <Cookie size={15} color="#D97706" />
            <span style={{ fontSize: "10px", color: "#D97706", fontWeight: 800, letterSpacing: "0.16em" }}>COOKIE STATUS</span>
          </div>
          <div className="mb-4 flex flex-wrap justify-center gap-2">
            {[
              { label: "Real", value: null },
              { label: "0/5", value: 0 },
              { label: "1/5", value: 1 },
              { label: "2/5", value: 2 },
              { label: "3/5", value: 3 },
              { label: "4/5", value: 4 },
              { label: "5/5", value: 5 },
            ].map((preset) => {
              const active = previewCount === preset.value || (preset.value === null && previewCount === null);
              return (
                <button
                  key={preset.label}
                  onClick={() => setPreviewCount(preset.value)}
                  className="rounded-full px-3 py-1.5 transition-all active:scale-95"
                  style={{
                    background: active ? "#D97706" : "#FFF7ED",
                    border: `1px solid ${active ? "#D97706" : "#FDE68A"}`,
                    color: active ? "#FFFFFF" : "#92400E",
                    fontSize: "10px",
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                  }}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
          <div className="flex justify-center">
            <CookieProgress unlockedCount={visibleCount} totalBadges={ALL_BADGES.length} />
          </div>
          <div className="mt-2 text-center" style={{ fontSize: "12px", color: "#7C2D12", fontWeight: 700, lineHeight: 1.45 }}>
            {visibleCount === ALL_BADGES.length
              ? "You finished the whole cookie!"
              : `${visibleRemaining} more bite${visibleRemaining === 1 ? "" : "s"} to go.`}
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
