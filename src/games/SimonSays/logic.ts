import { Difficulty } from '../../types';

export type SimonColor = 0 | 1 | 2 | 3; // Red, Blue, Green, Yellow

export interface SimonSaysState {
  sequence: SimonColor[];
  playerSequence: SimonColor[];
  isPlayingSequence: boolean;
  activeColor: SimonColor | null;
  gameOver: boolean;
  gameWon: boolean;
}

export function initializeSimonSays(difficulty: Difficulty): SimonSaysState {
  return {
    sequence: [],
    playerSequence: [],
    isPlayingSequence: false,
    activeColor: null,
    gameOver: false,
    gameWon: false,
  };
}

export function addToSequence(sequence: SimonColor[]): SimonColor[] {
  const nextColor = Math.floor(Math.random() * 4) as SimonColor;
  return [...sequence, nextColor];
}
