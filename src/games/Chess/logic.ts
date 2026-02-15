import { Board, Cell, Piece, PieceColor, PieceType, Position, Move, GameState } from './types';

const BOARD_SIZE = 8;

export function createEmptyBoard(): Board {
  return Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
}

export function initializeBoard(): Board {
  const board = createEmptyBoard();
  
  // Pawns
  for (let col = 0; col < 8; col++) {
    board[1][col] = { type: 'pawn', color: 'black', hasMoved: false };
    board[6][col] = { type: 'pawn', color: 'white', hasMoved: false };
  }
  
  // Rooks
  board[0][0] = { type: 'rook', color: 'black', hasMoved: false };
  board[0][7] = { type: 'rook', color: 'black', hasMoved: false };
  board[7][0] = { type: 'rook', color: 'white', hasMoved: false };
  board[7][7] = { type: 'rook', color: 'white', hasMoved: false };
  
  // Knights
  board[0][1] = { type: 'knight', color: 'black', hasMoved: false };
  board[0][6] = { type: 'knight', color: 'black', hasMoved: false };
  board[7][1] = { type: 'knight', color: 'white', hasMoved: false };
  board[7][6] = { type: 'knight', color: 'white', hasMoved: false };
  
  // Bishops
  board[0][2] = { type: 'bishop', color: 'black', hasMoved: false };
  board[0][5] = { type: 'bishop', color: 'black', hasMoved: false };
  board[7][2] = { type: 'bishop', color: 'white', hasMoved: false };
  board[7][5] = { type: 'bishop', color: 'white', hasMoved: false };
  
  // Queens
  board[0][3] = { type: 'queen', color: 'black', hasMoved: false };
  board[7][3] = { type: 'queen', color: 'white', hasMoved: false };
  
  // Kings
  board[0][4] = { type: 'king', color: 'black', hasMoved: false };
  board[7][4] = { type: 'king', color: 'white', hasMoved: false };
  
  return board;
}

export function isValidPosition(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

export function getOpponent(player: PieceColor): PieceColor {
  return player === 'white' ? 'black' : 'white';
}

export function getPieceSymbol(piece: Piece): string {
  const symbols = {
    white: { king: '♔', queen: '♕', rook: '♖', bishop: '♗', knight: '♘', pawn: '♙' },
    black: { king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟' },
  };
  return symbols[piece.color][piece.type];
}

export function getPseudoLegalMoves(board: Board, pos: Position, enPassantTarget: Position | null): Move[] {
  const piece = board[pos.row][pos.col];
  if (!piece) return [];
  
  const moves: Move[] = [];
  const { row, col } = pos;
  
  switch (piece.type) {
    case 'pawn':
      const direction = piece.color === 'white' ? -1 : 1;
      const startRow = piece.color === 'white' ? 6 : 1;
      
      // Forward move
      if (isValidPosition(row + direction, col) && !board[row + direction][col]) {
        moves.push({ from: pos, to: { row: row + direction, col } });
        
        // Double move from start
        if (row === startRow && !board[row + direction * 2][col]) {
          moves.push({ from: pos, to: { row: row + direction * 2, col } });
        }
      }
      
      // Captures
      for (const dc of [-1, 1]) {
        if (isValidPosition(row + direction, col + dc)) {
          const target = board[row + direction][col + dc];
          if (target && target.color !== piece.color) {
            moves.push({ 
              from: pos, 
              to: { row: row + direction, col: col + dc },
              capturedPiece: target 
            });
          }
          
          // En passant
          if (enPassantTarget && 
              enPassantTarget.row === row + direction && 
              enPassantTarget.col === col + dc) {
            moves.push({
              from: pos,
              to: { row: row + direction, col: col + dc },
              isEnPassant: true,
              capturedPiece: board[row][col + dc] || undefined,
            });
          }
        }
      }
      break;
      
    case 'knight':
      const knightMoves = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1],
      ];
      for (const [dr, dc] of knightMoves) {
        const newRow = row + dr;
        const newCol = col + dc;
        if (isValidPosition(newRow, newCol)) {
          const target = board[newRow][newCol];
          if (!target || target.color !== piece.color) {
            moves.push({ 
              from: pos, 
              to: { row: newRow, col: newCol },
              capturedPiece: target || undefined 
            });
          }
        }
      }
      break;
      
    case 'bishop':
      addSlidingMoves(board, pos, piece, moves, [[-1, -1], [-1, 1], [1, -1], [1, 1]]);
      break;
      
    case 'rook':
      addSlidingMoves(board, pos, piece, moves, [[-1, 0], [1, 0], [0, -1], [0, 1]]);
      break;
      
    case 'queen':
      addSlidingMoves(board, pos, piece, moves, [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1],
      ]);
      break;
      
    case 'king':
      const kingMoves = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1],
      ];
      for (const [dr, dc] of kingMoves) {
        const newRow = row + dr;
        const newCol = col + dc;
        if (isValidPosition(newRow, newCol)) {
          const target = board[newRow][newCol];
          if (!target || target.color !== piece.color) {
            moves.push({ 
              from: pos, 
              to: { row: newRow, col: newCol },
              capturedPiece: target || undefined 
            });
          }
        }
      }
      
      // Castling
      if (!piece.hasMoved) {
        // Kingside
        if (board[row][7]?.type === 'rook' && 
            !board[row][7]?.hasMoved &&
            !board[row][5] && !board[row][6]) {
          moves.push({ 
            from: pos, 
            to: { row, col: col + 2 },
            isCastling: true 
          });
        }
        // Queenside
        if (board[row][0]?.type === 'rook' && 
            !board[row][0]?.hasMoved &&
            !board[row][1] && !board[row][2] && !board[row][3]) {
          moves.push({ 
            from: pos, 
            to: { row, col: col - 2 },
            isCastling: true 
          });
        }
      }
      break;
  }
  
  return moves;
}

