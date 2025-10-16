import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable, Animated, Image, TouchableOpacity } from 'react-native';
import SlidingUpPanel from 'rn-sliding-up-panel';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height } = Dimensions.get('window');

export default function SlidePanel({
  visible,
  station,
  onClose,
  eta,
  distance,
  arrivalTime,
  crowd = 0,
  onSwitchGiheung, // ✅ 추가: 기흥역 출발/도착 전환 콜백
}) {
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

  // ✅ 기흥역인지 판단 (station1: 출발 / station7: 도착)
  const isGiheung = station?.id === 'station1' || station?.id === 'station7';
  const giheungActive = station?.id === 'station1' ? 'depart' : 'arrive';

  const imageMap = {
    monfri: require('../assets/images/mon_fri_schedule.png'),
    tuewedthu: require('../assets/images/tue_wed_thu_schedule.png'),
  };

  const formatETA = (val) => {
    if (!val) return '계산 중...';
    // 부모에서 분 단위 문자열 "12.3"을 넘기는 경우와 "12분 30초" 모두 대응
    if (typeof val === 'string' && val.includes('분')) return val;
    const totalMin = parseFloat(val) || 0;
    const totalSeconds = Math.round(totalMin * 60);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
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
            <View style={{ alignItems: 'center', gap: 8 }}>
              <Text style={styles.title}>{station.title}</Text>

              {/* ✅ 기흥역 출발/도착 세그먼트 */}
              {isGiheung && (
                <View style={styles.segmentWrap}>
                  <TouchableOpacity
                    style={[styles.segmentBtn, giheungActive === 'depart' && styles.segmentActive]}
                    onPress={() => {
                      if (giheungActive !== 'depart' && onSwitchGiheung) onSwitchGiheung('station1');
                    }}
                  >
                    <Text style={[styles.segmentText, giheungActive === 'depart' && styles.segmentTextActive]}>
                      기흥역 출발
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.segmentBtn, giheungActive === 'arrive' && styles.segmentActive]}
                    onPress={() => {
                      if (giheungActive !== 'arrive' && onSwitchGiheung) onSwitchGiheung('station7');
                    }}
                  >
                    <Text style={[styles.segmentText, giheungActive === 'arrive' && styles.segmentTextActive]}>
                      기흥역 도착
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={styles.subtitle}>
                  걸리는 시간: {formatETA(eta)} / 거리: {distance ?? '?'} km
                </Text>
                <View style={{ backgroundColor: badgeColor, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                  <Text style={{ color: '#000', fontWeight: '700' }}>대기 {crowd}명</Text>
                </View>
              </View>
              <Text style={styles.subtitle}>도착 예상 시간: {arrivalTime || '계산 중...'}</Text>
            </View>

            {/* 요일 탭 */}
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
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    alignSelf: 'center',
    marginBottom: 6,
  },

  // ✅ 기흥역 세그먼트
  segmentWrap: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    padding: 4,
    borderRadius: 12,
    gap: 6,
    marginTop: 6,
  },
  segmentBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  segmentActive: {
    backgroundColor: '#E5E5EA',
  },
  segmentText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#111',
  },

  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 14,
    marginBottom: 16,
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
  },
});
