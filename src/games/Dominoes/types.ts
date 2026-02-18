export interface DominoTile {
  id: string;
  sideA: number;
  sideB: number;
}

export interface DominoGameState {
  playerHand: DominoTile[];
  aiHands: DominoTile[][];
  board: { 
    tile: DominoTile; 
    end: 'left' | 'right' | 'root';
    outLeft?: number;
    outRight?: number;
    outValue?: number;
    displaySideA: number;
    displaySideB: number;
  }[];
  stock: DominoTile[];
  currentPlayerIndex: number;
  gameOver: boolean;
  winner: number | null;
}
