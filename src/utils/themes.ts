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
  },
};
