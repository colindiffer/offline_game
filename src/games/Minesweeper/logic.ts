import { Difficulty } from '../../types';

export type CellState = 'hidden' | 'revealed' | 'flagged';

export interface Cell {
  row: number;
  col: number;
  isMine: boolean;
  minesAround: number;
  state: CellState;
}

export type Board = Cell[][];

export interface GameConfig {
  rows: number;
  cols: number;
  mines: number;
}

export function getGameConfig(difficulty: Difficulty, level: number = 1): GameConfig {
  const baseSize = difficulty === 'easy' ? 8 : difficulty === 'medium' ? 12 : 16;
  const baseMines = difficulty === 'easy' ? 10 : difficulty === 'medium' ? 25 : 50;
  
  const size = Math.min(baseSize + Math.floor((level - 1) / 10), 24);
  const mines = Math.min(baseMines + (level - 1), Math.floor(size * size * 0.3));
  
  return { rows: size, cols: size, mines };
}

export function createBoard(difficulty: Difficulty, firstClickRow: number, firstClickCol: number, level: number = 1): Board {
  const { rows, cols, mines } = getGameConfig(difficulty, level);
  let board: Board = Array(rows)
    .fill(0)
    .map((_, r) =>
      Array(cols)
        .fill(0)
        .map((__, c) => ({
          row: r,
          col: c,
          isMine: false,
          minesAround: 0,
          state: 'hidden',
        }))
    );

  let minesPlaced = 0;
  while (minesPlaced < mines) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);

    // Ensure first click area is clear
    if (
      !board[r][c].isMine &&
      (Math.abs(r - firstClickRow) > 1 || Math.abs(c - firstClickCol) > 1)
    ) {
      board[r][c].isMine = true;
      minesPlaced++;
    }
  }

  // Calculate mines around each cell
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!board[r][c].isMine) {
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr;
            const nc = c + dc;
            if (
              nr >= 0 &&
              nr < rows &&
              nc >= 0 &&
              nc < cols &&
              board[nr][nc].isMine
            ) {
              count++;
            }
          }
        }
        board[r][c].minesAround = count;
      }
    }
  }
  return board;
}

export function revealCell(board: Board, row: number, col: number): Board {
  if (row < 0 || row >= board.length || col < 0 || col >= board[0].length) {
    return board;
  }
  const cell = board[row][col];
  if (cell.state !== 'hidden') {
    return board;
  }

  cell.state = 'revealed';

  if (cell.minesAround === 0 && !cell.isMine) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        revealCell(board, row + dr, col + dc);
      }
    }
  }
  return board;
}

export function toggleFlag(board: Board, row: number, col: number): Board {
  if (row < 0 || row >= board.length || col < 0 || col >= board[0].length) {
    return board;
  }
  const cell = board[row][col];
  if (cell.state === 'revealed') {
    return board;
  }
  cell.state = cell.state === 'flagged' ? 'hidden' : 'flagged';
  return board;
}

export function checkWin(board: Board): boolean {
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[0].length; c++) {
      const cell = board[r][c];
      if (cell.isMine && cell.state !== 'flagged') {
        return false;
      }
      if (!cell.isMine && cell.state !== 'revealed') {
        return false;
      }
    }
  }
  return true;
}

export function checkLoss(board: Board): boolean {
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[0].length; c++) {
      const cell = board[r][c];
      if (cell.isMine && cell.state === 'revealed') {
        return true;
      }
    }
  }
  return false;
}
