import { Board, Cell, Piece, PieceColor, PieceType, Position, Move, GameState } from './types';

const BOARD_SIZE = 8;

export function createEmptyBoard(): Board {
  return Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
}

export function initializeBoard(): Board {
  const board = createEmptyBoard();
  
  // Place black pieces (top 3 rows, only on dark squares)
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if ((row + col) % 2 === 1) {
        board[row][col] = { color: 'black', type: 'man' };
      }
    }
  }
  
  // Place red pieces (bottom 3 rows, only on dark squares)
  for (let row = 5; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if ((row + col) % 2 === 1) {
        board[row][col] = { color: 'red', type: 'man' };
      }
    }
  }
  
  return board;
}

export function isValidPosition(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

export function isDarkSquare(row: number, col: number): boolean {
  return (row + col) % 2 === 1;
}

export function getOpponent(player: PieceColor): PieceColor {
  return player === 'black' ? 'red' : 'black';
}

export function canKing(piece: Piece, row: number): boolean {
  if (piece.type === 'king') return false;
  if (piece.color === 'black' && row === 7) return true;
  if (piece.color === 'red' && row === 0) return true;
  return false;
}

export function getSimpleMoves(board: Board, pos: Position, piece: Piece): Move[] {
  const moves: Move[] = [];
  const { row, col } = pos;
  
  // Determine valid move directions
  const directions: number[][] = [];
  
  if (piece.type === 'king') {
    directions.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
  } else if (piece.color === 'black') {
    directions.push([1, -1], [1, 1]); // Move down
  } else {
    directions.push([-1, -1], [-1, 1]); // Move up
  }
  
  for (const [dRow, dCol] of directions) {
    const newRow = row + dRow;
    const newCol = col + dCol;
    
    if (isValidPosition(newRow, newCol) && board[newRow][newCol] === null) {
      moves.push({
        from: pos,
        to: { row: newRow, col: newCol },
        captures: [],
      });
    }
  }
  
  return moves;
}

export function getJumpMoves(board: Board, pos: Position, piece: Piece): Move[] {
  const moves: Move[] = [];
  
  function findJumps(currentPos: Position, currentBoard: Board, capturedSoFar: Position[]): void {
    const { row, col } = currentPos;
    let foundJump = false;
    
    // Determine valid jump directions
    const directions: number[][] = [];
    
    if (piece.type === 'king') {
      directions.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
    } else if (piece.color === 'black') {
      directions.push([1, -1], [1, 1]); // Jump down
    } else {
      directions.push([-1, -1], [-1, 1]); // Jump up
    }
    
    for (const [dRow, dCol] of directions) {
      const jumpedRow = row + dRow;
      const jumpedCol = col + dCol;
      const landRow = row + dRow * 2;
      const landCol = col + dCol * 2;
      
      if (!isValidPosition(landRow, landCol)) continue;
      
      const jumpedPiece = currentBoard[jumpedRow]?.[jumpedCol];
      const landCell = currentBoard[landRow]?.[landCol];
      
      // Can jump if: opponent piece is jumped over and landing square is empty
      // and we haven't already captured this piece
      if (jumpedPiece && 
          jumpedPiece.color === getOpponent(piece.color) && 
          landCell === null &&
          !capturedSoFar.some(c => c.row === jumpedRow && c.col === jumpedCol)) {
        
        foundJump = true;
        const newCaptures = [...capturedSoFar, { row: jumpedRow, col: jumpedCol }];
        
        // Simulate the jump
        const newBoard = currentBoard.map(r => [...r]);
        newBoard[landRow][landCol] = newBoard[row][col];
        newBoard[row][col] = null;
        newBoard[jumpedRow][jumpedCol] = null;
        
        // Look for additional jumps from the new position
        const nextPos = { row: landRow, col: landCol };
        const initialLength = moves.length;
        findJumps(nextPos, newBoard, newCaptures);
        
        // If no further jumps, this is a valid terminal move
        if (moves.length === initialLength) {
          moves.push({
            from: pos,
            to: nextPos,
            captures: newCaptures,
          });
        }
      }
    }
    
    // If we didn't find any jumps from this position but we have captures, add the move
    if (!foundJump && capturedSoFar.length > 0) {
      const existingMove = moves.find(m => 
        m.to.row === currentPos.row && 
        m.to.col === currentPos.col &&
        m.captures.length < capturedSoFar.length
      );
      
      if (!existingMove) {
        moves.push({
          from: pos,
          to: currentPos,
          captures: capturedSoFar,
        });
      }
    }
  }
  
  findJumps(pos, board, []);
  return moves;
}

export function getValidMovesForPiece(board: Board, pos: Position): Move[] {
  const piece = board[pos.row][pos.col];
  if (!piece) return [];
  
  const jumpMoves = getJumpMoves(board, pos, piece);
  
  // If jumps are available, only return jumps (mandatory capture rule)
  if (jumpMoves.length > 0) {
    return jumpMoves;
  }
  
  return getSimpleMoves(board, pos, piece);
}

export function getAllValidMoves(board: Board, player: PieceColor): Move[] {
  const allMoves: Move[] = [];
  const jumpMoves: Move[] = [];
  
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col];
      if (piece && piece.color === player) {
        const moves = getValidMovesForPiece(board, { row, col });
        
        for (const move of moves) {
          if (move.captures.length > 0) {
            jumpMoves.push(move);
          } else {
            allMoves.push(move);
          }
        }
      }
    }
  }
  
  // If any jumps available, only return jumps (mandatory capture)
  return jumpMoves.length > 0 ? jumpMoves : allMoves;
}

export function makeMove(board: Board, move: Move): Board {
  const newBoard = board.map(row => [...row]);
  const piece = newBoard[move.from.row][move.from.col];
  
  if (!piece) return board;
  
  // Remove captured pieces
  for (const capture of move.captures) {
    newBoard[capture.row][capture.col] = null;
  }
  
  // Move the piece
  newBoard[move.to.row][move.to.col] = piece;
  newBoard[move.from.row][move.from.col] = null;
  
  // Check for kinging
  if (canKing(piece, move.to.row)) {
    newBoard[move.to.row][move.to.col] = { ...piece, type: 'king' };
  }
  
  return newBoard;
}

export function countPieces(board: Board): { black: number; red: number } {
  let black = 0;
  let red = 0;
  
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col];
      if (piece) {
        if (piece.color === 'black') black++;
        else red++;
      }
    }
  }
  
  return { black, red };
}

export function isGameOver(board: Board, currentPlayer: PieceColor): boolean {
  const moves = getAllValidMoves(board, currentPlayer);
  return moves.length === 0;
}

export function getWinner(board: Board, currentPlayer: PieceColor): PieceColor | 'draw' | null {
  const { black, red } = countPieces(board);
  
  if (black === 0) return 'red';
  if (red === 0) return 'black';
  
  // If current player has no moves, they lose
  if (isGameOver(board, currentPlayer)) {
    return getOpponent(currentPlayer);
  }
  
  return null;
}

export function initializeGame(): GameState {
  const board = initializeBoard();
  const currentPlayer: PieceColor = 'black';
  const validMoves = getAllValidMoves(board, currentPlayer);
  const { black, red } = countPieces(board);
  const mustCapture = validMoves.some(m => m.captures.length > 0);
  
  return {
    board,
    currentPlayer,
    selectedPiece: null,
    validMoves,
    blackPieces: black,
    redPieces: red,
    gameOver: false,
    winner: null,
    mustCapture,
  };
}
