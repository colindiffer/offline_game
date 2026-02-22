import React, { useState, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView, Dimensions, Platform, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeColors } from '../utils/themes';
import { spacing, radius, shadows, typography } from '../utils/designTokens';
import PremiumButton from './PremiumButton';
import { GameId } from '../types';
import GameIcon from './GameIcon';

const { width, height } = Dimensions.get('window');

export interface TutorialStep {
  title: string;
  description: string;
  icon?: string;
  tips?: string[];
}

interface Props {
  gameName: string;
  steps: TutorialStep[];
  onClose: () => void;
  gameId?: GameId;
}

export default function TutorialScreen({ gameName, steps, onClose, gameId }: Props) {
  const { colors } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const styles = useMemo(() => getStyles(colors), [colors]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const step = steps[currentStep];

  return (
    <Modal animationType="slide" transparent={false} visible={true} onRequestClose={onClose}>
      <View style={styles.container}>
        <LinearGradient colors={[colors.background, colors.surface]} style={StyleSheet.absoluteFill} />
        
        {/* Decorative Blobs */}
        <View style={[styles.blob, { backgroundColor: colors.primary + '10' }]} />

        <View style={styles.header}>
          <Text style={styles.gameTitle}>{gameName.toUpperCase()}</Text>
          <Text style={styles.subtitle}>GUIDE</Text>
        </View>

        <View style={styles.contentCard}>
          <ScrollView 
            style={styles.scrollView} 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {(step.icon || gameId) && (
              <View style={styles.iconContainer}>
                {gameId ? <GameIcon gameId={gameId} /> : <Text style={styles.icon}>{step.icon}</Text>}
              </View>
            )}

            <Text style={styles.stepTitle}>{step.title}</Text>
            <Text style={styles.description}>{step.description}</Text>

            {step.tips && step.tips.length > 0 && (
              <View style={styles.tipsSection}>
                <Text style={styles.tipsHeading}>PRO TIPS</Text>
                {step.tips.map((tip, index) => (
                  <View key={index} style={styles.tipRow}>
                    <View style={[styles.tipDot, { backgroundColor: colors.primary }]} />
                    <Text style={styles.tipText}>{tip}</Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </View>

        <View style={styles.footer}>
          <View style={styles.pagination}>
            {steps.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === currentStep ? [styles.activeDot, { backgroundColor: colors.primary }] : { backgroundColor: colors.textSecondary + '40' },
                ]}
              />
            ))}
          </View>

          <View style={styles.buttons}>
            {currentStep > 0 ? (
              <TouchableOpacity
                style={styles.prevBtn}
                onPress={handlePrev}
              >
                <Text style={styles.prevBtnText}>PREVIOUS</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.prevBtn} />
            )}

            <PremiumButton
              variant="primary"
              height={56}
              onPress={handleNext}
              style={styles.nextBtn}
            >
              <Text style={styles.nextBtnText}>
                {currentStep === steps.length - 1 ? 'START PLAYING' : 'NEXT STEP'}
              </Text>
            </PremiumButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: Platform.OS === 'ios' ? 60 : 40,
      paddingHorizontal: spacing.md, // Add horizontal padding to container
    },
    blob: {
      position: 'absolute',
      width: width * 1.5,
      height: width * 1.5,
      borderRadius: width,
      top: -width * 0.5,
      left: -width * 0.25,
      filter: Platform.OS === 'web' ? 'blur(80px)' : undefined,
    },
    header: {
      alignItems: 'center',
      marginBottom: spacing.xl,
    },
    gameTitle: {
      fontSize: 36,
      fontWeight: '900',
      color: colors.text,
      letterSpacing: -1,
      flexShrink: 1, // Allow text to shrink
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.primary,
      letterSpacing: 4,
      marginTop: -4,
    },
    contentCard: {
      flex: 1,
      maxHeight: height * 0.6,
      // marginHorizontal: spacing.lg, // Removed to use container padding
      backgroundColor: colors.card,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      ...shadows.lg,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: spacing.lg, // Reduced padding
      alignItems: 'center',
    },
    iconContainer: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    icon: {
      fontSize: 40,
    },
    stepTitle: {
      fontSize: 20,
      fontWeight: '900',
      color: colors.text,
      textAlign: 'center',
      marginBottom: spacing.sm,
      flexShrink: 1,
    },
    description: {
      fontSize: 16, // Reduced font size
      lineHeight: 24, // Adjusted line height
      color: colors.text,
      textAlign: 'center',
      marginBottom: spacing.xl, // Reduced margin
      flexWrap: 'wrap', // Allow text to wrap
    },
    tipsSection: {
      width: '100%',
      backgroundColor: colors.background,
      borderRadius: radius.lg,
      padding: spacing.md, // Reduced padding
      borderWidth: 1,
      borderColor: colors.border,
    },
    tipsHeading: {
      fontSize: 14, // Reduced font size
      fontWeight: '900',
      color: colors.primary,
      letterSpacing: 2,
      marginBottom: spacing.md, // Reduced margin
    },
    tipRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: spacing.sm, // Reduced margin
    },
    tipDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginTop: 8, // Adjusted for new font size
      marginRight: 12, // Reduced margin
    },
    tipText: {
      flex: 1,
      fontSize: 14, // Reduced font size
      color: colors.text,
      lineHeight: 22, // Adjusted line height
      flexWrap: 'wrap', // Allow text to wrap
    },
    footer: {
      padding: spacing.md, // Reduced padding
      paddingBottom: Platform.OS === 'ios' ? 30 : spacing.md, // Adjusted padding
    },
    pagination: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 6, // Reduced gap
      marginBottom: spacing.md, // Reduced margin
    },
    dot: {
      height: 6,
      borderRadius: 3,
      width: 6,
    },
    activeDot: {
      width: 18, // Reduced width
    },
    buttons: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md, // Reduced gap
    },
    prevBtn: {
      flex: 1,
      height: 50, // Reduced height
      justifyContent: 'center',
      alignItems: 'center',
    },
    prevBtnText: {
      color: colors.textSecondary,
      fontWeight: '900',
      fontSize: 12, // Reduced font size
      letterSpacing: 1,
    },
    nextBtn: {
      flex: 2,
    },
    nextBtnText: {
      color: colors.textOnPrimary,
      fontWeight: '900',
      fontSize: 14, // Reduced font size
      letterSpacing: 1,
    },
  });
