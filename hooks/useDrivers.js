// /hooks/useDrivers.js
import { useEffect, useState } from 'react';
import { getDatabase, ref, onValue } from 'firebase/database';
import { app } from '../firebaseConfig';

export default function useDrivers() {
  const [driverLocations, setDriverLocations] = useState({});

  useEffect(() => {
    const driversRef = ref(getDatabase(app), 'drivers');
    const unsub = onValue(driversRef, (snapshot) => {
      const data = snapshot.val() || {};
      const map = {};
      Object.entries(data).forEach(([id, v]) => {
        if (v?.latitude && v?.longitude) {
          map[id] = { lat: v.latitude, lng: v.longitude, ts: v.timestamp };
        }
      });
      setDriverLocations(map);
    });
    return () => unsub();
  }, []);

  return driverLocations;
}
