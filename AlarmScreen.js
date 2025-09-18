// AlarmScreen.js
import React, { useState, useEffect } from 'react';
import {View,Text,StyleSheet,FlatList,TouchableOpacity,Alert,Vibration,} from 'react-native';
import axios from 'axios';
import { db } from '../Test5/firebaseConfig';
import { ref, onValue } from 'firebase/database';

const NAVER_CLIENT_ID = 'u6w3cppkl8';
const NAVER_CLIENT_SECRET = '7kMTpyh0B2rScqRev2pwcwGYb9WZEJwT7qyv4GvN';

const STATIONS = [
  { id: 'station1', title: '기흥역 출발', lat: 37.274514, lng: 127.116160 },
  { id: 'station2', title: '강남대역', lat: 37.270780, lng: 127.125569 },
  { id: 'station3', title: '샬롬관 앞', lat: 37.274566, lng: 127.130307 },
  { id: 'station4', title: '교육관 앞', lat: 37.275690, lng: 127.133470 },
  { id: 'station5', title: '이공관 앞', lat: 37.276645, lng: 127.134479 },
  { id: 'station6', title: '스타벅스 앞', lat: 37.270928, lng: 127.125917 },
  { id: 'station7', title: '기흥역 도착', lat: 37.274618, lng: 127.116129 },
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
        const driverLoc = { lat: data.latitude, lng: data.longitude };
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
      const start = origin;
      const goalStation = goal;

      const startIdx = findNearestPassedStop(origin);
      const goalIdx = STATIONS.findIndex(s => s.id === goal.id);
      let midStations = STATIONS.slice(startIdx + 1, goalIdx);

      // 항상 이공관을 거쳐야 하는 경우 강제로 추가
      const needBypass = ['station6', 'station7'];
      if (needBypass.includes(goal.id) && !midStations.some(s => s.id === 'station5')) {
        midStations = [
          ...STATIONS.filter(s => s.id === 'station5'),
          ...midStations
        ];
      }

      const waypoints = midStations.map(p => `${p.lng},${p.lat}`).join('|');

      const res = await axios.get('https://maps.apigw.ntruss.com/map-direction/v1/driving', {
        headers: {
          'x-ncp-apigw-api-key-id': NAVER_CLIENT_ID,
          'x-ncp-apigw-api-key': NAVER_CLIENT_SECRET,
        },
        params: {
          start: `${start.lng},${start.lat}`,
          goal: `${goalStation.lng},${goalStation.lat}`,
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

        const milliseconds = totalSeconds * 1000 - 30000; // 30초 전 알람
        clearTimeout(alarmTimer);
        alarmTimer = setTimeout(() => {
          Vibration.vibrate();
          Alert.alert('⏰ 알람', `${goal.title} 도착까지 30초 남았습니다!`);
        }, milliseconds);
      }
    } catch (err) {
      Alert.alert('ETA 계산 실패', err.message);
    }
  };

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

  const findNearestPassedStop = (driverLoc) => {
    let minIndex = 0;
    let minDist = Infinity;
    STATIONS.forEach((station, idx) => {
      const d = getDistance(driverLoc, station);
      if (d < minDist) {
        minDist = d;
        minIndex = idx;
      }
    });
    return minIndex;
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