import { Suit, Rank, Card as ICard } from '../../types/cards';

export interface Card extends ICard {
  faceUp: boolean;
}

export type Pile = Card[];

export interface GameState {
  stock: Pile;
  waste: Pile;
  foundations: [Pile, Pile, Pile, Pile]; // Hearts, Diamonds, Clubs, Spades
  tableau: [Pile, Pile, Pile, Pile, Pile, Pile, Pile];
}
