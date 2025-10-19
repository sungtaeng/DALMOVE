// /hooks/useBestETA.js
import { useCallback, useState } from 'react';
import { indexOfStation } from '../constants/stations';
import { forwardSteps, findNearestPassedStop, haversineKm } from '../utils/geo';
import { navRouteSummary } from '../services/naverDirections';

// ===== 임계값(현장에 맞게 조절 가능) =====
const ARRIVED_EXCLUDE_M   = 50;   // 목표 정류장 50m 이내면 '이미 도착'으로 보고 후보 제외
const APPROACH_KEEP_M     = 220;  // steps===0 이고 220m 이내면 접근 중 → 후보 유지
const ARRIVING_SOON_MS    = 90_000; // 1분 30초 이내면 '곧 도착'
const ARRIVING_SOON_DISTM = 200;    // 경로거리 200m 이내면 '곧 도착'

export default function useBestETA(driverLocations, naverKeys) {
  const [eta, setEta] = useState(null);
  const [distance, setDistance] = useState(null);
  const [arrivalTime, setArrivalTime] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [activeBusId, setActiveBusId] = useState(null);

  // 추가 상태: 곧 도착, 다음 버스
  const [arrivingSoon, setArrivingSoon] = useState(false);
  const [nextEta, setNextEta] = useState(null);
  const [nextArrivalTime, setNextArrivalTime] = useState(null);
  const [nextBusId, setNextBusId] = useState(null);

  const [routeSource, setRouteSource] = useState(null);
  const [routeDebug, setRouteDebug] = useState({ pathPoints: 0, hasCongestion: false, apiCode: null });

  const reset = () => {
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
  };

  /**
   * goalStation: STATIONS 항목
   * driversOverride: 즉시 계산용 드라이버 목록(있으면 이것으로 계산)
   */
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

      // 1) 후보 구성
      const rawCandidates = entries.map(([busId, bus]) => {
        if (!bus?.lat || !bus?.lng) return null;
        const origin = { lat: bus.lat, lng: bus.lng };
        const busIdx = findNearestPassedStop(origin);
        const steps  = forwardSteps(busIdx, goalIdx);
        const distToGoalM = Math.round(haversineKm(origin, goalStation) * 1000);
        return { busId, origin, steps, distToGoalM };
      }).filter(Boolean);

      // 1-1) 필터링 규칙
      const candidates = rawCandidates.filter(c => {
        if (c.steps !== 0) return true; // 순방향상 뒤에 있는 버스는 후보 OK
        // steps===0: 목표가 가장 가까운 정류장
        if (c.distToGoalM <= ARRIVED_EXCLUDE_M) return false; // 사실상 도착 → 제외
        if (c.distToGoalM <= APPROACH_KEEP_M) return true;    // 접근 중 → 후보 유지
        return false;                                         // 이미 지나간(멀어지는) 버스 → 제외
      });

      if (!candidates.length) {
        reset();
        return { ok: false, reason: 'no_candidates' };
      }

      // 2) NAVER(trafast) 호출
      const results = await Promise.all(
        candidates.map(async (c) => {
          try {
            const r = await navRouteSummary(c.origin, goalStation, naverKeys);
            return { ok: true, busId: c.busId, metaCand: c, ...r };
          } catch (e) {
            return {
              ok: false, busId: c.busId, metaCand: c,
              error: { code: e.code || 'ERR', status: e.status || 0, message: e.message || String(e) }
            };
          }
        })
      );

      const successes = results.filter(r => r.ok);
      if (!successes.length) {
        const lastErr = results[results.length - 1]?.error || { code: 'NAVER_ROUTE_FAIL' };
        reset();
        return { ok: false, reason: 'naver_error', errorDetails: lastErr };
      }

      // 3) 최단 ETA 순 정렬
      successes.sort((a, b) => a.duration - b.duration);
      const best = successes[0];
      const second = successes[1] || null;

      // 4) 상태 반영(메인 버스)
      setActiveBusId(best.busId);
      setRouteSource(best.source || 'vpc_trafast');
      setRouteDebug({
        pathPoints: best.meta?.pathPoints ?? 0,
        hasCongestion: Array.isArray(best.sections) && best.sections.some(s => typeof s?.congestion !== 'undefined'),
        apiCode: null,
      });

      setEta((best.duration / 60000).toFixed(1));
      setDistance(best.distance != null ? (best.distance / 1000).toFixed(2) : null);

      const now = new Date();
      setArrivalTime(
        new Date(now.getTime() + best.duration).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
      );
      setRouteCoords((best.path || []).map(([lng, lat]) => ({ latitude: lat, longitude: lng })));

      // '곧 도착' 판정
      const soonByTime = best.duration <= ARRIVING_SOON_MS;
      const soonByDist = (typeof best.distance === 'number') && best.distance <= ARRIVING_SOON_DISTM;
      setArrivingSoon(!!(soonByTime || soonByDist));

      // 5) 다음 버스
      if (second) {
        setNextBusId(second.busId);
        setNextEta((second.duration / 60000).toFixed(1));
        setNextArrivalTime(
          new Date(now.getTime() + second.duration).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
        );
      } else {
        setNextBusId(null);
        setNextEta(null);
        setNextArrivalTime(null);
      }

      return { ok: true, busId: best.busId, arrivingSoon: soonByTime || soonByDist };
    },
    [driverLocations, naverKeys]
  );

  return {
    eta, distance, arrivalTime, routeCoords, activeBusId,
    arrivingSoon, nextEta, nextArrivalTime, nextBusId,
    routeSource, routeDebug,
    computeForStation, setRouteCoords
  };
}
