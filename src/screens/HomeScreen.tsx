import React, { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import GameCard from '../components/GameCard';
import { GAMES } from '../utils/constants';
import { GameId, RootStackParamList } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeColors } from '../utils/themes';
import { spacing, radius, typography } from '../utils/designTokens';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;
const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const openGame = useCallback(
    (gameId: GameId) => {
      navigation.navigate('Game', { gameId });
    },
    [navigation]
  );

  const styles = useMemo(() => getStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.background, colors.surface]}
        style={StyleSheet.absoluteFill}
      />
      {/* Mesh gradient effect circles */}
      <View style={[styles.blob, styles.blob1, { backgroundColor: colors.primary + '15' }]} />
      <View style={[styles.blob, styles.blob2, { backgroundColor: colors.accent + '10' }]} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.headerArea}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.heading}>OFFLINE{'\n'}GAMES</Text>
              <View style={styles.countPill}>
                <Text style={styles.countText}>15 CLASSICS READY</Text>
              </View>
            </View>
            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={styles.settingsBtn}
                onPress={() => navigation.navigate('Settings')}
                activeOpacity={0.7}
              >
                <Text style={styles.settingsIcon}>⚙️</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.grid}>
          {GAMES.map((game, index) => (
            <GameCard key={game.id} game={game} onPress={() => openGame(game.id)} index={index} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.xl,
    paddingTop: 70,
  },
  blob: {
    position: 'absolute',
    borderRadius: 200,
    filter: Platform.OS === 'web' ? 'blur(80px)' : undefined,
  },
  blob1: {
    width: width * 1.2,
    height: width * 1.2,
    top: -width * 0.5,
    left: -width * 0.2,
  },
  blob2: {
    width: width * 0.9,
    height: width * 0.9,
    bottom: -width * 0.2,
    right: -width * 0.3,
  },
  headerArea: {
    marginBottom: spacing.xxl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heading: {
    color: colors.text,
    fontSize: 42,
    fontWeight: '900',
    lineHeight: 44,
    letterSpacing: -1,
  },
  countPill: {
    backgroundColor: colors.primary + '25',
    borderRadius: radius.sm,
    paddingVertical: 4,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  countText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  settingsIcon: {
    fontSize: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});
