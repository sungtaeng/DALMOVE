// /hooks/useBestETA.js
import { useCallback, useState } from 'react';
import { indexOfStation } from '../constants/stations';
import { forwardSteps, findNearestPassedStop, haversineKm, loopRouteEstimate } from '../utils/geo';
import { navRouteSummary } from '../services/naverDirections';

const ARRIVED_EXCLUDE_M = 50;
const APPROACH_KEEP_M = 220;
const ARRIVING_SOON_MS = 90_000;
const ARRIVING_SOON_DISTM = 200;

export default function useBestETA(driverLocations, naverKeys) {
  const [eta, setEta] = useState(null);
  const [distance, setDistance] = useState(null);
  const [arrivalTime, setArrivalTime] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [activeBusId, setActiveBusId] = useState(null);

  const [arrivingSoon, setArrivingSoon] = useState(false);
  const [nextEta, setNextEta] = useState(null);
  const [nextArrivalTime, setNextArrivalTime] = useState(null);
  const [nextBusId, setNextBusId] = useState(null);

  const [routeSource, setRouteSource] = useState(null);
  const [routeDebug, setRouteDebug] = useState({ pathPoints: 0, hasCongestion: false, apiCode: null });
  const [lastError, setLastError] = useState(null);

  const reset = useCallback(() => {
    setEta(null);
    setDistance(null);
    setArrivalTime(null);
    setRouteCoords([]);
    setActiveBusId(null);
    setArrivingSoon(false);
    setNextEta(null);
    setNextArrivalTime(null);
    setNextBusId(null);
    setRouteSource(null);
    setRouteDebug({ pathPoints: 0, hasCongestion: false, apiCode: null });
    setLastError(null);
  }, []);

  const computeForStation = useCallback(
    async (goalStation, driversOverride = null) => {
      const pool = driversOverride && Object.keys(driversOverride).length
        ? driversOverride
        : (driverLocations || {});
      const entries = Object.entries(pool);

      if (entries.length === 0) {
        reset();
        return { ok: false, reason: 'no_buses' };
      }

      const goalIdx = indexOfStation(goalStation.id);

      const rawCandidates = entries
        .map(([busId, bus]) => {
          if (!bus?.lat || !bus?.lng) return null;
          const origin = { lat: bus.lat, lng: bus.lng };
          const busIdx = findNearestPassedStop(origin);
          const steps = forwardSteps(busIdx, goalIdx);
          const distToGoalM = Math.round(haversineKm(origin, goalStation) * 1000);
          return { busId, origin, steps, distToGoalM };
        })
        .filter(Boolean);

      const candidates = rawCandidates.filter((candidate) => {
        if (candidate.steps !== 0) return true;
        if (candidate.distToGoalM <= ARRIVED_EXCLUDE_M) return false;
        if (candidate.distToGoalM <= APPROACH_KEEP_M) return true;
        return false;
      });

      if (!candidates.length) {
        reset();
        return { ok: false, reason: 'no_candidates' };
      }

      const results = await Promise.all(
        candidates.map(async (candidate) => {
          try {
            const resp = await navRouteSummary(candidate.origin, goalStation, naverKeys);
            return { ok: true, busId: candidate.busId, metaCand: candidate, ...resp };
          } catch (error) {
            return {
              ok: false,
              busId: candidate.busId,
              metaCand: candidate,
              error: {
                code: error.code || 'ERR',
                status: error.status || 0,
                message: error.message || String(error),
              },
            };
          }
        })
      );

      let successes = results.filter((item) => item.ok);
      let usedFallback = false;

      if (!successes.length) {
        const fallbacks = candidates
          .map((candidate) => {
            try {
              const estimate = loopRouteEstimate(candidate.origin, goalStation);
              if (!estimate) return null;
              return {
                ok: true,
                busId: candidate.busId,
                metaCand: candidate,
                ...estimate,
                sections: [],
                source: 'loop_estimate',
                meta: { pathPoints: estimate.path?.length || 0, fallback: true },
              };
            } catch {
              return null;
            }
          })
          .filter(Boolean);

        if (!fallbacks.length) {
          const lastErr = results[results.length - 1]?.error || { code: 'NAVER_ROUTE_FAIL' };
          reset();
          setLastError(lastErr);
          return { ok: false, reason: 'naver_error', errorDetails: lastErr };
        }

        successes = fallbacks;
        usedFallback = true;
      }

      successes.sort((a, b) => a.duration - b.duration);
      const best = successes[0];
      const second = successes[1] || null;

      setActiveBusId(best.busId);
      setRouteSource(best.source || (usedFallback ? 'loop_estimate' : 'vpc_trafast'));
      setRouteDebug({
        pathPoints: best.meta?.pathPoints ?? 0,
        hasCongestion: Array.isArray(best.sections)
          && best.sections.some((section) => typeof section?.congestion !== 'undefined'),
        apiCode: usedFallback ? 'FALLBACK_LOOP_ESTIMATE' : null,
      });

      setEta((best.duration / 60000).toFixed(1));
      setDistance(typeof best.distance === 'number' ? (best.distance / 1000).toFixed(2) : null);

      const now = new Date();
      setArrivalTime(
        new Date(now.getTime() + best.duration).toLocaleTimeString('ko-KR', {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
      setRouteCoords((best.path || []).map(([lng, lat]) => ({ latitude: lat, longitude: lng })));

      const soonByTime = best.duration <= ARRIVING_SOON_MS;
      const soonByDist = typeof best.distance === 'number' && best.distance <= ARRIVING_SOON_DISTM;
      setArrivingSoon(Boolean(soonByTime || soonByDist));

      if (second) {
        setNextBusId(second.busId);
        setNextEta((second.duration / 60000).toFixed(1));
        setNextArrivalTime(
          new Date(now.getTime() + second.duration).toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
          })
        );
      } else {
        setNextBusId(null);
        setNextEta(null);
        setNextArrivalTime(null);
      }

      setLastError(null);
      return { ok: true, busId: best.busId, arrivingSoon: soonByTime || soonByDist, usedFallback };
    },
    [driverLocations, naverKeys, reset]
  );

  return {
    eta,
    distance,
    arrivalTime,
    routeCoords,
    activeBusId,
    arrivingSoon,
    nextEta,
    nextArrivalTime,
    nextBusId,
    routeSource,
    routeDebug,
    lastError,
    computeForStation,
    setRouteCoords,
  };
}
