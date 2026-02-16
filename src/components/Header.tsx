import React, { useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeColors } from '../utils/themes';
import { spacing, radius, typography } from '../utils/designTokens';
import { useNavigation } from '@react-navigation/native';

interface Props {
  score?: number;
  scoreLabel?: string;
  highScore?: number;
  highScoreLabel?: string;
  onPause?: () => void;
  isPaused?: boolean;
}

export default function Header({
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

        <View style={styles.capsuleContainer}>
          <View style={styles.pill}>
            <View style={styles.pillLabelContainer}>
              <Text style={styles.pillLabel}>{scoreLabel}</Text>
            </View>
            <Text style={styles.pillValue}>{score !== undefined ? score : '0'}</Text>
          </View>

          {highScore !== undefined && (
            <View style={styles.pill}>
              <View style={[styles.pillLabelContainer, styles.highScoreLabelContainer]}>
                <Text style={styles.pillLabel}>{highScoreLabel}</Text>
              </View>
              <Text style={[styles.pillValue, styles.highScoreValue]}>{highScore}</Text>
            </View>
          )}
        </View>

        {onPause && (
          <TouchableOpacity
            style={styles.circleBtn}
            onPress={onPause}
            activeOpacity={0.7}
          >
            <Text style={styles.pauseIcon}>{isPaused ? '▶' : '‖'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      paddingBottom: spacing.md,
      marginTop: Platform.OS === 'ios' ? 44 : 20,
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    circleBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.border,
    },
    backIcon: {
      fontSize: 32,
      color: colors.textSecondary,
      marginTop: -4,
    },
    pauseIcon: {
      fontSize: 20,
      color: colors.textSecondary,
      fontWeight: 'bold',
    },
    capsuleContainer: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    pill: {
      backgroundColor: '#3d3d5c', // Dark capsule background
      borderRadius: radius.md,
      minWidth: 90,
      height: 52,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 8,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
      position: 'relative',
    },
    pillLabelContainer: {
      position: 'absolute',
      top: -10,
      backgroundColor: '#2b2b45',
      paddingHorizontal: 12,
      paddingVertical: 2,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
    },
    highScoreLabelContainer: {
      backgroundColor: colors.primary, // Using primary color for High Score badge
    },
    pillLabel: {
      color: '#fff',
      fontSize: 10,
      fontWeight: 'bold',
      letterSpacing: 0.5,
    },
    pillValue: {
      color: '#fff',
      fontSize: 20,
      fontWeight: 'bold',
    },
    highScoreValue: {
      color: '#fab1a0',
    },
  });
