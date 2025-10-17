// /hooks/useBestETA.js
import { useCallback, useState } from 'react';
import { indexOfStation } from '../constants/stations';
import { forwardSteps, findNearestPassedStop } from '../utils/geo';
import { navRouteSummary } from '../services/naverDirections';

export default function useBestETA(driverLocations, naverKeys) {
  const [eta, setEta] = useState(null);
  const [distance, setDistance] = useState(null);
  const [arrivalTime, setArrivalTime] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [activeBusId, setActiveBusId] = useState(null);

  const computeForStation = useCallback(async (goalStation) => {
    const entries = Object.entries(driverLocations || {});
    if (entries.length === 0) {
      setEta(null); setDistance(null); setArrivalTime(null); setRouteCoords([]); setActiveBusId(null);
      return { ok: false, reason: 'no_buses' };
    }
    const goalIdx = indexOfStation(goalStation.id);

    const candidates = entries
      .map(([busId, bus]) => {
        if (!bus?.lat || !bus?.lng) return null;
        const busIdx = findNearestPassedStop({ lat: bus.lat, lng: bus.lng });
        const steps = forwardSteps(busIdx, goalIdx);
        if (steps === 0) return null; // 초기 동작본: 같은 정류장으로 판단되면 제외
        return { busId, origin: { lat: bus.lat, lng: bus.lng } };
      })
      .filter(Boolean);

    if (candidates.length === 0) {
      setEta(null); setDistance(null); setArrivalTime(null); setRouteCoords([]); setActiveBusId(null);
      return { ok: false, reason: 'no_candidates' };
    }

    const results = await Promise.all(
      candidates.map(async (c) => {
        try {
          const { duration, distance, path } = await navRouteSummary(c.origin, goalStation, naverKeys);
          return { busId: c.busId, duration, distance, path };
        } catch {
          return { busId: c.busId, duration: Number.MAX_SAFE_INTEGER, distance: null, path: [] };
        }
      })
    );

    const best = results.reduce((a, b) => (a.duration < b.duration ? a : b));
    if (!best || !isFinite(best.duration)) {
      setEta(null); setDistance(null); setArrivalTime(null); setRouteCoords([]); setActiveBusId(null);
      return { ok: false, reason: 'route_fail' };
    }

    setActiveBusId(best.busId);
    setEta((best.duration / 60000).toFixed(1));
    setDistance(best.distance != null ? (best.distance / 1000).toFixed(2) : null);
    const now = new Date();
    setArrivalTime(
      new Date(now.getTime() + best.duration).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    );
    setRouteCoords(best.path.map(([lng, lat]) => ({ latitude: lat, longitude: lng })));
    return { ok: true, busId: best.busId };
  }, [driverLocations, naverKeys]);

  return { eta, distance, arrivalTime, routeCoords, activeBusId, computeForStation, setRouteCoords };
}
