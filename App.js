import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  TouchableOpacity,
  Animated,
  Image,
  ScrollView,
} from 'react-native';
import AntDesign from 'react-native-vector-icons/AntDesign';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import DriverScreen from './DriverScreen';
import StudentScreen from './StudentScreen';
import AlarmScreen from './AlarmScreen';
import NoticeScreen from './NoticeScreen';
import SplashScreen from './components/SplashScreen';
import { BRANDING, DRIVER_ACCESS_CODE } from './config/appConfig';
import { COLORS, IMAGES, RADIUS, SHADOWS } from './config/theme';
import { initNotifications } from './services/notificationService';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICON_MAP = {
  StudentMain: 'home',
  NoticeBoard: 'bells',
  AlarmCenter: 'notification',
};

const TRAVEL_MESSAGE_GROUPS = {
  morning: {
    heading: "🌅 Good Morning",
    cheer: [
      "🌞 오늘도 달무브처럼 부드럽게 출발하자!",
      "🚍 오늘은 네가 주인공이야, 멋진 하루 만들자!",
      "💫 달빛은 아직 잠들었지만, 넌 이미 반짝이고 있어.",
      "☕ 하루의 첫 여정, 달무브가 든든히 함께 달릴게.",
      "📚 오늘은 어제보다 한 걸음 더 성장하는 날!",
      "🌕 달빛이 사라져도 너의 빛은 꺼지지 않아. 파이팅!",
      "💪 오늘도 늦지 않게, 당당하게 달려보자!",
      "✨ 출발선에서부터 이미 멋진 하루야.",
    ],
    safety: [
      "🚸 버스가 완전히 멈춘 뒤에 천천히 올라타요.",
      "☀️ 길 건널 땐 휴대폰보다 신호등을 먼저 봐요!",
      "🚌 기사님과 눈 마주치면 더 안전하게 탈 수 있어요.",
      "🧢 이어폰 볼륨을 살짝 낮추면 주변이 잘 들려요.",
      "🌤️ 정류장에서 뛰지 말고 달무브를 기다려요.",
      "👟 가방 끈은 꽉! 마음은 여유롭게!",
      "📱 핸드폰 보다가 버스 놓치면 오늘의 시작이 늦어진다! 😉",
    ],
  },
  evening: {
    heading: "🌙 Good Bye",
    cheer: [
      "🌕 오늘도 수고했어, 달빛이 너를 집까지 데려다줄 거야.",
      "💛 하루의 끝, 이제는 달무브가 안전하게 마무리할게.",
      "💤 달빛이 네 어깨에 내려앉을 시간이야. 편히 쉬자.",
      "🚌 오늘의 피로는 버스에 맡기고, 달무브 타고 귀가~",
      "🌌 하루 종일 달려온 너, 이제 달빛 아래로 천천히.",
      "✨ 별보다 먼저 반짝이는 퇴근길, 수고 많았어!",
      "💫 하루의 끝도 아름답게 — 달무브가 함께 달려요.",
      "☁️ 오늘의 걱정은 모두 하차하세요 :)",
    ],
    safety: [
      "🚦 내릴 땐 꼭 뒤를 확인하고 천천히 하차해요.",
      "🦺 밤엔 어두우니까, 휴대폰 불빛을 켜 두면 좋아요.",
      "🌙 달무브 하차 시 친구와 함께 내리면 더 안전해요.",
      "📱 귀가 중엔 이어폰을 잠시 빼두세요 — 안전이 우선이에요.",
      "🛣️ 도로 근처에선 장난은 No! 별 보면서 걸어요.",
      "🚶 달무브가 멈춘 후, 기사님께 인사 잊지 말기 :)",
      "🌃 정류장에서 뛰면 별보다 빨리 넘어질 수 있어요 😅",
    ],
  },
};

const pickRandomLine = (list) => list[Math.floor(Math.random() * list.length)];

