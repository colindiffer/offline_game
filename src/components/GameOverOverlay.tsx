import React, { useEffect, useRef, useMemo } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeColors } from '../utils/themes';
import { spacing, radius, shadows, typography } from '../utils/designTokens';
import AnimatedButton from './AnimatedButton';

export type GameResult = 'win' | 'lose' | 'draw';

interface Props {
  result: GameResult;
  title: string;
  subtitle?: string;
  onPlayAgain: () => void;
  onPlayAgainLabel?: string;
  /** Extra action button (e.g. "Resume" for paused state) */
  secondaryAction?: {
    label: string;
    onPress: () => void;
  };
}

export default function GameOverOverlay({
  result,
  title,
  subtitle,
  onPlayAgain,
  onPlayAgainLabel = 'Play Again',
  secondaryAction,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const contentScale = useRef(new Animated.Value(0.8)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(contentScale, {
        toValue: result === 'win' ? 1.05 : 1,
        friction: result === 'win' ? 4 : 8,
        tension: 80,
        delay: 100,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 250,
        delay: 100,
        useNativeDriver: true,
      }),
      Animated.spring(contentTranslateY, {
        toValue: 0,
        friction: 8,
        tension: 65,
        delay: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Settle win scale back to 1
      if (result === 'win') {
        Animated.spring(contentScale, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }).start();
      }
    });
  }, []);

  const accentColor =
    result === 'win' ? colors.success :
    result === 'lose' ? colors.error :
    colors.warning;

  return (
    <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
      <Animated.View
        style={[
          styles.card,
          {
            opacity: contentOpacity,
            transform: [
              { scale: contentScale },
              { translateY: contentTranslateY },
            ],
          },
        ]}
      >
        <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
        <Text style={[styles.title, { color: accentColor }]}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        <AnimatedButton
          variant="primary"
          onPress={onPlayAgain}
          style={styles.buttonWrapper}
        >
          <Text style={styles.buttonText}>{onPlayAgainLabel}</Text>
        </AnimatedButton>
        {secondaryAction && (
          <AnimatedButton
            variant="secondary"
            onPress={secondaryAction.onPress}
            style={styles.secondaryWrapper}
          >
            <Text style={styles.secondaryText}>{secondaryAction.label}</Text>
          </AnimatedButton>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.overlayBackground,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 900,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      padding: spacing.lg,
      alignItems: 'center',
      minWidth: 260,
      maxWidth: 320,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.xl,
      overflow: 'hidden',
    },
    accentBar: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 4,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
    },
    title: {
      ...typography.heading,
      marginTop: spacing.sm,
      marginBottom: spacing.sm,
    },
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    buttonWrapper: {
      marginTop: spacing.lg,
      width: '100%',
      minWidth: 200,
      height: 50,
    },
    buttonText: {
      color: colors.textOnPrimary,
      ...typography.bodyBold,
    },
    secondaryWrapper: {
      marginTop: spacing.md,
      width: '100%',
      minWidth: 200,
      height: 50,
    },
    secondaryText: {
      color: colors.text,
      ...typography.bodyBold,
    },
  });
