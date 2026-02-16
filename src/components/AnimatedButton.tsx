import React, { useRef, useMemo } from 'react';
import { Animated, TouchableOpacity, TouchableOpacityProps, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeColors } from '../utils/themes';
import { spacing, radius, shadows } from '../utils/designTokens';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface AnimatedButtonProps extends TouchableOpacityProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
}

export default function AnimatedButton({ children, variant, style, ...props }: AnimatedButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const { colors } = useTheme();

  const variantStyle = useMemo(() => {
    if (!variant) return undefined;
    return getVariantStyle(variant, colors);
  }, [variant, colors]);

  const onPressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      {...props}
      style={style}
    >
      <Animated.View style={[
        variantStyle,
        styles.inner,
        { transform: [{ scale: scaleAnim }] },
        (style as any)?.flexDirection === 'row' && { flexDirection: 'row' }
      ]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  inner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

function getVariantStyle(variant: ButtonVariant, colors: ThemeColors): ViewStyle {
  const base: ViewStyle = {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    ...shadows.sm,
  };

  switch (variant) {
    case 'primary':
      return {
        ...base,
        backgroundColor: colors.primary,
      };
    case 'secondary':
      return {
        ...base,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
      };
    case 'ghost':
      return {
        ...base,
        backgroundColor: 'transparent',
        ...shadows.none,
      };
    case 'danger':
      return {
        ...base,
        backgroundColor: colors.error,
      };
  }
}
