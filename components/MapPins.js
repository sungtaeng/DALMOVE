// /components/MapPins.js
import React from 'react';
import { Image } from 'react-native';
import { Marker } from 'react-native-maps';

// components 폴더 기준 경로 주의!
const MOON_IMG = require('../assets/images/splash/moon.png');
const BUS_IMG  = require('../assets/images/splash/bus.png');

export function StationPin({ station, size = 45, onPress }) {
  return (
    <Marker
      coordinate={{ latitude: station.lat, longitude: station.lng }}
      anchor={{ x: 0.5, y: 0.5 }}
      zIndex={1}
      onPress={onPress}
      title={station.title}
    >
      <Image source={MOON_IMG} style={{ width: size, height: size }} resizeMode="contain" />
    </Marker>
  );
}

export function GiheungPin({ coord, size = 45, onPress }) {
  return (
    <Marker
      coordinate={coord}
      anchor={{ x: 0.5, y: 0.5 }}
      zIndex={2}
      onPress={onPress}
      title="기흥역"
    >
      <Image source={MOON_IMG} style={{ width: size, height: size }} resizeMode="contain" />
    </Marker>
  );
}

export function BusPin({ id, point, size = 60 }) {
  return (
    <Marker
      coordinate={{ latitude: point.lat, longitude: point.lng }}
      anchor={{ x: 0.5, y: 0.5 }}
      zIndex={3}
      title={`버스 ${id}`}
    >
      <Image source={BUS_IMG} style={{ width: size, height: size }} resizeMode="contain" />
    </Marker>
  );
}
