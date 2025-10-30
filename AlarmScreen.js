// /AlarmScreen.js
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Vibration,
  ActivityIndicator,
  ScrollView,
} from 'react-native';

import useDrivers from './hooks/useDrivers';
import { STATIONS } from './constants/stations';
import { NAVER_CONFIG } from './config/appConfig';
import { navRouteSummary } from './services/naverDirections';
import { loopRouteEstimate } from './utils/geo';
import { COLORS, RADIUS, SHADOWS } from './config/theme';

const formatEta = (durationMs) => {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}초`;
  if (seconds === 0) return `${minutes}분`;
  return `${minutes}분 ${seconds}초`;
};

export default function AlarmScreen() {
  const { driverLocations } = useDrivers();
  const [selectedStation, setSelectedStation] = useState(null);
  const [bestEstimate, setBestEstimate] = useState(null);
  const [eta, setEta] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const alarmTimerRef = useRef(null);
  const scheduleCacheRef = useRef({ driverId: null, duration: null, stationId: null });

  const clearAlarmTimer = useCallback(() => {
    if (alarmTimerRef.current) {
      clearTimeout(alarmTimerRef.current);
      alarmTimerRef.current = null;
    }
  }, []);

  const scheduleAlarm = useCallback(
    (durationMs, stationTitle) => {
      clearAlarmTimer();
      const triggerMs = Math.max(0, durationMs - 30_000);
      alarmTimerRef.current = setTimeout(() => {
        Vibration.vibrate();
        Alert.alert('알림', `${stationTitle} 도착 30초 전입니다.`);
      }, triggerMs);
    },
    [clearAlarmTimer]
  );

  useEffect(() => clearAlarmTimer, [clearAlarmTimer]);

  const computeBestEstimate = useCallback(async (station, drivers) => {
    const entries = Object.entries(drivers || {});
    if (!entries.length) return null;

    const enriched = await Promise.all(
      entries.map(async ([busId, point]) => {
        if (!point?.lat || !point?.lng) return null;
        const origin = { lat: point.lat, lng: point.lng };
        try {
          const res = await navRouteSummary(origin, station, NAVER_CONFIG);
          return {
            ok: true,
            busId,
            duration: res.duration,
            distance: typeof res.distance === 'number' ? res.distance : null,
          };
        } catch (err) {
          const fallback = loopRouteEstimate(origin, station);
          if (!fallback) return null;
          return {
            ok: true,
            busId,
            duration: fallback.duration,
            distance: fallback.distance ?? null,
          };
        }
      })
    );

    const candidates = enriched.filter(Boolean);
    if (!candidates.length) return null;
    candidates.sort((a, b) => a.duration - b.duration);
    return candidates[0];
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!selectedStation) {
      setBestEstimate(null);
      setEta(null);
      setError(null);
      scheduleCacheRef.current = { driverId: null, duration: null, stationId: null };
      clearAlarmTimer();
      return undefined;
    }

    if (!Object.keys(driverLocations || {}).length) {
      setLoading(false);
      setBestEstimate(null);
      setEta(null);
      setError('운행 중인 버스가 없습니다.');
      clearAlarmTimer();
      scheduleCacheRef.current = { driverId: null, duration: null, stationId: null };
      return undefined;
    }

    setLoading(true);
    computeBestEstimate(selectedStation, driverLocations)
      .then((result) => {
        if (cancelled) return;
        setLoading(false);
        if (!result) {
          setBestEstimate(null);
          setEta(null);
          setError('경로 정보를 가져오지 못했습니다.');
          clearAlarmTimer();
          scheduleCacheRef.current = { driverId: null, duration: null, stationId: null };
          return;
        }
        setBestEstimate(result);
        setEta(formatEta(result.duration));
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoading(false);
        setBestEstimate(null);
        setEta(null);
        setError(err?.message || '경로 계산 오류');
        clearAlarmTimer();
        scheduleCacheRef.current = { driverId: null, duration: null, stationId: null };
      });

    return () => {
      cancelled = true;
    };
  }, [selectedStation, driverLocations, computeBestEstimate, clearAlarmTimer]);

  useEffect(() => {
    if (!selectedStation) {
      setEta(null);
      clearAlarmTimer();
      scheduleCacheRef.current = { driverId: null, duration: null, stationId: null };
      return;
    }

    if (!bestEstimate) {
      if (!loading) {
        setEta(null);
        clearAlarmTimer();
        scheduleCacheRef.current = { driverId: null, duration: null, stationId: null };
      }
      return;
    }

    const cache = scheduleCacheRef.current;
    if (
      cache.driverId !== bestEstimate.busId
      || cache.duration !== bestEstimate.duration
      || cache.stationId !== selectedStation.id
    ) {
      scheduleCacheRef.current = {
        driverId: bestEstimate.busId,
        duration: bestEstimate.duration,
        stationId: selectedStation.id,
      };
      scheduleAlarm(bestEstimate.duration, selectedStation.title);
    }
  }, [bestEstimate, selectedStation, loading, scheduleAlarm, clearAlarmTimer]);

  const cancelAlarm = () => {
    clearAlarmTimer();
    setSelectedStation(null);
    setBestEstimate(null);
    setEta(null);
    setError(null);
  };

  const renderStationChip = (station) => {
    const isSelected = selectedStation?.id === station.id;
    return (
      <TouchableOpacity
        key={station.id}
        style={[styles.stationChip, isSelected && styles.stationChipActive]}
        onPress={() => setSelectedStation(station)}
      >
        <Text style={[styles.stationChipText, isSelected && styles.stationChipTextActive]}>
          {station.title}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>달빛 알람</Text>
      <Text style={styles.subtitle}>
        정류장을 선택하면 달무브가 가장 가까운 버스를 찾아  알람을 예약해 드려요.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>정류장 선택</Text>
        <View style={styles.stationGrid}>{STATIONS.map(renderStationChip)}</View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>가장 빠른 버스</Text>
        {loading && (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loaderText}>최단 경로를 찾는 중입니다...</Text>
          </View>
        )}
        {!loading && selectedStation && !bestEstimate && (
          <View style={styles.blankCard}>
            <Text style={styles.blankText}>{error || '운행 중인 버스를 찾지 못했습니다.'}</Text>
          </View>
        )}
        {!loading && bestEstimate && (
          <View style={styles.busCard}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>가장 빠른 버스</Text>
            </View>
          
            <Text style={styles.etaText}>{eta}</Text>
            <Text style={styles.busMeta}>
              {selectedStation?.title || ''}까지
              {bestEstimate.distance != null ? ` · ${(bestEstimate.distance / 1000).toFixed(2)} km` : ''}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>알람 상태</Text>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLine}>정류장 · {selectedStation?.title || '미선택'}</Text>
          <Text style={styles.summaryLine}>몇 분 후 도착 · {eta || (selectedStation ? '계산 중...' : '-')}</Text>
        
          {selectedStation && (
            <TouchableOpacity style={styles.cancelButton} onPress={cancelAlarm}>
              <Text style={styles.cancelText}>알람 취소</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingVertical: 30,
    paddingHorizontal: 24,
    backgroundColor: COLORS.background,
  },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text },
  subtitle: { marginTop: 8, color: COLORS.textMuted, lineHeight: 21 },
  section: { marginTop: 28 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 14 },
  stationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  stationChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: RADIUS.md,
    backgroundColor: '#fceec3',
  },
  stationChipActive: {
    backgroundColor: COLORS.primary,
    shadowColor: '#ffbb48',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  stationChipText: { color: COLORS.text, fontWeight: '600' },
  stationChipTextActive: { color: '#fff' },
  loaderBox: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.card,
  },
  loaderText: { marginTop: 12, color: COLORS.textMuted, fontSize: 14 },
  blankCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.card,
  },
  blankText: { color: COLORS.textMuted, fontSize: 14 },
  busCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 28,
    ...SHADOWS.card,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.badge,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    marginBottom: 18,
  },
  badgeText: { color: COLORS.primaryDark, fontWeight: '700', fontSize: 12 },
  busId: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  etaText: { fontSize: 46, fontWeight: '800', color: COLORS.primary, marginTop: 10 },
  busMeta: { marginTop: 10, color: COLORS.textMuted },
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 24,
    ...SHADOWS.floating,
  },
  summaryLine: { fontSize: 15, color: COLORS.text, fontWeight: '600', marginBottom: 10 },
  cancelButton: {
    marginTop: 18,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    shadowColor: '#ffbb48',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  cancelText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
