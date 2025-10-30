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

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICON_MAP = {
  StudentMain: 'home',
  NoticeBoard: 'bells',
  AlarmCenter: 'notification',
};

const HomeScreen = ({ navigation }) => {
  const [showModal, setShowModal] = useState(false);
  const [password, setPassword] = useState('');
  const floatAnim = useRef(new Animated.Value(0)).current;

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
    <View style={styles.homeContainer}>
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
          <Text style={styles.highlightTitle}>오늘의 달빛 추천</Text>
          <Text style={styles.highlightSubtitle}>
            오늘의 달은 무슨 달입니다!
          </Text>
          <View style={styles.highlightRow}>
            <View>
              <Text style={styles.highlightMetric}>17:40</Text>
              <Text style={styles.highlightMetricLabel}>예상 도착</Text>
            </View>
            <View>
              <Text style={styles.highlightMetric}>8분</Text>
              <Text style={styles.highlightMetricLabel}>기다리면 만나요</Text>
            </View>
          </View>
        </View>

        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>달무브 꿀팁</Text>
          <Text style={styles.tipText}>
            정류장 대기 공유를 켜두면 함께 타는 친구들이 혼잡도를 미리 확인할 수 있어요.
          </Text>
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
    </View>
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
        name="StudentMain"
        component={StudentScreen}
        options={{ title: '학생', tabBarLabel: '학생' }}
      />
      <Tab.Screen
        name="NoticeBoard"
        component={NoticeScreen}
        options={{ title: '공지사항', tabBarLabel: '공지' }}
      />
      <Tab.Screen
        name="AlarmCenter"
        component={AlarmScreen}
        options={{ title: '알림', tabBarLabel: '알림' }}
      />
    </Tab.Navigator>
  );
};

export default function App() {
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
  homeContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 26,
    paddingTop: 48,
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
  highlightSubtitle: { marginTop: 8, color: COLORS.textMuted },
  highlightRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  highlightMetric: { fontSize: 24, fontWeight: '800', color: COLORS.primaryDark },
  highlightMetricLabel: { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },
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
