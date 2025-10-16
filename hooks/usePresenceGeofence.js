// /hooks/usePresenceGeofence.js
import { useEffect, useRef } from 'react';
import Geolocation from '@react-native-community/geolocation';
import { setPresence, heartbeatPresenceRTDB } from '../firebaseConfig';
import { findNearestStation } from '../utils/geo';

export default function usePresenceGeofence() {
  const GEOFENCE_M = 80;
  const EXIT_M = 120;
  const DWELL_MS = 100000;
  const HEARTBEAT_MS = 30000;

  const dwellStartRef = useRef(null);
  const waitingRef = useRef(false);
  const activeStopIdRef = useRef(null);
  const currentStopIdRef = useRef(null);
  const heartbeatTimerRef = useRef(null);

  useEffect(() => {
    Geolocation.requestAuthorization?.();

    const watchId = Geolocation.watchPosition(
      (pos) => {
        const coords = pos.coords;

        const { station, distM } = findNearestStation(coords);
        if (!station) return;

        const now = Date.now();
        const inside = distM <= GEOFENCE_M;
        const outside = distM >= EXIT_M;

        if (currentStopIdRef.current !== station.id) {
          if (waitingRef.current && activeStopIdRef.current) {
            setPresence(activeStopIdRef.current, false).catch(() => {});
            waitingRef.current = false;
            activeStopIdRef.current = null;
            if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
          }
          currentStopIdRef.current = station.id;
          dwellStartRef.current = inside ? now : null;
        } else {
          if (inside) {
            if (!dwellStartRef.current) dwellStartRef.current = now;
            const dwelled = now - (dwellStartRef.current || now);
            if (!waitingRef.current && dwelled >= DWELL_MS) {
              waitingRef.current = true;
              activeStopIdRef.current = station.id;
              setPresence(station.id, true).catch(() => {});
              if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
              heartbeatTimerRef.current = setInterval(() => {
                heartbeatPresenceRTDB(station.id).catch(() => {});
              }, HEARTBEAT_MS);
            }
          }
          if (outside && waitingRef.current && activeStopIdRef.current === station.id) {
            setPresence(station.id, false).catch(() => {});
            waitingRef.current = false;
            activeStopIdRef.current = null;
            dwellStartRef.current = null;
            if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
          }
        }
      },
      () => {},
      { enableHighAccuracy: true, distanceFilter: 5, interval: 5000, fastestInterval: 3000 }
    );

    return () => {
      Geolocation.clearWatch?.(watchId);
      if (waitingRef.current && activeStopIdRef.current) {
        setPresence(activeStopIdRef.current, false).catch(() => {});
      }
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
    };
  }, []);
}
