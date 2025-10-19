// /utils/geo.js
import { STATIONS } from '../constants/stations';

export const haversineKm = (a, b) => {
  const lat1 = a.lat ?? a.latitude;
  const lng1 = a.lng ?? a.longitude;
  const lat2 = b.lat ?? b.latitude;
  const lng2 = b.lng ?? b.longitude;
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return Infinity;

  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const aa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return R * c;
};

export const distanceMeters = (a, b) => Math.round(haversineKm(a, b) * 1000);

export const findNearestStation = (loc) => {
  if (!loc) return { station: null, distM: Infinity };
  let best = { station: null, distM: Infinity };
  for (const s of STATIONS) {
    const d = distanceMeters(
      { lat: loc.latitude ?? loc.lat, lng: loc.longitude ?? loc.lng }, s
    );
    if (d < best.distM) best = { station: s, distM: d };
  }
  return best;
};

export const findNearestPassedStop = (driverLoc) => {
  let minIndex = 0;
  let minDist = Infinity;
  STATIONS.forEach((s, idx) => {
    const d = haversineKm(driverLoc, s);
    if (d < minDist) { minDist = d; minIndex = idx; }
  });
  return minIndex;
};

export const forwardSteps = (fromIdx, toIdx) =>
  (toIdx - fromIdx + STATIONS.length) % STATIONS.length;

/**
 * ✅ NAVER 실패 시 사용하는 고정 루프 기반 경로/ETA 추정
 * - 현재 위치에서 "다음 정류장"까지 직선 거리
 * - 이후 정류장 간 거리들을 골까지 합산
 * - 평균 속도(km/h)로 ETA 환산
 * - 간단하지만 "항상 값이 나온다"
 */
export function loopRouteEstimate(origin, goal, { avgKmh = 18 } = {}) {
  const N = STATIONS.length;
  const toIdx = STATIONS.findIndex((s) => s.id === goal.id);
  if (toIdx < 0) return null;

  const fromIdx = findNearestPassedStop(origin);
  const nextIdx = (fromIdx + 1) % N;

  // 1) origin → 다음 정류장
  let totalM = distanceMeters(origin, STATIONS[nextIdx]);

  // 2) 다음 정류장 → goal 정류장 (순방향)
  for (let i = nextIdx; i !== toIdx; i = (i + 1) % N) {
    const a = STATIONS[i];
    const b = STATIONS[(i + 1) % N];
    totalM += distanceMeters(a, b);
  }

  // 경로 선(폴리라인) 구성: origin → next → ... → goal
  const path = [
    [origin.lng, origin.lat],
    [STATIONS[nextIdx].lng, STATIONS[nextIdx].lat],
  ];
  for (let i = nextIdx; i !== toIdx; i = (i + 1) % N) {
    const b = STATIONS[(i + 1) % N];
    path.push([b.lng, b.lat]);
  }

  const msPerMeter = (3600 * 1000) / (avgKmh * 1000); // km/h → ms/m
  const duration = Math.max(5000, Math.round(totalM * msPerMeter)); // 하한 5초

  return { distance: totalM, duration, path };
}
