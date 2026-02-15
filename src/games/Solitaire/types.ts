export type Suit = '♠' | '♥' | '♦' | '♣';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
}

export type Pile = Card[];

export interface GameState {
  stock: Pile;
  waste: Pile;
  foundations: [Pile, Pile, Pile, Pile]; // Hearts, Diamonds, Clubs, Spades
  tableau: [Pile, Pile, Pile, Pile, Pile, Pile, Pile];
}
