export type ThemeId = 'dark' | 'light' | 'retro' | 'ocean';

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
  retro: {
    background: '#2b1e1e',
    surface: '#3b2c2c',
    card: '#4a3434',
    text: '#f9e4b7',
    textSecondary: '#d7b980',
    primary: '#f0a500',
    accent: '#f0a500',
    success: '#6cc070',
    warning: '#ffb703',
    error: '#e04f5f',
    primaryGradientEnd: '#ffc233',
    surfaceGradientEnd: '#463535',
    border: 'rgba(249, 228, 183, 0.08)',
    borderLight: 'rgba(249, 228, 183, 0.04)',
    overlayBackground: 'rgba(20, 14, 14, 0.92)',
    textOnPrimary: '#1c1008',
    shadow: '#c68400',
  },
  ocean: {
    background: '#0b1d2a',
    surface: '#102c3f',
    card: '#173a52',
    text: '#e8f4ff',
    textSecondary: '#b4c6d4',
    primary: '#2ec4b6',
    accent: '#2ec4b6',
    success: '#4ecca3',
    warning: '#ffd166',
    error: '#ef476f',
    primaryGradientEnd: '#5ee6d8',
    surfaceGradientEnd: '#163a50',
    border: 'rgba(232, 244, 255, 0.08)',
    borderLight: 'rgba(232, 244, 255, 0.04)',
    overlayBackground: 'rgba(5, 12, 18, 0.92)',
    textOnPrimary: '#ffffff',
    shadow: '#24a397',
  },
};
