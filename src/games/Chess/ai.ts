import { Board, PieceColor, Piece, Move } from './types';
import { getAllLegalMoves, makeMove, getOpponent, isKingInCheck } from './logic';

// Piece values
const PIECE_VALUES = {
  pawn: 100,
  knight: 320,
  bishop: 330,
  rook: 500,
  queen: 900,
  king: 20000,
};

// Positional bonuses (simplified piece-square tables)
const PAWN_TABLE = [
  [0,  0,  0,  0,  0,  0,  0,  0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5,  5, 10, 25, 25, 10,  5,  5],
  [0,  0,  0, 20, 20,  0,  0,  0],
  [5, -5,-10,  0,  0,-10, -5,  5],
  [5, 10, 10,-20,-20, 10, 10,  5],
  [0,  0,  0,  0,  0,  0,  0,  0],
];

const KNIGHT_TABLE = [
  [-50,-40,-30,-30,-30,-30,-40,-50],
  [-40,-20,  0,  0,  0,  0,-20,-40],
  [-30,  0, 10, 15, 15, 10,  0,-30],
  [-30,  5, 15, 20, 20, 15,  5,-30],
  [-30,  0, 15, 20, 20, 15,  0,-30],
  [-30,  5, 10, 15, 15, 10,  5,-30],
  [-40,-20,  0,  5,  5,  0,-20,-40],
  [-50,-40,-30,-30,-30,-30,-40,-50],
];

export function evaluateBoard(board: Board, player: PieceColor): number {
  let score = 0;
  const opponent = getOpponent(player);
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece) continue;
      
      const pieceValue = PIECE_VALUES[piece.type];
      let positionalBonus = 0;
      
      // Add positional bonuses
      if (piece.type === 'pawn') {
        const tableRow = piece.color === 'white' ? 7 - row : row;
        positionalBonus = PAWN_TABLE[tableRow][col];
      } else if (piece.type === 'knight') {
        const tableRow = piece.color === 'white' ? 7 - row : row;
        positionalBonus = KNIGHT_TABLE[tableRow][col];
      }
      
      const totalValue = pieceValue + positionalBonus;
      
      if (piece.color === player) {
        score += totalValue;
      } else {
        score -= totalValue;
      }
    }
  }
  
  // Bonus for check
  if (isKingInCheck(board, opponent)) {
    score += 50;
  }
  if (isKingInCheck(board, player)) {
    score -= 50;
  }
  
  return score;
}

export function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  maximizingPlayer: boolean,
  player: PieceColor,
  enPassantTarget: any
): number {
  if (depth === 0) {
    return evaluateBoard(board, player);
  }
  
  const currentPlayer = maximizingPlayer ? player : getOpponent(player);
  const moves = getAllLegalMoves(board, currentPlayer, enPassantTarget);
  
  if (moves.length === 0) {
    // Checkmate or stalemate
    if (isKingInCheck(board, currentPlayer)) {
      return maximizingPlayer ? -50000 : 50000; // Checkmate
    }
    return 0; // Stalemate
  }
  
  if (maximizingPlayer) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const newBoard = makeMove(board, move);
      const evaluation = minimax(newBoard, depth - 1, alpha, beta, false, player, null);
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
      const evaluation = minimax(newBoard, depth - 1, alpha, beta, true, player, null);
      minEval = Math.min(minEval, evaluation);
      beta = Math.min(beta, evaluation);
      if (beta <= alpha) {
        break; // Alpha-beta pruning
      }
    }
    return minEval;
  }
}

export function getBestMove(board: Board, player: PieceColor, depth: number, enPassantTarget: any): Move | null {
  const moves = getAllLegalMoves(board, player, enPassantTarget);
  
  if (moves.length === 0) {
    return null;
  }
  
  if (depth === 1) {
    // Easy mode - random but prioritize captures
    const captureMoves = moves.filter(m => m.capturedPiece);
    if (captureMoves.length > 0) {
      return captureMoves[Math.floor(Math.random() * captureMoves.length)];
    }
    return moves[Math.floor(Math.random() * moves.length)];
  }
  
  let bestMove = moves[0];
  let bestValue = -Infinity;
  
  for (const move of moves) {
    const newBoard = makeMove(board, move);
    const value = minimax(newBoard, depth - 1, -Infinity, Infinity, false, player, null);
    
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
      return 2;
    case 'hard':
      return 3;
    default:
      return 2;
  }
}
