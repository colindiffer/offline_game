import React, { useEffect, useRef, useMemo } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Difficulty } from '../types';
import AnimatedButton from './AnimatedButton';
import { ThemeColors } from '../utils/themes';
import { spacing, radius, shadows, typography } from '../utils/designTokens';

interface Props {
  onSelect: (difficulty: Difficulty) => void;
  onShowTutorial: () => void;
  onShowHighScores: () => void;
  gameName: string;
}

const DIFFICULTIES: { key: Difficulty; label: string; emoji: string; desc: string; accentColor: string }[] = [
  { key: 'easy', label: 'Easy', emoji: '🟢', desc: 'Relaxed pace, forgiving gameplay', accentColor: '#4ecca3' },
  { key: 'medium', label: 'Medium', emoji: '🟡', desc: 'Balanced challenge', accentColor: '#f0a500' },
  { key: 'hard', label: 'Hard', emoji: '🔴', desc: 'Test your skills!', accentColor: '#ff4d4d' },
];

export default function DifficultyPicker({ onSelect, onShowTutorial, onShowHighScores, gameName }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const anims = useRef(
    Array.from({ length: 5 }, () => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(20),
    }))
  ).current;

  useEffect(() => {
    const animations = anims.map((a, i) =>
      Animated.parallel([
        Animated.timing(a.opacity, {
          toValue: 1,
          duration: 300,
          delay: i * 50,
          useNativeDriver: true,
        }),
        Animated.spring(a.translateY, {
          toValue: 0,
          friction: 8,
          tension: 65,
          delay: i * 50,
          useNativeDriver: true,
        }),
      ])
    );
    Animated.parallel(animations).start();
  }, [anims]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{gameName}</Text>
      <Text style={styles.subtitle}>Choose Difficulty</Text>
      {DIFFICULTIES.map((d, i) => (
        <Animated.View
          key={d.key}
          style={{
            opacity: anims[i].opacity,
            transform: [{ translateY: anims[i].translateY }],
          }}
        >
          <AnimatedButton
            onPress={() => onSelect(d.key)}
            style={styles.optionContainer}
          >
            <View style={[styles.option, { borderColor: colors.border }]}>
              <View style={[styles.leftAccent, { backgroundColor: d.accentColor }]} />
              <Text style={styles.emoji}>{d.emoji}</Text>
              <View style={styles.optionInfo}>
                <Text style={styles.label}>{d.label}</Text>
                <Text style={styles.desc}>{d.desc}</Text>
              </View>
            </View>
          </AnimatedButton>
        </Animated.View>
      ))}

      <Animated.View
        style={[
          styles.bottomButtons,
          {
            opacity: anims[3].opacity,
            transform: [{ translateY: anims[3].translateY }],
          },
        ]}
      >
        <AnimatedButton
          onPress={onShowTutorial}
          style={styles.bottomButtonContainer}
        >
          <View style={styles.tutorialOption}>
            <Text style={styles.tutorialEmoji}>📖</Text>
            <View style={styles.optionInfo}>
              <Text style={styles.label}>How to Play</Text>
              <Text style={styles.desc}>Learn the rules</Text>
            </View>
          </View>
        </AnimatedButton>

        <AnimatedButton
          onPress={onShowHighScores}
          style={styles.bottomButtonContainer}
        >
          <View style={styles.highScoresOption}>
            <Text style={styles.tutorialEmoji}>🏆</Text>
            <View style={styles.optionInfo}>
              <Text style={styles.label}>High Scores</Text>
              <Text style={styles.desc}>View your best</Text>
            </View>
          </View>
        </AnimatedButton>
      </Animated.View>
    </View>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
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
  emoji: {
    fontSize: 28,
    marginRight: spacing.lg,
    marginLeft: spacing.sm,
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
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    flex: 1,
  },
  highScoresOption: {
    backgroundColor: colors.warning + '15',
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.warning,
    flex: 1,
  },
  tutorialEmoji: {
    fontSize: 24,
    marginRight: spacing.md,
  },
});
