export type ThemeId = 'dark' | 'light';

export interface ThemeColors {
  background: string;
  surface: string;
  card: string;
  text: string;
  textSecondary: string;
  primary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  primaryGradientEnd: string;
  surfaceGradientEnd: string;
  border: string;
  borderLight: string;
  overlayBackground: string;
  textOnPrimary: string;
  shadow: string;
}

export const DEFAULT_THEME: ThemeId = 'dark';

export const THEMES: Record<ThemeId, ThemeColors> = {
  dark: {
    background: '#1a1a2e',
    surface: '#16213e',
    card: '#0f3460',
    text: '#f5f5f5',
    textSecondary: '#b7b7c2',
    primary: '#e94560',
    accent: '#e94560',
    success: '#4ecca3',
    warning: '#f0a500',
    error: '#ff4d4d',
    primaryGradientEnd: '#ff6b81',
    surfaceGradientEnd: '#1c2d50',
    border: 'rgba(255, 255, 255, 0.08)',
    borderLight: 'rgba(255, 255, 255, 0.04)',
    overlayBackground: 'rgba(10, 10, 20, 0.92)',
    textOnPrimary: '#ffffff',
    shadow: '#c03850',
  },
  light: {
    background: '#f7f7fb',
    surface: '#ffffff',
    card: '#f0f1f7',
    text: '#1c1c28',
    textSecondary: '#60606d',
    primary: '#e94560',
    accent: '#e94560',
    success: '#2d9a6f',
    warning: '#d58f00',
    error: '#d72638',
    primaryGradientEnd: '#ff6b81',
    surfaceGradientEnd: '#f0f0f5',
    border: 'rgba(0, 0, 0, 0.08)',
    borderLight: 'rgba(0, 0, 0, 0.04)',
    overlayBackground: 'rgba(0, 0, 0, 0.88)',
    textOnPrimary: '#ffffff',
    shadow: '#c93a52',
  },
};
