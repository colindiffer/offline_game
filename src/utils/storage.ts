import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameId, Difficulty } from '../types';

const highScoreKey = (gameId: GameId, difficulty: Difficulty) => 
  `@highscore_${gameId}_${difficulty}`;

const activeGameKey = (gameId: GameId) => `@active_game_${gameId}`;

export async function getHighScore(gameId: GameId, difficulty: Difficulty): Promise<number> {
  try {
    const value = await AsyncStorage.getItem(highScoreKey(gameId, difficulty));
    return value ? parseInt(value, 10) : 0;
  } catch {
    return 0;
  }
}

export async function setHighScore(gameId: GameId, score: number, difficulty: Difficulty): Promise<void> {
  try {
    await AsyncStorage.setItem(highScoreKey(gameId, difficulty), score.toString());
  } catch {
    // silently fail
  }
}

export async function getActiveGame(gameId: GameId): Promise<Difficulty | null> {
  try {
    const value = await AsyncStorage.getItem(activeGameKey(gameId));
    return value as Difficulty | null;
  } catch {
    return null;
  }
}

export async function setActiveGame(gameId: GameId, difficulty: Difficulty): Promise<void> {
  try {
    await AsyncStorage.setItem(activeGameKey(gameId), difficulty);
  } catch {
    // silently fail
  }
}

export async function clearActiveGame(gameId: GameId): Promise<void> {
  try {
    await AsyncStorage.removeItem(activeGameKey(gameId));
  } catch {
    // silently fail
  }
}

export async function clearAllHighScores(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const scoreKeys = keys.filter((k) => k.startsWith('@highscore_'));
    await AsyncStorage.multiRemove(scoreKeys);
  } catch {
    // silently fail
  }
}

export async function getLevel(gameId: GameId, difficulty: Difficulty): Promise<number> {
  try {
    const value = await AsyncStorage.getItem(`@level_${gameId}_${difficulty}`);
    return value ? parseInt(value, 10) : 1;
  } catch {
    return 1;
  }
}

export async function setLevel(gameId: GameId, difficulty: Difficulty, level: number): Promise<void> {
  try {
    await AsyncStorage.setItem(`@level_${gameId}_${difficulty}`, level.toString());
  } catch {
    // silently fail
  }
}
