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
