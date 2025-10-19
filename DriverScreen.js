// DriverScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Alert, PermissionsAndroid, Platform, TouchableOpacity, TextInput,
} from 'react-native';

// ✅ 확장자(.js)까지 포함해서 named import로 정확히 가져오기
import { addListener, start, stop, pushOnce, isRunning } from './services/driverTracker.js';

const GOOGLE_GEOCODE_KEY = 'AIzaSyASr2mxhFez1B-Va5HbxsIE28fbZsPLRYI';

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

  useEffect(() => {
    // 문제 계속되면 여기 잠깐 켜고 확인: addListener, start가 함수인지
    // console.log('tracker fns:', typeof addListener, typeof start, typeof stop, typeof pushOnce, typeof isRunning);

    const off = addListener((u) => {
      if (u?.stopped) { setRunning(false); return; }
      if (u?.error) { Alert.alert('위치 오류', u.error); return; }
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
    if (!ok) { Alert.alert('권한 필요', '위치 권한을 허용해주세요.'); return; }

    start({
      driverId,
      highAccuracy: true,
      distanceFilter: 5,
      intervalMs: 5000,
      reverseGeocode: true,
      geocodeApiKey: GOOGLE_GEOCODE_KEY,
    });
    setRunning(true);
  };

  const onRefresh = async () => { await pushOnce(); };

  const onStop = async () => {
    await stop({ removeFromDb: true });
    setRunning(false);
    setLoc({ latitude: 0, longitude: 0 });
    setAddress('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🚗 Driver 위치 정보</Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Text>Driver ID:</Text>
        <TextInput
          value={driverId}
          onChangeText={setDriverId}
          placeholder="driver1"
          style={{ borderWidth: 1, borderColor: '#ccc', paddingHorizontal: 10, borderRadius: 8, minWidth: 120 }}
          editable={!running}
        />
      </View>

      <Text style={styles.text}>상태: {running ? '운행 중' : '대기'}</Text>
      <Text style={styles.text}>위도: {loc.latitude ? loc.latitude.toFixed(6) : '-'}</Text>
      <Text style={styles.text}>경도: {loc.longitude ? loc.longitude.toFixed(6) : '-'}</Text>
      <Text style={styles.text}>주소: {address || '-'}</Text>

      <TouchableOpacity style={styles.button} onPress={onStart}>
        <Text style={styles.buttonText}>운행중</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={onRefresh} disabled={!running}>
        <Text style={styles.buttonText}>새로고침</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={onStop} disabled={!running}>
        <Text style={styles.buttonText}>운행 종료</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'white' },
  title:{ fontSize:22, fontWeight:'bold', marginBottom:20 },
  text:{ fontSize:16, marginBottom:8 },
  button:{
    backgroundColor:'black',
    paddingVertical:12,
    paddingHorizontal:24,
    borderRadius:12,
    marginTop:10,
  },
  buttonText:{ color:'yellow', fontSize:16, fontWeight:'bold' },
});
