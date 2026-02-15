import React, { useEffect, useState, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../contexts/ThemeContext';
import { getAllStats, getEmptyStats } from '../utils/stats';
import { GAMES } from '../utils/constants';
import { GameId, GameStats, RootStackParamList } from '../types';
import { ThemeColors } from '../utils/themes';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>; // Reusing Settings route type for now

export default function StatsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const [stats, setStats] = useState<Record<GameId, GameStats>>(getEmptyStats());

  useEffect(() => {
    const loadStats = async () => {
      const allStats = await getAllStats();
      setStats(allStats);
    };
    loadStats();
  }, []);

  const formatTime = (totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes}m ${seconds}s`;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Game Statistics</Text>

      {GAMES.map((game) => {
        const gameStats = stats[game.id] || { gamesPlayed: 0, wins: 0, losses: 0, totalTimeSeconds: 0 };
        const winRate = gameStats.gamesPlayed > 0
          ? ((gameStats.wins / gameStats.gamesPlayed) * 100).toFixed(1)
          : '0.0';

        return (
          <View key={game.id} style={styles.statCard}>
            <Text style={styles.gameTitle}>{game.name} {game.icon}</Text>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Games Played:</Text>
              <Text style={styles.statValue}>{gameStats.gamesPlayed}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Wins:</Text>
              <Text style={styles.statValue}>{gameStats.wins}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Losses:</Text>
              <Text style={styles.statValue}>{gameStats.losses}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Win Rate:</Text>
              <Text style={styles.statValue}>{winRate}%</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Time Played:</Text>
              <Text style={styles.statValue}>{formatTime(gameStats.totalTimeSeconds)}</Text>
            </View>
          </View>
        );
      })}

      {Object.keys(stats).length === 0 && (
        <Text style={styles.noStatsText}>No game statistics yet!</Text>
      )}
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
    paddingTop: 40,
  },
  heading: {
    color: colors.text,
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 32,
    textAlign: 'center',
  },
  statCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  gameTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  statValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  noStatsText: {
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
});
