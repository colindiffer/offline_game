import { Card } from '../../types/cards';

export interface FreeCellGameState {
  tableau: Card[][];
  foundations: Card[][];
  freeCells: (Card | null)[];
  history: any[];
}
