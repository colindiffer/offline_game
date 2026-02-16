import { Card, Rank } from '../../types/cards';
import { createDeck, shuffleDeck, dealCards, getRankValue } from '../../utils/cardUtils';
import { Difficulty } from '../../types';
import { HandRank, PokerHand, Player, PokerGameState, GamePhase } from './types';

const AI_NAMES = ['Alice', 'Bob', 'Charlie'];
const SMALL_BLIND = 5;
const BIG_BLIND = 10;

/**
 * Initialize a new Poker game
 */
export function initializePokerGame(difficulty: Difficulty, initialChips: number): PokerGameState {
  const players: Player[] = [
    {
      id: 0,
      name: 'You',
      tokens: initialChips,
      cards: [],
      folded: false,
      isAI: false,
      bet: 0,
    },
    ...AI_NAMES.map((name, i) => ({
      id: i + 1,
      name,
      tokens: initialChips,
      cards: [],
      folded: false,
      isAI: true,
      bet: 0,
    })),
  ];

  return {
    players,
    communityCards: [],
    pot: 0,
    currentPlayerIndex: 0,
    gamePhase: 'preFlop',
    deck: [], // Will be populated in startNewRound
    button: 0,
    roundBet: 0,
    hasRaised: false,
    lastRaiseIndex: 0,
  };
}

/**
 * Start a new round of Poker
 */
export function startNewRound(state: PokerGameState): PokerGameState {
  const newButton = (state.button + 1) % state.players.length;

  const newPlayers = state.players.map(p => ({
    ...p,
    cards: [],
    folded: p.tokens <= 0,
    bet: 0,
    hand: undefined,
  }));

  const deckObj = shuffleDeck(createDeck());

  const newState: PokerGameState = {
    ...state,
    players: newPlayers,
    communityCards: [],
    pot: 0,
    currentPlayerIndex: (newButton + 1) % newPlayers.length,
    gamePhase: 'preFlop',
    deck: deckObj.cards,
    button: newButton,
    roundBet: BIG_BLIND,
    hasRaised: false,
    lastRaiseIndex: (newButton + 2) % newPlayers.length,
  };

  return postBlinds(newState);
}

function postBlinds(state: PokerGameState): PokerGameState {
  const sbIndex = (state.button + 1) % state.players.length;
  const bbIndex = (state.button + 2) % state.players.length;

  const newPlayers = [...state.players];
  const sbAmount = Math.min(newPlayers[sbIndex].tokens, SMALL_BLIND);
  newPlayers[sbIndex].tokens -= sbAmount;
  newPlayers[sbIndex].bet = sbAmount;

  const bbAmount = Math.min(newPlayers[bbIndex].tokens, BIG_BLIND);
  newPlayers[bbIndex].tokens -= bbAmount;
  newPlayers[bbIndex].bet = bbAmount;

  return {
    ...state,
    players: newPlayers,
    pot: sbAmount + bbAmount,
    roundBet: BIG_BLIND,
    currentPlayerIndex: (bbIndex + 1) % newPlayers.length,
  };
}

/**
 * Deal initial hole cards
 */
export function dealInitialHands(state: PokerGameState): PokerGameState {
  let currentDeckCards = [...state.deck];
  const newPlayers = state.players.map(player => {
    if (player.folded) return player;
    const { dealt, remaining } = dealCards({ cards: currentDeckCards }, 2);
    currentDeckCards = remaining.cards;
    return { ...player, cards: dealt };
  });

  return {
    ...state,
    players: newPlayers,
    deck: currentDeckCards,
  };
}

/**
 * Handle player actions
 */
export function playerAction(state: PokerGameState, action: 'fold' | 'call' | 'raise', amount: number = 0): PokerGameState {
  const playerIndex = state.currentPlayerIndex;
  const player = state.players[playerIndex];
  const newPlayers = [...state.players];
  let newPot = state.pot;
  let newRoundBet = state.roundBet;
  let newHasRaised = state.hasRaised;
  let newLastRaiseIndex = state.lastRaiseIndex;

  if (action === 'fold') {
    newPlayers[playerIndex].folded = true;
  } else if (action === 'call') {
    const callAmount = newRoundBet - player.bet;
    const actualCall = Math.min(player.tokens, callAmount);
    newPlayers[playerIndex].tokens -= actualCall;
    newPlayers[playerIndex].bet += actualCall;
    newPot += actualCall;
  } else if (action === 'raise') {
    const callAmount = newRoundBet - player.bet;
    const totalRaise = callAmount + amount;
    const actualRaise = Math.min(player.tokens, totalRaise);
    newPlayers[playerIndex].tokens -= actualRaise;
    newPlayers[playerIndex].bet += actualRaise;
    newPot += actualRaise;
    newRoundBet = newPlayers[playerIndex].bet;
    newHasRaised = true;
    newLastRaiseIndex = playerIndex;
  }

  let nextIndex = (playerIndex + 1) % state.players.length;
  while (newPlayers[nextIndex].folded && nextIndex !== playerIndex) {
    nextIndex = (nextIndex + 1) % state.players.length;
  }

  const activePlayers = newPlayers.filter(p => !p.folded);
  if (activePlayers.length <= 1 || nextIndex === newLastRaiseIndex) {
    return advancePhase({
      ...state,
      players: newPlayers,
      pot: newPot,
      roundBet: newRoundBet,
      hasRaised: newHasRaised,
      lastRaiseIndex: newLastRaiseIndex,
    });
  }

  return {
    ...state,
    players: newPlayers,
    pot: newPot,
    roundBet: newRoundBet,
    hasRaised: newHasRaised,
    lastRaiseIndex: newLastRaiseIndex,
    currentPlayerIndex: nextIndex,
  };
}

