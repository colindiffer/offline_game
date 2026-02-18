import { Card } from '../../types/cards';

export type SpadesGamePhase = 'bidding' | 'playing' | 'roundEnd' | 'gameOver';

export interface SpadesPlayer {
  id: number;
  name: string;
  cards: Card[];
  bid: number | null;
  tricksWon: number;
  score: number;
  bags: number;
  isHuman: boolean;
  teamId: number; // 0 for player & partner, 1 for opponents
}

export interface SpadesTrickCard {
  card: Card;
  playerId: number;
}

export interface SpadesTrick {
  cards: SpadesTrickCard[];
  winner: number | null;
}

export interface SpadesGameState {
  players: SpadesPlayer[];
  currentTrick: SpadesTrick;
  completedTricks: SpadesTrick[];
  gamePhase: SpadesGamePhase;
  roundNumber: number;
  currentPlayerIndex: number;
  leadSuit: string | null;
  spadesBroken: boolean;
  teamScores: number[];
  teamBags: number[];
}
