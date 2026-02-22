import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Difficulty } from '../types';
import AnimatedButton from './AnimatedButton';
import { ThemeColors } from '../utils/themes';
import { spacing, radius, shadows, typography } from '../utils/designTokens';

interface Props {
  gameName: string;
  difficulty: Difficulty;
  onResume: () => void;
  onNewGame: () => void;
  onShowTutorial: () => void;
  onShowHighScores: () => void;
}

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy: '#4ecca3',
  medium: '#f0a500',
  hard: '#ff4d4d',
};

export default function ResumeGamePicker({
  gameName,
  difficulty,
  onResume,
  onNewGame,
  onShowTutorial,
  onShowHighScores,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const diffColor = DIFFICULTY_COLORS[difficulty];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{gameName}</Text>
      <View style={styles.subtitleRow}>
        <View style={[styles.diffDot, { backgroundColor: diffColor }]} />
        <Text style={styles.subtitle}>
          {DIFFICULTY_LABELS[difficulty]} Game in Progress
        </Text>
      </View>

      <AnimatedButton onPress={onResume} style={styles.optionContainer}>
        <View style={styles.option}>
          <View style={[styles.leftAccent, { backgroundColor: colors.success }]} />
          <View style={[styles.dotIcon, { backgroundColor: colors.success }]}>
            <Text style={styles.dotLabel}>▶</Text>
          </View>
          <View style={styles.optionInfo}>
            <Text style={styles.label}>Continue Game</Text>
            <Text style={styles.desc}>Resume where you left off</Text>
          </View>
        </View>
      </AnimatedButton>

      <AnimatedButton onPress={onNewGame} style={styles.optionContainer}>
        <View style={styles.option}>
          <View style={[styles.leftAccent, { backgroundColor: colors.primary }]} />
          <View style={[styles.dotIcon, { backgroundColor: colors.primary }]}>
            <Text style={styles.dotLabel}>↺</Text>
          </View>
          <View style={styles.optionInfo}>
            <Text style={styles.label}>New Game</Text>
            <Text style={styles.desc}>Start fresh with new difficulty</Text>
          </View>
        </View>
      </AnimatedButton>

      <AnimatedButton onPress={onShowTutorial} style={styles.optionContainer}>
        <View style={styles.option}>
          <View style={[styles.leftAccent, { backgroundColor: colors.primary }]} />
          <View style={[styles.dotIcon, { backgroundColor: colors.primary }]}>
            <Text style={styles.dotLabel}>?</Text>
          </View>
          <View style={styles.optionInfo}>
            <Text style={styles.label}>How to Play</Text>
            <Text style={styles.desc}>Learn the rules</Text>
          </View>
        </View>
      </AnimatedButton>

      <AnimatedButton onPress={onShowHighScores} style={styles.optionContainer}>
        <View style={styles.option}>
          <View style={[styles.leftAccent, { backgroundColor: colors.warning }]} />
          <View style={[styles.dotIcon, { backgroundColor: colors.warning }]}>
            <Text style={styles.dotLabel}>★</Text>
          </View>
          <View style={styles.optionInfo}>
            <Text style={styles.label}>High Scores</Text>
            <Text style={styles.desc}>View your best</Text>
          </View>
        </View>
      </AnimatedButton>
    </View>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      padding: spacing.xxl,
    },
    title: {
      color: colors.text,
      ...typography.heading,
      fontSize: 28,
      textAlign: 'center',
      marginBottom: spacing.xs,
    },
    subtitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      marginBottom: spacing.xxl,
    },
    diffDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    subtitle: {
      color: colors.textSecondary,
      ...typography.body,
    },
    optionContainer: {
      marginBottom: spacing.lg - 2,
      width: '100%',
      height: 90,
    },
    option: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      padding: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.sm,
      overflow: 'hidden',
      flex: 1,
    },
    leftAccent: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 4,
      borderTopLeftRadius: radius.lg,
      borderBottomLeftRadius: radius.lg,
    },
    dotIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      marginRight: spacing.lg,
      marginLeft: spacing.sm,
      justifyContent: 'center',
      alignItems: 'center',
    },
    dotLabel: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '900',
    },
    optionInfo: {
      flex: 1,
    },
    label: {
      color: colors.text,
      ...typography.bodyBold,
      fontSize: 18,
    },
    desc: {
      color: colors.textSecondary,
      ...typography.caption,
      marginTop: spacing.xxs,
    },
  });

