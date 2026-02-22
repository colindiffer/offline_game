import React, { useEffect, useRef, useMemo } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GameMetadata } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import PremiumButton from './PremiumButton';
import GameIcon from './GameIcon';
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

  const renderIcon = () => <GameIcon gameId={game.id} />;

  return (
    <Animated.View style={[styles.animWrapper, { opacity, transform: [{ translateY }] }]}>
      <View style={styles.shadowContainer}>
        <PremiumButton
          variant="secondary"
          height={140}
          depth={6}
          onPress={onPress}
          style={styles.cardWrapper}
          contentStyle={[styles.cardContent, { backgroundColor: game.color }]}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.2)', 'transparent', 'rgba(0,0,0,0.2)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.innerGlow} />
          
          <View style={styles.iconContainer}>
            {renderIcon()}
          </View>
          
          <View style={styles.labelContainer}>
            <Text style={styles.name} numberOfLines={1}>{game.name.toUpperCase()}</Text>
          </View>
        </PremiumButton>
      </View>
    </Animated.View>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  animWrapper: {
    width: '48%',
    marginBottom: spacing.lg,
  },
  shadowContainer: {
    ...shadows.lg,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  cardWrapper: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
  },
  cardContent: {
    paddingHorizontal: 0,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xl,
  },
  innerGlow: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    bottom: 2,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 22,
  },
  iconContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    overflow: 'hidden',
    paddingBottom: 4,
  },
  labelContainer: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