const HomeScreen = ({ navigation }) => {
  const [showModal, setShowModal] = useState(false);
  const [password, setPassword] = useState('');
  const floatAnim = useRef(new Animated.Value(0)).current;
  const [travelMode, setTravelMode] = useState('morning');
  const [cheerLine, setCheerLine] = useState(() =>
    pickRandomLine(TRAVEL_MESSAGE_GROUPS.morning.cheer)
  );
  const [safetyLine, setSafetyLine] = useState(() =>
    pickRandomLine(TRAVEL_MESSAGE_GROUPS.morning.safety)
  );

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2200, useNativeDriver: true }),
      ]),
    ).start();
  }, [floatAnim]);

  const busTranslateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -12],
  });

  useEffect(() => {
    const group = TRAVEL_MESSAGE_GROUPS[travelMode];
    setCheerLine(pickRandomLine(group.cheer));
    setSafetyLine(pickRandomLine(group.safety));
  }, [travelMode]);

  const handleDriverAccess = () => {
    if (!DRIVER_ACCESS_CODE) {
      Alert.alert('설정 필요', '운전자 접근 코드를 설정한 후 다시 시도해 주세요.');
      return;
    }
    if (password.trim() === DRIVER_ACCESS_CODE) {
      setShowModal(false);
      setPassword('');
      navigation.navigate('Driver');
    } else {
      Alert.alert('접근 제한', '비밀번호가 일치하지 않습니다.');
    }
  };

  return (
    <ScrollView
      style={styles.homeScroll}
      contentContainerStyle={styles.homeContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <Image source={IMAGES.moon} style={styles.moonArt} resizeMode="contain" />
        <Animated.Image
          source={IMAGES.bus}
          style={[styles.busArt, { transform: [{ translateY: busTranslateY }] }]}
          resizeMode="contain"
        />
        <Text style={styles.brandMark}>DALMOVE</Text>
        <Text style={styles.heroTitle}>{BRANDING.homeTitle}</Text>
        <Text style={styles.heroSubtitle}>
          달빛을 따라 달무브 버스의 위치, 도착 예정 시간, 혼잡도를 실시간으로 확인해 보세요.
        </Text>
      </View>

  <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('StudentTabs')}
        >
          <Text style={styles.primaryButtonText}>{BRANDING.studentButton}</Text>
          <Text style={styles.buttonCaption}>지도 · 도착 예정 시간 · 혼잡도 확인</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowModal(true)}>
          <Text style={styles.secondaryButtonText}>{BRANDING.driverButton}</Text>
          <Text style={styles.buttonCaptionDark}>위치 전송 · 운행 관리</Text>
        </TouchableOpacity>
  </View>

      <View style={styles.infoDeck}>
        <View style={styles.highlightCard}>
          <Text style={styles.highlightTitle}>오늘의 달빛 메시지</Text>
          <Text style={styles.highlightSubtitle}>
            {TRAVEL_MESSAGE_GROUPS[travelMode].heading}
          </Text>

          <View style={styles.modeToggleRow}>
            <TouchableOpacity
              style={[styles.modeButton, travelMode === 'morning' && styles.modeButtonActive]}
              onPress={() => setTravelMode('morning')}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  travelMode === 'morning' && styles.modeButtonTextActive,
                ]}
              >
                등교길
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, travelMode === 'evening' && styles.modeButtonActive]}
              onPress={() => setTravelMode('evening')}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  travelMode === 'evening' && styles.modeButtonTextActive,
                ]}
              >
                하교길
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.messageBlock}>
            <Text style={styles.messageLabel}>💬 응원 문구</Text>
            <Text style={styles.messageBody}>{cheerLine}</Text>
          </View>

          <View style={styles.messageBlock}>
            <Text style={styles.messageLabel}>🦺 안전 문구</Text>
            <Text style={styles.messageBody}>{safetyLine}</Text>
          </View>
        </View>

       
      </View>


      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>운전자 확인</Text>
            <Text style={styles.modalDescription}>
              운전자 전용 화면에 입장하려면 비밀번호를 입력해 주세요.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="비밀번호"
              placeholderTextColor="#b4b4be"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={handleDriverAccess} style={styles.confirmButton}>
                <Text style={styles.confirmText}>입장</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowModal(false)} style={styles.cancelButton}>
                <Text style={styles.cancelText}>취소</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const StudentTabs = () => {
  const screenOptions = useMemo(
    () => ({
      headerShown: false,
      tabBarActiveTintColor: COLORS.primaryDark,
      tabBarInactiveTintColor: '#a0a0a8',
      tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      tabBarStyle: {
        height: 66,
        paddingBottom: 8,
        paddingTop: 8,
        backgroundColor: COLORS.surface,
        borderTopWidth: 0.5,
        borderTopColor: COLORS.badge,
      },
    }),
    []
  );

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...screenOptions,
        tabBarIcon: ({ color, size }) => {
          const iconName = TAB_ICON_MAP[route.name] || 'questioncircleo';
          return <AntDesign name={iconName} size={size} color={color} />;
        },
      })}
    >
      
      <Tab.Screen
        name="NoticeBoard"
        component={NoticeScreen}
        options={{ title: '공지사항', tabBarLabel: '공지' }}
      />
      <Tab.Screen
        name="StudentMain"
        component={StudentScreen}
        options={{ title: '학생', tabBarLabel: '홈' }}
      />
      <Tab.Screen
        name="AlarmCenter"
        component={AlarmScreen}
        options={{ title: '알림', tabBarLabel: '알람' }}
      />
    </Tab.Navigator>
  );
};

