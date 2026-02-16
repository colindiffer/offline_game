import React, { useMemo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeColors } from '../utils/themes';
import { spacing, radius, shadows } from '../utils/designTokens';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
}

export default function GameBoardContainer({ children, style }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  return (
    <View style={[styles.container, style]}>
      {children}
    </View>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.lg,
      alignItems: 'center',
    },
  });
