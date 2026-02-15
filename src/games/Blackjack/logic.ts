import { Card } from '../../types/cards';
import { createMultipleDecks, shuffleDeck, dealCards, getCardValue } from '../../utils/cardUtils';
import { BlackjackHand, BlackjackGameState } from './types';
import { Difficulty } from '../../types';

/**
 * Calculate the best value for a blackjack hand (handles aces intelligently)
 */
export function calculateHandValue(cards: Card[]): { value: number; isSoft: boolean } {
  let value = 0;
  let aceCount = 0;

  // Count total with all aces as 1
  for (const card of cards) {
    value += getCardValue(card, false);
    if (card.rank === 'A') {
      aceCount++;
    }
  }

  // Try to use one ace as 11 if it doesn't bust
  let isSoft = false;
  if (aceCount > 0 && value + 10 <= 21) {
    value += 10;
    isSoft = true;
  }

  return { value, isSoft };
}

/**
 * Evaluate a hand and return BlackjackHand object
 */
export function evaluateHand(cards: Card[]): BlackjackHand {
  const { value, isSoft } = calculateHandValue(cards);
  const isBust = value > 21;
  const isBlackjack = cards.length === 2 && value === 21;

  return {
    cards,
    value,
    isBust,
    isBlackjack,
    isSoft,
  };
}

/**
 * Initialize a new blackjack game state
 */
export function initializeBlackjackGame(difficulty: Difficulty, tokens: number = 100): BlackjackGameState {
  // Deck count based on difficulty
  const deckCount = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 6;
  const deck = shuffleDeck(createMultipleDecks(deckCount));

  return {
    playerHand: { cards: [], value: 0, isBust: false, isBlackjack: false, isSoft: false },
    dealerHand: { cards: [], value: 0, isBust: false, isBlackjack: false, isSoft: false },
    deck: deck.cards,
    bet: 0,
    tokens,
    gamePhase: 'betting',
    result: null,
    canDouble: false,
    canSplit: false,
  };
}

/**
 * Deal initial hand (2 cards to player, 2 to dealer)
 */
export function dealInitialHand(state: BlackjackGameState, bet: number): BlackjackGameState {
  if (bet > state.tokens) {
    throw new Error('Insufficient funds');
  }

  let currentDeck = state.deck;
  
  // Deal: Player, Dealer, Player, Dealer
  const { dealt: playerCard1, remaining: deck1 } = dealCards({ cards: currentDeck }, 1);
  const { dealt: dealerCard1, remaining: deck2 } = dealCards(deck1, 1);
  const { dealt: playerCard2, remaining: deck3 } = dealCards(deck2, 1);
  const { dealt: dealerCard2, remaining: deck4 } = dealCards(deck3, 1);

  const playerCards = [...playerCard1, ...playerCard2];
  const dealerCards = [...dealerCard1, ...dealerCard2];

  const playerHand = evaluateHand(playerCards);
  const dealerHand = evaluateHand(dealerCards);

  const newTokens = state.tokens - bet;
  
  // Check for blackjack (instant win unless dealer also has blackjack)
  let gamePhase: BlackjackGameState['gamePhase'] = 'playing';
  let result: BlackjackGameState['result'] = null;
  let finalTokens = newTokens;

  if (playerHand.isBlackjack) {
    if (dealerHand.isBlackjack) {
      // Push
      gamePhase = 'finished';
      result = 'push';
      finalTokens = newTokens + bet; // Return bet
    } else {
      // Player blackjack wins 3:2
      gamePhase = 'finished';
      result = 'blackjack';
      finalTokens = newTokens + bet + Math.floor(bet * 1.5);
    }
  } else if (dealerHand.isBlackjack) {
    // Dealer blackjack, player loses
    gamePhase = 'finished';
    result = 'loss';
  }

  // Can double if 2 cards and enough tokens
  const canDouble = playerCards.length === 2 && finalTokens >= bet && gamePhase === 'playing';
  
  // Can split if 2 cards of same rank and enough tokens (not implemented in this version)
  const canSplit = false; // Keep it simple for now

  return {
    ...state,
    playerHand,
    dealerHand,
    deck: deck4.cards,
    bet,
    tokens: finalTokens,
    gamePhase,
    result,
    canDouble,
    canSplit,
  };
}

