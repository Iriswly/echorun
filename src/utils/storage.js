import { getStorageKey } from "./auth.js";

const RUNS_KEY = "ECHORUN_RUNS";
const MOCK_VERSION_KEY = "ECHORUN_MOCK_RUNS_VERSION";
const MOCK_VERSION = "ghost-v3";

function createDistanceSeries(totalDistance, splits) {
  const series = [{ t: 0, d: 0 }];
  let elapsed = 0;
  let distance = 0;

  for (const split of splits) {
    const { duration, distanceGain } = split;
    const startTime = elapsed;
    const startDistance = distance;

    for (let second = 1; second <= duration; second += 1) {
      const progress = second / duration;
      series.push({
        t: startTime + second,
        d: startDistance + distanceGain * progress,
      });
    }

    elapsed += duration;
    distance += distanceGain;
  }

  if (series[series.length - 1]?.d !== totalDistance) {
    series.push({ t: elapsed, d: totalDistance });
  }

  return series;
}

function createMockRuns() {
  const now = Date.now();

  return [
    {
      id: 900001,
      mode: "standard",
      source: "self",
      runnerName: "You",
      title: "Last 120m Benchmark",
      distance: 120,
      duration: 36,
      avgPace: 300,
      pointsEarned: 120,
      date: new Date(now - 1000 * 60 * 60 * 24).toISOString(),
      savedAt: new Date(now - 1000 * 60 * 60 * 24).toISOString(),
      isMock: true,
      distanceSeries: createDistanceSeries(120, [
        { duration: 12, distanceGain: 34 },
        { duration: 12, distanceGain: 42 },
        { duration: 12, distanceGain: 44 },
      ]),
    },
    {
      id: 900002,
      mode: "standard",
      source: "friend",
      runnerName: "Mika",
      title: "Friend Quick Dash 180m",
      distance: 180,
      duration: 54,
      avgPace: 300,
      pointsEarned: 0,
      date: new Date(now - 1000 * 60 * 60 * 36).toISOString(),
      savedAt: new Date(now - 1000 * 60 * 60 * 36).toISOString(),
      isMock: true,
      distanceSeries: createDistanceSeries(180, [
        { duration: 18, distanceGain: 56 },
        { duration: 18, distanceGain: 60 },
        { duration: 18, distanceGain: 64 },
      ]),
    },
    {
      id: 900003,
      mode: "standard",
      source: "friend",
      runnerName: "Leo",
      title: "Friend Sprint 240m",
      distance: 240,
      duration: 66,
      avgPace: 275,
      pointsEarned: 0,
      date: new Date(now - 1000 * 60 * 60 * 52).toISOString(),
      savedAt: new Date(now - 1000 * 60 * 60 * 52).toISOString(),
      isMock: true,
      distanceSeries: createDistanceSeries(240, [
        { duration: 22, distanceGain: 78 },
        { duration: 22, distanceGain: 80 },
        { duration: 22, distanceGain: 82 },
      ]),
    },
  ];
}

function normalizeRunRecord(record) {
  if (!record?.distanceSeries || record.distanceSeries.length === 0) return record;
  return {
    ...record,
    distanceSeries: record.distanceSeries
      .map((point) => ({ t: Number(point.t) || 0, d: Number(point.d) || 0 }))
      .sort((a, b) => a.t - b.t),
  };
}

function ensureMockRuns(history) {
  const runsKey = getStorageKey(RUNS_KEY);
  const mockVersionKey = getStorageKey(MOCK_VERSION_KEY);
  const seededVersion = localStorage.getItem(mockVersionKey);
  const baseHistory = Array.isArray(history) ? history : [];
  const withoutMocks = baseHistory.filter((record) => !record?.isMock);
  const nextHistory = [...withoutMocks, ...createMockRuns()]
    .map(normalizeRunRecord)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (seededVersion !== MOCK_VERSION || nextHistory.length !== baseHistory.length) {
    localStorage.setItem(runsKey, JSON.stringify(nextHistory));
    localStorage.setItem(mockVersionKey, MOCK_VERSION);
  }

  return nextHistory;
}

export function getRunHistory() {
  try {
    const raw = localStorage.getItem(getStorageKey(RUNS_KEY));
    const history = raw ? JSON.parse(raw) : [];
    return ensureMockRuns(history);
  } catch {
    const mockRuns = createMockRuns();
    localStorage.setItem(getStorageKey(RUNS_KEY), JSON.stringify(mockRuns));
    localStorage.setItem(getStorageKey(MOCK_VERSION_KEY), MOCK_VERSION);
    return mockRuns;
  }
}

export function saveRunRecord(record) {
  const history = getRunHistory().filter((item) => !item?.isMock);
  const newRecord = normalizeRunRecord({
    ...record,
    id: Date.now(),
    savedAt: new Date().toISOString(),
  });
  const nextHistory = [newRecord, ...history];
  localStorage.setItem(getStorageKey(RUNS_KEY), JSON.stringify(nextHistory));
  localStorage.removeItem(getStorageKey(MOCK_VERSION_KEY));
  return newRecord;
}
