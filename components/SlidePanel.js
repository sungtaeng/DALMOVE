import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable, Animated, Image, TouchableOpacity } from 'react-native';
import SlidingUpPanel from 'rn-sliding-up-panel';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height } = Dimensions.get('window');

export default function SlidePanel({ visible, station, onClose, eta, distance, arrivalTime, crowd = 0 }) {
  const panelRef = useRef();
  const animatedValue = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  const [isFullScreen, setIsFullScreen] = useState(false);
  const [selectedTab, setSelectedTab] = useState('monfri');

  useEffect(() => {
    if (visible && panelRef.current) {
      panelRef.current.show(height / 5);
    }
  }, [visible]);

  useEffect(() => {
    const listenerId = animatedValue.addListener(({ value }) => {
      const threshold = height * 0.8;
      setIsFullScreen(value >= threshold);
    });
    return () => {
      animatedValue.removeListener(listenerId);
    };
  }, []);

  if (!visible || !station) return null;

  const imageMap = {
    monfri: require('../assets/images/mon_fri_schedule.png'),
    tuewedthu: require('../assets/images/tue_wed_thu_schedule.png'),
  };

  const formatETA = (eta) => {
    if (!eta) return '계산 중...';
    const totalSeconds = parseFloat(eta) * 60;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.round(totalSeconds % 60);
    return `${minutes}분 ${seconds}초`;
  };

  const badgeColor = crowd === 0 ? '#43A047' : crowd <= 5 ? '#FBC02D' : '#E53935';

  return (
    <>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <SlidingUpPanel
        ref={panelRef}
        draggableRange={{ top: height, bottom: 0 }}
        animatedValue={animatedValue}
        showBackdrop={false}
        onBottomReached={onClose}
        friction={0.9}
      >
        <View style={styles.panel}>
          <View style={styles.handle} />
          <View style={[styles.content, isFullScreen ? { paddingTop: insets.top + 60 } : { marginTop: 30 }]}>
            {/* 헤더 */}
            <View style={{ alignItems: 'center', gap: 6 }}>
              <Text style={styles.title}>{station.title}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={styles.subtitle}>
                  걸리는 시간: {formatETA(eta)} / 거리: {distance || '?'} km
                </Text>
                {/* 혼잡도 배지 */}
                <View style={{ backgroundColor: badgeColor, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                  <Text style={{ color: '#000', fontWeight: '700' }}>대기 {crowd}명</Text>
                </View>
              </View>
              <Text style={styles.subtitle}>도착 예상 시간: {arrivalTime || '계산 중...'}</Text>
            </View>

            {/* 탭 */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                onPress={() => setSelectedTab('monfri')}
                style={[styles.tabButton, selectedTab === 'monfri' && styles.activeTab]}
              >
                <Text style={styles.tabText}>월요일 / 금요일</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setSelectedTab('tuewedthu')}
                style={[styles.tabButton, selectedTab === 'tuewedthu' && styles.activeTab]}
              >
                <Text style={styles.tabText}>화요일 ~ 목요일</Text>
              </TouchableOpacity>
            </View>

            {/* 이미지 */}
            <View style={styles.imageContainer}>
              <Image source={imageMap[selectedTab]} style={styles.image} resizeMode="contain" />
            </View>
          </View>
        </View>
      </SlidingUpPanel>
    </>
  );
}

const styles = StyleSheet.create({
  panel: {
    height,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: '#ccc',
    borderRadius: 3,
    marginTop: 12,
    marginBottom: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    alignSelf: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    alignSelf: 'center',
    marginBottom: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  tabButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 6,
    borderRadius: 20,
    backgroundColor: '#eee',
  },
  activeTab: {
    backgroundColor: '#ccc',
  },
  tabText: {
    color: 'black',
    fontWeight: 'bold',
    fontSize: 14,
  },
  content: {
    flexGrow: 1,
    width: '100%',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  imageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 20,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
});
