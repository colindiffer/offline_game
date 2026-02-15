export type Cell = 'black' | 'white' | null;
export type Board = Cell[][];
export type Player = 'black' | 'white';

export interface Position {
  row: number;
  col: number;
}

export interface Move extends Position {
  flips: Position[];
}

export interface GameState {
  board: Board;
  currentPlayer: Player;
  blackScore: number;
  whiteScore: number;
  validMoves: Move[];
  gameOver: boolean;
  winner: Player | 'draw' | null;
  lastMove: Position | null;
}
