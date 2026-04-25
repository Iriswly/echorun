export function calculateRunPoints({ mode, distance, duration, avgPace, finalGap, result }) {
  let points = 50; // base completion

  // per 100m
  points += Math.floor(distance / 100) * 5;

  // distance bonuses
  if (distance >= 3000) points += 150;
  else if (distance >= 1000) points += 50;

  // ghost run result
  if (mode === "ghost") {
    if (result === "win") points += 100;
    else if (result === "tie") points += 40;
    else points += 20;

    if (finalGap > 50) points += 50;
  }

  return Math.max(0, points);
}

export function getLevelInfo(totalPoints) {
  const level = Math.floor(totalPoints / 500) + 1;
  const currentLevelPoints = totalPoints % 500;
  const nextLevelPoints = 500;
  const progress = currentLevelPoints / nextLevelPoints;
  return { level, currentLevelPoints, nextLevelPoints, progress };
}
