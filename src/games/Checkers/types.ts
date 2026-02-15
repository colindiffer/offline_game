export type PieceType = 'man' | 'king';
export type PieceColor = 'black' | 'red';

export interface Piece {
  color: PieceColor;
  type: PieceType;
}

export type Cell = Piece | null;
export type Board = Cell[][];

export interface Position {
  row: number;
  col: number;
}

export interface Move {
  from: Position;
  to: Position;
  captures: Position[];
}

export interface GameState {
  board: Board;
  currentPlayer: PieceColor;
  selectedPiece: Position | null;
  validMoves: Move[];
  blackPieces: number;
  redPieces: number;
  gameOver: boolean;
  winner: PieceColor | 'draw' | null;
  mustCapture: boolean;
}
