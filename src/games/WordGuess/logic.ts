import { Difficulty } from '../../types';

export type LetterStatus = 'correct' | 'present' | 'absent' | 'empty';

export interface GuessLetter {
  char: string;
  status: LetterStatus;
}

export interface WordGuessState {
  targetWord: string;
  guesses: GuessLetter[][];
  currentRow: number;
  currentCol: number;
  gameOver: boolean;
  gameWon: boolean;
  keyboardStatus: Record<string, LetterStatus>;
}

const WORD_LIST = ['APPLE', 'BEACH', 'BRAIN', 'BREAD', 'BRUSH', 'CHAIR', 'CHEST', 'CHORD', 'CLICK', 'CLOCK', 'CLOUD', 'DANCE', 'DIARY', 'DRINK', 'DRIVE', 'EARTH', 'FEAST', 'FIELD', 'FRUIT', 'GLASS', 'GRAPE', 'GREEN', 'GROUND', 'GROUP', 'GHOST', 'HEART', 'HOUSE', 'JUICE', 'LIGHT', 'LEMON', 'MUSIC', 'NIGHT', 'OCEAN', 'PAINT', 'PAPER', 'PHONE', 'PIANO', 'PLANE', 'PLANT', 'PLATE', 'RADIO', 'RIVER', 'SLEEP', 'SMILE', 'SPACE', 'SPOON', 'STAGE', 'STICK', 'STONE', 'STORY', 'STUDY', 'TABLE', 'TIGER', 'TOUCH', 'TRAIN', 'TRUCK', 'VOICE', 'WATER', 'WATCH', 'WHALE', 'WORLD', 'WRITE', 'YOUTH', 'ZEBRA'];

export function initializeWordGuess(difficulty: Difficulty, level: number = 1): WordGuessState {
  // Use level to pick word or just random for now
  const targetWord = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
  
  const guesses: GuessLetter[][] = Array(6).fill(null).map(() => 
    Array(5).fill(null).map(() => ({ char: '', status: 'empty' }))
  );

  return {
    targetWord,
    guesses,
    currentRow: 0,
    currentCol: 0,
    gameOver: false,
    gameWon: false,
    keyboardStatus: {},
  };
}

export function checkGuess(target: string, guess: string): LetterStatus[] {
  const result: LetterStatus[] = Array(5).fill('absent');
  const targetChars = target.split('');
  const guessChars = guess.split('');
  const used = Array(5).fill(false);

  // First pass: correct positions
  for (let i = 0; i < 5; i++) {
    if (guessChars[i] === targetChars[i]) {
      result[i] = 'correct';
      used[i] = true;
    }
  }

  // Second pass: present but wrong position
  for (let i = 0; i < 5; i++) {
    if (result[i] !== 'correct') {
      for (let j = 0; j < 5; j++) {
        if (!used[j] && guessChars[i] === targetChars[j]) {
          result[i] = 'present';
          used[j] = true;
          break;
        }
      }
    }
  }

  return result;
}
