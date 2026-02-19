import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Dimensions, Platform, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import GameCard from '../components/GameCard';
import AdBanner from '../components/AdBanner';
import { GAMES } from '../utils/constants';
import { GameId, RootStackParamList } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeColors } from '../utils/themes';
import { spacing, radius, shadows } from '../utils/designTokens';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;
const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const openGame = useCallback((gameId: GameId) => {
    navigation.navigate('Game', { gameId });
  }, [navigation]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.background, colors.surface]} style={StyleSheet.absoluteFill} />

      {/* Premium Decorative Blobs */}
      <View style={[styles.blob, styles.blob1, { backgroundColor: colors.primary + '10' }]} />
      <View style={[styles.blob, styles.blob2, { backgroundColor: colors.accent + '08' }]} />

      <Animated.ScrollView
        style={[styles.scrollView, { opacity: fadeAnim }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.appTitle}>Classic Offline</Text>
            <Text style={styles.appSubtitle}>GAMES ROOM</Text>
            <View style={styles.pillContainer}>
              <View style={styles.countPill}>
                <Text style={styles.countText}>30 CLASSICS READY</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.7}
          >
            <View style={styles.settingsBtnInner}>
              <Text style={styles.settingsEmoji}>⚙️</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.grid}>
          {GAMES.map((game, index) => (
            <GameCard key={game.id} game={game} onPress={() => openGame(game.id)} index={index} />
          ))}
        </View>

        <View style={styles.footerSpacer} />
      </Animated.ScrollView>
      <View style={styles.adContainer}>
        <AdBanner />
      </View>
    </View>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollView: { flex: 1 },
  content: { padding: spacing.lg, paddingTop: Platform.OS === 'ios' ? 60 : 40 },
  blob: { position: 'absolute', borderRadius: 300 },
  vehicular: { position: 'absolute', borderRadius: 300, filter: Platform.OS === 'web' ? 'blur(100px)' : undefined },
  blob1: { width: width * 1.5, height: width * 1.5, top: -width, left: -width * 0.5 },
  blob2: { width: width, height: width, bottom: -width * 0.3, right: -width * 0.4 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.xl },
  appTitle: { fontSize: 48, fontWeight: '900', color: colors.text, lineHeight: 48, letterSpacing: -1.5 },
  appSubtitle: { fontSize: 14, fontWeight: '800', color: colors.primary, letterSpacing: 4, marginTop: -2 },
  pillContainer: { marginTop: 12 },
  countPill: { backgroundColor: colors.card, paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.sm, alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.border },
  countText: { color: colors.textSecondary, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  settingsBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.border, padding: 2 },
  settingsBtnInner: { flex: 1, borderRadius: 23, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  settingsEmoji: { fontSize: 22 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  footerSpacer: { height: 100 },
  adContainer: { width: '100%', backgroundColor: colors.background },
});
