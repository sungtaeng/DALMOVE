// /AlarmScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Vibration } from 'react-native';
import { db } from './firebaseConfig'; // 경로는 실제 위치에 맞게
import { ref, onValue } from 'firebase/database';
import { navRouteSummary } from './services/naverDirections';

const NAVER_KEYS = {
  keyId: 'u6w3cppkl8',
  keySecret: '7kMTpyh0B2rScqRev2pwcwGYb9WZEJwT7qyv4GvN',
};

const STATIONS = [
  { id: 'station1', title: '기흥역 출발', lat: 37.274514, lng: 127.116160 },
  { id: 'station2', title: '강남대역',     lat: 37.270780, lng: 127.125569 },
  { id: 'station3', title: '샬롬관 앞',    lat: 37.274566, lng: 127.130307 },
  { id: 'station4', title: '교육관 앞',    lat: 37.275690, lng: 127.133470 },
  { id: 'station5', title: '이공관 앞',    lat: 37.276645, lng: 127.134479 },
  { id: 'station6', title: '스타벅스 앞',  lat: 37.270928, lng: 127.125917 },
  { id: 'station7', title: '기흥역 도착',  lat: 37.274618, lng: 127.116129 },
];

let alarmTimer = null;

export default function AlarmScreen() {
  const [selectedStation, setSelectedStation] = useState(null);
  const [eta, setEta] = useState(null);

  useEffect(() => {
    if (!selectedStation) return;

    const driverRef = ref(db, 'drivers/driver1');
    const unsubscribe = onValue(driverRef, async (snapshot) => {
      const data = snapshot.val();
      if (data?.latitude && data?.longitude) {
        const driverLoc = { lat: Number(data.latitude), lng: Number(data.longitude) };
        await getRouteInfo(driverLoc, selectedStation);
      }
    });

    return () => {
      clearTimeout(alarmTimer);
      unsubscribe();
    };
  }, [selectedStation]);

  const getRouteInfo = async (origin, goalStation) => {
    try {
      const { duration } = await navRouteSummary(origin, goalStation, NAVER_KEYS);
      const totalSeconds = Math.floor(duration / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;

      setEta(`${minutes}분 ${seconds}초`);

      const milliseconds = totalSeconds * 1000 - 30000; // 30초 전 알림
      clearTimeout(alarmTimer);
      alarmTimer = setTimeout(() => {
        Vibration.vibrate();
        Alert.alert('⏰ 알람', `${goalStation.title} 도착까지 30초 남았습니다!`);
      }, Math.max(0, milliseconds));
    } catch (err) {
      Alert.alert('ETA 계산 실패', `${err.code || ''} ${err.message || String(err)}`);
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
  stationButton: { padding: 15, marginVertical: 5, backgroundColor: '#eee', borderRadius: 10 },
  stationText: { fontSize: 16 },
  cancelButton: { marginTop: 10, backgroundColor: 'red', padding: 10, borderRadius: 8, alignItems: 'center' },
});
