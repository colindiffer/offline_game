import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeColors } from '../utils/themes';

interface Props {
  title: string;
  score?: number;
  scoreLabel?: string;
  highScore?: number;
  highScoreLabel?: string;
}

export default function Header({
  title,
  score,
  scoreLabel = 'Score',
  highScore,
  highScoreLabel = 'Best',
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {score !== undefined && (
        <View style={styles.scores}>
          <Text style={styles.score}>
            {scoreLabel}: {score}
          </Text>
          {highScore !== undefined && (
            <Text style={styles.highScore}>
              {highScoreLabel}: {highScore}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: 'bold',
  },
  scores: {
    alignItems: 'flex-end',
  },
  score: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  highScore: {
    color: colors.warning,
    fontSize: 13,
    marginTop: 2,
  },
});
