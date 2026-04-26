const RUNS_KEY = "ECHORUN_RUNS";
const MOCK_VERSION_KEY = "ECHORUN_MOCK_RUNS_VERSION";
const MOCK_VERSION = "ghost-v2";

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
      title: "Last 1K Benchmark",
      distance: 1000,
      duration: 285,
      avgPace: 285,
      pointsEarned: 120,
      date: new Date(now - 1000 * 60 * 60 * 24).toISOString(),
      savedAt: new Date(now - 1000 * 60 * 60 * 24).toISOString(),
      isMock: true,
      distanceSeries: createDistanceSeries(1000, [
        { duration: 60, distanceGain: 180 },
        { duration: 60, distanceGain: 220 },
        { duration: 60, distanceGain: 215 },
        { duration: 60, distanceGain: 210 },
        { duration: 45, distanceGain: 175 },
      ]),
    },
    {
      id: 900002,
      mode: "standard",
      source: "friend",
      runnerName: "Mika",
      title: "Friend Long Run 10K",
      distance: 10000,
      duration: 2940,
      avgPace: 294,
      pointsEarned: 0,
      date: new Date(now - 1000 * 60 * 60 * 36).toISOString(),
      savedAt: new Date(now - 1000 * 60 * 60 * 36).toISOString(),
      isMock: true,
      distanceSeries: createDistanceSeries(10000, [
        { duration: 300, distanceGain: 980 },
        { duration: 300, distanceGain: 1010 },
        { duration: 300, distanceGain: 1000 },
        { duration: 300, distanceGain: 1040 },
        { duration: 300, distanceGain: 1010 },
        { duration: 300, distanceGain: 990 },
        { duration: 300, distanceGain: 1005 },
        { duration: 300, distanceGain: 995 },
        { duration: 300, distanceGain: 985 },
        { duration: 240, distanceGain: 985 },
      ]),
    },
    {
      id: 900003,
      mode: "standard",
      source: "friend",
      runnerName: "Leo",
      title: "Friend Fast 5K",
      distance: 5000,
      duration: 1260,
      avgPace: 252,
      pointsEarned: 0,
      date: new Date(now - 1000 * 60 * 60 * 52).toISOString(),
      savedAt: new Date(now - 1000 * 60 * 60 * 52).toISOString(),
      isMock: true,
      distanceSeries: createDistanceSeries(5000, [
        { duration: 180, distanceGain: 740 },
        { duration: 180, distanceGain: 710 },
        { duration: 180, distanceGain: 720 },
        { duration: 180, distanceGain: 705 },
        { duration: 180, distanceGain: 720 },
        { duration: 180, distanceGain: 700 },
        { duration: 180, distanceGain: 705 },
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
  const seededVersion = localStorage.getItem(MOCK_VERSION_KEY);
  const baseHistory = Array.isArray(history) ? history : [];
  const withoutMocks = baseHistory.filter((record) => !record?.isMock);
  const nextHistory = [...withoutMocks, ...createMockRuns()]
    .map(normalizeRunRecord)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (seededVersion !== MOCK_VERSION || nextHistory.length !== baseHistory.length) {
    localStorage.setItem(RUNS_KEY, JSON.stringify(nextHistory));
    localStorage.setItem(MOCK_VERSION_KEY, MOCK_VERSION);
  }

  return nextHistory;
}

export function getRunHistory() {
  try {
    const raw = localStorage.getItem(RUNS_KEY);
    const history = raw ? JSON.parse(raw) : [];
    return ensureMockRuns(history);
  } catch {
    const mockRuns = createMockRuns();
    localStorage.setItem(RUNS_KEY, JSON.stringify(mockRuns));
    localStorage.setItem(MOCK_VERSION_KEY, MOCK_VERSION);
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
  localStorage.setItem(RUNS_KEY, JSON.stringify(nextHistory));
  localStorage.removeItem(MOCK_VERSION_KEY);
  return newRecord;
}
