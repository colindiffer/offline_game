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
  const translateY = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        delay: index * 40,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        friction: 9,
        tension: 50,
        delay: index * 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.animWrapper, { opacity, transform: [{ translateY }] }]}>
      <PremiumButton
        variant="secondary"
        height={130}
        depth={6}
        onPress={onPress}
        style={styles.cardWrapper}
      >
        <View style={styles.cardContent}>
          <LinearGradient
            colors={['rgba(255,255,255,0.05)', 'transparent']}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.iconBox, { backgroundColor: game.color + '15' }]}>
            <Text style={styles.icon}>{game.icon}</Text>
          </View>
          <Text style={styles.name} numberOfLines={1}>{game.name.toUpperCase()}</Text>
          <View style={[styles.indicator, { backgroundColor: game.color }]} />
        </View>
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
  cardContent: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  iconBox: {
    width: 70,
    height: 70,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    ...shadows.sm,
  },
  icon: { fontSize: 42 },
  name: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    left: '35%',
    right: '35%',
    height: 3,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    opacity: 0.6,
  },
});
