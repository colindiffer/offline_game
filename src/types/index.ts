export type GameId = 'tic-tac-toe' | 'snake' | '2048' | 'minesweeper' | 'connect-four' | 'tetris' | 'maze' | 'solitaire' | 'sudoku' | 'reversi' | 'checkers' | 'chess' | 'blackjack' | 'poker' | 'hearts';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface GameMetadata {
  id: GameId;
  name: string;
  icon: string;
  description: string;
  color: string;
}

export interface GameStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  totalTimeSeconds: number;
}

export type RootStackParamList = {
  Home: undefined;
  Game: { gameId: GameId };
  Settings: undefined;
};
