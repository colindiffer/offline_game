import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_THEME, THEMES, ThemeColors, ThemeId } from '../utils/themes';

interface ThemeContextType {
  colors: ThemeColors;
  themeId: ThemeId;
  setTheme: (themeId: ThemeId) => void;
}

const STORAGE_KEY = '@theme_id';

export const ThemeContext = createContext<ThemeContextType | undefined>(
  undefined
);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [themeId, setThemeId] = useState<ThemeId>(DEFAULT_THEME);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored && stored in THEMES) {
          setThemeId(stored as ThemeId);
        }
      } catch (error) {
        console.error('Failed to load theme', error);
      }
    };
    loadTheme();
  }, []);

  const setTheme = useCallback(async (nextTheme: ThemeId) => {
    setThemeId(nextTheme);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, nextTheme);
    } catch (error) {
      console.error('Failed to save theme', error);
    }
  }, []);

  const value = useMemo(
    () => ({
      colors: THEMES[themeId],
      themeId,
      setTheme,
    }),
    [themeId, setTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
