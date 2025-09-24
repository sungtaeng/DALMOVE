import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Alert, TouchableOpacity, Animated } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';

// ❌ import './firebaseConfig' (사이드이펙트 호출) 지우고,
// ✅ app과 유틸을 명시적으로 가져오기
import { app, setPresence, heartbeatPresenceRTDB, subscribeCrowdRTDB } from './firebaseConfig';
import { getDatabase, ref, onValue } from 'firebase/database';

import Geolocation from '@react-native-community/geolocation';
import axios from 'axios';
import SlidePanel from './components/SlidePanel';

const { height } = Dimensions.get('window');
const NAVER_CLIENT_ID = 'u6w3cppkl8';
const NAVER_CLIENT_SECRET = '7kMTpyh0B2rScqRev2pwcwGYb9WZEJwT7qyv4GvN';

const STATIONS = [
  { id: 'station1', title: '기흥역 출발', lat: 37.274514, lng: 127.116160 },
  { id: 'station2', title: '강남대역',     lat: 37.270780, lng: 127.125569 },
  { id: 'station3', title: '샬롬관 앞',    lat: 37.274566, lng: 127.130307 },
  { id: 'station4', title: '교육관 앞',    lat: 37.275690, lng: 127.133470 },
  { id: 'station5', title: '이공관 앞',    lat: 37.276645, lng: 127.134479 },
  { id: 'station6', title: '스타벅스 앞',  lat: 37.270928, lng: 127.125917 },
  { id: 'station7', title: '기흥역 도착',  lat: 37.274618, lng: 127.116129 },
];

