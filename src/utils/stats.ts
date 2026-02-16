import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameId, GameStats } from '../types';

const STATS_STORAGE_KEY = '@game_stats';

type GameResult = 'win' | 'loss';

const createEmptyStats = (): Record<GameId, GameStats> => ({
  'tic-tac-toe': { gamesPlayed: 0, wins: 0, losses: 0, totalTimeSeconds: 0 },
  snake: { gamesPlayed: 0, wins: 0, losses: 0, totalTimeSeconds: 0 },
  '2048': { gamesPlayed: 0, wins: 0, losses: 0, totalTimeSeconds: 0 },
  minesweeper: { gamesPlayed: 0, wins: 0, losses: 0, totalTimeSeconds: 0 },
  'connect-four': { gamesPlayed: 0, wins: 0, losses: 0, totalTimeSeconds: 0 },
  tetris: { gamesPlayed: 0, wins: 0, losses: 0, totalTimeSeconds: 0 },
  maze: { gamesPlayed: 0, wins: 0, losses: 0, totalTimeSeconds: 0 },
  solitaire: { gamesPlayed: 0, wins: 0, losses: 0, totalTimeSeconds: 0 },
  sudoku: { gamesPlayed: 0, wins: 0, losses: 0, totalTimeSeconds: 0 },
  reversi: { gamesPlayed: 0, wins: 0, losses: 0, totalTimeSeconds: 0 },
  checkers: { gamesPlayed: 0, wins: 0, losses: 0, totalTimeSeconds: 0 },
  chess: { gamesPlayed: 0, wins: 0, losses: 0, totalTimeSeconds: 0 },
  blackjack: { gamesPlayed: 0, wins: 0, losses: 0, totalTimeSeconds: 0 },
  poker: { gamesPlayed: 0, wins: 0, losses: 0, totalTimeSeconds: 0 },
  hearts: { gamesPlayed: 0, wins: 0, losses: 0, totalTimeSeconds: 0 },
  'water-sort': { gamesPlayed: 0, wins: 0, losses: 0, totalTimeSeconds: 0 },
  'word-search': { gamesPlayed: 0, wins: 0, losses: 0, totalTimeSeconds: 0 },
  'brick-breaker': { gamesPlayed: 0, wins: 0, losses: 0, totalTimeSeconds: 0 },
  'mahjong': { gamesPlayed: 0, wins: 0, losses: 0, totalTimeSeconds: 0 },
  'hangman': { gamesPlayed: 0, wins: 0, losses: 0, totalTimeSeconds: 0 },
  'simon-says': { gamesPlayed: 0, wins: 0, losses: 0, totalTimeSeconds: 0 },
});

export function getEmptyStats(): Record<GameId, GameStats> {
  return createEmptyStats();
}

async function getStats(): Promise<Record<GameId, GameStats>> {
  try {
    const jsonValue = await AsyncStorage.getItem(STATS_STORAGE_KEY);
    const stored = jsonValue != null ? (JSON.parse(jsonValue) as Partial<Record<GameId, GameStats>>) : {};
    const base = createEmptyStats();
    (Object.keys(base) as GameId[]).forEach((gameId) => {
      if (stored[gameId]) {
        base[gameId] = { ...base[gameId], ...stored[gameId]! };
      }
    });
    return base;
  } catch (e) {
    console.error('Failed to load stats.', e);
    return createEmptyStats();
  }
}

async function saveStats(stats: Record<GameId, GameStats>): Promise<void> {
  try {
    const jsonValue = JSON.stringify(stats);
    await AsyncStorage.setItem(STATS_STORAGE_KEY, jsonValue);
  } catch (e) {
    console.error('Failed to save stats.', e);
  }
}

export async function recordGameResult(
  gameId: GameId,
  result: GameResult,
  timeSeconds: number
): Promise<void> {
  const allStats = await getStats();
  const gameStats = allStats[gameId] || { gamesPlayed: 0, wins: 0, losses: 0, totalTimeSeconds: 0 };

  gameStats.gamesPlayed += 1;
  gameStats.totalTimeSeconds += timeSeconds;

  if (result === 'win') {
    gameStats.wins += 1;
  } else {
    gameStats.losses += 1;
  }

  allStats[gameId] = gameStats;
  await saveStats(allStats);
}

export async function getAllStats(): Promise<Record<GameId, GameStats>> {
  return getStats();
}

export async function clearAllStats(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STATS_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear all stats.', e);
  }
}
