import React, { useState, useMemo } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useSound } from '../contexts/SoundContext';
import { clearAllHighScores } from '../utils/storage';
import { clearAllStats } from '../utils/stats';
import { THEMES, ThemeColors, ThemeId } from '../utils/themes';

export default function SettingsScreen() {
  const { colors, themeId, setTheme } = useTheme();
  const { isMuted, toggleMute } = useSound();
  const [clearedHighScores, setClearedHighScores] = useState(false);
  const [clearedStats, setClearedStats] = useState(false);
  const styles = useMemo(() => getStyles(colors), [colors]);

  const handleClearHighScores = () => {
    Alert.alert(
      'Clear All High Scores',
      'Are you sure? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearAllHighScores();
            setClearedHighScores(true);
          },
        },
      ]
    );
  };

  const handleClearStats = () => {
    Alert.alert(
      'Clear All Game Statistics',
      'Are you sure? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearAllStats();
            setClearedStats(true);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Settings</Text>

      <View style={styles.settingRow}>
        <Text style={styles.label}>Theme</Text>
        <View style={styles.themePicker}>
          {Object.keys(THEMES).map((key) => {
            const theme = THEMES[key as ThemeId];
            const isActive = themeId === key;
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.themeSwatch,
                  { backgroundColor: theme.primary },
                  isActive && styles.activeTheme,
                ]}
                onPress={() => setTheme(key as ThemeId)}
                activeOpacity={0.8}
              />
            );
          })}
        </View>
      </View>

      <View style={styles.settingRow}>
        <Text style={styles.label}>Sound Effects</Text>
        <TouchableOpacity style={styles.button} onPress={toggleMute} activeOpacity={0.7}>
          <Text style={styles.buttonText}>{isMuted ? 'Unmute Sound' : 'Mute Sound'}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleClearHighScores} activeOpacity={0.7}>
        <Text style={styles.buttonText}>Clear All High Scores</Text>
      </TouchableOpacity>
      {clearedHighScores && <Text style={styles.success}>High scores cleared!</Text>}

      <TouchableOpacity style={styles.button} onPress={handleClearStats} activeOpacity={0.7}>
        <Text style={styles.buttonText}>Clear All Game Statistics</Text>
      </TouchableOpacity>
      {clearedStats && <Text style={styles.success}>Game statistics cleared!</Text>}

      <View style={styles.footer}>
        <Text style={styles.version}>Offline Games v1.0.0</Text>
      </View>
    </View>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
    paddingTop: 40,
  },
  heading: {
    color: colors.text,
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 32,
  },
  settingRow: {
    marginBottom: 24,
  },
  label: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  themePicker: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
  },
  themeSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeTheme: {
    borderColor: colors.accent,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  success: {
    color: colors.success,
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  footer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 20,
  },
  version: {
    color: colors.textSecondary,
    fontSize: 13,
  },
});
