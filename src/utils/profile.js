import { getLevelInfo } from "./scoring.js";

const KEY = "ECHORUN_PROFILE";

const DEFAULT_PROFILE = {
  totalPoints: 0,
  level: 1,
  totalRuns: 0,
  totalDistance: 0,
  ghostWins: 0,
  ghostLosses: 0,
  badges: [],
};

export function getProfile() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_PROFILE, ...JSON.parse(raw) } : { ...DEFAULT_PROFILE };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export function saveProfile(profile) {
  localStorage.setItem(KEY, JSON.stringify(profile));
}

export function updateProfileAfterRun(runResult, newBadges) {
  const profile = getProfile();
  const { level } = getLevelInfo(profile.totalPoints + runResult.pointsEarned);

  const updated = {
    ...profile,
    totalPoints: profile.totalPoints + runResult.pointsEarned,
    level,
    totalRuns: profile.totalRuns + 1,
    totalDistance: profile.totalDistance + runResult.distance,
    ghostWins: runResult.mode === "ghost" && runResult.result === "win"
      ? profile.ghostWins + 1
      : profile.ghostWins,
    ghostLosses: runResult.mode === "ghost" && runResult.result === "lose"
      ? profile.ghostLosses + 1
      : profile.ghostLosses,
    badges: [...new Set([...profile.badges, ...newBadges])],
  };

  saveProfile(updated);
  return updated;
}
