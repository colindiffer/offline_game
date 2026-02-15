import { Card, Rank } from '../../types/cards';
import { createDeck, shuffleDeck, dealCards, getRankValue } from '../../utils/cardUtils';
import { Difficulty } from '../../types';
import { HandRank, PokerHand, Player, PokerGameState, GamePhase } from './types';

const AI_NAMES = ['Alice', 'Bob', 'Charlie'];
const SMALL_BLIND = 5;
const BIG_BLIND = 10;

/**
 * Evaluate a 5-card poker hand
 */
export function evaluateHand(cards: Card[]): PokerHand {
  if (cards.length !== 5) {
    return {
      cards,
      rank: HandRank.HighCard,
      value: 0,
      description: 'Incomplete Hand',
    };
  }

  const sorted = [...cards].sort((a, b) => getRankValue(b.rank) - getRankValue(a.rank));
  const ranks = sorted.map(c => c.rank);
  const suits = sorted.map(c => c.suit);
  const rankValues = sorted.map(c => getRankValue(c.rank));

  // Count rank frequencies
  const rankCounts = new Map<Rank, number>();
  ranks.forEach(rank => {
    rankCounts.set(rank, (rankCounts.get(rank) || 0) + 1);
  });

  const counts = Array.from(rankCounts.values()).sort((a, b) => b - a);
  const uniqueRanks = Array.from(rankCounts.keys());

  // Check flush
  const isFlush = suits.every(suit => suit === suits[0]);

  // Check straight
  let isStraight = false;
  if (rankValues[0] - rankValues[4] === 4) {
    isStraight = true;
  }
  // Special case: A-2-3-4-5 (wheel)
  if (ranks[0] === 'A' && ranks[1] === '5' && ranks[2] === '4' && ranks[3] === '3' && ranks[4] === '2') {
    isStraight = true;
  }

  // Calculate hand value (for tie-breaking)
  let value = 0;
  rankValues.forEach((rv, i) => {
    value += rv * Math.pow(100, 4 - i);
  });

  // Royal Flush: A-K-Q-J-10 of same suit
  if (isFlush && isStraight && ranks[0] === 'A' && ranks[1] === 'K') {
    return {
      cards: sorted,
      rank: HandRank.RoyalFlush,
      value: 10000000000 + value,
      description: 'Royal Flush',
    };
  }

  // Straight Flush
  if (isFlush && isStraight) {
    return {
      cards: sorted,
      rank: HandRank.StraightFlush,
      value: 9000000000 + value,
      description: 'Straight Flush',
    };
  }

  // Four of a Kind
  if (counts[0] === 4) {
    const quadRank = uniqueRanks.find(r => rankCounts.get(r) === 4)!;
    const quadValue = getRankValue(quadRank);
    return {
      cards: sorted,
      rank: HandRank.FourOfAKind,
      value: 8000000000 + quadValue * 10000 + value,
      description: 'Four of a Kind',
    };
  }

  // Full House
  if (counts[0] === 3 && counts[1] === 2) {
    const tripRank = uniqueRanks.find(r => rankCounts.get(r) === 3)!;
    const pairRank = uniqueRanks.find(r => rankCounts.get(r) === 2)!;
    const tripValue = getRankValue(tripRank);
    const pairValue = getRankValue(pairRank);
    return {
      cards: sorted,
      rank: HandRank.FullHouse,
      value: 7000000000 + tripValue * 100 + pairValue,
      description: 'Full House',
    };
  }

  // Flush
  if (isFlush) {
    return {
      cards: sorted,
      rank: HandRank.Flush,
      value: 6000000000 + value,
      description: 'Flush',
    };
  }

  // Straight
  if (isStraight) {
    return {
      cards: sorted,
      rank: HandRank.Straight,
      value: 5000000000 + value,
      description: 'Straight',
    };
  }

  // Three of a Kind
  if (counts[0] === 3) {
    const tripRank = uniqueRanks.find(r => rankCounts.get(r) === 3)!;
    const tripValue = getRankValue(tripRank);
    return {
      cards: sorted,
      rank: HandRank.ThreeOfAKind,
      value: 4000000000 + tripValue * 10000 + value,
      description: 'Three of a Kind',
    };
  }

  // Two Pair
  if (counts[0] === 2 && counts[1] === 2) {
    const pairRanks = uniqueRanks.filter(r => rankCounts.get(r) === 2);
    const highPairValue = Math.max(...pairRanks.map(r => getRankValue(r)));
    const lowPairValue = Math.min(...pairRanks.map(r => getRankValue(r)));
    return {
      cards: sorted,
      rank: HandRank.TwoPair,
      value: 3000000000 + highPairValue * 10000 + lowPairValue * 100 + value,
      description: 'Two Pair',
    };
  }

  // Pair
  if (counts[0] === 2) {
    const pairRank = uniqueRanks.find(r => rankCounts.get(r) === 2)!;
    const pairValue = getRankValue(pairRank);
    return {
      cards: sorted,
      rank: HandRank.Pair,
      value: 2000000000 + pairValue * 10000 + value,
      description: 'Pair',
    };
  }

  // High Card
  return {
    cards: sorted,
    rank: HandRank.HighCard,
    value: 1000000000 + value,
    description: 'High Card',
  };
}