function addSlidingMoves(
  board: Board,
  pos: Position,
  piece: Piece,
  moves: Move[],
  directions: number[][]
): void {
  for (const [dr, dc] of directions) {
    let newRow = pos.row + dr;
    let newCol = pos.col + dc;
    
    while (isValidPosition(newRow, newCol)) {
      const target = board[newRow][newCol];
      
      if (!target) {
        moves.push({ from: pos, to: { row: newRow, col: newCol } });
      } else {
        if (target.color !== piece.color) {
          moves.push({ 
            from: pos, 
            to: { row: newRow, col: newCol },
            capturedPiece: target 
          });
        }
        break;
      }
      
      newRow += dr;
      newCol += dc;
    }
  }
}

export function isSquareUnderAttack(board: Board, pos: Position, byColor: PieceColor): boolean {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col];
      if (piece && piece.color === byColor) {
        const moves = getPseudoLegalMoves(board, { row, col }, null);
        if (moves.some(m => m.to.row === pos.row && m.to.col === pos.col)) {
          return true;
        }
      }
    }
  }
  return false;
}

export function findKing(board: Board, color: PieceColor): Position | null {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col];
      if (piece && piece.type === 'king' && piece.color === color) {
        return { row, col };
      }
    }
  }
  return null;
}

export function isKingInCheck(board: Board, color: PieceColor): boolean {
  const kingPos = findKing(board, color);
  if (!kingPos) return false;
  return isSquareUnderAttack(board, kingPos, getOpponent(color));
}

export function makeMove(board: Board, move: Move): Board {
  const newBoard = board.map(row => [...row]);
  const piece = newBoard[move.from.row][move.from.col];
  
  if (!piece) return board;
  
  // Handle en passant
  if (move.isEnPassant) {
    newBoard[move.from.row][move.to.col] = null;
  }
  
  // Handle castling
  if (move.isCastling) {
    const row = move.from.row;
    if (move.to.col > move.from.col) {
      // Kingside
      newBoard[row][5] = newBoard[row][7]!;
      newBoard[row][7] = null;
      newBoard[row][5]!.hasMoved = true;
    } else {
      // Queenside
      newBoard[row][3] = newBoard[row][0]!;
      newBoard[row][0] = null;
      newBoard[row][3]!.hasMoved = true;
    }
  }
  
  // Move the piece
  newBoard[move.to.row][move.to.col] = { ...piece, hasMoved: true };
  newBoard[move.from.row][move.from.col] = null;
  
  // Handle pawn promotion
  if (piece.type === 'pawn') {
    if ((piece.color === 'white' && move.to.row === 0) ||
        (piece.color === 'black' && move.to.row === 7)) {
      newBoard[move.to.row][move.to.col] = {
        ...piece,
        type: move.promotion || 'queen',
        hasMoved: true,
      };
    }
  }
  
  return newBoard;
}

export function isLegalMove(board: Board, move: Move): boolean {
  const piece = board[move.from.row][move.from.col];
  if (!piece) return false;
  
  // Make the move
  const newBoard = makeMove(board, move);
  
  // Check if king is in check after move
  return !isKingInCheck(newBoard, piece.color);
}

export function getLegalMoves(board: Board, pos: Position, enPassantTarget: Position | null): Move[] {
  const pseudoMoves = getPseudoLegalMoves(board, pos, enPassantTarget);
  return pseudoMoves.filter(move => isLegalMove(board, move));
}

export function getAllLegalMoves(board: Board, color: PieceColor, enPassantTarget: Position | null): Move[] {
  const moves: Move[] = [];
  
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col];
      if (piece && piece.color === color) {
        const pieceMoves = getLegalMoves(board, { row, col }, enPassantTarget);
        moves.push(...pieceMoves);
      }
    }
  }
  
  return moves;
}

export function initializeGame(): GameState {
  const board = initializeBoard();
  const currentPlayer: PieceColor = 'white';
  const validMoves = getAllLegalMoves(board, currentPlayer, null);
  
  return {
    board,
    currentPlayer,
    selectedPiece: null,
    validMoves,
    isCheck: false,
    isCheckmate: false,
    isStalemate: false,
    capturedWhite: [],
    capturedBlack: [],
    lastMove: null,
    enPassantTarget: null,
  };
}
