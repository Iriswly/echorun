import { useEffect, useMemo, useRef, useState } from "react";

type Phase = "idle" | "running" | "paused" | "done";
type LngLatTuple = [number, number];

type PositionPayload = {
  lng: number;
  lat: number;
  accuracy?: number;
  timestamp: number;
};

type LiveRunMapProps = {
  phase: Phase;
  isGhostMode: boolean;
  deltaLabel: string;
  deltaColor: string;
  gapMeters?: number;
  ghostProgress: number;
  ghostName?: string;
  currentPosition?: LngLatTuple | null;
  userTrack: LngLatTuple[];
  onPositionChange: (payload: PositionPayload) => void;
  onLocationStatusChange?: (status: string | null) => void;
};

declare global {
  interface Window {
    AMap?: any;
    _AMapSecurityConfig?: {
      securityJsCode?: string;
    };
  }
}

const DEFAULT_CENTER: LngLatTuple = [121.4737, 31.2304];
const AMAP_API_KEY = import.meta.env.VITE_AMAP_API_KEY;
const AMAP_SECURITY_JS_CODE = import.meta.env.VITE_AMAP_SECURITY_JS_CODE;

let amapLoaderPromise: Promise<any> | null = null;

function loadAmapSdk() {
  if (typeof window === "undefined") return Promise.reject(new Error("AMap can only load in a browser environment."));
  if (window.AMap) return Promise.resolve(window.AMap);
  if (!AMAP_API_KEY) return Promise.reject(new Error("Missing VITE_AMAP_API_KEY."));

  if (!amapLoaderPromise) {
    amapLoaderPromise = new Promise((resolve, reject) => {
      if (AMAP_SECURITY_JS_CODE) {
        window._AMapSecurityConfig = { securityJsCode: AMAP_SECURITY_JS_CODE };
      }

      const existingScript = document.querySelector<HTMLScriptElement>('script[data-amap-sdk="true"]');
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(window.AMap));
        existingScript.addEventListener("error", () => reject(new Error("Failed to load AMap SDK.")));
        return;
      }

      const script = document.createElement("script");
      script.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_API_KEY}&plugin=AMap.Geolocation`;
      script.async = true;
      script.defer = true;
      script.dataset.amapSdk = "true";
      script.onload = () => window.AMap ? resolve(window.AMap) : reject(new Error("AMap SDK loaded but AMap is unavailable."));
      script.onerror = () => reject(new Error("Failed to load AMap SDK."));
      document.head.appendChild(script);
    });
  }

  return amapLoaderPromise;
}

function createMarkerContent(background: string, border: string, size: number, label: string) {
  return `
    <div style="
      width:${size}px;
      height:${size}px;
      border-radius:9999px;
      background:${background};
      border:3px solid ${border};
      box-shadow:0 0 0 6px ${background}22, 0 4px 14px rgba(15,23,42,0.18);
      display:flex;
      align-items:center;
      justify-content:center;
      color:#ffffff;
      font-size:${Math.max(10, Math.floor(size / 2.2))}px;
      font-weight:900;
      font-family:Arial,sans-serif;
    ">${label}</div>
  `;
}

function createGhostMarkerContent(name: string, status: "ahead" | "behind" | "even") {
  const palette = {
    ahead: { shell: "#F97316", ring: "#FED7AA", chip: "#FFF7ED", chipBorder: "#FDBA74", chipText: "#C2410C", text: "LEADS", opacity: 1 },
    behind: { shell: "#7C3AED", ring: "#DDD6FE", chip: "#F5F3FF", chipBorder: "#C4B5FD", chipText: "#6D28D9", text: "BEHIND", opacity: 0.88 },
    even: { shell: "#64748B", ring: "#CBD5E1", chip: "#F8FAFC", chipBorder: "#CBD5E1", chipText: "#475569", text: "EVEN", opacity: 0.95 },
  }[status];
  const initial = (name || "G").trim().charAt(0).toUpperCase();

  return `
    <div style="
      display:flex;
      flex-direction:column;
      align-items:center;
      gap:6px;
      transform:translateY(-8px);
      opacity:${palette.opacity};
      font-family:Arial,sans-serif;
    ">
      <div style="
        width:34px;
        height:34px;
        border-radius:9999px;
        background:${palette.shell};
        border:3px solid #ffffff;
        box-shadow:0 0 0 6px ${palette.ring}AA, 0 8px 20px rgba(15,23,42,0.18);
        display:flex;
        align-items:center;
        justify-content:center;
        color:#ffffff;
        font-size:15px;
        font-weight:900;
      ">${initial}</div>
      <div style="
        padding:3px 8px;
        border-radius:9999px;
        background:${palette.chip};
        border:1px solid ${palette.chipBorder};
        color:${palette.chipText};
        font-size:9px;
        font-weight:800;
        letter-spacing:0.08em;
        white-space:nowrap;
        box-shadow:0 4px 12px rgba(15,23,42,0.08);
      ">${palette.text}</div>
    </div>
  `;
}

function getPointOnTrack(track: LngLatTuple[], progress: number): LngLatTuple | null {
  if (track.length === 0) return null;
  if (track.length === 1) return track[0];

  const safeProgress = Math.min(Math.max(progress, 0), 1);
  if (safeProgress <= 0) return track[0];
  if (safeProgress >= 1) return track[track.length - 1];

  const segment = (track.length - 1) * safeProgress;
  const startIndex = Math.floor(segment);
  const t = segment - startIndex;
  const start = track[startIndex];
  const end = track[Math.min(startIndex + 1, track.length - 1)];

  return [
    start[0] + (end[0] - start[0]) * t,
    start[1] + (end[1] - start[1]) * t,
  ];
}

export function LiveRunMap({
  phase,
  isGhostMode,
  deltaLabel,
  deltaColor,
  gapMeters = 0,
  ghostProgress,
  ghostName = "Ghost",
  currentPosition = null,
  userTrack,
  onPositionChange,
  onLocationStatusChange,
}: LiveRunMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const geolocationRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const ghostMarkerRef = useRef<any>(null);
  const accuracyCircleRef = useRef<any>(null);
  const trackLineRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const pollTimerRef = useRef<number | null>(null);
  const hasCenteredRef = useRef(false);
  const statusRef = useRef<string | null>(null);
  const [sdkError, setSdkError] = useState<string | null>(null);
  const [debugStatus, setDebugStatus] = useState("Preparing AMap...");

  const canUseAmap = useMemo(() => Boolean(AMAP_API_KEY), []);

  useEffect(() => {
    if (!canUseAmap || !containerRef.current) return;

    let disposed = false;

    loadAmapSdk()
      .then((AMap) => {
        if (disposed || !containerRef.current) return;
        setDebugStatus("AMap SDK loaded.");

        const map = new AMap.Map(containerRef.current, {
          viewMode: "2D",
          zoom: 16,
          center: DEFAULT_CENTER,
          mapStyle: "amap://styles/normal",
          resizeEnable: true,
          jogEnable: true,
        });

        mapRef.current = map;
        setDebugStatus("Map instance created.");
        tileLayerRef.current = new AMap.TileLayer({ zIndex: 1, opacity: 1 });
        map.add(tileLayerRef.current);

        trackLineRef.current = new AMap.Polyline({
          path: [],
          strokeColor: "#2563EB",
          strokeWeight: 6,
          strokeOpacity: 0.9,
          lineJoin: "round",
          lineCap: "round",
          showDir: false,
          zIndex: 10,
        });
        accuracyCircleRef.current = new AMap.Circle({
          center: DEFAULT_CENTER,
          radius: 0,
          strokeColor: "#2563EB",
          strokeOpacity: 0.28,
          strokeWeight: 1,
          fillColor: "#2563EB",
          fillOpacity: 0.08,
          zIndex: 4,
        });
        userMarkerRef.current = new AMap.Marker({
          position: DEFAULT_CENTER,
          anchor: "center",
          offset: new AMap.Pixel(-12, -12),
          content: createMarkerContent("#2563EB", "#FFFFFF", 24, "U"),
          zIndex: 20,
        });
        ghostMarkerRef.current = new AMap.Marker({
          position: DEFAULT_CENTER,
          anchor: "center",
          offset: new AMap.Pixel(-17, -36),
          content: createGhostMarkerContent(ghostName, "even"),
          zIndex: 19,
        });

        map.add([trackLineRef.current, accuracyCircleRef.current, userMarkerRef.current]);
        map.add(ghostMarkerRef.current);
        ghostMarkerRef.current.hide();
        map.on("complete", () => setDebugStatus("Map render complete."));
        window.requestAnimationFrame(() => map.resize());
        window.setTimeout(() => map.resize(), 120);

        AMap.plugin(["AMap.Geolocation"], () => {
          if (disposed) return;
          setDebugStatus("Geolocation plugin ready.");

          geolocationRef.current = new AMap.Geolocation({
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
            convert: true,
            showButton: false,
            showMarker: false,
            showCircle: false,
            panToLocation: false,
            zoomToAccuracy: false,
            needAddress: false,
          });

          onLocationStatusChange?.("Locating...");
          statusRef.current = "Locating...";
          setDebugStatus("Requesting current position...");
          geolocationRef.current.getCurrentPosition((status: string, result: any) => {
            if (disposed) return;

            if (status === "complete" && result?.position) {
              const lng = result.position.lng;
              const lat = result.position.lat;
              const accuracy = result.accuracy;

              userMarkerRef.current?.setPosition([lng, lat]);
              accuracyCircleRef.current?.setCenter([lng, lat]);
              accuracyCircleRef.current?.setRadius(typeof accuracy === "number" ? accuracy : 0);
              map.setCenter([lng, lat]);
              hasCenteredRef.current = true;
              statusRef.current = null;
              onLocationStatusChange?.(null);
              setDebugStatus("Location acquired.");
              onPositionChange({ lng, lat, accuracy, timestamp: Date.now() });
            } else {
              const message = result?.message || result?.info || "Location failed.";
              setSdkError(message);
              statusRef.current = message;
              onLocationStatusChange?.(message);
              setDebugStatus(`Location failed: ${message}`);
            }
          });
        });
      })
      .catch((error: Error) => {
        if (disposed) return;
        setSdkError(error.message);
        onLocationStatusChange?.(error.message);
        setDebugStatus(`AMap init failed: ${error.message}`);
      });

    return () => {
      disposed = true;
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      ghostMarkerRef.current?.setMap?.(null);
      userMarkerRef.current?.setMap?.(null);
      accuracyCircleRef.current?.setMap?.(null);
      trackLineRef.current?.setMap?.(null);
      tileLayerRef.current?.setMap?.(null);
      mapRef.current?.destroy?.();
      ghostMarkerRef.current = null;
      userMarkerRef.current = null;
      accuracyCircleRef.current = null;
      trackLineRef.current = null;
      tileLayerRef.current = null;
      geolocationRef.current = null;
      mapRef.current = null;
    };
  }, [canUseAmap, ghostName, onLocationStatusChange, onPositionChange]);

  useEffect(() => {
    if (!mapRef.current) return;

    const resizeMap = () => mapRef.current?.resize?.();
    window.addEventListener("resize", resizeMap);
    window.requestAnimationFrame(resizeMap);
    window.setTimeout(resizeMap, 200);
    return () => window.removeEventListener("resize", resizeMap);
  }, []);

  useEffect(() => {
    if (!mapRef.current || !geolocationRef.current) return;

    const tick = () => {
      setDebugStatus(phase === "running" ? "Refreshing live position..." : "Refreshing standby position...");
      geolocationRef.current.getCurrentPosition((status: string, result: any) => {
        if (status === "complete" && result?.position) {
          const lng = result.position.lng;
          const lat = result.position.lat;
          const accuracy = result.accuracy;

          userMarkerRef.current?.setPosition([lng, lat]);
          accuracyCircleRef.current?.setCenter([lng, lat]);
          accuracyCircleRef.current?.setRadius(typeof accuracy === "number" ? accuracy : 0);
          if (!hasCenteredRef.current) {
            mapRef.current.setCenter([lng, lat]);
            hasCenteredRef.current = true;
          } else {
            mapRef.current.panTo([lng, lat]);
          }

          if (statusRef.current) {
            statusRef.current = null;
            onLocationStatusChange?.(null);
          }
          setSdkError(null);
          setDebugStatus("Live position updated.");
          onPositionChange({ lng, lat, accuracy, timestamp: Date.now() });
        } else {
          const message = result?.message || result?.info || "Location failed.";
          statusRef.current = message;
          onLocationStatusChange?.(message);
          setSdkError(message);
          setDebugStatus(`Refresh failed: ${message}`);
        }
      });
    };

    tick();
    if (pollTimerRef.current) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    pollTimerRef.current = window.setInterval(tick, phase === "running" ? 1000 : 2000);
    return () => {
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [phase, onLocationStatusChange, onPositionChange]);

  useEffect(() => {
    if (!trackLineRef.current) return;
    trackLineRef.current.setPath(userTrack);
  }, [userTrack]);

  useEffect(() => {
    if (!ghostMarkerRef.current) return;
    if (!isGhostMode) {
      ghostMarkerRef.current.hide();
      return;
    }

    const ghostPoint = userTrack.length > 0 ? getPointOnTrack(userTrack, ghostProgress) : currentPosition;
    if (!ghostPoint) {
      ghostMarkerRef.current.hide();
      return;
    }

    ghostMarkerRef.current.setPosition(ghostPoint);
    ghostMarkerRef.current.setContent(createGhostMarkerContent(ghostName, gapMeters > 8 ? "behind" : gapMeters < -8 ? "ahead" : "even"));
    ghostMarkerRef.current.show();
  }, [currentPosition, gapMeters, ghostName, ghostProgress, isGhostMode, userTrack]);

  if (!canUseAmap) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center" style={{ background: "#EFF6FF" }}>
        <div style={{ fontSize: "14px", fontWeight: 800, color: "#1D4ED8", marginBottom: "8px" }}>AMap API key required</div>
        <div style={{ fontSize: "12px", color: "#475569", lineHeight: 1.6 }}>
          Add <code>VITE_AMAP_API_KEY</code> in your local env file to enable the live map.
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 min-w-0 overflow-hidden">
      <div ref={containerRef} className="absolute inset-0" style={{ width: "100%", height: "100%", minHeight: "100%", maxWidth: "100%", zIndex: 0 }} />
      <div className="absolute top-3 right-3 max-w-[calc(100%-24px)] px-3 py-1.5 rounded-full flex flex-wrap items-center gap-1.5" style={{ background: "rgba(255,255,255,0.92)", border: `1.5px solid ${deltaColor}40`, backdropFilter: "blur(4px)" }}>
        <div className="w-2 h-2 rounded-full" style={{ background: deltaColor }} />
        <span style={{ fontSize: "12px", fontWeight: 800, color: deltaColor, fontFamily: "'Archivo Black', sans-serif", letterSpacing: "-0.01em" }}>{deltaLabel}</span>
      </div>
      <div className="absolute top-3 left-3 max-w-[calc(100%-24px)] px-2.5 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.9)", border: "1px solid #E5E7EB", fontSize: "8px", color: "#6B7280", fontWeight: 700, letterSpacing: "0.12em" }}>
        {isGhostMode ? "GHOST MODE" : "LIVE GPS"}
      </div>
      <div className="absolute left-3 bottom-3 max-w-[calc(100%-24px)] px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.95)", border: "1px solid #E5E7EB", color: "#334155", fontSize: "11px", lineHeight: 1.45 }}>
        {debugStatus}
      </div>
      {sdkError && (
        <div className="absolute left-3 right-3 bottom-16 px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.95)", border: "1px solid #FECACA", color: "#B91C1C", fontSize: "11px", lineHeight: 1.45 }}>
          {sdkError}
        </div>
      )}
    </div>
  );
}
