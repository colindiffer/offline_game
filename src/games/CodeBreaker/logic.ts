import { CodeBreakerGameState, CodeBreakerGuess, CODE_BREAKER_COLORS } from './types';
import { Difficulty } from '../../types';

export function initializeCodeBreaker(difficulty: Difficulty): CodeBreakerGameState {
  const codeLength = 4;
  const secretCode: string[] = [];
  
  for (let i = 0; i < codeLength; i++) {
    secretCode.push(CODE_BREAKER_COLORS[Math.floor(Math.random() * CODE_BREAKER_COLORS.length)]);
  }

  return {
    secretCode,
    guesses: [],
    currentGuess: [],
    gamePhase: 'playing',
    winner: null,
  };
}

export function evaluateGuess(secretCode: string[], guessColors: string[]): CodeBreakerGuess {
  let black = 0;
  let white = 0;
  
  const secretCopy = [...secretCode];
  const guessCopy = [...guessColors];

  // Count black pegs
  for (let i = 0; i < guessCopy.length; i++) {
    if (guessCopy[i] === secretCopy[i]) {
      black++;
      secretCopy[i] = 'used';
      guessCopy[i] = 'done';
    }
  }

  // Count white pegs
  for (let i = 0; i < guessCopy.length; i++) {
    if (guessCopy[i] !== 'done') {
      const index = secretCopy.indexOf(guessCopy[i]);
      if (index !== -1) {
        white++;
        secretCopy[index] = 'used';
      }
    }
  }

  return {
    colors: guessColors,
    feedback: { black, white },
  };
}
