import { Board, Cell, Player, Position, Move, GameState } from './types';

const BOARD_SIZE = 8;
const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
];

export function createEmptyBoard(): Board {
  return Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
}

export function initializeBoard(): Board {
  const board = createEmptyBoard();
  // Initial 4 pieces in center
  board[3][3] = 'white';
  board[3][4] = 'black';
  board[4][3] = 'black';
  board[4][4] = 'white';
  return board;
}

export function isValidPosition(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

export function getOpponent(player: Player): Player {
  return player === 'black' ? 'white' : 'black';
}

export function getFlipsInDirection(
  board: Board,
  row: number,
  col: number,
  dRow: number,
  dCol: number,
  player: Player
): Position[] {
  const opponent = getOpponent(player);
  const flips: Position[] = [];
  let r = row + dRow;
  let c = col + dCol;

  // Collect opponent pieces
  while (isValidPosition(r, c) && board[r][c] === opponent) {
    flips.push({ row: r, col: c });
    r += dRow;
    c += dCol;
  }

  // Valid if we hit our own piece after opponent pieces
  if (isValidPosition(r, c) && board[r][c] === player && flips.length > 0) {
    return flips;
  }

  return [];
}

export function getFlipsForMove(board: Board, row: number, col: number, player: Player): Position[] {
  if (board[row][col] !== null) {
    return [];
  }

  const allFlips: Position[] = [];

  for (const [dRow, dCol] of DIRECTIONS) {
    const flips = getFlipsInDirection(board, row, col, dRow, dCol, player);
    allFlips.push(...flips);
  }

  return allFlips;
}

export function getValidMoves(board: Board, player: Player): Move[] {
  const moves: Move[] = [];

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const flips = getFlipsForMove(board, row, col, player);
      if (flips.length > 0) {
        moves.push({ row, col, flips });
      }
    }
  }

  return moves;
}

export function makeMove(board: Board, move: Move, player: Player): Board {
  const newBoard = board.map(row => [...row]);
  
  // Place the piece
  newBoard[move.row][move.col] = player;
  
  // Flip pieces
  for (const flip of move.flips) {
    newBoard[flip.row][flip.col] = player;
  }
  
  return newBoard;
}

export function countPieces(board: Board): { black: number; white: number } {
  let black = 0;
  let white = 0;

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col] === 'black') black++;
      if (board[row][col] === 'white') white++;
    }
  }

  return { black, white };
}

export function isGameOver(board: Board, currentPlayer: Player): boolean {
  const currentMoves = getValidMoves(board, currentPlayer);
  if (currentMoves.length > 0) return false;

  const opponentMoves = getValidMoves(board, getOpponent(currentPlayer));
  if (opponentMoves.length > 0) return false;

  return true;
}

export function getWinner(board: Board): Player | 'draw' | null {
  const { black, white } = countPieces(board);
  
  if (black > white) return 'black';
  if (white > black) return 'white';
  return 'draw';
}

export function initializeGame(): GameState {
  const board = initializeBoard();
  const currentPlayer: Player = 'black';
  const validMoves = getValidMoves(board, currentPlayer);
  const { black, white } = countPieces(board);

  return {
    board,
    currentPlayer,
    blackScore: black,
    whiteScore: white,
    validMoves,
    gameOver: false,
    winner: null,
    lastMove: null,
  };
}
