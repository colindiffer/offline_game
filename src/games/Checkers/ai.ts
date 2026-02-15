import { Board, PieceColor, Move } from './types';
import { getAllValidMoves, makeMove, getOpponent, countPieces } from './logic';

export function evaluateBoard(board: Board, player: PieceColor): number {
  const { black, red } = countPieces(board);
  const opponent = getOpponent(player);
  
  let score = 0;
  
  // Piece count (kings worth more)
  let playerPieces = 0;
  let playerKings = 0;
  let opponentPieces = 0;
  let opponentKings = 0;
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece) {
        if (piece.color === player) {
          playerPieces++;
          if (piece.type === 'king') playerKings++;
        } else {
          opponentPieces++;
          if (piece.type === 'king') opponentKings++;
        }
      }
    }
  }
  
  score += (playerPieces - opponentPieces) * 100;
  score += (playerKings - opponentKings) * 50;
  
  // Positional advantage - pieces closer to kinging
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.type === 'man') {
        if (piece.color === player) {
          const advancement = player === 'black' ? row : (7 - row);
          score += advancement * 5;
        } else {
          const advancement = opponent === 'black' ? row : (7 - row);
          score -= advancement * 5;
        }
      }
    }
  }
  
  // Mobility (number of valid moves)
  const playerMoves = getAllValidMoves(board, player).length;
  const opponentMoves = getAllValidMoves(board, opponent).length;
  score += (playerMoves - opponentMoves) * 10;
  
  return score;
}

export function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  maximizingPlayer: boolean,
  player: PieceColor
): number {
  if (depth === 0) {
    return evaluateBoard(board, player);
  }
  
  const currentPlayer = maximizingPlayer ? player : getOpponent(player);
  const moves = getAllValidMoves(board, currentPlayer);
  
  if (moves.length === 0) {
    // Game over - opponent wins
    return maximizingPlayer ? -10000 : 10000;
  }
  
  if (maximizingPlayer) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const newBoard = makeMove(board, move);
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
      const newBoard = makeMove(board, move);
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

export function getBestMove(board: Board, player: PieceColor, depth: number): Move | null {
  const moves = getAllValidMoves(board, player);
  
  if (moves.length === 0) {
    return null;
  }
  
  if (depth <= 2) {
    // Easy mode - prioritize captures, then random
    const captureMoves = moves.filter(m => m.captures.length > 0);
    if (captureMoves.length > 0) {
      return captureMoves[Math.floor(Math.random() * captureMoves.length)];
    }
    return moves[Math.floor(Math.random() * moves.length)];
  }
  
  let bestMove = moves[0];
  let bestValue = -Infinity;
  
  for (const move of moves) {
    const newBoard = makeMove(board, move);
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
      return 2;
    case 'medium':
      return 4;
    case 'hard':
      return 6;
    default:
      return 4;
  }
}
