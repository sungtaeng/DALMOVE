// App.js
import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, Button, StyleSheet, Alert, Modal, TextInput, TouchableOpacity } from 'react-native';
import AntDesign from 'react-native-vector-icons/AntDesign';

import DriverScreen from './DriverScreen';
import StudentScreen from './StudentScreen';
import AlarmScreen from './AlarmScreen';
import NoticeScreen from './NoticeScreen';
import SplashScreen from './components/SplashScreen'; // ✅ 추가

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const HomeScreen = ({ navigation }) => {
  const [showModal, setShowModal] = useState(false);
  const [password, setPassword] = useState('');
  const handleDriverAccess = () => {
    if (password === 'driver123') {
      setShowModal(false);
      setPassword('');
      navigation.navigate('Driver');
    } else {
      Alert.alert('❌ 비밀번호가 틀렸습니다');
    }
  };
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🛣 역할 선택</Text>
      <View style={styles.button}>
        <Button title="운전자 화면 이동" onPress={() => setShowModal(true)} />
      </View>
      <View style={styles.button}>
        <Button title="학생 화면 이동" onPress={() => navigation.navigate('StudentTabs')} />
      </View>
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>🔒 운전자 비밀번호 입력</Text>
            <TextInput
              style={styles.input}
              placeholder="비밀번호"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={handleDriverAccess} style={styles.confirmButton}>
                <Text style={styles.confirmText}>확인</Text>
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

const StudentTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ color, size }) => {
        let iconName;
        if (route.name === '홈') iconName = 'home';
        else if (route.name === '공지사항') iconName = 'bells';
        else if (route.name === '알람') iconName = 'notification';
        return <AntDesign name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#ff6347',
      tabBarInactiveTintColor: 'gray',
    })}
  >
    <Tab.Screen name="홈" component={StudentScreen} />
    <Tab.Screen name="공지사항" component={NoticeScreen} />
    <Tab.Screen name="알람" component={AlarmScreen} />
  </Tab.Navigator>
);

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Splash">
        {/* ✅ 스플래시 추가 */}
        <Stack.Screen
          name="Splash"
          component={SplashScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: '메인 화면' }} />
        <Stack.Screen name="Driver" component={DriverScreen} options={{ title: '운전자 화면' }} />
        <Stack.Screen name="StudentTabs" component={StudentTabs} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 30 },
  button: { marginVertical: 10, width: '70%' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { backgroundColor: '#fff', borderRadius: 10, width: '80%', padding: 20, alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, width: '100%', padding: 10, marginBottom: 15 },
  modalButtons: { flexDirection: 'row', gap: 10 },
  confirmButton: { backgroundColor: '#ff6347', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, marginRight: 10 },
  confirmText: { color: '#fff', fontWeight: 'bold' },
  cancelButton: { backgroundColor: '#ccc', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  cancelText: { color: '#333' },
});
