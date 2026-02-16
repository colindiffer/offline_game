import { Platform, ViewStyle } from 'react-native';

// Spacing scale
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

// Border radius scale
export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
  capsule: 50,
} as const;

// Typography scale
export const typography = {
  display: {
    fontSize: 32,
    fontWeight: 'bold' as const,
    lineHeight: 40,
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    lineHeight: 32,
  },
  subheading: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyBold: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
  },
  small: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
} as const;

// Cross-platform shadow presets
type ShadowStyle = Pick<ViewStyle, 'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'>;

const createShadow = (
  offsetY: number,
  opacity: number,
  shadowRadius: number,
  elevation: number,
): ShadowStyle => {
  const base: ShadowStyle = {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: offsetY },
    shadowOpacity: opacity,
    shadowRadius: shadowRadius,
    elevation,
  };
  return base;
};

export const shadows = {
  none: createShadow(0, 0, 0, 0),
  sm: createShadow(1, 0.12, 2, 2),
  md: createShadow(2, 0.18, 4, 4),
  lg: createShadow(4, 0.22, 8, 8),
  xl: createShadow(6, 0.28, 12, 12),
} as const;

// Animation durations
export const duration = {
  fast: 150,
  normal: 250,
  slow: 400,
  overlay: 300,
} as const;

// Opacity values
export const opacity = {
  disabled: 0.4,
  pressed: 0.7,
  overlay: 0.85,
  subtle: 0.08,
  light: 0.15,
  medium: 0.3,
} as const;
