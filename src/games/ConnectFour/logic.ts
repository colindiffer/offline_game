import { Difficulty } from '../../types';

export type Player = 'R' | 'Y' | null; // Red, Yellow, or Empty
export type Board = Player[][];

export interface GameConfig {
  rows: number;
  cols: number;
  aiDifficulty: number; // Probability of optimal move (0-1)
}

const GAME_CONFIGS: Record<Difficulty, GameConfig> = {
  easy: { rows: 6, cols: 7, aiDifficulty: 0.3 },
  medium: { rows: 6, cols: 7, aiDifficulty: 0.6 },
  hard: { rows: 6, cols: 7, aiDifficulty: 0.9 },
};

export function createEmptyBoard(difficulty: Difficulty): Board {
  const { rows, cols } = GAME_CONFIGS[difficulty];
  return Array(rows)
    .fill(0)
    .map(() => Array(cols).fill(null));
}

export function dropPiece(board: Board, col: number, player: Player): Board | null {
  const newBoard = board.map((row) => [...row]);
  for (let r = newBoard.length - 1; r >= 0; r--) {
    if (newBoard[r][col] === null) {
      newBoard[r][col] = player;
      return newBoard;
    }
  }
  return null; // Column is full
}

export function checkWinner(board: Board): Player {
  const numRows = board.length;
  const numCols = board[0].length;

  const directions = [
    [1, 0], // Horizontal
    [0, 1], // Vertical
    [1, 1], // Diagonal 
    [1, -1], // Diagonal /
  ];

  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < numCols; c++) {
      const player = board[r][c];
      if (player === null) continue;

      for (const [dr, dc] of directions) {
        let count = 0;
        for (let i = 0; i < 4; i++) {
          const nr = r + dr * i;
          const nc = c + dc * i;
          if (
            nr >= 0 && nr < numRows &&
            nc >= 0 && nc < numCols &&
            board[nr][nc] === player
          ) {
            count++;
          } else {
            break;
          }
        }
        if (count === 4) return player;
      }
    }
  }
  return null;
}

export function isBoardFull(board: Board): boolean {
  return board[0].every((cell) => cell !== null);
}

// AI Logic (Minimax with Alpha-Beta Pruning - simplified)
// Depth-limited minimax for performance
function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizingPlayer: boolean,
  difficulty: Difficulty
): number {
  const winner = checkWinner(board);
  if (winner === 'Y') return 100000000000000 - depth; // AI wins
  if (winner === 'R') return -10000000000000 + depth; // Player wins
  if (isBoardFull(board) || depth === 0) return 0; // Draw or depth limit reached

  if (isMaximizingPlayer) {
    let bestValue = -Infinity;
    for (let col = 0; col < board[0].length; col++) {
      if (board[0][col] === null) {
        const newBoard = dropPiece(board, col, 'Y')!;
        bestValue = Math.max(
          bestValue,
          minimax(newBoard, depth - 1, alpha, beta, false, difficulty)
        );
        alpha = Math.max(alpha, bestValue);
        if (beta <= alpha) break;
      }
    }
    return bestValue;
  } else {
    let bestValue = Infinity;
    for (let col = 0; col < board[0].length; col++) {
      if (board[0][col] === null) {
        const newBoard = dropPiece(board, col, 'R')!;
        bestValue = Math.min(
          bestValue,
          minimax(newBoard, depth - 1, alpha, beta, true, difficulty)
        );
        beta = Math.min(beta, bestValue);
        if (beta <= alpha) break;
      }
    }
    return bestValue;
  }
}

export function getAIMove(board: Board, difficulty: Difficulty): number {
  const { cols, aiDifficulty } = GAME_CONFIGS[difficulty];
  const availableMoves: number[] = [];
  for (let col = 0; col < cols; col++) {
    if (board[0][col] === null) {
      availableMoves.push(col);
    }
  }

  if (availableMoves.length === 0) return -1;

  if (Math.random() < aiDifficulty) {
    // Play optimally
    let bestMove = -1;
    let bestValue = -Infinity;

    for (const col of availableMoves) {
      const newBoard = dropPiece(board, col, 'Y')!;
      const moveValue = minimax(newBoard, 4, -Infinity, Infinity, false, difficulty); // Depth 4 for reasonable performance
      if (moveValue > bestValue) {
        bestValue = moveValue;
        bestMove = col;
      }
    }
    return bestMove;
  } else {
    // Play randomly
    return availableMoves[Math.floor(Math.random() * availableMoves.length)];
  }
}
