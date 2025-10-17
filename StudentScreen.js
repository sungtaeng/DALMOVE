// StudentScreen.js
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity, Text } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Polyline } from 'react-native-maps';

import { STATIONS, GIHEUNG_IDS, getGiheungGroupCoord } from './constants/stations';
import useDrivers from './hooks/useDrivers';
import usePresenceGeofence from './hooks/usePresenceGeofence';
import useBestETA from './hooks/useBestETA';
import { GiheungPin, StationPin, BusPin } from './components/MapPins';
import SlidePanel from './components/SlidePanel';
import { subscribeCrowdRTDB } from './firebaseConfig';

// 초기 동작본: useBestETA에 키를 넘겨줌
const NAVER_CLIENT_ID = 'u6w3cppkl8';
const NAVER_CLIENT_SECRET = '7kMTpyh0B2rScqRev2pwcwGYb9WZEJwT7qyv4GvN';

export default function StudentScreen() {
  const mapRef = useRef();
  const driverLocations = useDrivers();
  usePresenceGeofence();

  const { eta, distance, arrivalTime, routeCoords, computeForStation, setRouteCoords } =
    useBestETA(driverLocations, { keyId: NAVER_CLIENT_ID, keySecret: NAVER_CLIENT_SECRET });

  const [panelVisible, setPanelVisible] = useState(false);
  const [selectedStation, setSelectedStation] = useState(null);
  const [crowd, setCrowd] = useState(0);
  const lastGiheungTargetRef = useRef('station1');

  const handleStationPress = async (station) => {
    setSelectedStation(station);
    setPanelVisible(true);
    const res = await computeForStation(station);
    if (!res.ok) Alert.alert('안내', '해당 정류장으로 향하는 버스를 찾지 못했습니다.');
  };

  const handleGiheungPress = async () => {
    const id = lastGiheungTargetRef.current;
    const st = STATIONS.find((s) => s.id === id);
    if (!st) return;
    setSelectedStation(st);
    setPanelVisible(true);
    const res = await computeForStation(st);
    if (!res.ok) Alert.alert('안내', '기흥역으로 향하는 버스를 찾지 못했습니다.');
  };

  const switchGiheung = async (targetId) => {
    lastGiheungTargetRef.current = targetId;
    const st = STATIONS.find((s) => s.id === targetId);
    if (!st) return;
    setSelectedStation(st);
    setPanelVisible(true);
    const res = await computeForStation(st);
    if (!res.ok) Alert.alert('안내', '해당 방향으로 향하는 버스를 찾지 못했습니다.');
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

        {Object.entries(driverLocations).map(([id, p]) => (
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
