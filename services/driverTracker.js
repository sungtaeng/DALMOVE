import Geolocation from '@react-native-community/geolocation';
import { db } from '../firebaseConfig';
import { ref, set, remove } from 'firebase/database';

let _running = false;
let _watchId = null;
let _driverId = null;
let _listeners = new Set();
let _geocodeKey = null;
let _reverseGeocode = false;

function notify(update) {
  _listeners.forEach(fn => { try { fn(update); } catch {} });
}

async function saveToFirebase(lat, lng, address = '') {
  if (!_driverId) return;
  const r = ref(db, `drivers/${_driverId}`);
  await set(r, {
    latitude: Number(lat),
    longitude: Number(lng),
    address: address || '',
    timestamp: new Date().toISOString(),
  });
}

async function reverseGeocode(lat, lng) {
  if (!_reverseGeocode || !_geocodeKey) return '';
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${_geocodeKey}`;
    const res = await fetch(url);
    const json = await res.json();
    return json?.results?.[0]?.formatted_address ?? '';
  } catch {
    return '';
  }
}

export function addListener(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

export function isRunning() { return _running; }
export function getDriverId() { return _driverId; }

/**
 * 위치 추적 시작 (화면 전환과 무관하게 유지)
 */
export function start(opts = {}) {
  if (_running) return;
  _driverId = opts.driverId || 'driver1';
  _reverseGeocode = !!opts.reverseGeocode;
  _geocodeKey = opts.geocodeApiKey || null;

  const high = opts.highAccuracy ?? true;
  const dist = opts.distanceFilter ?? 5;
  const interval = opts.intervalMs ?? 5000;

  _running = true;

  _watchId = Geolocation.watchPosition(
    async (pos) => {
      const { latitude, longitude } = pos.coords || {};
      if (latitude == null || longitude == null) return;

      const latN = Number(latitude);
      const lngN = Number(longitude);
      const addr = await reverseGeocode(latN, lngN);
      await saveToFirebase(latN, lngN, addr);
      notify({ lat: latN, lng: lngN, address: addr, ts: Date.now() });
    },
    (err) => {
      notify({ error: err?.message || 'location error' });
    },
    {
      enableHighAccuracy: high,
      distanceFilter: dist,
      interval,
      fastestInterval: Math.min(3000, interval),
      showsBackgroundLocationIndicator: false,
      useSignificantChanges: false,
    }
  );
}

/** 현재 위치 한 번만 업로드 */
export async function pushOnce() {
  return new Promise((resolve) => {
    Geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords || {};
        const latN = Number(latitude);
        const lngN = Number(longitude);
        const addr = await reverseGeocode(latN, lngN);
        await saveToFirebase(latN, lngN, addr);
        notify({ lat: latN, lng: lngN, address: addr, ts: Date.now() });
        resolve(true);
      },
      () => resolve(false),
      { enableHighAccuracy: true }
    );
  });
}

/** 추적 중지 (removeFromDb=true면 RTDB 노드 삭제) */
export async function stop(opts = {}) {
  if (_watchId != null) {
    Geolocation.clearWatch(_watchId);
    _watchId = null;
  }
  const removeDb = !!opts.removeFromDb;
  if (removeDb && _driverId) {
    try { await remove(ref(db, `drivers/${_driverId}`)); } catch {}
  }
  _running = false;
  notify({ stopped: true });
}
