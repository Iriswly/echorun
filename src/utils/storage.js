const RUNS_KEY = "ECHORUN_RUNS";

export function getRunHistory() {
  try {
    const raw = localStorage.getItem(RUNS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveRunRecord(record) {
  const history = getRunHistory();
  const newRecord = {
    ...record,
    id: Date.now(),
    savedAt: new Date().toISOString(),
  };
  history.unshift(newRecord);
  localStorage.setItem(RUNS_KEY, JSON.stringify(history));
  return newRecord;
}
