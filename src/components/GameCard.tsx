import React, { useEffect, useRef, useMemo } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GameMetadata } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import PremiumButton from './PremiumButton';
import { ThemeColors } from '../utils/themes';
import { spacing, radius, shadows, typography } from '../utils/designTokens';

interface Props {
  game: GameMetadata;
  onPress: () => void;
  index?: number;
}

export default function GameCard({ game, onPress, index = 0 }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        delay: index * 30,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        friction: 8,
        tension: 65,
        delay: index * 30,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.animWrapper, { opacity, transform: [{ translateY }] }]}>
      <PremiumButton
        variant="secondary"
        height={110}
        depth={6}
        onPress={onPress}
        style={styles.cardWrapper}
      >
        <LinearGradient
          colors={[colors.card, colors.surface]}
          style={styles.cardInner}
        >
          <View style={[styles.iconContainer, { backgroundColor: game.color + '20' }]}>
            <Text style={styles.icon}>{game.icon}</Text>
          </View>
          <Text style={styles.name}>{game.name.toUpperCase()}</Text>
        </LinearGradient>
      </PremiumButton>
    </Animated.View>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  animWrapper: {
    width: '31%',
    marginBottom: spacing.lg,
  },
  cardWrapper: {
    width: '100%',
  },
  cardInner: {
    flex: 1,
    width: '100%',
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  iconContainer: {
    width: 54,
    height: 54,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  icon: {
    fontSize: 28,
  },
  name: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
