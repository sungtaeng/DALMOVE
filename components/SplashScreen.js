// components/SplashScreen.js
import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Dimensions, Animated, Easing,
  Image, Pressable, Platform, InteractionManager // ✅ 추가
} from 'react-native';

const { width, height } = Dimensions.get('window');
const BASE = Math.min(width, height);

// 크기
const TITLE_TOP  = 48;
const MOON_SIZE  = Math.min(BASE * 0.98, 560);
const BUS_BASE   = Math.min(BASE * 0.64, 500);

// 위치
const MOON_TOP      = TITLE_TOP + 44;
const MOON_CENTER_Y = MOON_TOP + MOON_SIZE / 2;

// 타이밍
const BUS_TRAVEL_MS = 6200;  // 버스 이동 (그대로)
const FADE_OUT_MS   = 420;   // 페이드 길이
const FADE_START_MS = 2400;  // ✅ 더 빨리 꺼지게: 페이드를 일찍 시작

export default function SplashScreen({ navigation }) {
  const progress = useRef(new Animated.Value(0)).current;
  const fadeOut  = useRef(new Animated.Value(1)).current;
  const didNav   = useRef(false);

  useEffect(() => {
    // 버스 이동 시작 (느긋)
    const ease = Easing.bezier(0.2, 0.9, 0.2, 1);
    const busAnim = Animated.timing(progress, {
      toValue: 1,
      duration: BUS_TRAVEL_MS,
      easing: ease,
      useNativeDriver: true,
    });
    busAnim.start();

    // 일정 시점에 페이드 시작 → 네비게이션은 "한 프레임 뒤"로 미룸
    const t = setTimeout(() => {
      Animated.timing(fadeOut, {
        toValue: 0,
        duration: FADE_OUT_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        if (didNav.current) return;
        // ✅ 핵심: 애니메이션 콜백에서 직접 replace하지 말고 defer
        InteractionManager.runAfterInteractions(() => {
          requestAnimationFrame(() => {
            if (didNav.current) return;
            didNav.current = true;
            navigation.replace('Home');
          });
        });
      });
    }, FADE_START_MS);

    return () => {
      didNav.current = true;
      clearTimeout(t);
      // 애니메이션 중단 안전
      progress.stopAnimation();
      fadeOut.stopAnimation?.();
    };
  }, [navigation, progress, fadeOut]);

  // ---- 버스 곡선/스케일 ----
  const busTranslateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [MOON_SIZE * 1.60, 0],
  });
  const busTranslateX = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [MOON_SIZE * 0.14, 0, -MOON_SIZE * 0.05],
  });
  const busScale = progress.interpolate({
    inputRange: [0, 0.55, 1],
    outputRange: [3.4, 0.7, 0.34],
  });
  const busRotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['-4deg', '4deg'],
  });
  const busOpacity = progress.interpolate({
    inputRange: [0, 0.9, 1],
    outputRange: [1, 1, 0.9],
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeOut }]}>
      <Text style={styles.title}>DALMOVE</Text>

      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* 달: 효과 없이 "달만" */}
        <View style={[styles.moonWrap, { top: MOON_TOP }]}>
          <Image
            source={require('../assets/images/splash/moon.png')}
            style={styles.moonImage}
            resizeMode="contain"
          />
        </View>

        {/* 버스 */}
        <Animated.View
          style={[
            styles.busWrap,
            {
              top: MOON_CENTER_Y - BUS_BASE / 2,
              transform: [
                { translateY: busTranslateY },
                { translateX: busTranslateX },
                { rotate: busRotate },
                { scale: busScale },
              ],
              opacity: busOpacity,
            },
          ]}
        >
          <Image
            source={require('../assets/images/splash/bus.png')}
            style={styles.busImage}
            resizeMode="contain"
          />
          <View style={styles.busShadow} />
        </Animated.View>
      </View>

      <Pressable style={styles.skipArea} onPress={() => {
        if (didNav.current) return;
        didNav.current = true;
        navigation.replace('Home');
      }} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF', alignItems: 'center' },
  title: { position: 'absolute', top: TITLE_TOP, fontSize: 30, fontWeight: '800', letterSpacing: 1, color: '#111' },

  moonWrap: {
    position: 'absolute',
    left: (width - MOON_SIZE) / 2,
    width: MOON_SIZE, height: MOON_SIZE,
    alignItems: 'center', justifyContent: 'center',
  },
  moonImage: { width: MOON_SIZE, height: MOON_SIZE },

  busWrap: {
    position: 'absolute',
    left: (width - BUS_BASE) / 2,
    width: BUS_BASE, height: BUS_BASE,
    alignItems: 'center', justifyContent: 'center', zIndex: 2,
  },
  busImage: {
    width: BUS_BASE, height: BUS_BASE,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
    }),
  },
  busShadow: {
    position: 'absolute', bottom: -6,
    width: BUS_BASE * 0.36, height: BUS_BASE * 0.14,
    borderRadius: BUS_BASE, backgroundColor: 'rgba(0,0,0,0.12)', transform: [{ scaleX: 1.1 }],
  },
  skipArea: { position: 'absolute', inset: 0 },
});
