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
}

export default function Header({
  title,
  score,
  scoreLabel = 'SCORE',
  highScore,
  highScoreLabel = 'BEST',
  onPause,
  isPaused,
}: Props) {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const styles = useMemo(() => getStyles(colors), [colors]);

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

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      paddingBottom: spacing.md,
      paddingHorizontal: spacing.md,
      marginTop: Platform.OS === 'ios' ? 50 : 20,
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: '900',
      color: '#fff',
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
      backgroundColor: 'rgba(255,255,255,0.05)',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
      ...shadows.sm,
    },
    backIcon: {
      fontSize: 32,
      color: '#fff',
      marginTop: -4,
    },
    pauseIcon: {
      fontSize: 20,
      color: '#fff',
      fontWeight: 'bold',
    },
    statsContainer: {
      flexDirection: 'row',
      backgroundColor: 'rgba(0,0,0,0.3)',
      borderRadius: 25,
      padding: 4,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
    },
    statPill: {
      paddingHorizontal: 16,
      paddingVertical: 6,
      alignItems: 'center',
      minWidth: 80,
    },
    bestPill: {
      borderLeftWidth: 1,
      borderLeftColor: 'rgba(255,255,255,0.1)',
    },
    pillLabel: {
      color: 'rgba(255,255,255,0.5)',
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    pillValue: {
      color: '#fff',
      fontSize: 18,
      fontWeight: '900',
    },
  });
