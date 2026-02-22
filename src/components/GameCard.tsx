import React, { useEffect, useRef, useMemo } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GameMetadata } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import PremiumButton from './PremiumButton';
import DominoTile from './DominoTile';
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

  const renderIcon = () => {
    if (game.id === 'dominoes') {
      return (
        <View style={styles.customIconContainer}>
          <DominoTile
            sideA={6}
            sideB={6}
            style={styles.gameCardDomino}
            pointerEvents="none"
          />
        </View>
      );
    }

    if (game.id === '2048') {
      return (
        <View style={styles.tile2048}>
          <Text style={styles.tileText2048}>2048</Text>
        </View>
      );
    }

    if (game.id === 'brick-breaker') {
      return (
        <View style={styles.bbContainer}>
          <View style={styles.bbBricksRow}>
            <View style={[styles.bbBrick, { backgroundColor: '#ff7675' }]} />
            <View style={[styles.bbBrick, { backgroundColor: '#fdcb6e' }]} />
            <View style={[styles.bbBrick, { backgroundColor: '#55efc4' }]} />
          </View>
          <View style={styles.bbBricksRow}>
            <View style={[styles.bbBrick, { backgroundColor: '#74b9ff' }]} />
            <View style={[styles.bbBrick, { backgroundColor: '#a29bfe' }]} />
            <View style={[styles.bbBrick, { backgroundColor: '#ff7675' }]} />
          </View>
          <View style={styles.bbBall} />
          <View style={styles.bbPaddle} />
        </View>
      );
    }

    return <Text style={styles.icon}>{game.icon}</Text>;
  };

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
  icon: {
    fontSize: 60,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 8 },
    textShadowRadius: 10,
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : undefined,
  },
  customIconContainer: {
    transform: [{ rotate: '-15deg' }],
    ...shadows.lg,
  },
  gameCardDomino: {
    transform: [{ scale: 0.8 }],
  },
  tile2048: {
    width: 70,
    height: 70,
    backgroundColor: '#edc22e', // Classic 2048 gold
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    ...shadows.md,
  },
  tileText2048: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  bbContainer: {
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 72,
    width: 90,
    paddingVertical: 2,
  },
  bbBricksRow: {
    flexDirection: 'row',
    gap: 4,
  },
  bbBrick: {
    width: 22,
    height: 9,
    borderRadius: 2,
  },
  bbBall: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#fff',
    position: 'absolute',
    bottom: 20,
    left: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  bbPaddle: {
    width: 70,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
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
