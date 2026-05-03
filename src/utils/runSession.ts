export const RUN_STATUS_EVENT = "echorun-run-status-change";
export const RUN_STOP_REQUEST_EVENT = "echorun-run-stop-request";

const ACTIVE_RUN_KEY = "ECHORUN_ACTIVE_RUN";

export type ActiveRunStatus = {
  isActive: boolean;
};

export type StopRunRequestDetail = {
  destination: string;
};

export function getActiveRunStatus(): ActiveRunStatus {
  try {
    const raw = sessionStorage.getItem(ACTIVE_RUN_KEY);
    return raw ? JSON.parse(raw) : { isActive: false };
  } catch {
    return { isActive: false };
  }
}

export function setActiveRunStatus(status: ActiveRunStatus) {
  sessionStorage.setItem(ACTIVE_RUN_KEY, JSON.stringify(status));
  window.dispatchEvent(new CustomEvent(RUN_STATUS_EVENT, { detail: status }));
}
