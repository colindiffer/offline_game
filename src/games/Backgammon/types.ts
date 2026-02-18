export type CheckerColor = 'white' | 'red';

export interface BackgammonGameState {
  points: CheckerColor[][]; // 24 points, each an array of checkers
  bar: { white: number; red: number };
  off: { white: number; red: number };
  dice: number[];
  currentPlayer: CheckerColor;
  movesRemaining: number[];
  gameOver: boolean;
  winner: CheckerColor | null;
}
