import React, { useRef } from 'react';
import { Animated, StyleSheet, TouchableOpacity, TouchableOpacityProps, View, ViewStyle, Text, StyleProp } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, radius, shadows } from '../utils/designTokens';

export type PremiumButtonVariant = 'primary' | 'secondary' | 'danger' | 'warning' | 'ghost';

interface Props extends TouchableOpacityProps {
    children: React.ReactNode;
    variant?: PremiumButtonVariant;
    depth?: number;
    height?: number;
    contentStyle?: StyleProp<ViewStyle>;
}

export default function PremiumButton({
    children,
    variant = 'primary',
    depth = 4,
    height = 50,
    style,
    contentStyle,
    ...props
}: Props) {
    const { colors, themeId } = useTheme();
    const pushAnim = useRef(new Animated.Value(0)).current;

    const onPressIn = () => {
        Animated.spring(pushAnim, {
            toValue: depth,
            useNativeDriver: true,
            friction: 8,
            tension: 100,
        }).start();
    };

    const onPressOut = () => {
        Animated.spring(pushAnim, {
            toValue: 0,
            useNativeDriver: true,
            friction: 8,
            tension: 100,
        }).start();
    };

    const getVariantColors = () => {
        switch (variant) {
            case 'primary': return { bg: colors.primary, shadow: colors.shadow || colors.primaryGradientEnd };
            case 'danger': return { bg: colors.error, shadow: '#d63031' };
            case 'warning': return { bg: colors.warning, shadow: '#e17055' };
            case 'secondary': return { bg: colors.card, shadow: themeId === 'light' ? 'rgba(0,0,0,0.12)' : colors.border };
            case 'ghost': return { bg: 'transparent', shadow: 'transparent' };
            default: return { bg: colors.primary, shadow: colors.shadow };
        }
    };

    const vColors = getVariantColors();

    if (variant === 'ghost') {
        return (
            <TouchableOpacity activeOpacity={0.7} {...props} style={style}>
                {children}
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity
            activeOpacity={1}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            {...props}
            style={[style, { height: height + depth }]}
        >
            <View style={[styles.shadow, { backgroundColor: vColors.shadow, height, borderRadius: radius.md, top: depth }]} />
            <Animated.View
                style={[
                    styles.content,
                    {
                        backgroundColor: vColors.bg,
                        height,
                        borderRadius: radius.md,
                        transform: [{ translateY: pushAnim }],
                    },
                    contentStyle,
                ]}
            >
                {children}
            </Animated.View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    content: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
    },
    shadow: {
        position: 'absolute',
        left: 0,
        right: 0,
    },
});
