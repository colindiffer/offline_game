import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeColors } from '../utils/themes';

interface Props {
  onPress: () => void;
  disabled?: boolean;
  cooldown?: number;
  remainingHints?: number;
}

export default function HintButton({ onPress, disabled = false, cooldown, remainingHints }: Props) {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={styles.icon}>💡</Text>
      <View style={styles.textContainer}>
        <Text style={styles.text}>Hint</Text>
        {cooldown !== undefined && cooldown > 0 && (
          <Text style={styles.cooldown}>{cooldown}s</Text>
        )}
        {remainingHints !== undefined && (
          <Text style={styles.remaining}>({remainingHints} left)</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      gap: 6,
    },
    disabled: {
      opacity: 0.5,
    },
    icon: {
      fontSize: 20,
    },
    textContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    text: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    cooldown: {
      color: colors.warning,
      fontSize: 12,
    },
    remaining: {
      color: colors.textSecondary,
      fontSize: 12,
    },
  });
