// DriverScreen.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  PermissionsAndroid,
  Platform,
  TouchableOpacity,
  TextInput,
} from 'react-native';

import { addListener, start, stop, pushOnce, isRunning } from './services/driverTracker.js';
import { GOOGLE_CONFIG } from './config/appConfig';
import { COLORS, RADIUS, SHADOWS } from './config/theme';

const GOOGLE_GEOCODE_KEY = GOOGLE_CONFIG.geocodeKey;

async function requestPermission() {
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }
  return true;
}

export default function DriverScreen() {
  const [running, setRunning] = useState(() =>
    typeof isRunning === 'function' ? isRunning() : !!isRunning
  );
  const [driverId, setDriverId] = useState('driver1');
  const [loc, setLoc] = useState({ latitude: 0, longitude: 0 });
  const [address, setAddress] = useState('');

  const reverseGeocodeEnabled = useMemo(() => !!GOOGLE_GEOCODE_KEY, []);

  useEffect(() => {
    const off = addListener((u) => {
      if (u?.stopped) {
        setRunning(false);
        return;
      }
      if (u?.error) {
        Alert.alert('위치 오류', u.error);
        return;
      }
      if (u?.lat) {
        setLoc({ latitude: u.lat, longitude: u.lng });
        setAddress(u.address || '');
      }
    });
    return off;
  }, []);

  const onStart = async () => {
    if (running) return;
    const ok = await requestPermission();
    if (!ok) {
      Alert.alert('권한 필요', '위치 권한을 허용해 주세요.');
      return;
    }

    start({
      driverId,
      highAccuracy: true,
      distanceFilter: 5,
      intervalMs: 5000,
      reverseGeocode: reverseGeocodeEnabled,
      geocodeApiKey: GOOGLE_GEOCODE_KEY,
    });
    if (!reverseGeocodeEnabled) {
      Alert.alert('주소 변환 꺼짐', 'Google Geocode 키가 없어 주소 없이 전송됩니다.');
    }
    setRunning(true);
  };

  const onRefresh = async () => {
    await pushOnce();
  };

  const onStop = async () => {
    await stop({ removeFromDb: true });
    setRunning(false);
    setLoc({ latitude: 0, longitude: 0 });
    setAddress('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.pageTitle}>운전자 위치 공유</Text>

      <View style={styles.card}>
        <View style={styles.inputRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Driver ID</Text>
            <TextInput
              value={driverId}
              onChangeText={setDriverId}
              placeholder="driver1"
              placeholderTextColor="#b0b0ba"
              style={styles.input}
              editable={!running}
            />
          </View>
          <View style={styles.statusPill}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: running ? COLORS.success : '#d9d9df' },
              ]}
            />
            <Text style={styles.statusText}>{running ? '전송 중' : '대기'}</Text>
          </View>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>위도</Text>
          <Text style={styles.infoValue}>{loc.latitude ? loc.latitude.toFixed(6) : '-'}</Text>
        </View>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>경도</Text>
          <Text style={styles.infoValue}>{loc.longitude ? loc.longitude.toFixed(6) : '-'}</Text>
        </View>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>주소</Text>
          <Text style={styles.infoValue}>
            {address || (reverseGeocodeEnabled ? '수신 대기 중...' : '주소 변환 사용 안 함')}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.primaryButton, running && styles.buttonDisabled]}
          onPress={onStart}
          disabled={running}
        >
          <Text style={styles.primaryButtonText}>전송 시작</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryButton, !running && styles.buttonDisabled]}
          onPress={onRefresh}
          disabled={!running}
        >
          <Text style={styles.secondaryButtonText}>한 번 업데이트</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.stopButton, !running && styles.buttonDisabled]}
          onPress={onStop}
          disabled={!running}
        >
          <Text style={styles.stopButtonText}>전송 종료</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  pageTitle: { fontSize: 24, fontWeight: '800', color: COLORS.text, marginBottom: 20 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 20,
    ...SHADOWS.card,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 12 },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted, marginBottom: 8 },
  input: {
    borderWidth: 1.2,
    borderColor: '#e4e4ee',
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f6',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusDot: { width: 10, height: 10, borderRadius: RADIUS.pill, marginRight: 6 },
  statusText: { fontWeight: '700', color: '#3a3a45' },
  infoBox: { marginBottom: 12 },
  infoLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted, marginBottom: 4 },
  infoValue: { fontSize: 16, fontWeight: '600', color: '#22232b' },
  actions: { marginTop: 24, gap: 12 },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#ffbb48',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  primaryButtonText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  secondaryButton: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: '#ffd8cc',
  },
  secondaryButtonText: { color: '#c0563a', fontWeight: '700', fontSize: 16 },
  stopButton: {
    backgroundColor: '#24252f',
    borderRadius: RADIUS.md,
    paddingVertical: 15,
    alignItems: 'center',
  },
  stopButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  buttonDisabled: { opacity: 0.55 },
});