/**
 * Player hits (takes another card)
 */
export function playerHit(state: BlackjackGameState): BlackjackGameState {
  if (state.gamePhase !== 'playing') {
    return state;
  }

  const { dealt, remaining } = dealCards({ cards: state.deck }, 1);
  const newCards = [...state.playerHand.cards, ...dealt];
  const playerHand = evaluateHand(newCards);

  let gamePhase: BlackjackGameState['gamePhase'] = 'playing';
  let result: BlackjackGameState['result'] = null;
  let tokens = state.tokens;

  if (playerHand.isBust) {
    // Player busts, loses
    gamePhase = 'finished';
    result = 'loss';
  }

  return {
    ...state,
    playerHand,
    deck: remaining.cards,
    gamePhase,
    result,
    tokens,
    canDouble: false, // Can't double after hitting
  };
}

/**
 * Player stands (ends their turn, dealer plays)
 */
export function playerStand(state: BlackjackGameState): BlackjackGameState {
  if (state.gamePhase !== 'playing') {
    return state;
  }

  return {
    ...state,
    gamePhase: 'dealer',
    canDouble: false,
  };
}

/**
 * Player doubles down (double bet, take one card, then stand)
 */
export function playerDouble(state: BlackjackGameState): BlackjackGameState {
  if (!state.canDouble || state.gamePhase !== 'playing') {
    return state;
  }

  const { dealt, remaining } = dealCards({ cards: state.deck }, 1);
  const newCards = [...state.playerHand.cards, ...dealt];
  const playerHand = evaluateHand(newCards);

  const newBet = state.bet * 2;
  let tokens = state.tokens - state.bet; // Deduct additional bet

  let gamePhase: BlackjackGameState['gamePhase'] = 'dealer';
  let result: BlackjackGameState['result'] = null;

  if (playerHand.isBust) {
    // Player busts, loses
    gamePhase = 'finished';
    result = 'loss';
  }

  return {
    ...state,
    playerHand,
    deck: remaining.cards,
    bet: newBet,
    tokens,
    gamePhase,
    result,
    canDouble: false,
  };
}

/**
 * Dealer plays (hits on 16 or less, stands on 17+)
 * Hard mode: dealer hits on soft 17
 */
export function dealerPlay(state: BlackjackGameState, difficulty: Difficulty): BlackjackGameState {
  if (state.gamePhase !== 'dealer') {
    return state;
  }

  let dealerHand = state.dealerHand;
  let deck = state.deck;

  // Dealer draws until reaching 17+ (or soft 17 in hard mode)
  const shouldHitOnSoft17 = difficulty === 'hard';
  
  while (
    dealerHand.value < 17 || 
    (shouldHitOnSoft17 && dealerHand.value === 17 && dealerHand.isSoft)
  ) {
    const { dealt, remaining } = dealCards({ cards: deck }, 1);
    const newCards = [...dealerHand.cards, ...dealt];
    dealerHand = evaluateHand(newCards);
    deck = remaining.cards;
  }

  // Determine winner
  let result: BlackjackGameState['result'];
  let tokens = state.tokens;

  if (dealerHand.isBust) {
    // Dealer busts, player wins
    result = 'win';
    tokens += state.bet * 2;
  } else if (state.playerHand.value > dealerHand.value) {
    // Player has higher value
    result = 'win';
    tokens += state.bet * 2;
  } else if (state.playerHand.value < dealerHand.value) {
    // Dealer has higher value
    result = 'loss';
  } else {
    // Push (tie)
    result = 'push';
    tokens += state.bet; // Return bet
  }

  return {
    ...state,
    dealerHand,
    deck,
    gamePhase: 'finished',
    result,
    tokens,
  };
}