/**
 * Compare two poker hands
 * Returns: -1 if hand1 < hand2, 0 if equal, 1 if hand1 > hand2
 */
export function compareHands(hand1: PokerHand, hand2: PokerHand): number {
  if (hand1.value > hand2.value) return 1;
  if (hand1.value < hand2.value) return -1;
  return 0;
}

/**
 * Initialize a new poker game
 */
export function initializePokerGame(difficulty: Difficulty, initialTokens: number = 100): PokerGameState {
  const numPlayers = difficulty === 'easy' ? 2 : difficulty === 'medium' ? 3 : 4;
  
  const players: Player[] = [
    {
      id: 0,
      name: 'You',
      tokens: initialTokens,
      cards: [],
      folded: false,
      isAI: false,
      bet: 0,
    },
  ];

  // Add AI players
  for (let i = 1; i < numPlayers; i++) {
    players.push({
      id: i,
      name: AI_NAMES[i - 1],
      tokens: initialTokens,
      cards: [],
      folded: false,
      isAI: true,
      bet: 0,
    });
  }

  const deck = shuffleDeck(createDeck());

  return {
    players,
    pot: 0,
    currentPlayerIndex: 0,
    gamePhase: 'betting',
    deck: deck.cards,
    button: 0,
    roundBet: 0,
    hasRaised: false,
    lastRaiseIndex: -1,
  };
}

/**
 * Deal initial 5 cards to each player
 */
export function dealInitialHands(state: PokerGameState): PokerGameState {
  let currentDeck = [...state.deck];
  const newPlayers = state.players.map(player => ({ ...player, cards: [] as Card[], folded: false, bet: 0 }));

  // Deal 5 cards to each player
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < newPlayers.length; j++) {
      if (currentDeck.length === 0) {
        // Shuffle new deck if needed
        const newDeck = shuffleDeck(createDeck());
        currentDeck = newDeck.cards;
      }
      const { dealt, remaining } = dealCards({ cards: currentDeck }, 1);
      newPlayers[j].cards.push(...dealt);
      currentDeck = remaining.cards;
    }
  }

  // Post blinds
  const smallBlindIndex = (state.button + 1) % newPlayers.length;
  const bigBlindIndex = (state.button + 2) % newPlayers.length;
  
  newPlayers[smallBlindIndex].bet = SMALL_BLIND;
  newPlayers[smallBlindIndex].tokens -= SMALL_BLIND;
  newPlayers[bigBlindIndex].bet = BIG_BLIND;
  newPlayers[bigBlindIndex].tokens -= BIG_BLIND;

  const pot = SMALL_BLIND + BIG_BLIND;
  const startPlayerIndex = (state.button + 3) % newPlayers.length;

  return {
    ...state,
    players: newPlayers,
    deck: currentDeck,
    pot,
    currentPlayerIndex: startPlayerIndex,
    gamePhase: 'betting',
    roundBet: BIG_BLIND,
    hasRaised: false,
    lastRaiseIndex: bigBlindIndex,
  };
}

/**
 * Draw new cards for a player (exchange selected cards)
 */
