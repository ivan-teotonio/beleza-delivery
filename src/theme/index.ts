import type { TextStyle } from 'react-native';

export const colors = {
  primary: '#6B2148',
  primaryDark: '#4C1633',
  primarySoft: '#F6E8EF',
  primaryBorder: '#D9A9C1',
  accent: '#C96F56',
  accentDark: '#8F3F32',
  accentSoft: '#FCEAE4',
  accentBorder: '#E6B7A8',
  bg: '#FFFCF8',
  surface: '#FFFFFF',
  surfaceAlt: '#FAF3EF',
  text: '#211A1E',
  textMuted: '#5C5258',
  textOnPrimary: '#FFFFFF',
  border: '#E6DCD7',
  borderStrong: '#B9A49D',
  success: '#166534',
  successBg: '#DCFCE7',
  successBorder: '#86EFAC',
  danger: '#9F1239',
  dangerBg: '#FFE4E6',
  dangerBorder: '#FDA4AF',
  warning: '#92400E',
  warningBg: '#FEF3C7',
  warningBorder: '#FCD34D',
  info: '#1E3A8A',
  infoBg: '#DBEAFE',
  infoBorder: '#93C5FD',
  overlay: 'rgba(22, 13, 18, 0.55)',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export type TypographyVariant =
  | 'display'
  | 'title'
  | 'subtitle'
  | 'body'
  | 'bodyStrong'
  | 'label'
  | 'caption'
  | 'button';

export const typography: Record<TypographyVariant, TextStyle> = {
  display: { fontSize: 30, lineHeight: 38, fontWeight: '800', color: colors.text },
  title: { fontSize: 24, lineHeight: 32, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 19, lineHeight: 26, fontWeight: '700', color: colors.text },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400', color: colors.text },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: '700', color: colors.text },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '700', color: colors.text },
  caption: { fontSize: 13, lineHeight: 19, fontWeight: '400', color: colors.textMuted },
  button: { fontSize: 16, lineHeight: 22, fontWeight: '700', color: colors.textOnPrimary },
};

export const shadow = {
  card: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  floating: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

export const minTouchTarget = 48;
