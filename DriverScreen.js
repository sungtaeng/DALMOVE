// DriverScreen.js
import React, { useState, useEffect, useRef } from 'react';
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
import Geolocation from '@react-native-community/geolocation';
import { db } from './firebaseConfig';
import { ref, set, remove } from 'firebase/database';

const DriverScreen = () => {
  const [location, setLocation] = useState({ latitude: 0, longitude: 0 });
  const [address, setAddress] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [driverId, setDriverId] = useState('driver1'); // ✅ 여러 대 버스 구분용
  const watchId = useRef(null);

  const requestPermission = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  const startWatchingLocation = async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) {
      Alert.alert('위치 권한이 없습니다.');
      return;
    }
    if (watchId.current !== null) return;

    setIsRunning(true);
    watchId.current = Geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ latitude, longitude });
        getAddressFromCoords(latitude, longitude);
        saveLocationToFirebase(latitude, longitude);
      },
      (error) => Alert.alert('위치 오류', error.message),
      {
        enableHighAccuracy: false,
        distanceFilter: 1,
        interval: 10000,
        fastestInterval: 5000,
      }
    );
  };

  const refreshLocation = async () => {
    if (!isRunning) return;
    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ latitude, longitude });
        getAddressFromCoords(latitude, longitude);
        saveLocationToFirebase(latitude, longitude);
      },
      (error) => Alert.alert('위치 오류', error.message),
      { enableHighAccuracy: true }
    );
  };

  const stopWatchingLocation = () => {
    if (watchId.current !== null) {
      Geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setIsRunning(false);
    remove(ref(db, `drivers/${driverId}`)) // ✅ 본인 노드만 정리
      .then(() => console.log('🛑 위치 전송 중지'))
      .catch((err) => console.error(err));
  };

  const API_KEY = 'AIzaSyASr2mxhFez1B-Va5HbxsIE28fbZsPLRYI';
  const getAddressFromCoords = async (latitude, longitude) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${API_KEY}`
      );
      const data = await response.json();
      if (data.status === 'OK') {
        const addr = data.results[0].formatted_address;
        setAddress(addr);
      }
    } catch (error) {
      console.error('주소 변환 실패:', error);
    }
  };

  const saveLocationToFirebase = (latitude, longitude) => {
    const locationRef = ref(db, `drivers/${driverId}`); // ✅ driverId별 저장
    set(locationRef, {
      latitude,
      longitude,
      address,
      timestamp: new Date().toISOString(),
    })
      .then(() => console.log('📡 Firebase 저장 완료'))
      .catch((error) => console.error('❌ 저장 실패:', error));
  };

  useEffect(() => {
    // 앱 시작 시 자동 시작을 원하면 유지
    // startWatchingLocation();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🚗 Driver 위치 정보</Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Text>Driver ID:</Text>
        <TextInput
          value={driverId}
          onChangeText={setDriverId}
          placeholder="driver1"
          style={{ borderWidth: 1, borderColor: '#ccc', paddingHorizontal: 10, borderRadius: 8, minWidth: 100 }}
          editable={!isRunning}
        />
      </View>

      <Text style={styles.text}>위도: {location.latitude.toFixed(6)}</Text>
      <Text style={styles.text}>경도: {location.longitude.toFixed(6)}</Text>

      <TouchableOpacity style={styles.button} onPress={startWatchingLocation}>
        <Text style={styles.buttonText}>운행중</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={refreshLocation}>
        <Text style={styles.buttonText}>새로고침</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={stopWatchingLocation}>
        <Text style={styles.buttonText}>운행 종료</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  text: { fontSize: 16, marginBottom: 10 },
  button: {
    backgroundColor: 'black',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 10,
  },
  buttonText: { color: 'yellow', fontSize: 16, fontWeight: 'bold' },
});

export default DriverScreen;
