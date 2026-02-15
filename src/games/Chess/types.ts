export type PieceType = 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king';
export type PieceColor = 'white' | 'black';

export interface Piece {
  type: PieceType;
  color: PieceColor;
  hasMoved: boolean;
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
  capturedPiece?: Piece;
  isEnPassant?: boolean;
  isCastling?: boolean;
  promotion?: PieceType;
}

export interface GameState {
  board: Board;
  currentPlayer: PieceColor;
  selectedPiece: Position | null;
  validMoves: Move[];
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  capturedWhite: Piece[];
  capturedBlack: Piece[];
  lastMove: Move | null;
  enPassantTarget: Position | null;
}
