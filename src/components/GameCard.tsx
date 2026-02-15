import React, { useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';
import { GameMetadata } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import AnimatedButton from './AnimatedButton';
import { ThemeColors } from '../utils/themes';

interface Props {
  game: GameMetadata;
  onPress: () => void;
}

export default function GameCard({ game, onPress }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  return (
    <AnimatedButton style={styles.card} onPress={onPress}>
      <Text style={styles.icon}>{game.icon}</Text>
      <Text style={styles.name}>{game.name}</Text>
    </AnimatedButton>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    width: '31%', // 3 columns: approximately 33.33% minus gap
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    marginBottom: 12,
  },
  icon: {
    fontSize: 40,
    marginBottom: 8,
  },
  name: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
