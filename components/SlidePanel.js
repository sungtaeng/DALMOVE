// /components/SlidePanel.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  Image,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import SlidingUpPanel from 'rn-sliding-up-panel';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADIUS, SHADOWS, IMAGES } from '../config/theme';

const { height, width } = Dimensions.get('window');

const SCHEDULE_SCALE = 1.0;
const BOTTOM_PAD_FACTOR = 0.09;

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
  activeBusId = null,
}) {
  const insets = useSafeAreaInsets();
  const panelRef = useRef(null);
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
    let aspectRatio = 1;
    try {
      const meta = Image.resolveAssetSource(src);
      if (meta?.width && meta?.height) {
        aspectRatio = meta.width / meta.height;
      }
    } catch (err) {
      aspectRatio = 1;
    }
    const contentWidth = width - 36;
    const baseHeight = contentWidth / aspectRatio;
    return { scheduleSrc: src, aspect: aspectRatio, schedHeight: baseHeight * SCHEDULE_SCALE };
  }, [imageMap, selectedTab]);

  useEffect(() => {
    if (visible && panelRef.current) {
      panelRef.current.show(height / 5);
    }
  }, [visible]);

  if (!visible || !station) return null;

  const fmtETA = (value) => {
    if (!value) return '계산 중...';
    if (typeof value === 'string' && value.includes('분')) return value;
    const totalSeconds = Math.max(0, Math.round((parseFloat(value) || 0) * 60));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes === 0) return `${seconds}초`;
    if (seconds === 0) return `${minutes}분`;
    return `${minutes}분 ${seconds}초`;
  };

  const badgeColor = crowd === 0 ? '#ffe48a' : crowd <= 5 ? '#ffca6f' : '#ffa07f';

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
              contentContainerStyle={{
                paddingBottom: insets.bottom + Math.ceil(height * BOTTOM_PAD_FACTOR),
              }}
              showsVerticalScrollIndicator={false}
              bounces
            >
              <View style={styles.header}>
                <View style={styles.headerRow}>
                  <Text style={styles.title} numberOfLines={2}>
                    {station.title}
                  </Text>
                  <Image source={IMAGES.moon} style={styles.headerMoon} resizeMode="contain" />
                </View>
              </View>

              <View style={styles.metricsCard}>
                <View style={styles.metricPill}>
                  <Text style={styles.metricText}>
                    예상 소요시간: {fmtETA(eta)} · 거리: {distance ?? '?'} km
                  </Text>
                </View>
                <View style={styles.badgeRow}>
              
                  <View style={[styles.badgePill, { backgroundColor: badgeColor }]}>
                    <Text style={styles.badgeText}>대기 {crowd}명</Text>
                  </View>
                  {arrivingSoon && (
                    <View style={[styles.badgePill, styles.successBadge]}>
                      <Text style={styles.badgeText}>곧 도착</Text>
                    </View>
                  )}
                </View>
              </View>

              <Text style={styles.arrivalText}>도착 예정 시간: {arrivalTime || '계산 중...'}</Text>

              <View style={styles.tabContainer}>
                <TouchableOpacity
                  onPress={() => setSelectedTab('monfri')}
                  style={[styles.tabButton, selectedTab === 'monfri' && styles.activeTab]}
                >
                  <Text style={[styles.tabText, selectedTab === 'monfri' && styles.tabTextActive]}>
                    월 · 금
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setSelectedTab('tuewedthu')}
                  style={[styles.tabButton, selectedTab === 'tuewedthu' && styles.activeTab]}
                >
                  <Text style={[styles.tabText, selectedTab === 'tuewedthu' && styles.tabTextActive]}>
                    화 · 수 · 목
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.imageContainer}>
                <Image
                  source={scheduleSrc}
                  style={{ width: '100%', height: schedHeight, aspectRatio: aspect }}
                  resizeMode="contain"
                />
              </View>

              {(nextEta || nextArrivalTime) && (
                <View style={styles.nextWrap}>
                  <Text style={styles.nextTitle}>다음 버스</Text>
                  <Text style={styles.nextLine}>
                    {nextBusId ? `버스 ${nextBusId} · ` : ''}
                    {fmtETA(nextEta)} · 도착 {nextArrivalTime || '-'}
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
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: 52,
    height: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: '#ffe9a6',
    marginTop: 12,
    marginBottom: 12,
  },
  content: { flex: 1, width: '100%', paddingHorizontal: 18 },
  header: { alignItems: 'center', marginBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  headerMoon: { width: 38, height: 38, marginLeft: 8, opacity: 0.55 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text, textAlign: 'center', paddingHorizontal: 10 },
  metricsCard: {
    marginTop: 16,
    backgroundColor: '#fffaf0',
    borderRadius: RADIUS.lg,
    paddingVertical: 14,
    paddingHorizontal: 12,
    ...SHADOWS.floating,
  },
  metricPill: {
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#fff0ca',
    marginHorizontal: 4,
    marginVertical: 4,
    maxWidth: width - 48,
  },
  metricText: { color: COLORS.text, fontSize: 15, textAlign: 'center', fontWeight: '600' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  badgePill: {
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    marginVertical: 4,
  },
  primaryBadge: { backgroundColor: '#ffe6a8' },
  successBadge: { backgroundColor: '#dff7e5' },
  badgeText: { color: COLORS.text, fontWeight: '700' },
  arrivalText: { marginTop: 18, fontSize: 16, color: COLORS.textMuted, textAlign: 'center', fontWeight: '600' },
  tabContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20, marginBottom: 18 },
  tabButton: { paddingVertical: 11, paddingHorizontal: 20, marginHorizontal: 6, borderRadius: 24, backgroundColor: '#f1f2f8' },
  activeTab: { backgroundColor: COLORS.primary },
  tabText: { color: '#3b3b45', fontWeight: '700', fontSize: 14 },
  tabTextActive: { color: '#ffffff' },
  imageContainer: { width: '100%', alignItems: 'stretch', marginBottom: 16, borderRadius: RADIUS.md, overflow: 'hidden' },
  nextWrap: {
    width: '100%',
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  nextTitle: { fontWeight: '800', marginBottom: 6, color: COLORS.text },
  nextLine: { color: COLORS.textMuted, fontWeight: '600' },
});
