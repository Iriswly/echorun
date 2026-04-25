export const ALL_BADGES = [
  {
    id: "first_run",
    name: "First Run",
    description: "Complete your first run.",
    icon: "🏃",
  },
  {
    id: "ghost_hunter",
    name: "Ghost Hunter",
    description: "Beat a ghost for the first time.",
    icon: "👻",
  },
  {
    id: "one_k_club",
    name: "1K Club",
    description: "Complete a run over 1 km.",
    icon: "🥇",
  },
  {
    id: "three_k_grinder",
    name: "3K Grinder",
    description: "Complete a run over 3 km.",
    icon: "💪",
  },
  {
    id: "comeback_runner",
    name: "Comeback Runner",
    description: "Win a Ghost Run after being behind.",
    icon: "⚡",
  },
];

export function evaluateBadges(profile, runResult) {
  const unlocked = new Set(profile.badges || []);
  const newBadges = [];

  const check = (id) => {
    if (!unlocked.has(id)) {
      newBadges.push(id);
      unlocked.add(id);
    }
  };

  if (profile.totalRuns === 0) check("first_run");
  if (runResult.distance >= 1000) check("one_k_club");
  if (runResult.distance >= 3000) check("three_k_grinder");
  if (runResult.mode === "ghost" && runResult.result === "win") check("ghost_hunter");
  if (runResult.mode === "ghost" && runResult.result === "win" && runResult.wasBehinDuringRun) check("comeback_runner");

  return newBadges;
}
