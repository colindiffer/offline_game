import { Difficulty } from '../../types';

export interface HangmanState {
  word: string;
  guessedLetters: string[];
  incorrectAttempts: number;
  maxAttempts: number;
  gameOver: boolean;
  gameWon: boolean;
  theme: string;
}

const WORDS: Record<string, string[]> = {
  animals: ['ELEPHANT', 'GIRAFFE', 'PENGUIN', 'KANGAROO', 'DOLPHIN', 'HAMSTER', 'CHEETAH', 'GORILLA'],
  countries: ['GERMANY', 'BRAZIL', 'JAPAN', 'CANADA', 'AUSTRALIA', 'EGYPT', 'MEXICO', 'FRANCE'],
  objects: ['COMPUTER', 'TELEPHONE', 'GUITAR', 'BICYCLE', 'UMBRELLA', 'BACKPACK', 'KITCHEN', 'WINDOW'],
  space: ['PLANET', 'GALAXY', 'ASTRONAUT', 'ROCKET', 'COMET', 'METEOR', 'NEBULA', 'UNIVERSE'],
};

export function initializeHangman(difficulty: Difficulty, level: number = 1): HangmanState {
  const themes = Object.keys(WORDS);
  const theme = themes[Math.floor(Math.random() * themes.length)];
  const wordPool = WORDS[theme];
  
  // Pick a word, potentially longer for higher levels
  const word = wordPool[Math.floor(Math.random() * wordPool.length)];
  
  let maxAttempts = 6;
  if (difficulty === 'easy') maxAttempts = 10;
  else if (difficulty === 'hard') maxAttempts = 5;

  return {
    word,
    guessedLetters: [],
    incorrectAttempts: 0,
    maxAttempts,
    gameOver: false,
    gameWon: false,
    theme: theme.toUpperCase(),
  };
}

export function guessLetter(state: HangmanState, letter: string): HangmanState {
  if (state.gameOver || state.gameWon || state.guessedLetters.includes(letter)) {
    return state;
  }

  const guessedLetters = [...state.guessedLetters, letter];
  const isCorrect = state.word.includes(letter);
  const incorrectAttempts = isCorrect ? state.incorrectAttempts : state.incorrectAttempts + 1;
  
  const isWon = state.word.split('').every(l => guessedLetters.includes(l));
  const isLost = incorrectAttempts >= state.maxAttempts;

  return {
    ...state,
    guessedLetters,
    incorrectAttempts,
    gameOver: isLost,
    gameWon: isWon,
  };
}