export default function App() {
  useEffect(() => {
    initNotifications();
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Splash">
          <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false }} />
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Driver"
            component={DriverScreen}
            options={{
              title: '운전자 화면',
              headerStyle: { backgroundColor: COLORS.primary },
              headerTintColor: '#fff',
              headerTitleStyle: { fontWeight: '700' },
            }}
          />
          <Stack.Screen name="StudentTabs" component={StudentTabs} options={{ headerShown: false }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  homeScroll: { flex: 1, backgroundColor: COLORS.background },
  homeContainer: {
    paddingHorizontal: 26,
    paddingTop: 48,
    paddingBottom: 40,
    backgroundColor: COLORS.background,
  },
  hero: { marginTop: 12, marginBottom: 46, alignItems: 'flex-start' },
  brandMark: { fontSize: 16, fontWeight: '700', color: COLORS.primaryDark, letterSpacing: 4 },
  heroTitle: { fontSize: 30, fontWeight: '800', marginTop: 12, color: COLORS.text },
  heroSubtitle: { marginTop: 12, color: COLORS.textMuted, lineHeight: 21 },
  actions: { gap: 16 },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: 18,
    paddingHorizontal: 20,
    ...SHADOWS.card,
  },
  primaryButtonText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  buttonCaption: { color: '#fffdf6', marginTop: 6, fontSize: 12, fontWeight: '600' },
  secondaryButton: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1.2,
    borderColor: COLORS.badge,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  secondaryButtonText: { color: COLORS.primaryDark, fontSize: 18, fontWeight: '700' },
  buttonCaptionDark: { color: COLORS.textMuted, marginTop: 6, fontSize: 12, fontWeight: '600' },
  infoDeck: { marginTop: 28, gap: 14 },
  highlightCard: {
    backgroundColor: '#fff7d6',
    borderRadius: RADIUS.lg,
    padding: 20,
    ...SHADOWS.card,
  },
  highlightTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  highlightSubtitle: { marginTop: 8, color: COLORS.textMuted, lineHeight: 20 },
  highlightRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  highlightMetric: { fontSize: 24, fontWeight: '800', color: COLORS.primaryDark },
  highlightMetricLabel: { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },
  modeToggleRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    marginBottom: 4,
  },
  modeButton: {
    flex: 1,
    borderRadius: RADIUS.md,
    borderWidth: 1.2,
    borderColor: COLORS.badge,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fffdf0',
  },
  modeButtonActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  modeButtonText: { fontWeight: '700', color: COLORS.primaryDark },
  modeButtonTextActive: { color: '#fff' },
  messageBlock: {
    marginTop: 14,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 14,
    borderWidth: 1,
    borderColor: '#ffe6ba',
  },
  messageLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted, marginBottom: 6 },
  messageBody: { fontSize: 16, fontWeight: '600', color: COLORS.text, lineHeight: 20 },
  tipCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 18,
    borderWidth: 1.2,
    borderColor: '#ffe6a9',
  },
  tipTitle: { fontSize: 16, fontWeight: '700', color: COLORS.primaryDark, marginBottom: 6 },
  tipText: { color: COLORS.textMuted, lineHeight: 18 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    width: '82%',
    padding: 24,
    alignItems: 'stretch',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8, color: COLORS.text },
  modalDescription: { color: COLORS.textMuted, marginBottom: 18, lineHeight: 18 },
  input: {
    borderWidth: 1.2,
    borderColor: '#fde59d',
    borderRadius: RADIUS.md,
    width: '100%',
    padding: 14,
    marginBottom: 18,
    color: COLORS.text,
    fontSize: 16,
  },
  modalButtons: { flexDirection: 'row', gap: 12 },
  confirmButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  confirmText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f5f5fa',
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  cancelText: { color: '#4c4d57', fontWeight: '700', fontSize: 16 },
  moonArt: {
    position: 'absolute',
    right: -70,
    top: -60,
    width: 240,
    height: 240,
    opacity: 0.32,
  },
  busArt: {
    position: 'absolute',
    right: 20,
    top: 70,
    width: 140,
    height: 140,
    opacity: 0.95,
  },
});


