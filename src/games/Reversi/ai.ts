import { Board, Player, Move } from './types';
import { getValidMoves, makeMove, getOpponent, countPieces } from './logic';

// Positional weights - corners and edges are valuable
const POSITION_WEIGHTS = [
  [100, -20, 10,  5,  5, 10, -20, 100],
  [-20, -50, -2, -2, -2, -2, -50, -20],
  [ 10,  -2, -1, -1, -1, -1,  -2,  10],
  [  5,  -2, -1, -1, -1, -1,  -2,   5],
  [  5,  -2, -1, -1, -1, -1,  -2,   5],
  [ 10,  -2, -1, -1, -1, -1,  -2,  10],
  [-20, -50, -2, -2, -2, -2, -50, -20],
  [100, -20, 10,  5,  5, 10, -20, 100],
];

export function evaluateBoard(board: Board, player: Player): number {
  const { black, white } = countPieces(board);
  const opponent = getOpponent(player);
  
  let score = 0;
  
  // Piece count difference
  const pieceScore = player === 'black' ? black - white : white - black;
  score += pieceScore;
  
  // Positional score
  let positionScore = 0;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (board[row][col] === player) {
        positionScore += POSITION_WEIGHTS[row][col];
      } else if (board[row][col] === opponent) {
        positionScore -= POSITION_WEIGHTS[row][col];
      }
    }
  }
  score += positionScore * 2;
  
  // Mobility (number of valid moves)
  const playerMoves = getValidMoves(board, player).length;
  const opponentMoves = getValidMoves(board, opponent).length;
  score += (playerMoves - opponentMoves) * 5;
  
  return score;
}

export function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  maximizingPlayer: boolean,
  player: Player
): number {
  if (depth === 0) {
    return evaluateBoard(board, player);
  }
  
  const currentPlayer = maximizingPlayer ? player : getOpponent(player);
  const moves = getValidMoves(board, currentPlayer);
  
  if (moves.length === 0) {
    // Pass turn or game over
    const opponentMoves = getValidMoves(board, getOpponent(currentPlayer));
    if (opponentMoves.length === 0) {
      // Game over
      return evaluateBoard(board, player);
    }
    // Pass turn
    return minimax(board, depth - 1, alpha, beta, !maximizingPlayer, player);
  }
  
  if (maximizingPlayer) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const newBoard = makeMove(board, move, currentPlayer);
      const evaluation = minimax(newBoard, depth - 1, alpha, beta, false, player);
      maxEval = Math.max(maxEval, evaluation);
      alpha = Math.max(alpha, evaluation);
      if (beta <= alpha) {
        break; // Alpha-beta pruning
      }
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const newBoard = makeMove(board, move, currentPlayer);
      const evaluation = minimax(newBoard, depth - 1, alpha, beta, true, player);
      minEval = Math.min(minEval, evaluation);
      beta = Math.min(beta, evaluation);
      if (beta <= alpha) {
        break; // Alpha-beta pruning
      }
    }
    return minEval;
  }
}

export function getBestMove(board: Board, player: Player, depth: number): Move | null {
  const moves = getValidMoves(board, player);
  
  if (moves.length === 0) {
    return null;
  }
  
  if (depth === 1) {
    // Easy mode - just pick move with most flips
    return moves.reduce((best, move) => 
      move.flips.length > best.flips.length ? move : best
    );
  }
  
  let bestMove = moves[0];
  let bestValue = -Infinity;
  
  for (const move of moves) {
    const newBoard = makeMove(board, move, player);
    const value = minimax(newBoard, depth - 1, -Infinity, Infinity, false, player);
    
    if (value > bestValue) {
      bestValue = value;
      bestMove = move;
    }
  }
  
  return bestMove;
}

export function getAIDifficulty(difficulty: string): number {
  switch (difficulty) {
    case 'easy':
      return 1;
    case 'medium':
      return 3;
    case 'hard':
      return 5;
    default:
      return 3;
  }
}
