// /services/naverDirections.js
import axios from 'axios';
import { STATIONS, MUST_PASS_BY } from '../constants/stations';
import { NAVER_CONFIG } from '../config/appConfig';

// 좌표 검증/정규화
function normalizePoint(p) {
  const lat = Number(p?.lat ?? p?.latitude);
  const lng = Number(p?.lng ?? p?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    const e = new Error('BAD_COORDS');
    e.code = 'BAD_COORDS';
    throw e;
  }
  return { lat, lng };
}

function stationById(id) {
  return STATIONS.find(s => s.id === id) || null;
}

function dedupeStationsKeepOrder(arr) {
  const seen = new Set();
  const out = [];
  for (const s of arr) {
    if (!s || !s.id) continue;
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    out.push(s);
  }
  return out;
}

/**
 * NAVER VPC Maps Directions5 (trafast)
 * - 실시간 교통 ETA만 사용
 * - ✅ 반드시 거쳐야 하는 정류장(MUST_PASS_BY)만 waypoints에 넣고,
 *   나머지는 네이버가 자동 최적 경로로 계산하도록 맡긴다.
 *   (midStations 전부 강제 경유 ❌)
 *
 * @param {Object} originRaw {lat,lng} 또는 {latitude,longitude}
 * @param {Object} goalRaw   {id,lat,lng}
 * @param {Object} keys      { keyId, keySecret }
 */
export async function navRouteSummary(originRaw, goalRaw, keys = NAVER_CONFIG) {
  const keyId = keys?.keyId;
  const keySecret = keys?.keySecret;
  if (!keyId || !keySecret) {
    const e = new Error('NAVER_KEYS_MISSING');
    e.code = 'NAVER_KEYS_MISSING';
    throw e;
  }

  const origin = normalizePoint(originRaw);
  const goal   = normalizePoint(goalRaw);

  // ✅ 필수 경유지만 구성 (예: station6/7 → station5 강제)
  const mustIds = MUST_PASS_BY[goalRaw.id] || [];
  const mustStations = dedupeStationsKeepOrder(mustIds.map(stationById).filter(Boolean));

  const waypoints = mustStations.length
    ? mustStations.map(p => `${p.lng},${p.lat}`).join('|')
    : undefined;

  // 네이버 VPC Maps Directions5 호출
  const res = await axios.get('https://maps.apigw.ntruss.com/map-direction/v1/driving', {
    headers: {
      'x-ncp-apigw-api-key-id': keyId,
      'x-ncp-apigw-api-key':    keySecret,
    },
    params: {
      start: `${origin.lng},${origin.lat}`, // x,y = lng,lat
      goal:  `${goal.lng},${goal.lat}`,
      option: 'trafast',  // 실시간 교통 반영
      lang: 'ko',
      ...(waypoints ? { waypoints } : {}),
    },
    timeout: 10000,
    validateStatus: () => true,
  });

  if (res.status !== 200) {
    const err = new Error(`NAVER_${res.status}: ${res.data?.message || 'permission/quota error'}`);
    err.status = res.status;
    err.code = res.data?.code || `HTTP_${res.status}`;
    err.response = res.data;
    throw err;
  }

  const item = res.data?.route?.trafast?.[0];
  if (!item?.summary?.duration || !Array.isArray(item?.path)) {
    const err = new Error('NAVER_NO_ROUTE');
    err.status = 200;
    err.code = 'NAVER_NO_ROUTE';
    err.response = res.data;
    throw err;
  }

  return {
    duration: item.summary.duration,          // ms
    distance: item.summary.distance ?? null,  // m
    path: item.path,                          // [ [lng,lat], ... ]
    sections: item.section || [],
    source: 'vpc_trafast',
    meta: { pathPoints: item.path.length, bbox: item.summary?.bbox },
  };
}
