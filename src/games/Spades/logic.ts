import { Card } from '../../types/cards';
import { createDeck, shuffleDeck, dealCards as dealCardsFromDeck, getRankValue } from '../../utils/cardUtils';
import { Difficulty } from '../../types';
import { SpadesGameState, SpadesPlayer, SpadesTrick, SpadesTrickCard } from './types';

const AI_NAMES = ['Bob (AI)', 'Partner (AI)', 'Dave (AI)'];

export function initializeSpadesGame(difficulty: Difficulty): SpadesGameState {
  const players: SpadesPlayer[] = [
    { id: 0, name: 'You', cards: [], bid: null, tricksWon: 0, score: 0, bags: 0, isHuman: true, teamId: 0 },
    { id: 1, name: AI_NAMES[0], cards: [], bid: null, tricksWon: 0, score: 0, bags: 0, isHuman: false, teamId: 1 },
    { id: 2, name: AI_NAMES[1], cards: [], bid: null, tricksWon: 0, score: 0, bags: 0, isHuman: false, teamId: 0 },
    { id: 3, name: AI_NAMES[2], cards: [], bid: null, tricksWon: 0, score: 0, bags: 0, isHuman: false, teamId: 1 },
  ];

  const state: SpadesGameState = {
    players,
    currentTrick: { cards: [], winner: null },
    completedTricks: [],
    gamePhase: 'bidding',
    roundNumber: 1,
    currentPlayerIndex: 0,
    leadSuit: null,
    spadesBroken: false,
    teamScores: [0, 0],
    teamBags: [0, 0],
  };

  return dealCards(state);
}

export function dealCards(state: SpadesGameState): SpadesGameState {
  const deck = shuffleDeck(createDeck());
  let currentDeck = [...deck.cards];
  const newPlayers = state.players.map(p => ({ ...p, cards: [] as Card[], bid: null, tricksWon: 0 }));

  for (let i = 0; i < 13; i++) {
    for (let j = 0; j < 4; j++) {
      const { dealt, remaining } = dealCardsFromDeck({ cards: currentDeck }, 1);
      newPlayers[j].cards.push(...dealt);
      currentDeck = remaining.cards;
    }
  }

  newPlayers.forEach(player => {
    player.cards.sort((a, b) => {
      const suitOrder: any = { clubs: 0, diamonds: 1, hearts: 2, spades: 3 };
      if (a.suit !== b.suit) return suitOrder[a.suit] - suitOrder[b.suit];
      return getRankValue(a.rank) - getRankValue(b.rank);
    });
  });

  return {
    ...state,
    players: newPlayers,
    gamePhase: 'bidding',
    currentPlayerIndex: 0,
    currentTrick: { cards: [], winner: null },
    completedTricks: [],
    spadesBroken: false,
    leadSuit: null,
  };
}

export function handleBid(state: SpadesGameState, playerIndex: number, bid: number): SpadesGameState {
  const newPlayers = [...state.players];
  newPlayers[playerIndex] = { ...newPlayers[playerIndex], bid };

  let nextPhase = state.gamePhase;
  let nextPlayerIndex = (playerIndex + 1) % 4;

  if (newPlayers.every(p => p.bid !== null)) {
    nextPhase = 'playing';
    nextPlayerIndex = 0; // First player leads
  }

  return {
    ...state,
    players: newPlayers,
    gamePhase: nextPhase,
    currentPlayerIndex: nextPlayerIndex,
  };
}

export function getAIBid(cards: Card[]): number {
  let bid = 0;
  const spades = cards.filter(c => c.suit === 'spades');
  const highCards = cards.filter(c => c.suit !== 'spades' && (c.rank === 'A' || c.rank === 'K'));
  
  bid += highCards.length;
  bid += Math.floor(spades.length / 2);
  
  return Math.max(1, Math.min(13, bid));
}

