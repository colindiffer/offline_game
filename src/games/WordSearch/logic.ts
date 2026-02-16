import { Difficulty } from '../../types';

export type Position = { row: number; col: number };

export interface WordSearchGrid {
  letters: string[][];
  words: string[];
  foundWords: string[];
}

const WORD_LISTS: Record<string, string[]> = {
  animals: ['LION', 'TIGER', 'BEAR', 'WOLF', 'DEER', 'SNAKE', 'SHARK', 'WHALE', 'ZEBRA', 'HORSE', 'EAGLE', 'FROG'],
  nature: ['TREE', 'RIVER', 'MOUNT', 'FOREST', 'FLOWER', 'OCEAN', 'CLOUD', 'STORM', 'GRASS', 'DESERT', 'VALLEY', 'LAKE'],
  fruits: ['APPLE', 'MANGO', 'PEACH', 'BERRY', 'LEMON', 'GRAPE', 'MELON', 'PLUM', 'PEAR', 'KIWI', 'CHERRY', 'BANANA'],
  tech: ['CODE', 'DATA', 'CHIP', 'WEB', 'CLOUD', 'LOGIC', 'PIXEL', 'BYTE', 'ARRAY', 'LINK', 'TECH', 'USER'],
};

export function generateWordSearch(difficulty: Difficulty, level: number = 1): WordSearchGrid {
  const baseSize = difficulty === 'easy' ? 8 : difficulty === 'medium' ? 10 : 12;
  const baseWords = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 7 : 10;
  
  // Growth: +1 size every 8 levels, +1 word every 3 levels
  const size = Math.min(baseSize + Math.floor((level - 1) / 8), 16);
  const wordCount = Math.min(baseWords + Math.floor((level - 1) / 3), 15);
  
  let allowDiagonals = difficulty !== 'easy' || level > 5;
  let allowReversed = difficulty === 'hard' || (difficulty === 'medium' && level > 10);

  const grid: string[][] = Array(size).fill(null).map(() => Array(size).fill(''));
  const allThemes = Object.keys(WORD_LISTS);
  const theme = allThemes[Math.floor(Math.random() * allThemes.length)];
  const pool = [...WORD_LISTS[theme]];
  const selectedWords: string[] = [];

  // Pick words
  for (let i = 0; i < wordCount && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    selectedWords.push(pool.splice(idx, 1)[0]);
  }

  const directions = [
    { r: 0, c: 1 }, // Horizontal
    { r: 1, c: 0 }, // Vertical
  ];
  if (allowDiagonals) {
    directions.push({ r: 1, c: 1 }, { r: 1, c: -1 });
  }

  // Place words
  selectedWords.forEach(word => {
    let placed = false;
    let attempts = 0;
    
    while (!placed && attempts < 100) {
      attempts++;
      const dir = directions[Math.floor(Math.random() * directions.length)];
      let isReverse = allowReversed && Math.random() > 0.5;
      const actualWord = isReverse ? word.split('').reverse().join('') : word;
      
      const startR = Math.floor(Math.random() * size);
      const startC = Math.floor(Math.random() * size);
      
      const endR = startR + dir.r * (actualWord.length - 1);
      const endC = startC + dir.c * (actualWord.length - 1);
      
      if (endR >= 0 && endR < size && endC >= 0 && endC < size) {
        let fits = true;
        for (let i = 0; i < actualWord.length; i++) {
          const r = startR + dir.r * i;
          const c = startC + dir.c * i;
          if (grid[r][c] !== '' && grid[r][c] !== actualWord[i]) {
            fits = false;
            break;
          }
        }
        
        if (fits) {
          for (let i = 0; i < actualWord.length; i++) {
            grid[startR + dir.r * i][startC + dir.c * i] = actualWord[i];
          }
          placed = true;
        }
      }
    }
  });

  // Fill empty
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === '') {
        grid[r][c] = alphabet[Math.floor(Math.random() * alphabet.length)];
      }
    }
  }

  return {
    letters: grid,
    words: selectedWords,
    foundWords: [],
  };
}

export function getSelectedWord(grid: string[][], start: Position, end: Position): { word: string; cells: Position[] } | null {
  const dr = end.row - start.row;
  const dc = end.col - start.col;
  const dist = Math.max(Math.abs(dr), Math.abs(dc));
  
  if (dist === 0) return { word: grid[start.row][start.col], cells: [start] };

  // Check if it's a straight line (horizontal, vertical, or 45-deg diagonal)
  const isHorizontal = dr === 0;
  const isVertical = dc === 0;
  const isDiagonal = Math.abs(dr) === Math.abs(dc);

  if (!isHorizontal && !isVertical && !isDiagonal) return null;

  const unitR = dr === 0 ? 0 : dr / Math.abs(dr);
  const unitC = dc === 0 ? 0 : dc / Math.abs(dc);

  let word = '';
  const cells: Position[] = [];
  for (let i = 0; i <= dist; i++) {
    const r = start.row + unitR * i;
    const c = start.col + unitC * i;
    word += grid[r][c];
    cells.push({ row: r, col: c });
  }

  return { word, cells };
}
