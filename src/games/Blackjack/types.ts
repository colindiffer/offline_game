import { Card } from '../../types/cards';

export interface BlackjackHand {
  cards: Card[];
  value: number;
  isBust: boolean;
  isBlackjack: boolean;
  isSoft: boolean; // Contains an ace counted as 11
}

export interface BlackjackGameState {
  playerHand: BlackjackHand;
  dealerHand: BlackjackHand;
  deck: Card[];
  bet: number;
  tokens: number;
  gamePhase: 'betting' | 'playing' | 'dealer' | 'finished';
  result: 'win' | 'loss' | 'push' | 'blackjack' | null;
  canDouble: boolean;
  canSplit: boolean;
}
