// firebaseConfig.js
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getDatabase,
  ref as rtdbRef,
  onValue as onDbValue,
  set,
  remove,
  update,
  onDisconnect,
  get,
} from "firebase/database";
import { getFirestore } from "firebase/firestore";

import { FIREBASE_CONFIG } from "./config/appConfig";

const firebaseConfig = {
  apiKey: FIREBASE_CONFIG.apiKey,
  authDomain: FIREBASE_CONFIG.authDomain,
  databaseURL: FIREBASE_CONFIG.databaseURL,
  projectId: FIREBASE_CONFIG.projectId,
  storageBucket: FIREBASE_CONFIG.storageBucket,
  messagingSenderId: FIREBASE_CONFIG.messagingSenderId,
  appId: FIREBASE_CONFIG.appId,
  measurementId: FIREBASE_CONFIG.measurementId,
};

// ✅ 앱 단일 초기화
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// ✅ 공용 인스턴스 (모든 곳에서 이걸 import 하도록)
export const db = getDatabase(app);
export const firestore = getFirestore(app);

// ✅ 디버깅용: 현재 연결된 RTDB URL (학생 화면/콘솔에서 확인)
export const rtdbURL = app?.options?.databaseURL || "";

// ===== RTDB presence (no-auth) =====
function getDeviceId() {
  if (!global.__deviceId) {
    global.__deviceId = Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
  return global.__deviceId;
}
const TTL_MS = 15 * 1000;

export async function setPresence(stopId, isWaiting) {
  const deviceId = getDeviceId();
  const ref = rtdbRef(db, `presence/${stopId}/clients/${deviceId}`);

  if (isWaiting) {
    try { onDisconnect(ref).remove(); } catch (e) {}
    await set(ref, { deviceId, status: "waiting", lastSeen: Date.now() });
  } else {
    try { await remove(ref); } finally {
      try { await onDisconnect(ref).cancel(); } catch (e) {}
    }
  }
}

export async function heartbeatPresenceRTDB(stopId) {
  const deviceId = getDeviceId();
  const ref = rtdbRef(db, `presence/${stopId}/clients/${deviceId}`);
  await update(ref, { lastSeen: Date.now() }).catch(() => {});
}

export function subscribeCrowdRTDB(stopId, cb) {
  const listRef = rtdbRef(db, `presence/${stopId}/clients`);
  return onDbValue(listRef, (snap) => {
    if (!snap.exists()) return cb(0);
    const now = Date.now();
    let count = 0;
    snap.forEach((child) => {
      const v = child.val() || {};
      if (v.status === "waiting" && now - (v.lastSeen || 0) < TTL_MS) count++;
    });
    cb(count);
  });
}

export async function fetchCrowdCountRTDB(stopId) {
  const listRef = rtdbRef(db, `presence/${stopId}/clients`);
  const snap = await get(listRef);
  if (!snap.exists()) return 0;
  const now = Date.now();
  let count = 0;
  snap.forEach((child) => {
    const v = child.val() || {};
    if (v.status === "waiting" && now - (v.lastSeen || 0) < TTL_MS) count++;
  });
  return count;
}
