// /StudentScreen.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity, Text } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Polyline } from 'react-native-maps';

import { STATIONS, GIHEUNG_IDS, getGiheungGroupCoord } from './constants/stations';
import useDrivers, { fetchDriversOnceStrict } from './hooks/useDrivers';
import usePresenceGeofence from './hooks/usePresenceGeofence';
import useBestETA from './hooks/useBestETA';
import { GiheungPin, StationPin, BusPin } from './components/MapPins';
import SlidePanel from './components/SlidePanel';
import { subscribeCrowdRTDB } from './firebaseConfig';

// VPC Maps Directions 5 키 (네가 준 값 그대로 사용)
const NAVER_KEYS = {
  keyId: 'u6w3cppkl8',
  keySecret: '7kMTpyh0B2rScqRev2pwcwGYb9WZEJwT7qyv4GvN',
};

export default function StudentScreen() {
  const mapRef = useRef();

  // 실시간 드라이버 구독 + 지오펜스
  const { driverLocations } = useDrivers();
  usePresenceGeofence();

  // 실시간이 비면 스냅샷으로 보강
  const [snapshotDrivers, setSnapshotDrivers] = useState({});
  const effectiveDrivers = useMemo(() => {
    const live = Object.keys(driverLocations).length ? driverLocations : null;
    return live || snapshotDrivers;
  }, [driverLocations, snapshotDrivers]);

  const {
    eta, distance, arrivalTime, routeCoords,
    computeForStation, setRouteCoords,
    arrivingSoon, nextEta, nextArrivalTime, nextBusId,
  } = useBestETA(effectiveDrivers, NAVER_KEYS);

  const [panelVisible, setPanelVisible] = useState(false);
  const [selectedStation, setSelectedStation] = useState(null);
  const [crowd, setCrowd] = useState(0);
  const lastGiheungTargetRef = useRef('station1');
  const tapLockRef = useRef(false);

  // 즉시 사용할 드라이버 목록 확보
  const getDriversNow = async () => {
    if (Object.keys(driverLocations).length) return driverLocations;
    if (Object.keys(snapshotDrivers).length) return snapshotDrivers;
    try {
      const snap = await fetchDriversOnceStrict();
      setSnapshotDrivers(snap);
      return snap;
    } catch {
      return {};
    }
  };

  const safeOpenPanelAndCompute = async (station) => {
    if (tapLockRef.current) return;
    tapLockRef.current = true;

    const driversNow = await getDriversNow();
    setSelectedStation(station);
    setPanelVisible(true);

    setTimeout(async () => {
      if (!Object.keys(driversNow).length) {
        Alert.alert('안내', '현재 주행 중인 버스를 찾지 못했습니다.');
        tapLockRef.current = false;
        return;
      }
      const res = await computeForStation(station, driversNow); // override로 즉시 계산
      if (!res.ok) {
        if (res.reason === 'naver_error') {
          const { code, status, message } = res.errorDetails || {};
          Alert.alert('NAVER 경로 실패', `code:${code}\nstatus:${status}\nmsg:${message}`);
        } else {
          Alert.alert('안내', '버스를 찾을 수 없습니다.');
        }
      }
      setTimeout(() => { tapLockRef.current = false; }, 120);
    }, 60);
  };

  const handleStationPress = (station) => {
    if (!station?.lat || !station?.lng) return;
    safeOpenPanelAndCompute(station);
  };

  const handleGiheungPress = () => {
    const st = STATIONS.find(s => s.id === lastGiheungTargetRef.current) || STATIONS.find(s => s.id === 'station1');
    if (!st) return;
    safeOpenPanelAndCompute(st);
  };

  const switchGiheung = (targetId) => {
    lastGiheungTargetRef.current = targetId;
    const st = STATIONS.find(s => s.id === targetId);
    if (!st) return;
    safeOpenPanelAndCompute(st);
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
          latitude: getGiheungGroupCoord().latitude,
          longitude: getGiheungGroupCoord().longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        {STATIONS.filter((s) => !GIHEUNG_IDS.includes(s.id)).map((s) => (
          <StationPin key={s.id} station={s} onPress={() => handleStationPress(s)} />
        ))}

        <GiheungPin coord={getGiheungGroupCoord()} onPress={handleGiheungPress} />

        {Object.entries(effectiveDrivers).map(([id, p]) => (
          <BusPin key={id} id={id} point={p} />
        ))}

        {routeCoords.length > 0 && (
          <Polyline coordinates={routeCoords} strokeWidth={4} strokeColor="#007AFF" />
        )}
      </MapView>

      <TouchableOpacity style={styles.locationButton} onPress={() => setRouteCoords([])}>
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
        arrivingSoon={arrivingSoon}         // 새로 추가
        nextEta={nextEta}                   // 새로 추가
        nextArrivalTime={nextArrivalTime}   // 새로 추가
        nextBusId={nextBusId}               // 새로 추가
        onSwitchGiheung={switchGiheung}
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
