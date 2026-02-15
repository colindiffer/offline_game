import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeColors } from '../utils/themes';
import { GameId, Difficulty } from '../types';
import { getHighScore } from '../utils/storage';

interface Props {
  gameId: GameId;
  gameName: string;
  onClose: () => void;
}

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

export default function HighScoresScreen({ gameId, gameName, onClose }: Props) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [scores, setScores] = useState<Record<Difficulty, number | null>>({
    easy: null,
    medium: null,
    hard: null,
  });

  useEffect(() => {
    // Load high scores for all difficulties
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
    <View style={styles.container}>
      <View style={styles.content}>
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
      </View>
    </View>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      zIndex: 1000,
    },
    content: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 24,
      width: '100%',
      maxWidth: 400,
    },
    gameTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 24,
    },
    scrollView: {
      maxHeight: 300,
    },
    scrollContent: {
      gap: 16,
    },
    scoreRow: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    difficultyInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    difficultyIcon: {
      fontSize: 24,
    },
    difficultyLabel: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    scoreValue: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.warning,
    },
    noScore: {
      color: colors.textSecondary,
      fontSize: 14,
      fontStyle: 'italic',
    },
    closeButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 32,
      marginTop: 20,
      alignItems: 'center',
    },
    closeButtonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
  });
