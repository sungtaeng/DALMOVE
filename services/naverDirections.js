// /services/naverDirections.js
import axios from 'axios';
import { STATIONS, indexOfStation } from '../constants/stations';
import { findNearestPassedStop } from '../utils/geo';

// keys는 훅에서 { keyId, keySecret }로 전달받는 형태(초기 동작본)
export async function navRouteSummary(origin, goal, { keyId, keySecret }) {
  const goalIdx = indexOfStation(goal.id);
  const currentIdx = findNearestPassedStop(origin);

  // 루프 순방향으로 경유지 구성
  const midStations = [];
  for (let i = (currentIdx + 1) % STATIONS.length; i !== goalIdx; i = (i + 1) % STATIONS.length) {
    midStations.push(STATIONS[i]);
  }
  const waypoints = midStations.length ? midStations.map((p) => `${p.lng},${p.lat}`).join('|') : undefined;

  const params = { start: `${origin.lng},${origin.lat}`, goal: `${goal.lng},${goal.lat}`, option: 'trafast' };
  if (waypoints) params.waypoints = waypoints;

  const res = await axios.get('https://naveropenapi.apigw.ntruss.com/map-direction/v1/driving', {
    headers: {
      'x-ncp-apigw-api-key-id': keyId,
      'x-ncp-apigw-api-key': keySecret,
    },
    params,
  });

  const item = res.data?.route?.trafast?.[0];
  return {
    duration: item?.summary?.duration ?? Number.MAX_SAFE_INTEGER,
    distance: item?.summary?.distance ?? null,
    path: item?.path ?? [],
  };
}
