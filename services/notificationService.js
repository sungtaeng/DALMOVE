import {
  Platform,
  PermissionsAndroid,
  NativeModules,
  Vibration,
} from 'react-native';
import PushNotification, { Importance } from 'react-native-push-notification';

export const ALARM_CHANNEL_ID = 'dalmove-alarm-channel';

let configured = false;
const hasNativeModule = !!NativeModules.RNPushNotification;
const fallbackTimers = new Map();

export function initNotifications() {
  if (configured || !hasNativeModule) return;

  PushNotification.configure({
    onNotification: () => {},
    popInitialNotification: true,
    requestPermissions: Platform.OS === 'ios',
  });

  PushNotification.createChannel(
    {
      channelId: ALARM_CHANNEL_ID,
      channelName: '달무브 알람',
      channelDescription: '등하교 알람과 진동 채널',
      importance: Importance.HIGH,
      vibrate: true,
      vibration: 1200,
      playSound: false,
    },
    () => {}
  );

  configured = true;
}

export async function ensureNotificationPermission() {
  if (!hasNativeModule) return true;
  if (Platform.OS !== 'android') return true;
  if (Platform.Version < 33) return true;
  try {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

export function scheduleAlarmNotification({ fireDate, title, message }) {
  const id = `${Date.now()}`;
  if (!hasNativeModule) {
    const delay = Math.max(0, fireDate.getTime() - Date.now());
    const timer = setTimeout(() => {
      Vibration.vibrate([0, 600, 300, 600]);
      fallbackTimers.delete(id);
    }, delay);
    fallbackTimers.set(id, timer);
    return id;
  }
  PushNotification.localNotificationSchedule({
    id,
    channelId: ALARM_CHANNEL_ID,
    title,
    message,
    date: fireDate,
    allowWhileIdle: true,
    vibrate: true,
    vibration: 1200,
    playSound: false,
    priority: 'high',
    importance: Importance.HIGH,
    invokeApp: true,
  });
  return id;
}

export function cancelAlarmNotification(id) {
  if (!id) return;
  if (!hasNativeModule) {
    if (fallbackTimers.has(id)) {
      clearTimeout(fallbackTimers.get(id));
      fallbackTimers.delete(id);
    }
    return;
  }
  PushNotification.cancelLocalNotification(id);
}
