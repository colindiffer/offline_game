import React, { useState, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView, Dimensions, Platform, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeColors } from '../utils/themes';
import { spacing, radius, shadows, typography } from '../utils/designTokens';
import PremiumButton from './PremiumButton';

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
}

export default function TutorialScreen({ gameName, steps, onClose }: Props) {
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
            {step.icon && (
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>{step.icon}</Text>
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
      marginHorizontal: spacing.lg,
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
      padding: spacing.xl,
      alignItems: 'center',
    },
    iconContainer: {
      width: 160,
      height: 160,
      borderRadius: 80,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.xxl,
      borderWidth: 1,
      borderColor: colors.border,
    },
    icon: {
      fontSize: 100,
    },
    stepTitle: {
      fontSize: 32,
      fontWeight: '900',
      color: colors.text,
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    description: {
      fontSize: 20,
      lineHeight: 28,
      color: colors.text,
      textAlign: 'center',
      marginBottom: spacing.xxl,
    },
    tipsSection: {
      width: '100%',
      backgroundColor: colors.background,
      borderRadius: radius.lg,
      padding: spacing.xl,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tipsHeading: {
      fontSize: 16,
      fontWeight: '900',
      color: colors.primary,
      letterSpacing: 2,
      marginBottom: spacing.lg,
    },
    tipRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: spacing.md,
    },
    tipDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginTop: 10,
      marginRight: 16,
    },
    tipText: {
      flex: 1,
      fontSize: 18,
      color: colors.text,
      lineHeight: 26,
    },
    footer: {
      padding: spacing.xl,
      paddingBottom: Platform.OS === 'ios' ? 40 : spacing.xl,
    },
    pagination: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
      marginBottom: spacing.xl,
    },
    dot: {
      height: 6,
      borderRadius: 3,
      width: 6,
    },
    activeDot: {
      width: 24,
    },
    buttons: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
    },
    prevBtn: {
      flex: 1,
      height: 56,
      justifyContent: 'center',
      alignItems: 'center',
    },
    prevBtnText: {
      color: colors.textSecondary,
      fontWeight: '900',
      fontSize: 14,
      letterSpacing: 1,
    },
    nextBtn: {
      flex: 2,
    },
    nextBtnText: {
      color: colors.textOnPrimary,
      fontWeight: '900',
      fontSize: 16,
      letterSpacing: 1,
    },
  });