export function drawCards(
  state: PokerGameState,
  playerIndex: number,
  discardIndices: number[]
): PokerGameState {
  let currentDeck = [...state.deck];
  const newPlayers = [...state.players];
  const player = { ...newPlayers[playerIndex] };

  // Remove discarded cards
  const newCards = player.cards.filter((_, i) => !discardIndices.includes(i));

  // Draw new cards
  const numToDraw = discardIndices.length;
  if (numToDraw > 0) {
    if (currentDeck.length < numToDraw) {
      const newDeck = shuffleDeck(createDeck());
      currentDeck = newDeck.cards;
    }
    const { dealt, remaining } = dealCards({ cards: currentDeck }, numToDraw);
    newCards.push(...dealt);
    currentDeck = remaining.cards;
  }

  player.cards = newCards;
  newPlayers[playerIndex] = player;

  return {
    ...state,
    players: newPlayers,
    deck: currentDeck,
  };
}

/**
 * Player action (fold, call, raise)
 */
export function playerAction(
  state: PokerGameState,
  action: 'fold' | 'call' | 'raise',
  raiseAmount?: number
): PokerGameState {
  const newPlayers = [...state.players];
  const player = { ...newPlayers[state.currentPlayerIndex] };
  let newPot = state.pot;
  let newRoundBet = state.roundBet;
  let newHasRaised = state.hasRaised;
  let newLastRaiseIndex = state.lastRaiseIndex;

  if (action === 'fold') {
    player.folded = true;
  } else if (action === 'call') {
    const callAmount = state.roundBet - player.bet;
    const actualCall = Math.min(callAmount, player.tokens);
    player.bet += actualCall;
    player.tokens -= actualCall;
    newPot += actualCall;
  } else if (action === 'raise' && raiseAmount) {
    const totalBet = state.roundBet + raiseAmount;
    const amountToAdd = totalBet - player.bet;
    const actualRaise = Math.min(amountToAdd, player.tokens);
    player.bet += actualRaise;
    player.tokens -= actualRaise;
    newPot += actualRaise;
    newRoundBet = player.bet;
    newHasRaised = true;
    newLastRaiseIndex = state.currentPlayerIndex;
  }

  newPlayers[state.currentPlayerIndex] = player;

  // Move to next player
  let nextIndex = (state.currentPlayerIndex + 1) % newPlayers.length;
  
  // Skip folded players
  while (newPlayers[nextIndex].folded && nextIndex !== state.currentPlayerIndex) {
    nextIndex = (nextIndex + 1) % newPlayers.length;
  }

  // Check if betting round is complete
  const activePlayers = newPlayers.filter(p => !p.folded);
  const allBetsEqual = activePlayers.every(p => p.bet === newRoundBet || p.tokens === 0);
  const roundComplete = allBetsEqual && (nextIndex === newLastRaiseIndex || nextIndex === state.currentPlayerIndex);

  let newPhase = state.gamePhase;
  if (roundComplete) {
    if (state.gamePhase === 'betting') {
      newPhase = 'discard';
      nextIndex = (state.button + 1) % newPlayers.length;
      while (newPlayers[nextIndex].folded) {
        nextIndex = (nextIndex + 1) % newPlayers.length;
      }
    } else if (state.gamePhase === 'finalBetting') {
      newPhase = 'showdown';
    }
    
    // Reset bets for next round
    newPlayers.forEach(p => { p.bet = 0; });
    newRoundBet = 0;
    newHasRaised = false;
    newLastRaiseIndex = -1;
  }

  // Check if only one player remains
  if (activePlayers.length === 1) {
    newPhase = 'finished';
  }

  return {
    ...state,
    players: newPlayers,
    pot: newPot,
    currentPlayerIndex: nextIndex,
    gamePhase: newPhase,
    roundBet: newRoundBet,
    hasRaised: newHasRaised,
    lastRaiseIndex: newLastRaiseIndex,
  };
}

/**
 * AI decision making
 */
