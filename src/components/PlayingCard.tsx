import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from '../types/cards';
import { getSuitSymbol, getSuitColor } from '../utils/cardUtils';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeColors } from '../utils/themes';
import { radius, shadows, spacing } from '../utils/designTokens';

interface Props {
  card: Card | null;
  faceDown?: boolean;
  size?: 'small' | 'medium' | 'large';
  style?: any;
  width?: number;
  height?: number;
  pointerEvents?: 'auto' | 'none' | 'box-none' | 'box-only';
}

const CARD_SIZES = {
  small: { width: 40, height: 60, fontSize: 16 },
  medium: { width: 60, height: 90, fontSize: 24 },
  large: { width: 80, height: 120, fontSize: 32 },
};

export default function PlayingCard({ card, faceDown = false, size = 'medium', style, width, height, pointerEvents }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const cardSize = {
    width: width || CARD_SIZES[size].width,
    height: height || CARD_SIZES[size].height,
    fontSize: (width ? width * 0.5 : CARD_SIZES[size].fontSize),
  };

  if (!card) {
    return (
      <View
        pointerEvents={pointerEvents}
        style={[
          styles.card,
          styles.emptyCard,
          { width: cardSize.width, height: cardSize.height },
          style,
        ]}
      />
    );
  }

  if (faceDown) {
    return (
      <View
        pointerEvents={pointerEvents}
        style={[
          styles.card,
          styles.cardBack,
          { width: cardSize.width, height: cardSize.height },
          style,
        ]}
      >
        <LinearGradient
          colors={['#4834d4', '#686de0']}
          style={styles.cardBackGradient}
        />
        <View style={styles.cardBackPattern} />
        <View style={styles.patternInner} />
      </View>
    );
  }

  const suitSymbol = getSuitSymbol(card.suit);
  const cardColor = getSuitColor(card.suit);
  const textColor = cardColor === 'red' ? '#e74c3c' : '#2d3436';
  const isSmall = cardSize.width < 50;

  return (
    <View
      pointerEvents={pointerEvents}
      style={[
        styles.card,
        styles.cardFace,
        { width: cardSize.width, height: cardSize.height, padding: isSmall ? 2 : 4 },
        style,
      ]}
    >
      <LinearGradient
        colors={['#ffffff', '#f1f2f6']}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.cardContent, { top: isSmall ? 1 : 2, left: isSmall ? 1 : 2 }]}>
        <Text style={[styles.rankText, { fontSize: cardSize.fontSize * 0.95, color: textColor, lineHeight: cardSize.fontSize * 0.95 }]}>
          {card.rank}
        </Text>
        <Text style={[styles.suitText, { fontSize: cardSize.fontSize * 0.65, color: textColor, marginTop: isSmall ? -2 : -4 }]}>
          {suitSymbol}
        </Text>
      </View>

      <Text style={[styles.centerSuit, { 
        fontSize: cardSize.fontSize * 1.2,
        color: textColor,
        transform: [{ translateX: -cardSize.width * 0.15 }, { translateY: -cardSize.height * 0.15 }] 
      }]}>
        {suitSymbol}
      </Text>

      <View style={[styles.cardContent, styles.bottomContent, { bottom: isSmall ? 1 : 2, right: isSmall ? 1 : 2 }]}>
        <Text style={[styles.rankText, { fontSize: cardSize.fontSize * 0.95, color: textColor, lineHeight: cardSize.fontSize * 0.95 }]}>
          {card.rank}
        </Text>
        <Text style={[styles.suitText, { fontSize: cardSize.fontSize * 0.65, color: textColor, marginTop: isSmall ? -2 : -4 }]}>
          {suitSymbol}
        </Text>
      </View>
    </View>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.1)',
      backgroundColor: '#ffffff',
      overflow: 'hidden',
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    cardFace: {
      backgroundColor: '#ffffff',
      padding: 4,
    },
    cardBack: {
      backgroundColor: '#4834d4',
      justifyContent: 'center',
      alignItems: 'center',
    },
    cardBackGradient: {
      ...StyleSheet.absoluteFillObject,
    },
    cardBackPattern: {
      width: '80%',
      height: '85%',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.3)',
      borderRadius: radius.xs,
    },
    patternInner: {
      position: 'absolute',
      width: '60%',
      height: '65%',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: radius.xs,
      transform: [{ rotate: '45deg' }],
    },
    emptyCard: {
      backgroundColor: colors.surface,
      borderColor: colors.textSecondary,
      borderStyle: 'dashed',
      opacity: 0.3,
    },
    cardContent: {
      position: 'absolute',
      top: 2,
      left: 2,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 16,
    },
    bottomContent: {
      top: undefined,
      left: undefined,
      bottom: 2,
      right: 2,
      transform: [{ rotate: '180deg' }],
    },
    rankText: {
      fontWeight: '900',
    },
    suitText: {
      marginTop: -4,
    },
    centerSuit: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      opacity: 0.15,
    },
  });
