import React, { useMemo } from 'react';
import { StyleSheet, Text, View, Animated } from 'react-native';
import { Card } from '../types/cards';
import { getSuitSymbol, getSuitColor } from '../utils/cardUtils';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeColors } from '../utils/themes';

interface Props {
  card: Card | null;
  faceDown?: boolean;
  size?: 'small' | 'medium' | 'large';
  style?: any;
}

const CARD_SIZES = {
  small: { width: 40, height: 60, fontSize: 16 },
  medium: { width: 60, height: 90, fontSize: 24 },
  large: { width: 80, height: 120, fontSize: 32 },
};

export default function PlayingCard({ card, faceDown = false, size = 'medium', style }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const cardSize = CARD_SIZES[size];

  if (!card) {
    // Empty slot
    return (
      <View
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
        style={[
          styles.card,
          styles.cardBack,
          { width: cardSize.width, height: cardSize.height },
          style,
        ]}
      >
        <View style={styles.cardBackPattern} />
      </View>
    );
  }

  const suitSymbol = getSuitSymbol(card.suit);
  const cardColor = getSuitColor(card.suit);
  const textColor = cardColor === 'red' ? '#DC143C' : '#000000';

  return (
    <View
      style={[
        styles.card,
        styles.cardFace,
        { width: cardSize.width, height: cardSize.height },
        style,
      ]}
    >
      <View style={styles.cardContent}>
        <Text style={[styles.rankText, { fontSize: cardSize.fontSize, color: textColor }]}>
          {card.rank}
        </Text>
        <Text style={[styles.suitText, { fontSize: cardSize.fontSize, color: textColor }]}>
          {suitSymbol}
        </Text>
      </View>
      
      {/* Center suit symbol for face cards */}
      {['J', 'Q', 'K', 'A'].includes(card.rank) && (
        <Text style={[styles.centerSuit, { fontSize: cardSize.fontSize * 1.5, color: textColor }]}>
          {suitSymbol}
        </Text>
      )}
      
      {/* Bottom rank/suit (rotated) */}
      <View style={[styles.cardContent, styles.bottomContent]}>
        <Text style={[styles.rankText, { fontSize: cardSize.fontSize, color: textColor }]}>
          {card.rank}
        </Text>
        <Text style={[styles.suitText, { fontSize: cardSize.fontSize, color: textColor }]}>
          {suitSymbol}
        </Text>
      </View>
    </View>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#ccc',
      margin: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3,
      elevation: 3,
    },
    cardFace: {
      backgroundColor: '#ffffff',
      padding: 4,
      position: 'relative',
    },
    cardBack: {
      backgroundColor: '#2c5aa0',
      justifyContent: 'center',
      alignItems: 'center',
    },
    cardBackPattern: {
      width: '80%',
      height: '90%',
      borderWidth: 2,
      borderColor: '#ffffff',
      borderRadius: 4,
      backgroundColor: '#4169E1',
    },
    emptyCard: {
      backgroundColor: colors.surface,
      borderColor: colors.textSecondary,
      borderStyle: 'dashed',
      opacity: 0.3,
    },
    cardContent: {
      alignItems: 'center',
      gap: 2,
    },
    bottomContent: {
      position: 'absolute',
      bottom: 4,
      right: 4,
      transform: [{ rotate: '180deg' }],
    },
    rankText: {
      fontWeight: 'bold',
      lineHeight: undefined,
    },
    suitText: {
      lineHeight: undefined,
    },
    centerSuit: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: [{ translateX: -12 }, { translateY: -12 }],
    },
  });
