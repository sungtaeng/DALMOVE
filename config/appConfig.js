// config/appConfig.js
// 중앙 집중식 앱 설정/비밀키 관리.
// 필요 시 config/appConfig.local.json 파일을 생성해 값 덮어쓰기.

const DEFAULT_CONFIG = {
  appName: 'DALMOVE',
  branding: {
    homeTitle: '모드 선택',
    driverButton: '운전자 화면 이동',
    studentButton: '학생 화면 이동',
  },
  auth: {
    driverAccessCode: 'driver123',
  },
  naver: {
    keyId: 'u6w3cppkl8',
    keySecret: '7kMTpyh0B2rScqRev2pwcwGYb9WZEJwT7qyv4GvN',
  },
  google: {
    geocodeKey: 'AIzaSyASr2mxhFez1B-Va5HbxsIE28fbZsPLRYI',
  },
  firebase: {
    apiKey: 'AIzaSyA85Se_AWfx7My1LRR43WhXhAZ7uxTVa4o',
    authDomain: 'test4-3168a.firebaseapp.com',
    databaseURL: 'https://test4-3168a-default-rtdb.asia-southeast1.firebasedatabase.app',
    projectId: 'test4-3168a',
    storageBucket: 'test4-3168a.firebasestorage.app',
    messagingSenderId: '1088639479082',
    appId: '1:1088639479082:web:ac4098d4b05c5553de8253',
    measurementId: 'G-8KVMZEC5JR',
  },
};

function loadLocalOverrides() {
  try {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    return require('./appConfig.local.json');
  } catch (err) {
    return {};
  }
}

function deepMerge(base, override) {
  if (!override || typeof override !== 'object') return { ...base };
  const result = { ...base };
  Object.keys(override).forEach((key) => {
    const overrideValue = override[key];
    if (
      overrideValue
      && typeof overrideValue === 'object'
      && !Array.isArray(overrideValue)
    ) {
      result[key] = deepMerge(base[key] || {}, overrideValue);
    } else if (overrideValue !== undefined) {
      result[key] = overrideValue;
    }
  });
  return result;
}

const APP_CONFIG = deepMerge(DEFAULT_CONFIG, loadLocalOverrides());

export const APP_NAME = APP_CONFIG.appName;
export const BRANDING = APP_CONFIG.branding;
export const DRIVER_ACCESS_CODE = APP_CONFIG.auth.driverAccessCode;
export const NAVER_CONFIG = APP_CONFIG.naver;
export const GOOGLE_CONFIG = APP_CONFIG.google;
export const FIREBASE_CONFIG = APP_CONFIG.firebase;

export default APP_CONFIG;
