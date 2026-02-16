import React, { useState, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeColors } from '../utils/themes';
import { spacing, radius, shadows, typography } from '../utils/designTokens';
import ModalContainer from './ModalContainer';

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
    <ModalContainer onClose={onClose}>
      <Text style={styles.gameTitle}>{gameName}</Text>
      <Text style={styles.subtitle}>How to Play</Text>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {step.icon && (
          <Text style={styles.icon}>{step.icon}</Text>
        )}

        <Text style={styles.stepTitle}>{step.title}</Text>
        <Text style={styles.description}>{step.description}</Text>

        {step.tips && step.tips.length > 0 && (
          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>Tips:</Text>
            {step.tips.map((tip, index) => (
              <Text key={index} style={styles.tip}>- {tip}</Text>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.pagination}>
        {steps.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index === currentStep && styles.activeDot,
            ]}
          />
        ))}
      </View>

      <View style={styles.buttons}>
        {currentStep > 0 && (
          <TouchableOpacity
            style={[styles.button, styles.prevButton]}
            onPress={handlePrev}
            activeOpacity={0.7}
          >
            <Text style={styles.prevButtonText}>Previous</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.button, styles.nextButton]}
          onPress={handleNext}
          activeOpacity={0.7}
        >
          <Text style={styles.nextButtonText}>
            {currentStep === steps.length - 1 ? 'Got it!' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </ModalContainer>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    gameTitle: {
      ...typography.heading,
      color: '#2d3436', // Dark for light modal
      textAlign: 'center',
      marginBottom: spacing.xs,
    },
    subtitle: {
      ...typography.body,
      color: '#636e72',
      textAlign: 'center',
      marginBottom: spacing.xl,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      alignItems: 'center',
    },
    icon: {
      fontSize: 64,
      marginBottom: spacing.lg,
      color: '#2d3436',
    },
    stepTitle: {
      ...typography.subheading,
      color: '#2d3436',
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    description: {
      ...typography.body,
      color: '#2d3436',
      textAlign: 'center',
      marginBottom: spacing.lg,
      paddingHorizontal: spacing.md,
    },
    tipsContainer: {
      backgroundColor: '#f1f2f6',
      borderRadius: radius.sm,
      padding: spacing.lg,
      width: '100%',
      marginTop: spacing.sm,
      borderWidth: 1,
      borderColor: '#dfe4ea',
    },
    tipsTitle: {
      ...typography.bodyBold,
      color: '#2d3436',
      marginBottom: spacing.sm,
    },
    tip: {
      ...typography.label,
      fontWeight: '400',
      color: '#2d3436',
      marginBottom: spacing.xs,
    },
    pagination: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginVertical: spacing.lg,
      gap: spacing.sm,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: radius.full,
      backgroundColor: '#b2bec3',
      opacity: 0.3,
    },
    activeDot: {
      backgroundColor: colors.primary,
      opacity: 1,
      width: 24,
    },
    buttons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.sm,
    },
    button: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      borderRadius: radius.sm,
      flex: 1,
      ...shadows.sm,
    },
    prevButton: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    prevButtonText: {
      color: colors.text,
      ...typography.bodyBold,
      textAlign: 'center',
    },
    nextButton: {
      backgroundColor: colors.primary,
    },
    nextButtonText: {
      color: colors.textOnPrimary,
      ...typography.bodyBold,
      textAlign: 'center',
    },
  });
