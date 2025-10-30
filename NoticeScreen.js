import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { firestore } from './firebaseConfig';
import { COLORS, RADIUS, SHADOWS } from './config/theme';

const formatDate = (timestamp) => {
  if (!timestamp?.seconds) return '';
  const date = new Date(timestamp.seconds * 1000);
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
};

const relativeTime = (timestamp) => {
  if (!timestamp?.seconds) return '';
  const ms = timestamp.seconds * 1000;
  const diff = Date.now() - ms;
  if (diff < 60 * 60 * 1000) return `${Math.max(1, Math.floor(diff / (60 * 1000)))}분 전`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}시간 전`;
  return `${Math.floor(diff / (24 * 60 * 60 * 1000))}일 전`;
};

const NoticeScreen = () => {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(firestore, 'notices'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const result = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setNotices(result);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const latestNotice = useMemo(() => notices[0] || null, [notices]);
  const remainingNotices = useMemo(() => notices.slice(1), [notices]);

  const renderItem = ({ item }) => (
    <View style={styles.noticeCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.badge}>{item.category || '공지'}</Text>
        <Text style={styles.dateLabel}>{formatDate(item.date)}</Text>
      </View>
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardContent}>{item.content}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.cardMeta}>{relativeTime(item.date)}</Text>
        {item.link && (
          <TouchableOpacity onPress={() => Linking.openURL(item.link)} style={styles.linkButton}>
            <Text style={styles.linkText}>자세히 보기</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>달무브 소식</Text>
        <Text style={styles.subtitle}>
          노선 변경, 이벤트, 공지사항을 가장 빠르게 확인하세요!
        </Text>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loaderText}>소식을 불러오는 중입니다...</Text>
        </View>
      ) : (
        <>
          {latestNotice && (
            <View style={styles.featureCard}>
              <Text style={styles.featureBadge}>{latestNotice.category || '최신'}</Text>
              <Text style={styles.featureTitle}>{latestNotice.title}</Text>
              <Text style={styles.featureContent} numberOfLines={3}>
                {latestNotice.content}
              </Text>
              <Text style={styles.featureMeta}>
                {formatDate(latestNotice.date)} · {relativeTime(latestNotice.date)}
              </Text>
            </View>
          )}

          <FlatList
            data={remainingNotices}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              !latestNotice && (
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>아직 등록된 공지사항이 없습니다.</Text>
                </View>
              )
            }
            contentContainerStyle={{ paddingBottom: 32 }}
          />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  header: { marginBottom: 20 },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.text },
  subtitle: { marginTop: 6, color: COLORS.textMuted },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loaderText: { marginTop: 10, color: COLORS.textMuted },
  featureCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 20,
    marginBottom: 20,
    ...SHADOWS.card,
  },
  featureBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.badge,
    color: COLORS.primaryDark,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    fontWeight: '700',
    fontSize: 12,
  },
  featureTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginTop: 12 },
  featureContent: { marginTop: 10, color: COLORS.textMuted, lineHeight: 20 },
  featureMeta: { marginTop: 14, color: COLORS.textMuted, fontSize: 12 },
  noticeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#ffe7b4',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  badge: {
    backgroundColor: '#fff0c6',
    color: COLORS.primaryDark,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    fontSize: 11,
    fontWeight: '700',
  },
  dateLabel: { color: COLORS.textMuted, fontSize: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginTop: 4 },
  cardContent: { marginTop: 8, color: COLORS.textMuted, lineHeight: 18 },
  cardFooter: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardMeta: { color: COLORS.textMuted, fontSize: 12 },
  linkButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: '#fff0c6',
  },
  linkText: { color: COLORS.primaryDark, fontWeight: '700', fontSize: 12 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: COLORS.textMuted },
});

export default NoticeScreen;
