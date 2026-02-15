import { Card } from '../../types/cards';

export enum HandRank {
  HighCard = 0,
  Pair = 1,
  TwoPair = 2,
  ThreeOfAKind = 3,
  Straight = 4,
  Flush = 5,
  FullHouse = 6,
  FourOfAKind = 7,
  StraightFlush = 8,
  RoyalFlush = 9,
}

export interface PokerHand {
  cards: Card[];
  rank: HandRank;
  value: number;
  description: string;
}

export interface Player {
  id: number;
  name: string;
  tokens: number;
  cards: Card[];
  folded: boolean;
  isAI: boolean;
  bet: number;
  hand?: PokerHand;
}

export type GamePhase = 'betting' | 'discard' | 'finalBetting' | 'showdown' | 'finished';

export interface PokerGameState {
  players: Player[];
  pot: number;
  currentPlayerIndex: number;
  gamePhase: GamePhase;
  deck: Card[];
  button: number;
  roundBet: number;
  hasRaised: boolean;
  lastRaiseIndex: number;
}
