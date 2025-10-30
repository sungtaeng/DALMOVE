// config/theme.js
// DALMOVE 색상/스타일 테마

export const COLORS = {
  background: '#fdf7e8',
  surface: '#ffffff',
  surfaceAlt: '#fff4cc',
  primary: '#ffb300',
  primaryDark: '#f39c00',
  accent: '#4c5cff',
  text: '#1f1f1f',
  textMuted: '#6d6d78',
  badge: '#ffe49e',
  success: '#68d391',
  danger: '#ff6b6b',
  shadow: 'rgba(0,0,0,0.12)',
};

export const RADIUS = {
  sm: 12,
  md: 18,
  lg: 26,
  pill: 999,
};

export const FONTS = {
  title: { fontFamily: 'System', fontWeight: '800' },
  subtitle: { fontFamily: 'System', fontWeight: '600' },
  body: { fontFamily: 'System', fontWeight: '500' },
};

export const SHADOWS = {
  card: {
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  floating: {
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
};

export const IMAGES = {
  moon: require('../assets/images/splash/moon.png'),
  bus: require('../assets/images/splash/bus.png'),
};
