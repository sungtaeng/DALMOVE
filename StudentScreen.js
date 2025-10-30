// /StudentScreen.js
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Text,
  PermissionsAndroid,
  Platform,
  Switch,
  Image,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, Polyline } from 'react-native-maps';

import { STATIONS, getGiheungGroupCoord } from './constants/stations';
import useDrivers, { fetchDriversOnceStrict } from './hooks/useDrivers';
import usePresenceGeofence from './hooks/usePresenceGeofence';
import useBestETA from './hooks/useBestETA';
import { StationPin, BusPin } from './components/MapPins';
import SlidePanel from './components/SlidePanel';
import { subscribeCrowdRTDB } from './firebaseConfig';
import { NAVER_CONFIG } from './config/appConfig';
import { COLORS, IMAGES, RADIUS, SHADOWS } from './config/theme';

export default function StudentScreen({ navigation }) {
  const mapRef = useRef(null);
  const { driverLocations } = useDrivers();

  const [presenceEnabled, setPresenceEnabled] = useState(false);
  const presenceState = usePresenceGeofence({ enabled: presenceEnabled });

  const [snapshotDrivers, setSnapshotDrivers] = useState({});
  const effectiveDrivers = useMemo(() => {
    const live = Object.keys(driverLocations).length ? driverLocations : null;
    return live || snapshotDrivers;
  }, [driverLocations, snapshotDrivers]);

  const {
    eta,
    distance,
    arrivalTime,
    routeCoords,
    computeForStation,
    setRouteCoords,
    arrivingSoon,
    nextEta,
    nextArrivalTime,
    nextBusId,
    activeBusId,
  } = useBestETA(effectiveDrivers, NAVER_CONFIG);

  const [panelVisible, setPanelVisible] = useState(false);
  const [selectedStation, setSelectedStation] = useState(null);
  const [crowd, setCrowd] = useState(0);
  const tapLockRef = useRef(false);

  const currentPresenceStation = useMemo(
    () => STATIONS.find((s) => s.id === presenceState.stopId) || null,
    [presenceState.stopId]
  );

  const presenceStatusText = useMemo(() => {
    if (!presenceEnabled) return '대기 공유 꺼짐';
    if (presenceState.waiting && currentPresenceStation) {
      return `${currentPresenceStation.title}에서 대기 중으로 공유됨`;
    }
    if (currentPresenceStation) {
      return `${currentPresenceStation.title} 감지됨 (대기 아님)`;
    }
    return '정류장 범위 밖';
  }, [presenceEnabled, presenceState.waiting, currentPresenceStation]);

  const ensureLocationPermission = useCallback(async () => {
    if (Platform.OS !== 'android') {
      return true;
    }
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    );
    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
      Alert.alert('권한 필요', '위치 권한을 허용해야 정류장 대기 공유를 사용할 수 있습니다.');
      return false;
    }
    return true;
  }, []);

  const handlePresenceToggle = useCallback(
    async (value) => {
      if (value) {
        const ok = await ensureLocationPermission();
        if (!ok) return;
      }
      setPresenceEnabled(value);
    },
    [ensureLocationPermission]
  );

  const getDriversNow = useCallback(async () => {
    if (Object.keys(driverLocations).length) return driverLocations;
    if (Object.keys(snapshotDrivers).length) return snapshotDrivers;
    try {
      const snap = await fetchDriversOnceStrict();
      setSnapshotDrivers(snap);
      return snap;
    } catch (err) {
      console.warn('Failed to fetch drivers snapshot', err);
      return {};
    }
  }, [driverLocations, snapshotDrivers]);

  const safeOpenPanelAndCompute = useCallback(
    async (station) => {
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
        const res = await computeForStation(station, driversNow);
        if (!res.ok) {
          if (res.reason === 'naver_error') {
            const { code, status, message } = res.errorDetails || {};
            Alert.alert('경로 계산 실패', `code:${code}\nstatus:${status}\nmsg:${message}`);
          } else {
            Alert.alert('안내', '버스를 찾을 수 없습니다.');
          }
        }
        setTimeout(() => {
          tapLockRef.current = false;
        }, 120);
      }, 60);
    },
    [computeForStation, getDriversNow]
  );

  const handleStationPress = useCallback(
    (station) => {
      if (!station?.lat || !station?.lng) return;
      safeOpenPanelAndCompute(station);
    },
    [safeOpenPanelAndCompute]
  );

  useEffect(() => {
    if (!panelVisible || !selectedStation?.id) return undefined;
    const off = subscribeCrowdRTDB(selectedStation.id, setCrowd);
    return () => {
      if (off) off();
    };
  }, [panelVisible, selectedStation?.id]);

  const clearRoute = useCallback(() => {
    setRouteCoords([]);
  }, [setRouteCoords]);

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
        {STATIONS.filter((s) => s.visible !== false).map((s) => (
          <StationPin key={s.id} station={s} onPress={() => handleStationPress(s)} />
        ))}

        {Object.entries(effectiveDrivers).map(([id, point]) => (
          <BusPin key={id} id={id} point={point} />
        ))}

        {routeCoords.length > 0 && (
          <Polyline coordinates={routeCoords} strokeWidth={4} strokeColor={COLORS.accent} />
        )}
      </MapView>

      <View style={styles.overlayDecor}>
        <Image source={IMAGES.moon} style={styles.overlayMoon} resizeMode="contain" />
      </View>

      <View style={styles.controlsOverlay}>
        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchLabel}>정류장 대기 공유</Text>
            <Text style={styles.switchStatus}>{presenceStatusText}</Text>
          </View>
          <Switch
            value={presenceEnabled}
            onValueChange={handlePresenceToggle}
            thumbColor="#fff"
            trackColor={{ true: COLORS.primary, false: '#d9dae0' }}
          />
        </View>
      </View>

      <TouchableOpacity style={styles.homeButton} onPress={() => navigation.getParent()?.navigate?.('Home')}>
        <Image source={IMAGES.bus} style={styles.homeButtonIcon} resizeMode="contain" />
        <Text style={styles.homeButtonText}>달빛 홈으로</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.clearRouteButton} onPress={clearRoute}>
        <Text style={styles.clearRouteText}>경로 초기화</Text>
      </TouchableOpacity>

      <SlidePanel
        visible={panelVisible}
        station={selectedStation}
        onClose={() => setPanelVisible(false)}
        eta={eta}
        distance={distance}
        arrivalTime={arrivalTime}
        crowd={crowd}
        arrivingSoon={arrivingSoon}
        nextEta={nextEta}
        nextArrivalTime={nextArrivalTime}
        nextBusId={nextBusId}
        activeBusId={activeBusId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  overlayDecor: {
    position: 'absolute',
    top: -40,
    left: -40,
    width: 160,
    height: 160,
    opacity: 0.15,
  },
  overlayMoon: { width: '100%', height: '100%' },
  controlsOverlay: {
    position: 'absolute',
    top: 100,
    left: 18,
    right: 18,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingVertical: 14,
    paddingHorizontal: 18,
    ...SHADOWS.floating,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  switchStatus: {
    marginTop: 6,
    fontSize: 12,
    color: COLORS.textMuted,
  },
  clearRouteButton: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: 20,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.floating,
  },
  clearRouteText: { fontSize: 14, color: COLORS.primaryDark, fontWeight: '700' },
  homeButton: {
    position: 'absolute',
    top: 32,
    right: 18,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff0ca',
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
    ...SHADOWS.floating,
  },
  homeButtonIcon: { width: 20, height: 20, marginRight: 6 },
  homeButtonText: { color: COLORS.primaryDark, fontWeight: '700' },
});
