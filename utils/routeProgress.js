// utils/routeProgress.js
// 경로(정류장 간 선분) 위에서 진행도를 계산해 "이미 지난 정류장"을 안정적으로 판정하기 위한 유틸들

export const haversineKm = (a, b) => {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const la1 = a.lat * Math.PI / 180, la2 = b.lat * Math.PI / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
};

// 점 P를 선분 A-B에 투영해서, 선분 상의 위치 t(0~1)와 최단거리(km)를 구함
const projectToSegment = (A, B, P) => {
  // 짧은 구간이라 위경도를 평면 근사로 투영해도 충분히 정확
  const ax = A.lng, ay = A.lat;
  const bx = B.lng, by = B.lat;
  const px = P.lng, py = P.lat;

  const abx = bx - ax, aby = by - ay;
  const apx = px - ax, apy = py - ay;

  const ab2 = abx * abx + aby * aby || 1e-12;
  let t = (apx * abx + apy * aby) / ab2;
  t = Math.max(0, Math.min(1, t));

  const q = { lng: ax + t * abx, lat: ay + t * aby };
  const distKm = haversineKm(P, q);
  return { t, q, distKm };
};

// 정류장별 누적거리(prefix sum)
export const buildCumulativeKm = (STATIONS) => {
  const cum = [0];
  for (let i = 0; i < STATIONS.length - 1; i++) {
    cum.push(cum[i] + haversineKm(STATIONS[i], STATIONS[i + 1]));
  }
  return cum; // 길이 == STATIONS.length
};

// 드라이버가 "경로 위"에서 총 몇 km 지점인지 계산
export const progressKmOnRoute = (STATIONS, cumKm, driver) => {
  let best = { segIdx: 0, t: 0, distKm: Infinity };
  for (let i = 0; i < STATIONS.length - 1; i++) {
    const prj = projectToSegment(STATIONS[i], STATIONS[i + 1], driver);
    if (prj.distKm < best.distKm) best = { ...prj, segIdx: i };
  }
  const segLenKm = haversineKm(STATIONS[best.segIdx], STATIONS[best.segIdx + 1]);
  const alongInSeg = segLenKm * best.t;
  const totalKm = cumKm[best.segIdx] + alongInSeg;
  return { totalKm, segIdx: best.segIdx, t: best.t, offRouteKm: best.distKm };
};

// "지나간 정류장 인덱스" 판정
// passMarginM: 정류장을 완전히 통과했다고 인정할 여유거리(기본 60m)
export const passedStopIndex = (cumKm, totalKm, passMarginM = 60) => {
  const m2km = passMarginM / 1000;
  let idx = 0;
  while (idx < cumKm.length && cumKm[idx] <= totalKm - m2km) idx++;
  return Math.max(0, idx - 1); // 마지막으로 '지남'으로 간주되는 정류장 인덱스
};
