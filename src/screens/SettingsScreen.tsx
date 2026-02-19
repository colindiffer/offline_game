import React, { useState, useMemo, useEffect } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View, ScrollView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useSound } from '../contexts/SoundContext';
import { clearAllHighScores } from '../utils/storage';
import { clearAllStats } from '../utils/stats';
import { isHapticEnabled, setHapticEnabled, triggerHaptic } from '../utils/haptics';
import { THEMES, ThemeColors, ThemeId } from '../utils/themes';
import { spacing, radius, shadows, typography } from '../utils/designTokens';

const THEME_NAMES: Record<ThemeId, string> = {
  dark: 'Midnight',
  light: 'Arctic',
};

export default function SettingsScreen() {
  const { colors, themeId, setTheme } = useTheme();
  const { isMuted, toggleMute } = useSound();
  const [hapticEnabled, setHapticEnabledState] = useState(true);
  const [clearedHighScores, setClearedHighScores] = useState(false);
  const [clearedStats, setClearedStats] = useState(false);
  const styles = useMemo(() => getStyles(colors), [colors]);

  useEffect(() => {
    isHapticEnabled().then(setHapticEnabledState);
  }, []);

  const toggleHaptic = async () => {
    const newVal = !hapticEnabled;
    setHapticEnabledState(newVal);
    await setHapticEnabled(newVal);
    if (newVal) triggerHaptic('light');
  };

  const handleClearHighScores = () => {
    Alert.alert(
      'Clear All High Scores',
      'This will erase your personal records across all 24 games. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await clearAllHighScores();
            setClearedHighScores(true);
            setTimeout(() => setClearedHighScores(false), 3000);
          },
        },
      ]
    );
  };

  const handleClearStats = () => {
    Alert.alert(
      'Reset Statistics',
      'This will clear your play time and win/loss records. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await clearAllStats();
            setClearedStats(true);
            setTimeout(() => setClearedStats(false), 3000);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.background, colors.surface]} style={StyleSheet.absoluteFill} />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Settings</Text>

        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>APPEARANCE</Text>
          <View style={styles.card}>
            <Text style={styles.settingTitle}>Color Theme</Text>
            <Text style={styles.settingDesc}>Choose your favorite visual style</Text>
            
            <View style={styles.themeGrid}>
              {(Object.keys(THEMES) as ThemeId[]).map((id) => {
                const theme = THEMES[id];
                const isActive = themeId === id;
                return (
                  <TouchableOpacity
                    key={id}
                    style={styles.themeCard}
                    onPress={() => setTheme(id)}
                    activeOpacity={0.8}
                  >
                    <View style={[
                      styles.swatch, 
                      { backgroundColor: theme.surface },
                      isActive && { borderColor: colors.primary, borderWidth: 3 }
                    ]}>
                      <View style={[styles.swatchInner, { backgroundColor: theme.primary }]} />
                      {isActive && <View style={styles.activeIndicator}><Text style={styles.check}>✓</Text></View>}
                    </View>
                    <Text style={[styles.themeLabel, isActive && { color: colors.text }]}>{THEME_NAMES[id]}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PREFERENCES</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.row} onPress={toggleMute} activeOpacity={0.6}>
              <View>
                <Text style={styles.settingTitle}>Sound Effects</Text>
                <Text style={styles.settingDesc}>Enable/disable game audio</Text>
              </View>
              <View style={[styles.switch, !isMuted ? styles.switchOn : styles.switchOff]}>
                <View style={[styles.switchKnob, !isMuted ? styles.knobOn : styles.knobOff]} />
              </View>
            </TouchableOpacity>

            {Platform.OS !== 'web' && (
              <>
                <View style={styles.divider} />
                <TouchableOpacity style={styles.row} onPress={toggleHaptic} activeOpacity={0.6}>
                  <View>
                    <Text style={styles.settingTitle}>Haptic Feedback</Text>
                    <Text style={styles.settingDesc}>Feel every win and move</Text>
                  </View>
                  <View style={[styles.switch, hapticEnabled ? styles.switchOn : styles.switchOff]}>
                    <View style={[styles.switchKnob, hapticEnabled ? styles.knobOn : styles.knobOff]} />
                  </View>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Data Management Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>DATA MANAGEMENT</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.row} onPress={handleClearHighScores}>
              <View>
                <Text style={styles.settingTitle}>High Scores</Text>
                <Text style={styles.settingDesc}>Delete all saved records</Text>
              </View>
              <Text style={styles.actionText}>{clearedHighScores ? 'CLEARED' : 'RESET'}</Text>
            </TouchableOpacity>
            
            <View style={styles.divider} />
            
            <TouchableOpacity style={styles.row} onPress={handleClearStats}>
              <View>
                <Text style={styles.settingTitle}>Game Stats</Text>
                <Text style={styles.settingDesc}>Reset play time and history</Text>
              </View>
              <Text style={styles.actionText}>{clearedStats ? 'RESET' : 'RESET'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.versionText}>OFFLINE GAMES v1.2.0</Text>
          <Text style={styles.creditText}>A Premium Gaming Experience</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingTop: 20 },
  heading: { fontSize: 34, fontWeight: '900', color: colors.text, marginBottom: spacing.xl, letterSpacing: -0.5 },
  section: { marginBottom: spacing.xxl },
  sectionLabel: { fontSize: 12, fontWeight: '900', color: colors.textSecondary, letterSpacing: 1.5, marginBottom: spacing.sm, marginLeft: 4 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, ...shadows.md, borderWidth: 1, borderColor: colors.border },
  settingTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  settingDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.xl },
  themeCard: { width: '47%', alignItems: 'center' },
  swatch: { width: '100%', height: 80, borderRadius: radius.md, padding: 8, justifyContent: 'flex-end', borderWidth: 1, borderColor: colors.border, position: 'relative' },
  swatchInner: { width: 30, height: 30, borderRadius: 15, position: 'absolute', top: 10, right: 10 },
  activeIndicator: { position: 'absolute', bottom: -10, right: -5, backgroundColor: colors.primary, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', ...shadows.sm },
  check: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  themeLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginTop: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  switch: { width: 50, height: 28, borderRadius: 14, padding: 3 },
  switchOn: { backgroundColor: colors.success },
  switchOff: { backgroundColor: colors.textSecondary + '40' },
  switchKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', ...shadows.sm },
  knobOn: { alignSelf: 'flex-end' },
  knobOff: { alignSelf: 'flex-start' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.lg },
  actionText: { color: colors.error, fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  footer: { marginTop: spacing.xl, alignItems: 'center', opacity: 0.5 },
  versionText: { fontSize: 11, fontWeight: 'bold', color: colors.textSecondary },
  creditText: { fontSize: 10, color: colors.textSecondary, marginTop: 4 },
});
