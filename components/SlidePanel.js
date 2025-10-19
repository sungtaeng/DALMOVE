// /components/SlidePanel.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Dimensions, Pressable, Image, TouchableOpacity, ScrollView,
} from 'react-native';
import SlidingUpPanel from 'rn-sliding-up-panel';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height, width } = Dimensions.get('window');

// 🔧 여기 두 값만 건드리면 크기/여유 조정 끝
const SCHEDULE_SCALE = 1.00;   // 운행표 이미지 크기 (작게 1.00 ~ 크게 1.40)
const BOTTOM_PAD_FACTOR = 0.09; // 스크롤 바닥 여유 (0.35~0.55 추천)

export default function SlidePanel({
  visible,
  station,
  onClose,
  eta,
  distance,
  arrivalTime,
  crowd = 0,
  arrivingSoon = false,
  nextEta = null,
  nextArrivalTime = null,
  nextBusId = null,
  onSwitchGiheung,
}) {
  const insets = useSafeAreaInsets();
  const panelRef = useRef();
  const [selectedTab, setSelectedTab] = useState('monfri');

  const imageMap = useMemo(
    () => ({
      monfri: require('../assets/images/mon_fri_schedule.png'),
      tuewedthu: require('../assets/images/tue_wed_thu_schedule.png'),
    }),
    []
  );

  const { scheduleSrc, aspect, schedHeight } = useMemo(() => {
    const src = imageMap[selectedTab];
    let a = 1;
    try {
      const meta = Image.resolveAssetSource(src);
      if (meta?.width && meta?.height) a = meta.width / meta.height;
    } catch {}
    const contentW = width - 36;    // paddingHorizontal 18 * 2
    const baseH = contentW / a;
    return { scheduleSrc: src, aspect: a, schedHeight: baseH * SCHEDULE_SCALE };
  }, [imageMap, selectedTab]);

  useEffect(() => {
    if (visible && panelRef.current) panelRef.current.show(height / 5);
  }, [visible]);

  if (!visible || !station) return null;

  const isGiheung = station?.id === 'station1' || station?.id === 'station7';
  const giheungActive = station?.id === 'station1' ? 'depart' : 'arrive';

  const fmtETA = (v) => {
    if (!v) return '계산 중...';
    if (typeof v === 'string' && v.includes('분')) return v;
    const m = Math.floor((parseFloat(v) || 0) * 60);
    return `${Math.floor(m / 60)}분 ${m % 60}초`;
  };

  const badgeColor = crowd === 0 ? '#43A047' : crowd <= 5 ? '#FBC02D' : '#E53935';

  return (
    <>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <SlidingUpPanel
        ref={panelRef}
        draggableRange={{ top: height, bottom: 0 }}
        showBackdrop={false}
        onBottomReached={onClose}
        friction={0.94}
      >
        <View style={styles.panel}>
          <View style={styles.handle} />

          <View style={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <ScrollView
              contentContainerStyle={{ paddingBottom: insets.bottom + Math.ceil(height * BOTTOM_PAD_FACTOR) }}
              showsVerticalScrollIndicator={false}
              bounces
            >
              {/* 타이틀 */}
              <View style={{ alignItems: 'center', marginBottom: 8 }}>
                <Text style={styles.title} numberOfLines={2}>{station.title}</Text>

                {/* 기흥역 출발/도착 세그먼트 */}
                {isGiheung && (
                  <View style={styles.segmentWrap}>
                    <TouchableOpacity
                      style={[styles.segmentBtn, giheungActive === 'depart' && styles.segmentActive]}
                      onPress={() => giheungActive !== 'depart' && onSwitchGiheung?.('station1')}
                    >
                      <Text style={[styles.segmentText, giheungActive === 'depart' && styles.segmentTextActive]}>
                        기흥역 출발
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.segmentBtn, giheungActive === 'arrive' && styles.segmentActive]}
                      onPress={() => giheungActive !== 'arrive' && onSwitchGiheung?.('station7')}
                    >
                      <Text style={[styles.segmentText, giheungActive === 'arrive' && styles.segmentTextActive]}>
                        기흥역 도착
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* 메트릭/배지 */}
              <View style={styles.metricsRow}>
                <View style={styles.metricPill}>
                  <Text style={styles.metricText}>
                    걸리는 시간: {fmtETA(eta)} · 거리: {distance ?? '?'} km
                  </Text>
                </View>
                <View style={[styles.badgePill, { backgroundColor: badgeColor }]}>
                  <Text style={styles.badgeText}>대기 {crowd}명</Text>
                </View>
                {arrivingSoon && (
                  <View style={[styles.badgePill, { backgroundColor: '#34C759' }]}>
                    <Text style={styles.badgeText}>곧 도착</Text>
                  </View>
                )}
              </View>

              <Text style={styles.arrivalText}>도착 예상 시간: {arrivalTime || '계산 중...'}</Text>

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

              {/* 운행표 */}
              <View style={styles.imageContainer}>
                <Image
                  source={scheduleSrc}
                  style={{ width: '100%', height: schedHeight, aspectRatio: aspect }}
                  resizeMode="contain"
                />
              </View>

              {/* 다음 버스(있을 때만) */}
              {(nextEta || nextArrivalTime) && (
                <View style={styles.nextWrap}>
                  <Text style={styles.nextTitle}>다음 버스</Text>
                  <Text style={styles.nextLine}>
                    {nextBusId ? `버스 ${nextBusId} ` : ''}약 {fmtETA(nextEta)} · 도착 {nextArrivalTime || '-'}
                  </Text>
                </View>
              )}
            </ScrollView>
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
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: 44, height: 5, borderRadius: 3,
    backgroundColor: '#ccc', marginTop: 10, marginBottom: 6,
  },
  content: { flex: 1, width: '100%', paddingHorizontal: 18 },

  title: { fontSize: 20, fontWeight: 'bold', color: '#111', textAlign: 'center', paddingHorizontal: 10 },

  // 기흥역 토글
  segmentWrap: { marginTop: 8, flexDirection: 'row', alignSelf: 'center', backgroundColor: '#F2F2F7', padding: 4, borderRadius: 12 },
  segmentBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, marginHorizontal: 2 },
  segmentActive: { backgroundColor: '#E5E5EA' },
  segmentText: { fontSize: 14, color: '#333', fontWeight: '600' },
  segmentTextActive: { color: '#111' },

  // 메트릭/배지
  metricsRow: { marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' },
  metricPill: {
    borderRadius: 12, paddingVertical: 6, paddingHorizontal: 12,
    backgroundColor: '#EFEFF4', marginHorizontal: 4, marginVertical: 4, maxWidth: width - 48,
  },
  metricText: { color: '#333', fontSize: 15, textAlign: 'center' },
  badgePill: { borderRadius: 12, paddingVertical: 6, paddingHorizontal: 10, marginHorizontal: 4, marginVertical: 4 },
  badgeText: { color: '#000', fontWeight: '700' },

  arrivalText: { marginTop: 6, fontSize: 15, color: '#555', textAlign: 'center' },

  // 요일 탭
  tabContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 14, marginBottom: 12 },
  tabButton: { paddingVertical: 10, paddingHorizontal: 16, marginHorizontal: 6, borderRadius: 20, backgroundColor: '#eee' },
  activeTab: { backgroundColor: '#ccc' },
  tabText: { color: 'black', fontWeight: 'bold', fontSize: 14 },

  // 운행표
  imageContainer: { width: '100%', alignItems: 'stretch', marginBottom: 16 },

  // 다음 버스
  nextWrap: { width: '100%', paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#F7F7F7', borderRadius: 12, marginBottom: 10 },
  nextTitle: { fontWeight: '800', marginBottom: 4, color: '#111' },
  nextLine:  { color: '#333' },
});
