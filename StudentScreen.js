import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Alert, TouchableOpacity } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import { db } from './firebaseConfig';
import { ref, onValue } from 'firebase/database';
import Geolocation from '@react-native-community/geolocation';
import axios from 'axios';
import SlidePanel from './components/SlidePanel';
import { buildCumulativeKm, progressKmOnRoute, passedStopIndex, haversineKm } from './utils/routeProgress';

const { height } = Dimensions.get('window');

// ⚠️ 현재는 클라이언트에서 직접 호출(테스트용). 실제 배포시 서버 프록시로 교체 권장.
const NAVER_CLIENT_ID = 'u6w3cppkl8';
const NAVER_CLIENT_SECRET = '7kMTpyh0B2rScqRev2pwcwGYb9WZEJwT7qyv4GvN';

// 노선 순서: 기흥역 출발 → 강남대역 → 샬롬관 → 교육관 → 이공관 → 스타벅스 → 기흥역 도착
const STATIONS = [
  { id: 'station1', title: '기흥역 출발', lat: 37.274514, lng: 127.116160 },
  { id: 'station2', title: '강남대역',   lat: 37.270780, lng: 127.125569 },
  { id: 'station3', title: '샬롬관 앞',  lat: 37.274566, lng: 127.130307 },
  { id: 'station4', title: '교육관 앞',  lat: 37.275690, lng: 127.133470 },
  { id: 'station5', title: '이공관 앞',  lat: 37.276645, lng: 127.134479 },
  { id: 'station6', title: '스타벅스 앞', lat: 37.270928, lng: 127.125917 },
  { id: 'station7', title: '기흥역 도착', lat: 37.274618, lng: 127.116129 },
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

  const panelRef = useRef();
  const mapRef = useRef();

  // === 경로 진행도 계산 준비 ===
  const CUM_KM = useRef(buildCumulativeKm(STATIONS)).current;
  const lastPassedIdxRef = useRef(0); // 진행도는 증가만 허용(역행 방지)

  const getPassedStopIdx = (driverLoc) => {
    const { totalKm } = progressKmOnRoute(STATIONS, CUM_KM, driverLoc);
    return passedStopIndex(CUM_KM, totalKm, 60); // 60m 여유로 '지남' 판정
  };

  const getMonotonicPassedIdx = (driverLoc) => {
    const idx = getPassedStopIdx(driverLoc);
    if (idx >= lastPassedIdxRef.current) {
      lastPassedIdxRef.current = idx;
    }
    return lastPassedIdxRef.current;
  };

  // 순환 노선 루프 재시작 감지 (종점 → 다시 출발점으로)
  const loopResetIfNeeded = (driverLoc) => {
    const last = lastPassedIdxRef.current; // 0~6
    const nearStart = haversineKm(driverLoc, STATIONS[0]) < 0.08; // 80m 이내면 출발점 근처
    const farFromEnd = haversineKm(driverLoc, STATIONS[STATIONS.length - 1]) > 0.2; // 종점과는 멀다
    if (last >= STATIONS.length - 2 && nearStart && farFromEnd) {
      lastPassedIdxRef.current = 0;
    }
  };

  const getDistanceKm = (loc1, loc2) => {
    return haversineKm(loc1, loc2);
  };

  const getRouteInfo = async (origin, goal) => {
    try {
      // 진행도 기반으로 현재 "지나간 정류장" 인덱스 계산
      const currentIdx = getMonotonicPassedIdx(origin);
      const goalIdx = STATIONS.findIndex(s => s.id === goal.id);

      let midStations = STATIONS.filter((_, idx) => idx > currentIdx && idx < goalIdx);

      // 규칙: 스타벅스/기흥역 도착으로 갈 때, 이공관을 아직 지나지 않았다면 반드시 경유
      const egongwanIdx = STATIONS.findIndex(s => s.id === 'station5');
      const isGoingToStarbucksOrGiheung = (goal.id === 'station6' || goal.id === 'station7');
      const hasPassedEgongwan = currentIdx >= egongwanIdx;
      if (isGoingToStarbucksOrGiheung && !hasPassedEgongwan) {
        if (!midStations.some(s => s.id === 'station5')) {
          midStations = [STATIONS[egongwanIdx], ...midStations];
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

        const coords = path.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
        setRouteCoords(coords);
        // 경로에 맞춰 카메라 자동 맞춤
        if (coords.length > 1) {
          requestAnimationFrame(() => {
            mapRef.current?.fitToCoordinates(coords, {
              edgePadding: { top: 80, bottom: 320, left: 60, right: 60 },
              animated: true,
            });
          });
        }
      } else {
        Alert.alert('경로 데이터를 불러오지 못했습니다.');
      }
    } catch (err) {
      Alert.alert('API 오류 발생', err.message);
    }
  };

  useEffect(() => {
    Geolocation.requestAuthorization();
    Geolocation.getCurrentPosition(
      (pos) => setLocation(pos.coords),
      (err) => Alert.alert('위치 가져오기 오류', err.message),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 10000 }
    );

    const driverRef = ref(db, 'drivers/driver1');
    const unsubscribe = onValue(driverRef, (snapshot) => {
      const data = snapshot.val();
      if (data?.latitude && data?.longitude) {
        const origin = { lat: data.latitude, lng: data.longitude };
        setDriverLocation(origin);
        loopResetIfNeeded(origin); // 순환 루프 재시작 감지
      }
    });
    return () => unsubscribe();
  }, []);

  const handleMarkerPress = (station) => {
    setSelectedStation(station);
    setPanelVisible(true);
    panelRef.current?.show(height / 5);
    if (driverLocation) getRouteInfo(driverLocation, station);
  };

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
