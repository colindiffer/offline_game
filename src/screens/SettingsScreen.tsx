import React, { useState, useMemo } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useSound } from '../contexts/SoundContext';
import { clearAllHighScores } from '../utils/storage';
import { clearAllStats } from '../utils/stats';
import { THEMES, ThemeColors, ThemeId } from '../utils/themes';
import { spacing, radius, shadows, typography } from '../utils/designTokens';

const THEME_NAMES: Record<ThemeId, string> = {
  dark: 'Dark',
  light: 'Light',
  retro: 'Retro',
  ocean: 'Ocean',
};

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
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.heading}>Settings</Text>

      {/* Appearance Section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>APPEARANCE</Text>
        <View style={styles.sectionCard}>
          <Text style={styles.settingLabel}>Theme</Text>
          <View style={styles.themePicker}>
            {Object.keys(THEMES).map((key) => {
              const theme = THEMES[key as ThemeId];
              const isActive = themeId === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={styles.themeOption}
                  onPress={() => setTheme(key as ThemeId)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.themeSwatch,
                      { backgroundColor: theme.primary },
                      isActive && [styles.activeTheme, { borderColor: colors.text }],
                    ]}
                  >
                    {isActive && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={[styles.themeName, isActive && styles.themeNameActive]}>
                    {THEME_NAMES[key as ThemeId]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {/* Audio Section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>AUDIO</Text>
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.toggleRow}
            onPress={toggleMute}
            activeOpacity={0.7}
          >
            <Text style={styles.settingLabel}>Sound Effects</Text>
            <View style={[styles.toggleIndicator, isMuted && styles.toggleOff]}>
              <Text style={styles.toggleText}>{isMuted ? 'OFF' : 'ON'}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Data Section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>DATA</Text>
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.dangerButton}
            onPress={handleClearHighScores}
            activeOpacity={0.7}
          >
            <Text style={styles.dangerButtonText}>Clear All High Scores</Text>
          </TouchableOpacity>
          {clearedHighScores && <Text style={styles.success}>High scores cleared!</Text>}

          <TouchableOpacity
            style={[styles.dangerButton, styles.dangerButtonLast]}
            onPress={handleClearStats}
            activeOpacity={0.7}
          >
            <Text style={styles.dangerButtonText}>Clear All Game Statistics</Text>
          </TouchableOpacity>
          {clearedStats && <Text style={styles.success}>Game statistics cleared!</Text>}
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.versionPill}>
          <Text style={styles.version}>v1.0.0</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingTop: 40,
    paddingBottom: spacing.xxxl,
  },
  heading: {
    color: colors.text,
    ...typography.heading,
    fontSize: 28,
    marginBottom: spacing.xxl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    color: colors.textSecondary,
    ...typography.small,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  settingLabel: {
    color: colors.text,
    ...typography.bodyBold,
    marginBottom: spacing.md,
  },
  themePicker: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  themeOption: {
    alignItems: 'center',
  },
  themeSwatch: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  activeTheme: {
    borderWidth: 3,
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  themeName: {
    color: colors.textSecondary,
    ...typography.small,
    marginTop: spacing.sm,
  },
  themeNameActive: {
    color: colors.text,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleIndicator: {
    backgroundColor: colors.success,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  toggleOff: {
    backgroundColor: colors.textSecondary + '40',
  },
  toggleText: {
    color: colors.textOnPrimary,
    ...typography.small,
    fontWeight: '700',
  },
  dangerButton: {
    backgroundColor: colors.error + '15',
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.error + '30',
    marginBottom: spacing.md,
  },
  dangerButtonLast: {
    marginBottom: 0,
  },
  dangerButtonText: {
    color: colors.error,
    ...typography.bodyBold,
  },
  success: {
    color: colors.success,
    ...typography.label,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  versionPill: {
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  version: {
    color: colors.textSecondary,
    ...typography.caption,
  },
});
