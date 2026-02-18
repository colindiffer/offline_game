import { Card } from '../../types/cards';

export interface BlackjackHand {
  cards: Card[];
  value: number;
  isBust: boolean;
  isBlackjack: boolean;
  isSoft: boolean; // Contains an ace counted as 11
  is5CardTrick?: boolean;
}

export interface BlackjackGameState {
  playerHand: BlackjackHand;
  dealerHand: BlackjackHand;
  deck: Card[];
  bet: number;
  tokens: number;
  gamePhase: 'betting' | 'playing' | 'dealer' | 'finished';
  result: 'win' | 'loss' | 'push' | 'blackjack' | '5-card-trick' | null;
  canDouble: boolean;
  canSplit: boolean;
}
