import { Difficulty } from '../../types';

export type SudokuGrid = number[][]; // 0 = empty, 1-9 = filled
export type SudokuCell = {
  value: number;
  isFixed: boolean; // Pre-filled cells cannot be edited
};

export type SudokuBoard = SudokuCell[][];

export interface SudokuConfig {
  prefilled: number; // Number of cells to pre-fill
}

const SUDOKU_CONFIGS: Record<Difficulty, SudokuConfig> = {
  easy: { prefilled: 43 },
  medium: { prefilled: 33 },
  hard: { prefilled: 27 },
};

export function getSudokuConfig(difficulty: Difficulty): SudokuConfig {
  return SUDOKU_CONFIGS[difficulty];
}

// Check if a number is valid in a specific position
export function isValid(grid: SudokuGrid, row: number, col: number, num: number): boolean {
  // Check row
  for (let c = 0; c < 9; c++) {
    if (c !== col && grid[row][c] === num) return false;
  }

  // Check column
  for (let r = 0; r < 9; r++) {
    if (r !== row && grid[r][col] === num) return false;
  }

  // Check 3x3 box
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if ((r !== row || c !== col) && grid[r][c] === num) return false;
    }
  }

  return true;
}

// Solve sudoku using backtracking
function solveSudoku(grid: SudokuGrid): boolean {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (grid[row][col] === 0) {
        const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
        for (const num of numbers) {
          if (isValid(grid, row, col, num)) {
            grid[row][col] = num;
            if (solveSudoku(grid)) return true;
            grid[row][col] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

// Generate a complete solved sudoku grid
function generateSolvedGrid(): SudokuGrid {
  const grid: SudokuGrid = Array(9)
    .fill(0)
    .map(() => Array(9).fill(0));
  solveSudoku(grid);
  return grid;
}

// Remove cells to create puzzle
function removeNumbers(grid: SudokuGrid, cellsToRemove: number): void {
  let removed = 0;
  while (removed < cellsToRemove) {
    const row = Math.floor(Math.random() * 9);
    const col = Math.floor(Math.random() * 9);
    if (grid[row][col] !== 0) {
      grid[row][col] = 0;
      removed++;
    }
  }
}

// Generate a new sudoku puzzle
export function generateSudoku(difficulty: Difficulty): SudokuBoard {
  const config = getSudokuConfig(difficulty);
  const solvedGrid = generateSolvedGrid();
  const puzzleGrid = solvedGrid.map((row) => [...row]);
  
  const cellsToRemove = 81 - config.prefilled;
  removeNumbers(puzzleGrid, cellsToRemove);

  const board: SudokuBoard = [];
  for (let r = 0; r < 9; r++) {
    const row: SudokuCell[] = [];
    for (let c = 0; c < 9; c++) {
      row.push({
        value: puzzleGrid[r][c],
        isFixed: puzzleGrid[r][c] !== 0,
      });
    }
    board.push(row);
  }

  return board;
}

// Check if the board is completely and correctly filled
export function isSolved(board: SudokuBoard): boolean {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const val = board[row][col].value;
      if (val === 0) return false;

      // Temporarily clear the cell to check validity
      const temp = board[row][col].value;
      board[row][col].value = 0;
      const grid = board.map((r) => r.map((c) => c.value));
      const valid = isValid(grid, row, col, temp);
      board[row][col].value = temp;

      if (!valid) return false;
    }
  }
  return true;
}

// Get conflicts for a specific cell
export function getConflicts(board: SudokuBoard, row: number, col: number): boolean {
  const val = board[row][col].value;
  if (val === 0) return false;

  const grid = board.map((r) => r.map((c) => c.value));
  return !isValid(grid, row, col, val);
}
