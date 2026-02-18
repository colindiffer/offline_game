export type CodeColor = string;

export interface CodeBreakerGuess {
  colors: CodeColor[];
  feedback: {
    black: number; // Correct color and position
    white: number; // Correct color, wrong position
  };
}

export interface CodeBreakerGameState {
  secretCode: CodeColor[];
  guesses: CodeBreakerGuess[];
  currentGuess: CodeColor[];
  gamePhase: 'playing' | 'finished';
  winner: boolean | null;
}

export const CODE_BREAKER_COLORS = [
  '#ff7675', // Red
  '#74b9ff', // Blue
  '#55efc4', // Green
  '#fdcb6e', // Yellow
  '#a29bfe', // Purple
  '#fab1a0', // Orange
];
