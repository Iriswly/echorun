import { useEffect, useMemo, useRef, useState } from "react";

type Phase = "idle" | "running" | "paused" | "done";
type LngLatTuple = [number, number];

type PositionPayload = {
  lng: number;
  lat: number;
  accuracy?: number;
  timestamp: number;
  source: "amap" | "browser";
};

type LiveRunMapProps = {
  phase: Phase;
  isGhostMode: boolean;
  deltaLabel: string;
  deltaColor: string;
  gapMeters?: number;
  userDistance: number;
  ghostDistance: number;
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

function calculateSegmentDistanceMeters(from: LngLatTuple, to: LngLatTuple) {
  const earthRadius = 6371000;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const lat1 = toRadians(from[1]);
  const lat2 = toRadians(to[1]);
  const deltaLat = toRadians(to[1] - from[1]);
  const deltaLng = toRadians(to[0] - from[0]);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadius * c;
}

function getPointAtDistance(track: LngLatTuple[], targetDistance: number): LngLatTuple | null {
  if (!track.length) return null;
  if (track.length === 1 || targetDistance <= 0) return track[0];

  let covered = 0;
  for (let index = 1; index < track.length; index += 1) {
    const start = track[index - 1];
    const end = track[index];
    const segmentDistance = calculateSegmentDistanceMeters(start, end);

    if (covered + segmentDistance >= targetDistance) {
      const span = segmentDistance || 1;
      const t = (targetDistance - covered) / span;
      return [
        start[0] + (end[0] - start[0]) * t,
        start[1] + (end[1] - start[1]) * t,
      ];
    }

    covered += segmentDistance;
  }

  return track[track.length - 1];
}

function extrapolateFromHeading(track: LngLatTuple[], distanceMeters: number): LngLatTuple | null {
  if (!track.length) return null;
  if (track.length === 1 || distanceMeters <= 0) return track[track.length - 1];

  const last = track[track.length - 1];
  let previous = track[track.length - 2];

  for (let index = track.length - 2; index >= 0; index -= 1) {
    if (track[index][0] !== last[0] || track[index][1] !== last[1]) {
      previous = track[index];
      break;
    }
  }

  const segmentDistance = calculateSegmentDistanceMeters(previous, last) || 1;
  const lngDelta = last[0] - previous[0];
  const latDelta = last[1] - previous[1];
  const scale = distanceMeters / segmentDistance;

  return [
    last[0] + lngDelta * scale,
    last[1] + latDelta * scale,
  ];
}

function isValidLngLat(point: unknown): point is LngLatTuple {
  return (
    Array.isArray(point) &&
    point.length === 2 &&
    typeof point[0] === "number" &&
    Number.isFinite(point[0]) &&
    typeof point[1] === "number" &&
    Number.isFinite(point[1])
  );
}

function readAmapPosition(result: any): { lng: number; lat: number; accuracy?: number } | null {
  const position = result?.position ?? result?.lnglat ?? result?.location ?? result;
  if (!position) return null;

  const lng = typeof position.getLng === "function" ? position.getLng() : position.lng ?? position.longitude;
  const lat = typeof position.getLat === "function" ? position.getLat() : position.lat ?? position.latitude;

  if (typeof lng !== "number" || !Number.isFinite(lng) || typeof lat !== "number" || !Number.isFinite(lat)) {
    return null;
  }

  const accuracy = Number(result?.accuracy ?? position.accuracy);
  return {
    lng,
    lat,
    accuracy: Number.isFinite(accuracy) ? accuracy : undefined,
  };
}

export function LiveRunMap({
  phase,
  isGhostMode,
  deltaLabel,
  deltaColor,
  gapMeters = 0,
  userDistance,
  ghostDistance,
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
  const amapWatchIdRef = useRef<number | null>(null);
  const browserWatchIdRef = useRef<number | null>(null);
  const hasCenteredRef = useRef(false);
  const statusRef = useRef<string | null>(null);
  const onPositionChangeRef = useRef(onPositionChange);
  const onLocationStatusChangeRef = useRef(onLocationStatusChange);
  const [sdkError, setSdkError] = useState<string | null>(null);
  const [debugStatus, setDebugStatus] = useState("Preparing AMap...");
  const [mapReady, setMapReady] = useState(false);

  const canUseAmap = useMemo(() => Boolean(AMAP_API_KEY), []);

  useEffect(() => {
    onPositionChangeRef.current = onPositionChange;
  }, [onPositionChange]);

  useEffect(() => {
    onLocationStatusChangeRef.current = onLocationStatusChange;
  }, [onLocationStatusChange]);

  const updateMapPosition = (lng: number, lat: number, accuracy?: number, shouldPan = true) => {
    userMarkerRef.current?.setPosition([lng, lat]);
    accuracyCircleRef.current?.setCenter([lng, lat]);
    accuracyCircleRef.current?.setRadius(typeof accuracy === "number" ? accuracy : 0);

    if (!mapRef.current) return;

    if (!hasCenteredRef.current) {
      mapRef.current.setCenter([lng, lat]);
      hasCenteredRef.current = true;
      return;
    }

    if (shouldPan) {
      mapRef.current.panTo([lng, lat]);
    }
  };

  const emitResolvedPosition = (
    lng: number,
    lat: number,
    accuracy?: number,
    debugMessage = "Live position updated.",
    shouldPan = true,
    timestamp = Date.now(),
    source: "amap" | "browser" = "amap",
  ) => {
    updateMapPosition(lng, lat, accuracy, shouldPan);
    if (statusRef.current) {
      statusRef.current = null;
      onLocationStatusChangeRef.current?.(null);
    }
    setSdkError(null);
    setDebugStatus(debugMessage);
    onPositionChangeRef.current({ lng, lat, accuracy, timestamp, source });
  };

  const convertGpsToAmap = (lng: number, lat: number): Promise<LngLatTuple> => {
    const AMap = window.AMap;
    if (!AMap?.convertFrom) {
      return Promise.resolve([lng, lat]);
    }

    return new Promise((resolve) => {
      AMap.convertFrom([lng, lat], "gps", (status: string, result: any) => {
        const location = result?.locations?.[0];
        if (status === "complete" && location) {
          if (typeof location.getLng === "function" && typeof location.getLat === "function") {
            resolve([location.getLng(), location.getLat()]);
            return;
          }
          if (typeof location.lng === "number" && typeof location.lat === "number") {
            resolve([location.lng, location.lat]);
            return;
          }
        }
        resolve([lng, lat]);
      });
    });
  };

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
        trackLineRef.current.hide();
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
            GeoLocationFirst: true,
            panToLocation: false,
            zoomToAccuracy: false,
            needAddress: false,
          });
          setMapReady(true);
        });
      })
      .catch((error: Error) => {
        if (disposed) return;
        setSdkError(error.message);
        onLocationStatusChangeRef.current?.(error.message);
        setDebugStatus(`AMap init failed: ${error.message}`);
      });

    return () => {
      disposed = true;
      setMapReady(false);
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      if (amapWatchIdRef.current !== null) {
        geolocationRef.current?.clearWatch?.(amapWatchIdRef.current);
        amapWatchIdRef.current = null;
      }
      if (browserWatchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(browserWatchIdRef.current);
        browserWatchIdRef.current = null;
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
  }, [canUseAmap]);

  useEffect(() => {
    if (!mapRef.current) return;

    const resizeMap = () => mapRef.current?.resize?.();
    window.addEventListener("resize", resizeMap);
    window.requestAnimationFrame(resizeMap);
    window.setTimeout(resizeMap, 200);
    return () => window.removeEventListener("resize", resizeMap);
  }, []);

  useEffect(() => {
    if (!mapReady) return;

    statusRef.current = "Locating...";
    onLocationStatusChangeRef.current?.("Locating...");
    setDebugStatus(phase === "running" ? "Starting AMap live tracking..." : "Requesting AMap location...");

    let disposed = false;
    let browserWatchActive = false;

    const emitAmapResult = (result: any, message: string) => {
      if (disposed) return false;
      const position = readAmapPosition(result);
      if (!position) return false;
      emitResolvedPosition(position.lng, position.lat, position.accuracy, message, true, Date.now(), "amap");
      return true;
    };

    const getAmapCurrentPosition = (message = "Live position updated via AMap.") => {
      if (!geolocationRef.current) return;

      geolocationRef.current.getCurrentPosition((status: string, result: any) => {
        if (disposed) return;
        if (status === "complete" && emitAmapResult(result, message)) {
          return;
        }

        const errorMessage = result?.message || result?.info || "Location failed.";
        statusRef.current = errorMessage;
        setSdkError(errorMessage);
        setDebugStatus(`Location failed: ${errorMessage}`);
        onLocationStatusChangeRef.current?.(errorMessage);
      });
    };

    const startBrowserFallbackWatch = () => {
      if (browserWatchActive || typeof navigator === "undefined" || !navigator.geolocation) return;

      browserWatchActive = true;
      setDebugStatus("AMap tracking failed. Browser GPS fallback active.");
      browserWatchIdRef.current = navigator.geolocation.watchPosition(
        async (position) => {
          const converted = await convertGpsToAmap(position.coords.longitude, position.coords.latitude);
          if (disposed || !browserWatchActive) return;
          emitResolvedPosition(converted[0], converted[1], position.coords.accuracy, "Browser GPS fallback active.", true, position.timestamp, "browser");
        },
        (error) => {
          if (disposed) return;
          browserWatchActive = false;
          const message =
            error.code === error.PERMISSION_DENIED
              ? "Location permission denied."
              : error.code === error.TIMEOUT
                ? "GPS watch timed out."
                : error.code === error.POSITION_UNAVAILABLE
                  ? "GPS position unavailable."
                  : error.message || "GPS watch failed.";

          statusRef.current = message;
          setSdkError(message);
          setDebugStatus(`GPS watch failed: ${message}`);
          onLocationStatusChangeRef.current?.(message);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 1000,
          timeout: 15000,
        },
      );
    };

    if (phase !== "running") {
      getAmapCurrentPosition("AMap standby location updated.");
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      pollTimerRef.current = window.setInterval(() => getAmapCurrentPosition("AMap standby location updated."), 4000);
      return () => {
        disposed = true;
        if (amapWatchIdRef.current !== null) {
          geolocationRef.current?.clearWatch?.(amapWatchIdRef.current);
          amapWatchIdRef.current = null;
        }
        if (pollTimerRef.current) {
          window.clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
        browserWatchActive = false;
        if (browserWatchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
          navigator.geolocation.clearWatch(browserWatchIdRef.current);
          browserWatchIdRef.current = null;
        }
      };
    }

    getAmapCurrentPosition("AMap live tracking active.");

    if (typeof geolocationRef.current?.watchPosition === "function") {
      amapWatchIdRef.current = geolocationRef.current.watchPosition((status: string, result: any) => {
        if (disposed) return;
        if (status === "complete" && emitAmapResult(result, "AMap live tracking active.")) {
          return;
        }

        const message = result?.message || result?.info || "AMap live tracking failed.";
        statusRef.current = message;
        setSdkError(message);
        setDebugStatus(`AMap tracking failed: ${message}`);
        onLocationStatusChangeRef.current?.(message);
        startBrowserFallbackWatch();
      });
    } else {
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      pollTimerRef.current = window.setInterval(() => getAmapCurrentPosition("AMap live polling active."), 1000);
      setDebugStatus("AMap live polling active.");
    }

    return () => {
      disposed = true;
      if (amapWatchIdRef.current !== null) {
        geolocationRef.current?.clearWatch?.(amapWatchIdRef.current);
        amapWatchIdRef.current = null;
      }
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      browserWatchActive = false;
      if (browserWatchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(browserWatchIdRef.current);
        browserWatchIdRef.current = null;
      }
    };
  }, [mapReady, phase]);

  useEffect(() => {
    if (!trackLineRef.current) return;
    const validPath = userTrack.filter(isValidLngLat);

    if (validPath.length < 2) {
      trackLineRef.current.hide();
      return;
    }

    const amapPath = validPath.map(([lng, lat]) => {
      const AMap = window.AMap;
      return AMap ? new AMap.LngLat(lng, lat) : [lng, lat];
    });

    trackLineRef.current.setPath(amapPath);
    trackLineRef.current.show();
  }, [userTrack]);

  useEffect(() => {
    if (!ghostMarkerRef.current) return;
    if (!isGhostMode) {
      ghostMarkerRef.current.hide();
      return;
    }

    const ghostPoint =
      ghostDistance <= userDistance
        ? getPointAtDistance(userTrack, ghostDistance) ?? currentPosition
        : extrapolateFromHeading(userTrack.length > 0 ? userTrack : currentPosition ? [currentPosition] : [], ghostDistance - userDistance) ?? currentPosition;
    if (!ghostPoint) {
      ghostMarkerRef.current.hide();
      return;
    }

    const ghostState = gapMeters > 1 ? "behind" : gapMeters < -1 ? "ahead" : "even";
    ghostMarkerRef.current.setPosition(ghostPoint);
    ghostMarkerRef.current.setContent(createGhostMarkerContent(ghostName, ghostState));
    ghostMarkerRef.current.show();
  }, [currentPosition, ghostDistance, gapMeters, ghostName, isGhostMode, userDistance, userTrack]);

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