export default function StudentScreen() {
  const [location, setLocation] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [eta, setEta] = useState(null);
  const [distance, setDistance] = useState(null);
  const [arrivalTime, setArrivalTime] = useState(null);
  const [panelVisible, setPanelVisible] = useState(false);
  const [selectedStation, setSelectedStation] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [crowd, setCrowd] = useState(0);

  const animatedValue = useRef(new Animated.Value(0)).current;
  const mapRef = useRef();

  // 지오펜스/체류 파라미터
  const GEOFENCE_M = 80;
  const EXIT_M = 120;
  const DWELL_MS = 100000;
  const HEARTBEAT_MS = 30000;

  const dwellStartRef = useRef(null);
  const waitingRef = useRef(false);
  const activeStopIdRef = useRef(null);
  const currentStopIdRef = useRef(null);
  const heartbeatTimerRef = useRef(null);

  // 거리 계산 유틸
  const getDistance = (loc1, loc2) => {
    const R = 6371;
    const dLat = (loc2.lat - loc1.lat) * Math.PI / 180;
    const dLng = (loc2.lng - loc1.lng) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(loc1.lat * Math.PI / 180) *
      Math.cos(loc2.lat * Math.PI / 180) *
      Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };
  const distanceMeters = (a, b) => Math.round(getDistance(
    { lat: a.latitude ?? a.lat, lng: a.longitude ?? a.lng },
    b
  ) * 1000);

  const findNearestStation = (loc) => {
    if (!loc) return { station: null, distM: Infinity };
    let best = { station: null, distM: Infinity };
    for (const s of STATIONS) {
      const d = distanceMeters(loc, s);
      if (d < best.distM) best = { station: s, distM: d };
    }
    return best;
  };

  const findNearestPassedStop = (driverLoc) => {
    let minIndex = 0;
    let minDist = Infinity;
    STATIONS.forEach((station, idx) => {
      const d = getDistance(driverLoc, station);
      if (d < minDist) { minDist = d; minIndex = idx; }
    });
    return minIndex;
  };

  const getRouteInfo = async (origin, goal) => {
    try {
      const goalIdx = STATIONS.findIndex(s => s.id === goal.id);
      const currentIdx = findNearestPassedStop(origin);

      let midStations = STATIONS.filter((_, idx) => idx > currentIdx && idx < goalIdx);

      const egongwan = STATIONS.find(s => s.id === 'station5');
      const egongwanIdx = STATIONS.findIndex(s => s.id === 'station5');
      const isGoingToStarbucksOrGiheung = goal.id === 'station6' || goal.id === 'station7';
      const hasPassedEgongwan = currentIdx >= egongwanIdx;

      if (isGoingToStarbucksOrGiheung && !hasPassedEgongwan) {
        if (!midStations.some(s => s.id === 'station5')) {
          midStations = [egongwan, ...midStations];
        }
      }

      const waypoints = midStations.map(p => `${p.lng},${p.lat}`).join('|');
      const params = {
        start: `${origin.lng},${origin.lat}`,
        goal: `${goal.lng},${goal.lat}`,
        option: 'trafast',
      };
      if (waypoints) params.waypoints = waypoints;

      const res = await axios.get('https://maps.apigw.ntruss.com/map-direction/v1/driving', {
        headers: {
          'x-ncp-apigw-api-key-id': NAVER_CLIENT_ID,
          'x-ncp-apigw-api-key': NAVER_CLIENT_SECRET,
        },
        params,
      });

      const summary = res.data?.route?.trafast?.[0]?.summary;
      const path = res.data?.route?.trafast?.[0]?.path || [];

      if (summary) {
        const etaMin = (summary.duration / 60000).toFixed(1);
        const distanceKm = (summary.distance / 1000).toFixed(2);
        const now = new Date();
        const arrival = new Date(now.getTime() + summary.duration);

        setEta(etaMin);
        setDistance(distanceKm);
        setArrivalTime(
          arrival.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
        );
        setRouteCoords(path.map(([lng, lat]) => ({ latitude: lat, longitude: lng })));
      } else {
        Alert.alert('경로 데이터를 불러오지 못했습니다.');
      }
    } catch (err) {
      Alert.alert('API 오류 발생', err.message);
    }
  };

  // 초기 위치 + 운전자 구독 + 위치 watch
  useEffect(() => {
    Geolocation.requestAuthorization?.();
    Geolocation.getCurrentPosition(
      (pos) => setLocation(pos.coords),
      (err) => Alert.alert('위치 가져오기 오류', err.message),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 10000 }
    );

    // ✅ 초기화된 app으로 DB 가져오기
    const driverRef = ref(getDatabase(app), 'drivers/driver1');
    const unsubscribeDriver = onValue(driverRef, (snapshot) => {
      const data = snapshot.val();
      if (data?.latitude && data?.longitude) {
        setDriverLocation({ lat: data.latitude, lng: data.longitude });
      }
    });

    const watchId = Geolocation.watchPosition(
      (pos) => {
        const coords = pos.coords;
        setLocation(coords);

        const { station, distM } = findNearestStation(coords);
        if (!station) return;
        const now = Date.now();

        const inside = distM <= GEOFENCE_M;
        const outside = distM >= EXIT_M;

        if (currentStopIdRef.current !== station.id) {
          if (waitingRef.current && activeStopIdRef.current) {
            setPresence(activeStopIdRef.current, false).catch(() => {});
            waitingRef.current = false;
            activeStopIdRef.current = null;
            if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
          }
          currentStopIdRef.current = station.id;
          dwellStartRef.current = inside ? now : null;
        } else {
          if (inside) {
            if (!dwellStartRef.current) dwellStartRef.current = now;
            const dwelled = now - (dwellStartRef.current || now);
            if (!waitingRef.current && dwelled >= DWELL_MS) {
              waitingRef.current = true;
              activeStopIdRef.current = station.id;
              setPresence(station.id, true).catch(() => {});
              if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
              heartbeatTimerRef.current = setInterval(() => {
                heartbeatPresenceRTDB(station.id).catch(() => {});
              }, HEARTBEAT_MS);
            }
          }
          if (outside && waitingRef.current && activeStopIdRef.current === station.id) {
            setPresence(station.id, false).catch(() => {});
            waitingRef.current = false;
            activeStopIdRef.current = null;
            dwellStartRef.current = null;
            if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
          }
        }
      },
      () => {},
      { enableHighAccuracy: true, distanceFilter: 5, interval: 5000, fastestInterval: 3000 }
    );

    return () => {
      unsubscribeDriver();
      Geolocation.clearWatch?.(watchId);
      if (waitingRef.current && activeStopIdRef.current) {
        setPresence(activeStopIdRef.current, false).catch(() => {});
      }
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
    };
  }, []);

  const handleMarkerPress = (station) => {
    setSelectedStation(station);
    setPanelVisible(true);
    if (driverLocation) getRouteInfo(driverLocation, station);
  };

  useEffect(() => {
    if (!panelVisible || !selectedStation?.id) return;
    const off = subscribeCrowdRTDB(selectedStation.id, setCrowd);
    return () => off && off();
  }, [panelVisible, selectedStation?.id]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        showsUserLocation
        initialRegion={{
          latitude: STATIONS[0].lat,
          longitude: STATIONS[0].lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        {STATIONS.map((station) => (
          <Marker
            key={station.id}
            coordinate={{ latitude: station.lat, longitude: station.lng }}
            title={station.title}
            pinColor="red"
            onPress={() => handleMarkerPress(station)}
          />
        ))}

        {location && (
          <Marker
            coordinate={{ latitude: location.latitude, longitude: location.longitude }}
            title="내 위치"
            pinColor="blue"
          />
        )}

        {driverLocation && (
          <Marker
            coordinate={{ latitude: driverLocation.lat, longitude: driverLocation.lng }}
            title="기사님 위치"
            pinColor="green"
          />
        )}

        {routeCoords.length > 0 && (
          <Polyline coordinates={routeCoords} strokeWidth={4} strokeColor="#007AFF" />
        )}
      </MapView>

      <TouchableOpacity
        style={styles.locationButton}
        onPress={() => {
          Geolocation.getCurrentPosition(
            (pos) => {
              setLocation(pos.coords);
              mapRef.current?.animateToRegion({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              });
            },
            (err) => Alert.alert('위치 이동 오류', err.message),
            { enableHighAccuracy: true }
          );
        }}
      >
        <Text style={{ fontSize: 22, color: '#007AFF' }}>⌖</Text>
      </TouchableOpacity>

      <SlidePanel
        visible={panelVisible}
        station={selectedStation}
        onClose={() => setPanelVisible(false)}
        eta={eta}
        distance={distance}
        arrivalTime={arrivalTime}
        crowd={crowd}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  locationButton: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 30,
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
});
