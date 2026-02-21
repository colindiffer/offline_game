import React, { useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeColors } from '../utils/themes';
import { spacing, radius, typography, shadows } from '../utils/designTokens';
import { useNavigation } from '@react-navigation/native';

interface Props {
  title?: string;
  score?: number;
  scoreLabel?: string;
  highScore?: number;
  highScoreLabel?: string;
  onPause?: () => void;
  isPaused?: boolean;
  light?: boolean;
}

export default function Header({
  title,
  score,
  scoreLabel = 'SCORE',
  highScore,
  highScoreLabel = 'BEST',
  onPause,
  isPaused,
  light = false,
}: Props) {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const styles = useMemo(() => getStyles(colors, light), [colors, light]);

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <TouchableOpacity
          style={styles.circleBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>

        {title ? (
          <Text style={styles.headerTitle}>{title}</Text>
        ) : (
          <View style={styles.statsContainer}>
            <View style={styles.statPill}>
              <Text style={styles.pillLabel}>{scoreLabel}</Text>
              <Text style={styles.pillValue}>{score !== undefined ? score : '0'}</Text>
            </View>

            {highScore !== undefined && (
              <View style={[styles.statPill, styles.bestPill]}>
                <Text style={[styles.pillLabel, { color: '#fab1a0' }]}>{highScoreLabel}</Text>
                <Text style={styles.pillValue}>{highScore}</Text>
              </View>
            )}
          </View>
        )}

        {onPause ? (
          <TouchableOpacity
            style={styles.circleBtn}
            onPress={onPause}
            activeOpacity={0.7}
          >
            <Text style={styles.pauseIcon}>{isPaused ? '▶' : '‖'}</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.circleBtn, { opacity: 0 }]} />
        )}
      </View>
      
      {title && (
        <View style={styles.bottomStatsRow}>
          <View style={styles.statsContainer}>
            <View style={styles.statPill}>
              <Text style={styles.pillLabel}>{scoreLabel}</Text>
              <Text style={styles.pillValue}>{score !== undefined ? score : '0'}</Text>
            </View>

            {highScore !== undefined && (
              <View style={[styles.statPill, styles.bestPill]}>
                <Text style={[styles.pillLabel, { color: '#fab1a0' }]}>{highScoreLabel}</Text>
                <Text style={styles.pillValue}>{highScore}</Text>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const getStyles = (colors: ThemeColors, light: boolean) =>
  StyleSheet.create({
    container: {
      paddingBottom: spacing.md,
      paddingHorizontal: spacing.md,
      marginTop: Platform.OS === 'ios' ? 4 : 16,
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: '900',
      color: light ? '#fff' : colors.text,
      letterSpacing: -0.5,
    },
    bottomStatsRow: {
      alignItems: 'center',
      marginTop: spacing.md,
    },
    circleBtn: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: light ? 'rgba(255,255,255,0.1)' : colors.card,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: light ? 'rgba(255,255,255,0.2)' : colors.border,
      ...shadows.sm,
    },
    backIcon: {
      fontSize: 32,
      color: light ? '#fff' : colors.text,
      marginTop: -4,
    },
    pauseIcon: {
      fontSize: 20,
      color: light ? '#fff' : colors.text,
      fontWeight: 'bold',
    },
    statsContainer: {
      flexDirection: 'row',
      backgroundColor: light ? 'rgba(0,0,0,0.3)' : colors.card,
      borderRadius: 25,
      padding: 4,
      borderWidth: 1,
      borderColor: light ? 'rgba(255,255,255,0.1)' : colors.border,
    },
    statPill: {
      paddingHorizontal: 16,
      paddingVertical: 6,
      alignItems: 'center',
      minWidth: 80,
    },
    bestPill: {
      borderLeftWidth: 1,
      borderLeftColor: light ? 'rgba(255,255,255,0.1)' : colors.border,
    },
    pillLabel: {
      color: light ? 'rgba(255,255,255,0.5)' : colors.textSecondary,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    pillValue: {
      color: light ? '#fff' : colors.text,
      fontSize: 18,
      fontWeight: '900',
    },
  });
