import { Card } from '../../types/cards';

export interface Player {
  id: number;
  name: string;
  cards: Card[];
  score: number;
  totalScore: number;
  isHuman: boolean;
}

export interface TrickCard {
  card: Card;
  playerId: number;
}

export interface Trick {
  cards: TrickCard[];
  winner: number | null;
}

export type PassDirection = 'left' | 'right' | 'across' | 'none';

export type GamePhase = 'passing' | 'playing' | 'roundEnd' | 'gameOver';

export interface HeartsGameState {
  players: Player[];
  currentTrick: Trick;
  completedTricks: Trick[];
  passDirection: PassDirection;
  heartsBroken: boolean;
  gamePhase: GamePhase;
  roundNumber: number;
  currentPlayerIndex: number;
  leadSuit: string | null;
  selectedCardsToPass: Card[];
  passedCards: { fromId: number; toId: number; cards: Card[] }[];
}
