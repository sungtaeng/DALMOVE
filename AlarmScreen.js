import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Vibration } from 'react-native';
import axios from 'axios';
import { db } from '../Test5/firebaseConfig'; // ← 네가 쓰던 경로 유지
import { ref, onValue } from 'firebase/database';
import { buildCumulativeKm, progressKmOnRoute, passedStopIndex, haversineKm } from './utils/routeProgress';

// ⚠️ 테스트용 키. 실제 배포시 서버 프록시로 교체 권장.
const NAVER_CLIENT_ID = 'u6w3cppkl8';
const NAVER_CLIENT_SECRET = '7kMTpyh0B2rScqRev2pwcwGYb9WZEJwT7qyv4GvN';

// 노선 순서 동일
const STATIONS = [
  { id: 'station1', title: '기흥역 출발', lat: 37.274514, lng: 127.116160 },
  { id: 'station2', title: '강남대역',   lat: 37.270780, lng: 127.125569 },
  { id: 'station3', title: '샬롬관 앞',  lat: 37.274566, lng: 127.130307 },
  { id: 'station4', title: '교육관 앞',  lat: 37.275690, lng: 127.133470 },
  { id: 'station5', title: '이공관 앞',  lat: 37.276645, lng: 127.134479 },
  { id: 'station6', title: '스타벅스 앞', lat: 37.270928, lng: 127.125917 },
  { id: 'station7', title: '기흥역 도착', lat: 37.274618, lng: 127.116129 },
];

let alarmTimer = null;

export default function AlarmScreen() {
  const [selectedStation, setSelectedStation] = useState(null);
  const [eta, setEta] = useState(null);

  // 진행도 계산 준비
  const CUM_KM = useRef(buildCumulativeKm(STATIONS)).current;
  const lastPassedIdxRef = useRef(0);

  const getPassedStopIdx = (driverLoc) => {
    const { totalKm } = progressKmOnRoute(STATIONS, CUM_KM, driverLoc);
    return passedStopIndex(CUM_KM, totalKm, 60);
  };

  const getMonotonicPassedIdx = (driverLoc) => {
    const idx = getPassedStopIdx(driverLoc);
    if (idx >= lastPassedIdxRef.current) {
      lastPassedIdxRef.current = idx;
    }
    return lastPassedIdxRef.current;
  };

  const loopResetIfNeeded = (driverLoc) => {
    const last = lastPassedIdxRef.current;
    const nearStart = haversineKm(driverLoc, STATIONS[0]) < 0.08;
    const farFromEnd = haversineKm(driverLoc, STATIONS[STATIONS.length - 1]) > 0.2;
    if (last >= STATIONS.length - 2 && nearStart && farFromEnd) {
      lastPassedIdxRef.current = 0;
    }
  };

  useEffect(() => {
    if (!selectedStation) return;

    const driverRef = ref(db, 'drivers/driver1');
    const unsubscribe = onValue(driverRef, async (snapshot) => {
      const data = snapshot.val();
      if (data?.latitude && data?.longitude) {
        const driverLoc = { lat: data.latitude, lng: data.longitude };
        loopResetIfNeeded(driverLoc);
        await getRouteInfo(driverLoc, selectedStation);
      }
    });

    return () => {
      clearTimeout(alarmTimer);
      unsubscribe();
    };
  }, [selectedStation]);

  const getRouteInfo = async (origin, goal) => {
    try {
      const startIdx = getMonotonicPassedIdx(origin);
      const goalIdx = STATIONS.findIndex(s => s.id === goal.id);
      let midStations = STATIONS.slice(startIdx + 1, goalIdx);

      // 이공관 강제 경유 규칙
      const egongwanIdx = STATIONS.findIndex(s => s.id === 'station5');
      const needBypass = ['station6', 'station7'];
      const hasPassedEgongwan = startIdx >= egongwanIdx;
      if (needBypass.includes(goal.id) && !hasPassedEgongwan) {
        if (!midStations.some(s => s.id === 'station5')) {
          midStations = [STATIONS[egongwanIdx], ...midStations];
        }
      }

      const waypoints = midStations.map(p => `${p.lng},${p.lat}`).join('|');

      const res = await axios.get('https://maps.apigw.ntruss.com/map-direction/v1/driving', {
        headers: {
          'x-ncp-apigw-api-key-id': NAVER_CLIENT_ID,
          'x-ncp-apigw-api-key': NAVER_CLIENT_SECRET,
        },
        params: {
          start: `${origin.lng},${origin.lat}`,
          goal: `${goal.lng},${goal.lat}`,
          waypoints,
          option: 'trafast',
        },
      });

      const summary = res.data?.route?.trafast?.[0]?.summary;
      if (summary) {
        const totalSeconds = Math.floor(summary.duration / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        setEta(`${minutes}분 ${seconds}초`);

        // 30초 전 알람 (간단 타이머 방식)
        const milliseconds = Math.max(0, totalSeconds * 1000 - 30000);
        if (alarmTimer) clearTimeout(alarmTimer);
        alarmTimer = setTimeout(() => {
          Vibration.vibrate();
          Alert.alert('⏰ 알람', `${goal.title} 도착까지 30초 남았습니다!`);
        }, milliseconds);
      }
    } catch (err) {
      Alert.alert('ETA 계산 실패', err.message);
    }
  };

  const cancelAlarm = () => {
    clearTimeout(alarmTimer);
    setSelectedStation(null);
    setEta(null);
    Alert.alert('알람 취소됨');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎯 도착지 선택</Text>

      <FlatList
        data={STATIONS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.stationButton}
            onPress={() => setSelectedStation(item)}
          >
            <Text style={styles.stationText}>{item.title}</Text>
          </TouchableOpacity>
        )}
      />

      {selectedStation && (
        <View style={{ marginTop: 20 }}>
          <Text>도착지: {selectedStation.title}</Text>
          <Text>도착예정시간: {eta || '계산 중...'}</Text>
          <TouchableOpacity onPress={cancelAlarm} style={styles.cancelButton}>
            <Text style={{ color: 'white' }}>⛔ 알람 취소</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  stationButton: {
    padding: 15,
    marginVertical: 5,
    backgroundColor: '#eee',
    borderRadius: 10,
  },
  stationText: { fontSize: 16 },
  cancelButton: {
    marginTop: 10,
    backgroundColor: 'red',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
});
