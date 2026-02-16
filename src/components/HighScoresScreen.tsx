import React, { useEffect, useState, useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeColors } from '../utils/themes';
import { GameId, Difficulty } from '../types';
import { getHighScore } from '../utils/storage';
import { spacing, radius, shadows, typography } from '../utils/designTokens';
import ModalContainer from './ModalContainer';

interface Props {
  gameId: GameId;
  gameName: string;
  onClose: () => void;
}

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

export default function HighScoresScreen({ gameId, gameName, onClose }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const [scores, setScores] = useState<Record<Difficulty, number | null>>({
    easy: null,
    medium: null,
    hard: null,
  });

  useEffect(() => {
    const loadScores = async () => {
      const loadedScores: Record<Difficulty, number | null> = {
        easy: null,
        medium: null,
        hard: null,
      };

      for (const diff of DIFFICULTIES) {
        const score = await getHighScore(gameId, diff);
        loadedScores[diff] = score || null;
      }

      setScores(loadedScores);
    };

    loadScores();
  }, [gameId]);

  const formatScore = (score: number | null): string => {
    if (score === null || score === 0) return 'No score yet';
    return score.toString();
  };

  const getDifficultyIcon = (diff: Difficulty): string => {
    switch (diff) {
      case 'easy': return '🟢';
      case 'medium': return '🟡';
      case 'hard': return '🔴';
    }
  };

  const getDifficultyLabel = (diff: Difficulty): string => {
    return diff.charAt(0).toUpperCase() + diff.slice(1);
  };

  return (
    <ModalContainer onClose={onClose} maxWidth={400}>
      <Text style={styles.gameTitle}>{gameName}</Text>
      <Text style={styles.subtitle}>High Scores</Text>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {DIFFICULTIES.map((diff) => (
          <View key={diff} style={styles.scoreRow}>
            <View style={styles.difficultyInfo}>
              <Text style={styles.difficultyIcon}>{getDifficultyIcon(diff)}</Text>
              <Text style={styles.difficultyLabel}>{getDifficultyLabel(diff)}</Text>
            </View>
            <Text style={[
              styles.scoreValue,
              scores[diff] === null && styles.noScore
            ]}>
              {formatScore(scores[diff])}
            </Text>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={styles.closeButton}
        onPress={onClose}
        activeOpacity={0.7}
      >
        <Text style={styles.closeButtonText}>Close</Text>
      </TouchableOpacity>
    </ModalContainer>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    gameTitle: {
      ...typography.heading,
      color: colors.text,
      textAlign: 'center',
      marginBottom: spacing.xs,
    },
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: spacing.xl,
    },
    scrollView: {
      maxHeight: 300,
    },
    scrollContent: {
      gap: spacing.lg,
    },
    scoreRow: {
      backgroundColor: colors.card,
      borderRadius: radius.md,
      padding: spacing.lg,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.sm,
    },
    difficultyInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    difficultyIcon: {
      fontSize: 24,
    },
    difficultyLabel: {
      ...typography.bodyBold,
      fontSize: 18,
      color: colors.text,
    },
    scoreValue: {
      ...typography.subheading,
      color: colors.warning,
    },
    noScore: {
      color: colors.textSecondary,
      ...typography.label,
      fontStyle: 'italic',
    },
    closeButton: {
      backgroundColor: colors.primary,
      borderRadius: radius.md,
      paddingVertical: spacing.md + 2,
      paddingHorizontal: spacing.xxl,
      marginTop: spacing.xl,
      alignItems: 'center',
      ...shadows.sm,
    },
    closeButtonText: {
      color: colors.textOnPrimary,
      ...typography.bodyBold,
    },
  });