function advancePhase(state: PokerGameState): PokerGameState {
  const resetPlayers = state.players.map(p => ({ ...p, bet: 0 }));
  let currentDeckCards = [...state.deck];
  let newCommunity = [...state.communityCards];
  let newPhase: GamePhase = state.gamePhase;

  if (state.gamePhase === 'preFlop') {
    const { dealt, remaining } = dealCards({ cards: currentDeckCards }, 3);
    newCommunity = dealt;
    currentDeckCards = remaining.cards;
    newPhase = 'flop';
  } else if (state.gamePhase === 'flop') {
    const { dealt, remaining } = dealCards({ cards: currentDeckCards }, 1);
    newCommunity = [...newCommunity, ...dealt];
    currentDeckCards = remaining.cards;
    newPhase = 'turn';
  } else if (state.gamePhase === 'turn') {
    const { dealt, remaining } = dealCards({ cards: currentDeckCards }, 1);
    newCommunity = [...newCommunity, ...dealt];
    currentDeckCards = remaining.cards;
    newPhase = 'river';
  } else if (state.gamePhase === 'river') {
    newPhase = 'showdown';
  }

  const firstStartIndex = (state.button + 1) % state.players.length;
  let firstActive = -1;
  for (let i = 0; i < state.players.length; i++) {
    const idx = (firstStartIndex + i) % state.players.length;
    if (!resetPlayers[idx].folded) {
      firstActive = idx;
      break;
    }
  }

  return {
    ...state,
    players: resetPlayers,
    communityCards: newCommunity,
    deck: currentDeckCards,
    gamePhase: newPhase,
    roundBet: 0,
    hasRaised: false,
    lastRaiseIndex: firstActive >= 0 ? firstActive : 0,
    currentPlayerIndex: firstActive >= 0 ? firstActive : 0,
  };
}

export function getAIAction(state: PokerGameState, playerIndex: number, difficulty: Difficulty): { action: 'fold' | 'call' | 'raise', amount: number } {
  const player = state.players[playerIndex];
  const hand = evaluateHand(player.cards, state.communityCards);
  const callAmount = state.roundBet - player.bet;

  const threshold = difficulty === 'easy' ? 0.3 : difficulty === 'medium' ? 0.5 : 0.7;
  const strength = hand.rank / 10 + (Math.random() * 0.2);

  if (strength < threshold - 0.2 && callAmount > 20) return { action: 'fold', amount: 0 };
  if (strength > threshold + 0.2) return { action: 'raise', amount: 20 };

  return { action: 'call', amount: 0 };
}

export function evaluateHand(holeCards: Card[], communityCards: Card[]): PokerHand {
  const allCards = [...holeCards, ...communityCards];
  if (allCards.length < 5) {
    return { cards: allCards, rank: HandRank.HighCard, value: 0, description: 'High Card' };
  }

  const rankCounts: { [key: string]: number } = {};
  const suitCounts: { [key: string]: number } = {};

  allCards.forEach(c => {
    rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1;
    suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1;
  });

  const ranks = Object.keys(rankCounts).sort((a, b) => getRankValue(b as Rank) - getRankValue(a as Rank));
  const hasFlush = Object.values(suitCounts).some(count => count >= 5);
  const counts = Object.values(rankCounts).sort((a, b) => b - a);

  if (hasFlush) return { cards: allCards.slice(0, 5), rank: HandRank.Flush, value: 500, description: 'Flush' };
  if (counts[0] === 4) return { cards: allCards.slice(0, 5), rank: HandRank.FourOfAKind, value: 700, description: 'Four of a Kind' };
  if (counts[0] === 3 && (counts[1] || 0) >= 2) return { cards: allCards.slice(0, 5), rank: HandRank.FullHouse, value: 600, description: 'Full House' };
  if (counts[0] === 3) return { cards: allCards.slice(0, 5), rank: HandRank.ThreeOfAKind, value: 300, description: 'Three of a Kind' };
  if (counts[0] === 2 && (counts[1] || 0) === 2) return { cards: allCards.slice(0, 5), rank: HandRank.TwoPair, value: 200, description: 'Two Pair' };
  if (counts[0] === 2) return { cards: allCards.slice(0, 5), rank: HandRank.Pair, value: 100, description: 'Pair' };

  return { cards: allCards.slice(0, 5), rank: HandRank.HighCard, value: getRankValue(ranks[0] as Rank), description: 'High Card' };
}

export function determineWinners(state: PokerGameState): PokerGameState {
  const activePlayers = state.players.filter(p => !p.folded);

  const playerHands = activePlayers.map(p => ({
    playerIndex: state.players.findIndex(pl => pl.id === p.id),
    hand: evaluateHand(p.cards, state.communityCards)
  }));

  playerHands.sort((a, b) => b.hand.value - a.hand.value);

  if (playerHands.length === 0) {
    return { ...state, gamePhase: 'finished' };
  }

  const winner = playerHands[0];
  const newPlayers = state.players.map((p, i) => {
    const updated = { ...p };
    if (!p.folded) updated.hand = evaluateHand(p.cards, state.communityCards);
    if (i === winner.playerIndex) updated.tokens += state.pot;
    return updated;
  });

  return {
    ...state,
    players: newPlayers,
    gamePhase: 'finished',
  };
}
