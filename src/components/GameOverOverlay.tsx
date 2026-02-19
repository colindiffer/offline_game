import React, { useEffect, useRef, useMemo } from 'react';
import { Animated, StyleSheet, Text, View, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeColors } from '../utils/themes';
import { spacing, radius, shadows, typography } from '../utils/designTokens';
import PremiumButton from './PremiumButton';
import { useNavigation } from '@react-navigation/native';
import { useInterstitialAd } from '../lib/useInterstitialAd';
import { triggerHaptic } from '../utils/haptics';

export type GameResult = 'win' | 'lose' | 'draw' | 'paused';

interface Props {
  result: GameResult;
  title: string;
  subtitle?: string;
  onPlayAgain: () => void;
  onPlayAgainLabel?: string;
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
  onPlayAgainLabel,
  secondaryAction,
}: Props) {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { showAd } = useInterstitialAd();

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const contentScale = useRef(new Animated.Value(0.9)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(contentScale, {
        toValue: 1,
        friction: 7,
        tension: 40,
        delay: 150,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 300,
        delay: 150,
        useNativeDriver: true,
      }),
    ]).start();

    if (result === 'win') {
      triggerHaptic('success');
    } else if (result === 'lose') {
      triggerHaptic('error');
    }
  }, []);

  const config = useMemo(() => {
    switch (result) {
      case 'win':
        return {
          icon: '🏆',
          color: colors.success,
          gradient: ['#00b894', '#55efc4'] as any,
          btnLabel: onPlayAgainLabel || 'PLAY AGAIN',
        };
      case 'lose':
        return {
          icon: '💀',
          color: colors.error,
          gradient: ['#d63031', '#ff7675'] as any,
          btnLabel: onPlayAgainLabel || 'TRY AGAIN',
        };
      case 'paused':
        return {
          icon: '⏸️',
          color: colors.primary,
          gradient: [colors.primary, colors.accent] as any,
          btnLabel: onPlayAgainLabel || 'RESUME',
        };
      default:
        return {
          icon: '🤝',
          color: colors.warning,
          gradient: ['#f1c40f', '#ffeaa7'] as any,
          btnLabel: onPlayAgainLabel || 'PLAY AGAIN',
        };
    }
  }, [result, colors, onPlayAgainLabel]);

  const handlePlayAgain = () => {
    if (result !== 'paused') showAd();
    onPlayAgain();
  };

  const handleQuit = () => {
    if (result !== 'paused') showAd();
    if (secondaryAction) {
      secondaryAction.onPress();
    } else {
      navigation.goBack();
    }
  };

  return (
    <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
      <Animated.View
        style={[
          styles.cardContainer,
          {
            opacity: contentOpacity,
            transform: [{ scale: contentScale }],
          },
        ]}
      >
        <View style={styles.card}>
          {/* Header Section */}
          <View style={styles.heroHeader}>
            <LinearGradient colors={config.gradient as any} style={StyleSheet.absoluteFill} />
            <Text style={styles.heroIcon}>{config.icon}</Text>
            <View style={styles.headerGlow} />
          </View>

          {/* Content Section */}
          <View style={styles.content}>
            <Text style={[styles.title, { color: config.color }]}>{title.toUpperCase()}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

            <View style={styles.buttonContainer}>
              <PremiumButton
                variant="primary"
                height={56}
                onPress={handlePlayAgain}
                style={styles.mainButton}
              >
                <Text style={styles.buttonText}>{config.btnLabel}</Text>
              </PremiumButton>

              <PremiumButton
                variant="secondary"
                height={50}
                onPress={handleQuit}
                style={styles.quitButton}
              >
                <Text style={styles.quitButtonText}>
                  {secondaryAction?.label || 'EXIT TO MENU'}
                </Text>
              </PremiumButton>
            </View>
          </View>
          
          <View style={styles.innerBorder} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.85)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 2000,
    },
    cardContainer: {
      width: '85%',
      maxWidth: 340,
      ...shadows.xl,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 32,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
    },
    heroHeader: {
      height: 120,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    heroIcon: {
      fontSize: 64,
      zIndex: 2,
      textShadowColor: 'rgba(0,0,0,0.3)',
      textShadowOffset: { width: 0, height: 4 },
      textShadowRadius: 8,
    },
    headerGlow: {
      position: 'absolute',
      width: 150,
      height: 150,
      borderRadius: 75,
      backgroundColor: 'rgba(255,255,255,0.2)',
      filter: Platform.OS === 'web' ? 'blur(40px)' : undefined,
    },
    content: {
      padding: spacing.xl,
      alignItems: 'center',
    },
    title: {
      fontSize: 24,
      fontWeight: '900',
      textAlign: 'center',
      letterSpacing: 2,
      marginBottom: spacing.sm,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: spacing.xl,
      lineHeight: 20,
      fontWeight: '500',
    },
    buttonContainer: {
      width: '100%',
      gap: spacing.md,
    },
    mainButton: {
      width: '100%',
    },
    buttonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '900',
      letterSpacing: 1,
    },
    quitButton: {
      width: '100%',
    },
    quitButtonText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: 'bold',
      opacity: 0.7,
    },
    innerBorder: {
      position: 'absolute',
      top: 4,
      left: 4,
      right: 4,
      bottom: 4,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
      borderRadius: 28,
      pointerEvents: 'none',
    },
  });

