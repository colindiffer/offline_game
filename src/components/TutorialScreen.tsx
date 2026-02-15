import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView, Dimensions } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeColors } from '../utils/themes';

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
  const styles = getStyles(colors);

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
    <View style={styles.container}>
      <View style={styles.content}>
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
              <Text style={styles.tipsTitle}>💡 Tips:</Text>
              {step.tips.map((tip, index) => (
                <Text key={index} style={styles.tip}>• {tip}</Text>
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
              <Text style={styles.buttonText}>← Previous</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.button, styles.nextButton]}
            onPress={handleNext}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>
              {currentStep === steps.length - 1 ? 'Got it!' : 'Next →'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      zIndex: 1000,
    },
    content: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 24,
      width: '100%',
      maxWidth: 500,
      maxHeight: '80%',
    },
    gameTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 20,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      alignItems: 'center',
    },
    icon: {
      fontSize: 64,
      marginBottom: 16,
    },
    stepTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 12,
    },
    description: {
      fontSize: 16,
      color: colors.text,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: 16,
    },
    tipsContainer: {
      backgroundColor: colors.card,
      borderRadius: 8,
      padding: 16,
      width: '100%',
      marginTop: 8,
    },
    tipsTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    tip: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
      marginBottom: 4,
    },
    pagination: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginVertical: 16,
      gap: 8,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.textSecondary,
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
      gap: 8,
    },
    button: {
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 8,
      flex: 1,
    },
    prevButton: {
      backgroundColor: colors.card,
    },
    nextButton: {
      backgroundColor: colors.primary,
    },
    buttonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
    },
  });
