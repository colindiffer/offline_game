import React, { useEffect, useState, useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeColors } from '../utils/themes';
import { GameId, Difficulty } from '../types';
import { getHighScore, setHighScore } from '../utils/storage';
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

  useEffect(() => {
    loadScores();
  }, [gameId]);

  const handleClearScore = (diff: Difficulty) => {
    Alert.alert(
      'Clear Score',
      `Are you sure you want to clear the ${diff} high score?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await setHighScore(gameId, 0, diff);
            loadScores();
          }
        }
      ]
    );
  };

  const formatScore = (score: number | null): string => {
    if (score === null || score === 0) return 'None';
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
              <View>
                <Text style={styles.difficultyLabel}>{getDifficultyLabel(diff)}</Text>
                <Text style={[
                  styles.scoreValue,
                  scores[diff] === null && styles.noScore
                ]}>
                  {formatScore(scores[diff])}
                </Text>
              </View>
            </View>
            
            {scores[diff] !== null && scores[diff] !== 0 && (
              <TouchableOpacity 
                style={styles.clearMiniBtn} 
                onPress={() => handleClearScore(diff)}
              >
                <Text style={styles.clearText}>Clear</Text>
              </TouchableOpacity>
            )}
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
      maxHeight: 350,
      width: '100%',
    },
    scrollContent: {
      gap: spacing.md,
      paddingBottom: spacing.lg,
    },
    scoreRow: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
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
      gap: spacing.lg,
      flex: 1,
    },
    difficultyIcon: {
      fontSize: 32,
    },
    difficultyLabel: {
      ...typography.small,
      fontWeight: '900',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 1.5,
      marginBottom: 2,
    },
    scoreValue: {
      ...typography.heading,
      color: colors.text,
      fontSize: 28,
      fontWeight: '900',
    },
    noScore: {
      color: colors.textSecondary,
      ...typography.label,
      fontStyle: 'italic',
      fontSize: 16,
    },
    clearMiniBtn: {
      backgroundColor: '#ff7675',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radius.sm,
      marginLeft: 10,
    },
    clearText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '900',
      textTransform: 'uppercase',
    },
    closeButton: {
      backgroundColor: colors.primary,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
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
