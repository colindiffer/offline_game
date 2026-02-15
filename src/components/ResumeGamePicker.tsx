import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Difficulty } from '../types';
import AnimatedButton from './AnimatedButton';
import { ThemeColors } from '../utils/themes';

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
        style={styles.resumeOption}
        onPress={onResume}
      >
        <Text style={styles.resumeEmoji}>▶️</Text>
        <View style={styles.optionInfo}>
          <Text style={styles.label}>Continue Game</Text>
          <Text style={styles.desc}>Resume where you left off</Text>
        </View>
      </AnimatedButton>

      <AnimatedButton
        style={styles.newGameOption}
        onPress={onNewGame}
      >
        <Text style={styles.emoji}>🔄</Text>
        <View style={styles.optionInfo}>
          <Text style={styles.label}>New Game</Text>
          <Text style={styles.desc}>Start fresh with new difficulty</Text>
        </View>
      </AnimatedButton>

      <View style={styles.bottomButtons}>
        <AnimatedButton
          style={styles.tutorialOption}
          onPress={onShowTutorial}
        >
          <Text style={styles.smallEmoji}>📖</Text>
          <Text style={styles.smallLabel}>How to Play</Text>
        </AnimatedButton>

        <AnimatedButton
          style={styles.highScoresOption}
          onPress={onShowHighScores}
        >
          <Text style={styles.smallEmoji}>🏆</Text>
          <Text style={styles.smallLabel}>High Scores</Text>
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
      padding: 32,
    },
    title: {
      color: colors.text,
      fontSize: 28,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 4,
    },
    subtitle: {
      color: colors.textSecondary,
      fontSize: 16,
      textAlign: 'center',
      marginBottom: 32,
    },
    resumeOption: {
      backgroundColor: colors.success + '30',
      borderRadius: 14,
      padding: 18,
      marginBottom: 14,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.success,
    },
    newGameOption: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 18,
      marginBottom: 14,
      flexDirection: 'row',
      alignItems: 'center',
    },
    resumeEmoji: {
      fontSize: 32,
      marginRight: 16,
    },
    emoji: {
      fontSize: 28,
      marginRight: 16,
    },
    optionInfo: {
      flex: 1,
    },
    label: {
      color: colors.text,
      fontSize: 18,
      fontWeight: 'bold',
    },
    desc: {
      color: colors.textSecondary,
      fontSize: 13,
      marginTop: 2,
    },
    bottomButtons: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 20,
    },
    tutorialOption: {
      backgroundColor: colors.primary + '20',
      borderRadius: 14,
      padding: 16,
      flex: 1,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.primary,
    },
    highScoresOption: {
      backgroundColor: colors.warning + '20',
      borderRadius: 14,
      padding: 16,
      flex: 1,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.warning,
    },
    smallEmoji: {
      fontSize: 24,
      marginBottom: 4,
    },
    smallLabel: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '600',
      textAlign: 'center',
    },
  });