interface Props {
  gameName: string;
  difficulty: Difficulty;
  onResume: () => void;
  onNewGame: () => void;
  onShowTutorial: () => void;
  onShowHighScores: () => void;
}

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

const DIFFICULTY_ICONS: Record<Difficulty, string> = {
  easy: '🟢',
  medium: '🟡',
  hard: '🔴',
};

export default function ResumeGamePicker({
  gameName,
  difficulty,
  onResume,
  onNewGame,
  onShowTutorial,
  onShowHighScores
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{gameName}</Text>
      <Text style={styles.subtitle}>
        {DIFFICULTY_ICONS[difficulty]} {DIFFICULTY_LABELS[difficulty]} Game in Progress
      </Text>

      <AnimatedButton
        onPress={onResume}
        style={styles.optionContainer}
      >
        <View style={styles.resumeOption}>
          <Text style={styles.resumeEmoji}>▶️</Text>
          <View style={styles.optionInfo}>
            <Text style={styles.label}>Continue Game</Text>
            <Text style={styles.desc}>Resume where you left off</Text>
          </View>
        </View>
      </AnimatedButton>

      <AnimatedButton
        onPress={onNewGame}
        style={styles.optionContainer}
      >
        <View style={styles.newGameOption}>
          <Text style={styles.emoji}>🔄</Text>
          <View style={styles.optionInfo}>
            <Text style={styles.label}>New Game</Text>
            <Text style={styles.desc}>Start fresh with new difficulty</Text>
          </View>
        </View>
      </AnimatedButton>

      <View style={styles.bottomButtons}>
        <AnimatedButton
          onPress={onShowTutorial}
          style={styles.bottomButtonContainer}
        >
          <View style={styles.tutorialOption}>
            <Text style={styles.smallEmoji}>📖</Text>
            <Text style={styles.smallLabel}>How to Play</Text>
          </View>
        </AnimatedButton>

        <AnimatedButton
          onPress={onShowHighScores}
          style={styles.bottomButtonContainer}
        >
          <View style={styles.highScoresOption}>
            <Text style={styles.smallEmoji}>🏆</Text>
            <Text style={styles.smallLabel}>High Scores</Text>
          </View>
        </AnimatedButton>
      </View>
    </View>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      padding: spacing.xxl,
    },
    title: {
      color: colors.text,
      ...typography.heading,
      fontSize: 28,
      textAlign: 'center',
      marginBottom: spacing.xs,
    },
    subtitle: {
      color: colors.textSecondary,
      ...typography.body,
      textAlign: 'center',
      marginBottom: spacing.xxl,
    },
    optionContainer: {
      marginBottom: spacing.lg - 2,
      width: '100%',
      height: 90,
    },
    resumeOption: {
      backgroundColor: colors.success + '15',
      borderRadius: radius.lg,
      padding: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.success,
      flex: 1,
    },
    newGameOption: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      padding: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      flex: 1,
    },
    resumeEmoji: {
      fontSize: 32,
      marginRight: spacing.lg,
    },
    emoji: {
      fontSize: 28,
      marginRight: spacing.lg,
    },
    optionInfo: {
      flex: 1,
    },
    label: {
      color: colors.text,
      ...typography.bodyBold,
      fontSize: 18,
    },
    desc: {
      color: colors.textSecondary,
      ...typography.caption,
      marginTop: spacing.xxs,
    },
    bottomButtons: {
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.xl,
      height: 80,
    },
    bottomButtonContainer: {
      flex: 1,
    },
    tutorialOption: {
      backgroundColor: colors.primary + '15',
      borderRadius: radius.lg,
      padding: spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.primary,
      flex: 1,
    },
    highScoresOption: {
      backgroundColor: colors.warning + '15',
      borderRadius: radius.lg,
      padding: spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.warning,
      flex: 1,
    },
    smallEmoji: {
      fontSize: 24,
      marginBottom: spacing.xxs,
    },
    smallLabel: {
      color: colors.text,
      ...typography.caption,
      fontWeight: '600',
      textAlign: 'center',
    },
  });
