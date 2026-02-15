import { Difficulty } from '../../types';

export type TetrominoShape = number[][];
export type TetrominoType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';
export type TetrisBoard = (TetrominoType | 0)[][];

export const TETROMINOS: Record<TetrominoType, TetrominoShape> = {
  I: [[1, 1, 1, 1]],
  J: [[1, 0, 0], [1, 1, 1]],
  L: [[0, 0, 1], [1, 1, 1]],
  O: [[1, 1], [1, 1]],
  S: [[0, 1, 1], [1, 1, 0]],
  T: [[0, 1, 0], [1, 1, 1]],
  Z: [[1, 1, 0], [0, 1, 1]],
};

export const TETROMINO_COLORS: Record<TetrominoType, string> = {
  I: '#00FFFF', // Cyan
  J: '#0000FF', // Blue
  L: '#FFA500', // Orange
  O: '#FFFF00', // Yellow
  S: '#00FF00', // Green
  T: '#800080', // Purple
  Z: '#FF0000', // Red
};

export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;

export interface GameConfig {
  startSpeed: number; // ms per tick
  speedUp: number; // ms reduction per level
}

const GAME_CONFIGS: Record<Difficulty, GameConfig> = {
  easy: { startSpeed: 800, speedUp: 30 },
  medium: { startSpeed: 600, speedUp: 40 },
  hard: { startSpeed: 400, speedUp: 50 },
};

export function createEmptyBoard(): TetrisBoard {
  return Array(BOARD_HEIGHT)
    .fill(0)
    .map(() => Array(BOARD_WIDTH).fill(0));
}

export function getRandomTetromino(): { shape: TetrominoShape; type: TetrominoType } {
  const types: TetrominoType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
  const type = types[Math.floor(Math.random() * types.length)];
  return { shape: TETROMINOS[type], type };
}

export function rotateTetromino(shape: TetrominoShape): TetrominoShape {
  const rows = shape.length;
  const cols = shape[0].length;
  const newShape: TetrominoShape = Array(cols)
    .fill(0)
    .map(() => Array(rows).fill(0));

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      newShape[c][rows - 1 - r] = shape[r][c];
    }
  }
  return newShape;
}

export function isValidMove(
  board: TetrisBoard,
  shape: TetrominoShape,
  row: number,
  col: number
): boolean {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[0].length; c++) {
      if (shape[r][c] !== 0) {
        const boardRow = row + r;
        const boardCol = col + c;

        if (
          boardRow < 0 ||
          boardRow >= BOARD_HEIGHT ||
          boardCol < 0 ||
          boardCol >= BOARD_WIDTH ||
          (board[boardRow][boardCol] !== 0)
        ) {
          return false;
        }
      }
    }
  }
  return true;
}

export function mergeTetromino(
  board: TetrisBoard,
  shape: TetrominoShape,
  row: number,
  col: number,
  type: TetrominoType
): TetrisBoard {
  const newBoard = board.map((r) => [...r]);
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[0].length; c++) {
      if (shape[r][c] !== 0) {
        newBoard[row + r][col + c] = type;
      }
    }
  }
  return newBoard;
}

export function clearLines(board: TetrisBoard): { newBoard: TetrisBoard; clearedLines: number } {
  let clearedLines = 0;
  const newBoard = board.filter((row) => !row.every((cell) => cell !== 0));
  clearedLines = BOARD_HEIGHT - newBoard.length;
  while (newBoard.length < BOARD_HEIGHT) {
    newBoard.unshift(Array(BOARD_WIDTH).fill(0));
  }
  return { newBoard, clearedLines };
}

export function getSpeed(difficulty: Difficulty, level: number): number {
  const config = GAME_CONFIGS[difficulty];
  const speed = config.startSpeed - (level - 1) * config.speedUp;
  return Math.max(speed, 100); // Cap at 100ms
}

export function calculateScore(clearedLines: number, level: number): number {
  const points = [0, 100, 300, 500, 800]; // Points for 0, 1, 2, 3, 4 lines
  return points[clearedLines] * level;
}
