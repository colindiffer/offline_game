import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Difficulty } from '../types';
import AnimatedButton from './AnimatedButton';
import { ThemeColors } from '../utils/themes';

interface Props {
  onSelect: (difficulty: Difficulty) => void;
  onShowTutorial: () => void;
  onShowHighScores: () => void;
  gameName: string;
}

const DIFFICULTIES: { key: Difficulty; label: string; emoji: string; desc: string }[] = [
  { key: 'easy', label: 'Easy', emoji: '🟢', desc: 'Relaxed pace, forgiving gameplay' },
  { key: 'medium', label: 'Medium', emoji: '🟡', desc: 'Balanced challenge' },
  { key: 'hard', label: 'Hard', emoji: '🔴', desc: 'Test your skills!' },
];

export default function DifficultyPicker({ onSelect, onShowTutorial, onShowHighScores, gameName }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{gameName}</Text>
      <Text style={styles.subtitle}>Choose Difficulty</Text>
      {DIFFICULTIES.map((d) => (
        <AnimatedButton
          key={d.key}
          style={styles.option}
          onPress={() => onSelect(d.key)}
        >
          <Text style={styles.emoji}>{d.emoji}</Text>
          <View style={styles.optionInfo}>
            <Text style={styles.label}>{d.label}</Text>
            <Text style={styles.desc}>{d.desc}</Text>
          </View>
        </AnimatedButton>
      ))}
      
      <View style={styles.bottomButtons}>
        <AnimatedButton
          style={styles.tutorialOption}
          onPress={onShowTutorial}
        >
          <Text style={styles.tutorialEmoji}>📖</Text>
          <View style={styles.optionInfo}>
            <Text style={styles.label}>How to Play</Text>
            <Text style={styles.desc}>Learn the rules</Text>
          </View>
        </AnimatedButton>

        <AnimatedButton
          style={styles.highScoresOption}
          onPress={onShowHighScores}
        >
          <Text style={styles.tutorialEmoji}>🏆</Text>
          <View style={styles.optionInfo}>
            <Text style={styles.label}>High Scores</Text>
            <Text style={styles.desc}>View your best</Text>
          </View>
        </AnimatedButton>
      </View>
    </View>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
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
  option: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  highScoresOption: {
    backgroundColor: colors.warning + '20',
    borderRadius: 14,
    padding: 16,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.warning,
  },
  tutorialEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
});