export function canPlayCard(state: SpadesGameState, player: SpadesPlayer, card: Card): boolean {
  if (state.currentTrick.cards.length === 0) {
    if (card.suit === 'spades' && !state.spadesBroken) {
      return player.cards.every(c => c.suit === 'spades');
    }
    return true;
  }

  const leadSuit = state.leadSuit;
  const hasLeadSuit = player.cards.some(c => c.suit === leadSuit);

  if (hasLeadSuit) {
    return card.suit === leadSuit;
  }

  return true;
}

export function playCard(state: SpadesGameState, playerIndex: number, card: Card): SpadesGameState {
  const newPlayers = [...state.players];
  newPlayers[playerIndex] = {
    ...newPlayers[playerIndex],
    cards: newPlayers[playerIndex].cards.filter(c => c.id !== card.id),
  };

  const newTrickCards = [...state.currentTrick.cards, { card, playerId: playerIndex }];
  let newLeadSuit = state.leadSuit;
  if (newTrickCards.length === 1) newLeadSuit = card.suit;

  const newSpadesBroken = state.spadesBroken || card.suit === 'spades';

  let newState = {
    ...state,
    players: newPlayers,
    currentTrick: { ...state.currentTrick, cards: newTrickCards },
    leadSuit: newLeadSuit,
    spadesBroken: newSpadesBroken,
  };

  if (newTrickCards.length === 4) {
    const winnerId = evaluateTrick(newTrickCards, newLeadSuit!);
    newState.currentTrick.winner = winnerId;
  } else {
    newState.currentPlayerIndex = (playerIndex + 1) % 4;
  }

  return newState;
}

function evaluateTrick(cards: SpadesTrickCard[], leadSuit: string): number {
  let bestCard = cards[0];
  
  for (let i = 1; i < cards.length; i++) {
    const current = cards[i];
    if (current.card.suit === 'spades') {
      if (bestCard.card.suit !== 'spades' || getRankValue(current.card.rank) > getRankValue(bestCard.card.rank)) {
        bestCard = current;
      }
    } else if (current.card.suit === leadSuit && bestCard.card.suit !== 'spades') {
      if (getRankValue(current.card.rank) > getRankValue(bestCard.card.rank)) {
        bestCard = current;
      }
    }
  }
  
  return bestCard.playerId;
}

export function collectTrick(state: SpadesGameState): SpadesGameState {
  const winnerId = state.currentTrick.winner!;
  const newPlayers = [...state.players];
  newPlayers[winnerId].tricksWon++;

  const newCompletedTricks = [...state.completedTricks, state.currentTrick];
  
  let newState = {
    ...state,
    players: newPlayers,
    currentTrick: { cards: [], winner: null },
    completedTricks: newCompletedTricks,
    currentPlayerIndex: winnerId,
    leadSuit: null,
  };

  if (newCompletedTricks.length === 13) {
    return endRound(newState);
  }

  return newState;
}

function endRound(state: SpadesGameState): SpadesGameState {
  const teamTricks = [
    state.players[0].tricksWon + state.players[2].tricksWon,
    state.players[1].tricksWon + state.players[3].tricksWon,
  ];
  const teamBids = [
    (state.players[0].bid || 0) + (state.players[2].bid || 0),
    (state.players[1].bid || 0) + (state.players[3].bid || 0),
  ];

  const newTeamScores = [...state.teamScores];
  const newTeamBags = [...state.teamBags];

  for (let i = 0; i < 2; i++) {
    if (teamTricks[i] >= teamBids[i]) {
      newTeamScores[i] += teamBids[i] * 10;
      const bags = teamTricks[i] - teamBids[i];
      newTeamScores[i] += bags;
      newTeamBags[i] += bags;
      
      if (newTeamBags[i] >= 10) {
        newTeamScores[i] -= 100;
        newTeamBags[i] -= 10;
      }
    } else {
      newTeamScores[i] -= teamBids[i] * 10;
    }
  }

  const isGameOver = newTeamScores.some(s => s >= 250);

  return {
    ...state,
    teamScores: newTeamScores,
    teamBags: newTeamBags,
    gamePhase: isGameOver ? 'gameOver' : 'roundEnd',
  };
}
