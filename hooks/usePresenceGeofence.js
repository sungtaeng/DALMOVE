// /hooks/usePresenceGeofence.js
import { useEffect, useRef, useState } from 'react';
import Geolocation from '@react-native-community/geolocation';
import { setPresence, heartbeatPresenceRTDB } from '../firebaseConfig';
import { findNearestStation } from '../utils/geo';

const DEFAULT_GEOFENCE_OPTIONS = {
  geofenceRadiusM: 80,
  exitRadiusM: 120,
  dwellTimeMs: 100_000,
  heartbeatMs: 30_000,
};

export default function usePresenceGeofence(options = {}) {
  const {
    enabled = true,
    geofenceRadiusM = DEFAULT_GEOFENCE_OPTIONS.geofenceRadiusM,
    exitRadiusM = DEFAULT_GEOFENCE_OPTIONS.exitRadiusM,
    dwellTimeMs = DEFAULT_GEOFENCE_OPTIONS.dwellTimeMs,
    heartbeatMs = DEFAULT_GEOFENCE_OPTIONS.heartbeatMs,
  } = options;

  const dwellStartRef = useRef(null);
  const waitingRef = useRef(false);
  const activeStopIdRef = useRef(null);
  const currentStopIdRef = useRef(null);
  const heartbeatTimerRef = useRef(null);
  const [state, setState] = useState({ stopId: null, waiting: false });

  const clearHeartbeat = () => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  };

  const resetPresence = () => {
    if (waitingRef.current && activeStopIdRef.current) {
      setPresence(activeStopIdRef.current, false).catch(() => {});
    }
    waitingRef.current = false;
    activeStopIdRef.current = null;
    currentStopIdRef.current = null;
    dwellStartRef.current = null;
    clearHeartbeat();
    setState({ stopId: null, waiting: false });
  };

  useEffect(() => {
    if (!enabled) {
      resetPresence();
      return () => {};
    }

    Geolocation.requestAuthorization?.();

    const watchId = Geolocation.watchPosition(
      (pos) => {
        const coords = pos.coords;
        const { station, distM } = findNearestStation(coords);
        if (!station) return;

        const now = Date.now();
        const inside = distM <= geofenceRadiusM;
        const outside = distM >= exitRadiusM;

        if (currentStopIdRef.current !== station.id) {
          if (waitingRef.current && activeStopIdRef.current) {
            setPresence(activeStopIdRef.current, false).catch(() => {});
            waitingRef.current = false;
            activeStopIdRef.current = null;
            clearHeartbeat();
          }
          currentStopIdRef.current = station.id;
          dwellStartRef.current = inside ? now : null;
          setState({ stopId: station.id, waiting: waitingRef.current });
          return;
        }

        if (inside) {
          if (!dwellStartRef.current) dwellStartRef.current = now;
          const dwelled = now - (dwellStartRef.current || now);
          if (!waitingRef.current && dwelled >= dwellTimeMs) {
            waitingRef.current = true;
            activeStopIdRef.current = station.id;
            setPresence(station.id, true).catch(() => {});
            clearHeartbeat();
            heartbeatTimerRef.current = setInterval(() => {
              heartbeatPresenceRTDB(station.id).catch(() => {});
            }, heartbeatMs);
          }
        }

        if (outside && waitingRef.current && activeStopIdRef.current === station.id) {
          setPresence(station.id, false).catch(() => {});
          waitingRef.current = false;
          activeStopIdRef.current = null;
          dwellStartRef.current = null;
          clearHeartbeat();
        }

        setState({
          stopId: station.id,
          waiting: waitingRef.current,
        });
      },
      () => {},
      { enableHighAccuracy: true, distanceFilter: 5, interval: 5000, fastestInterval: 3000 }
    );

    return () => {
      Geolocation.clearWatch?.(watchId);
      resetPresence();
    };
  }, [enabled, geofenceRadiusM, exitRadiusM, dwellTimeMs, heartbeatMs]);

  return state;
}
