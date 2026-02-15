import React, { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import GameCard from '../components/GameCard';
import { GAMES } from '../utils/constants';
import { GameId, RootStackParamList } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeColors } from '../utils/themes';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.heading}>Offline Games</Text>
          <Text style={styles.subheading}>No internet required!</Text>
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
      <View style={styles.grid}>
        {GAMES.map((game) => (
          <GameCard key={game.id} game={game} onPress={() => openGame(game.id)} />
        ))}
      </View>
    </ScrollView>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  heading: {
    color: colors.text,
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subheading: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  settingsBtn: {
    padding: 8,
    marginLeft: 8,
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
