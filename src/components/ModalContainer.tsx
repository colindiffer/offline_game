import React, { useEffect, useRef, useMemo } from 'react';
import { Animated, StyleSheet, TouchableWithoutFeedback, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeColors } from '../utils/themes';
import { radius, shadows, spacing } from '../utils/designTokens';

interface Props {
  children: React.ReactNode;
  onClose: () => void;
  maxWidth?: number;
}

export default function ModalContainer({ children, onClose, maxWidth = 500 }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 250,
        delay: 80,
        useNativeDriver: true,
      }),
      Animated.spring(contentTranslateY, {
        toValue: 0,
        friction: 8,
        tension: 65,
        delay: 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateY, {
        toValue: 40,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  return (
    <View style={styles.wrapper}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
      </TouchableWithoutFeedback>
      <Animated.View
        style={[
          styles.content,
          {
            maxWidth,
            opacity: contentOpacity,
            transform: [{ translateY: contentTranslateY }],
          },
        ]}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wrapper: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
      zIndex: 1000,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.overlayBackground,
    },
    content: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.xl,
      width: '100%',
      maxHeight: '80%',
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.xl,
    },
  });
