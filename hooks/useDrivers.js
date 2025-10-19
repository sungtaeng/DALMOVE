// /hooks/useDrivers.js
import { useEffect, useState } from 'react';
import { ref, onValue, get } from 'firebase/database';
import { db } from '../firebaseConfig';

// RTDB 스냅샷 1회 읽기 (실시간 비었을 때 보강용)
export async function fetchDriversOnceStrict() {
  const snap = await get(ref(db, 'drivers'));
  if (!snap.exists()) {
    throw new Error('NO_DRIVERS_NODE');
  }
  const data = snap.val() || {};
  const map = {};
  Object.entries(data).forEach(([id, v]) => {
    const lat = Number(v?.latitude ?? v?.lat);
    const lng = Number(v?.longitude ?? v?.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      map[id] = { lat, lng, ts: v.timestamp || v.ts || null };
    }
  });
  if (!Object.keys(map).length) throw new Error('EMPTY_OR_BAD_FIELDS');
  return map;
}

export default function useDrivers() {
  const [driverLocations, setDriverLocations] = useState({});
  const [ready, setReady] = useState(false);
  const [lastError, setLastError] = useState(null);

  useEffect(() => {
    const driversRef = ref(db, 'drivers');
    const unsub = onValue(
      driversRef,
      (snapshot) => {
        try {
          const data = snapshot.val() || {};
          const map = {};
          Object.entries(data).forEach(([id, v]) => {
            const lat = Number(v?.latitude ?? v?.lat);
            const lng = Number(v?.longitude ?? v?.lng);
            if (Number.isFinite(lat) && Number.isFinite(lng)) {
              map[id] = { lat, lng, ts: v.timestamp || v.ts || null };
            }
          });
          setDriverLocations(map);
          setLastError(null);
        } catch (e) {
          setDriverLocations({});
          setLastError(`PARSE_ERROR:${e?.message || e}`);
        } finally {
          setReady(true);
        }
      },
      (err) => {
        setDriverLocations({});
        setLastError(`ONVALUE_ERROR:${err?.message || err}`);
        setReady(true);
      }
    );
    return () => unsub();
  }, []);

  return { driverLocations, ready, lastError };
}