export function getAIAction(
  state: PokerGameState,
  playerIndex: number,
  difficulty: Difficulty
): { action: 'fold' | 'call' | 'raise'; amount?: number } {
  const player = state.players[playerIndex];
  const hand = evaluateHand(player.cards);
  
  // Hand strength threshold based on difficulty
  const foldThreshold = difficulty === 'easy' ? HandRank.HighCard : 
                        difficulty === 'medium' ? HandRank.Pair : HandRank.TwoPair;
  const raiseThreshold = difficulty === 'easy' ? HandRank.TwoPair : 
                         difficulty === 'medium' ? HandRank.ThreeOfAKind : HandRank.Straight;

  const callAmount = state.roundBet - player.bet;
  const potOdds = callAmount / (state.pot + callAmount);

  // Basic strategy
  if (hand.rank < foldThreshold && potOdds > 0.3) {
    return { action: 'fold' };
  }

  if (hand.rank >= raiseThreshold && player.tokens >= callAmount + 20) {
    const raiseAmount = Math.min(20, player.tokens - callAmount);
    return { action: 'raise', amount: raiseAmount };
  }

  // Add some randomness for easier difficulties
  if (difficulty === 'easy' && Math.random() < 0.2) {
    return { action: 'fold' };
  }

  return { action: 'call' };
}

/**
 * AI discard decision
 */
export function getAIDiscards(cards: Card[], difficulty: Difficulty): number[] {
  const hand = evaluateHand(cards);
  
  // Never discard from good hands
  if (hand.rank >= HandRank.ThreeOfAKind) {
    return [];
  }

  // For pairs, keep the pair
  if (hand.rank === HandRank.Pair) {
    const rankCounts = new Map<string, number>();
    cards.forEach(card => {
      rankCounts.set(card.rank, (rankCounts.get(card.rank) || 0) + 1);
    });
    const pairRank = Array.from(rankCounts.entries()).find(([_, count]) => count === 2)?.[0];
    
    const discards: number[] = [];
    cards.forEach((card, i) => {
      if (card.rank !== pairRank) {
        discards.push(i);
      }
    });
    return discards;
  }

  // For high card, keep highest cards
  const sorted = cards.map((card, i) => ({ card, i, value: getRankValue(card.rank) }))
    .sort((a, b) => b.value - a.value);

  // Keep 2-3 highest cards based on difficulty
  const keepCount = difficulty === 'easy' ? 2 : 3;
  const discards = sorted.slice(keepCount).map(item => item.i);
  
  return discards;
}

/**
 * Determine winners and distribute pot
 */
export function determineWinners(state: PokerGameState): PokerGameState {
  const activePlayers = state.players.filter(p => !p.folded);
  
  // If only one player remains, they win
  if (activePlayers.length === 1) {
    const newPlayers = [...state.players];
    const winnerIndex = newPlayers.findIndex(p => p.id === activePlayers[0].id);
    newPlayers[winnerIndex].tokens += state.pot;
    
    return {
      ...state,
      players: newPlayers,
      pot: 0,
      gamePhase: 'finished',
    };
  }

  // Evaluate all hands
  const playersWithHands = activePlayers.map(p => ({
    player: p,
    hand: evaluateHand(p.cards),
  }));

  // Find best hand
  let bestHand = playersWithHands[0].hand;
  playersWithHands.forEach(({ hand }) => {
    if (compareHands(hand, bestHand) > 0) {
      bestHand = hand;
    }
  });

  // Find all players with best hand (for ties)
  const winners = playersWithHands.filter(({ hand }) => compareHands(hand, bestHand) === 0);
  const winAmount = Math.floor(state.pot / winners.length);

  const newPlayers = state.players.map(p => {
    const winner = winners.find(w => w.player.id === p.id);
    if (winner) {
      return { ...p, tokens: p.tokens + winAmount, hand: winner.hand };
    }
    const playerWithHand = playersWithHands.find(ph => ph.player.id === p.id);
    return { ...p, hand: playerWithHand?.hand };
  });

  return {
    ...state,
    players: newPlayers,
    pot: 0,
    gamePhase: 'finished',
  };
}

/**
 * Start new round
 */
export function startNewRound(state: PokerGameState): PokerGameState {
  // Remove players with no tokens
  const activePlayers = state.players.filter(p => p.tokens > 0);
  
  if (activePlayers.length < 2) {
    // Game over
    return state;
  }

  // Move button
  const newButton = (state.button + 1) % activePlayers.length;

  const newState: PokerGameState = {
    ...state,
    players: activePlayers.map(p => ({ ...p, cards: [], folded: false, bet: 0, hand: undefined })),
    pot: 0,
    button: newButton,
    currentPlayerIndex: 0,
    gamePhase: 'betting',
    roundBet: 0,
    hasRaised: false,
    lastRaiseIndex: -1,
  };

  return dealInitialHands(newState);
}
