import { Card } from '../../types/cards';
import { createDeck, shuffleDeck, dealCards as dealCardsFromDeck, getRankValue } from '../../utils/cardUtils';
import { Difficulty } from '../../types';
import { HeartsGameState, Player, PassDirection, Trick, TrickCard } from './types';

const AI_NAMES = ['Alice', 'Bob', 'Charlie'];

/**
 * Initialize a new Hearts game
 */
export function initializeHeartsGame(difficulty: Difficulty): HeartsGameState {
  const players: Player[] = [
    {
      id: 0,
      name: 'You',
      cards: [],
      score: 0,
      totalScore: 0,
      isHuman: true,
    },
  ];

  for (let i = 1; i <= 3; i++) {
    players.push({
      id: i,
      name: AI_NAMES[i - 1],
      cards: [],
      score: 0,
      totalScore: 0,
      isHuman: false,
    });
  }

  const state: HeartsGameState = {
    players,
    currentTrick: { cards: [], winner: null },
    completedTricks: [],
    passDirection: 'left',
    heartsBroken: false,
    gamePhase: 'passing',
    roundNumber: 1,
    currentPlayerIndex: 0,
    leadSuit: null,
    selectedCardsToPass: [],
    passedCards: [],
  };

  return dealCards(state);
}

/**
 * Shuffle and deal 13 cards to each player
 */
export function dealCards(state: HeartsGameState): HeartsGameState {
  const deck = shuffleDeck(createDeck());
  let currentDeck = [...deck.cards];
  const newPlayers: Player[] = state.players.map(p => ({ ...p, cards: [] as Card[], score: 0 }));

  // Deal 13 cards to each player
  for (let i = 0; i < 13; i++) {
    for (let j = 0; j < newPlayers.length; j++) {
      const { dealt, remaining } = dealCardsFromDeck({ cards: currentDeck }, 1);
      newPlayers[j].cards.push(...(dealt as Card[]));
      currentDeck = remaining.cards;
    }
  }

  // Sort each player's hand by suit then rank
  newPlayers.forEach(player => {
    player.cards.sort((a: Card, b: Card) => {
      const suitOrder: { [key: string]: number } = { clubs: 0, diamonds: 1, spades: 2, hearts: 3 };
      if (a.suit !== b.suit) {
        return suitOrder[a.suit] - suitOrder[b.suit];
      }
      return getRankValue(a.rank) - getRankValue(b.rank);
    });
  });

  // Find who has 2 of clubs to start
  let startingPlayer = 0;
  for (let i = 0; i < newPlayers.length; i++) {
    if (newPlayers[i].cards.some(c => c.suit === 'clubs' && c.rank === '2')) {
      startingPlayer = i;
      break;
    }
  }

  return {
    ...state,
    players: newPlayers,
    currentPlayerIndex: startingPlayer,
    currentTrick: { cards: [], winner: null },
    completedTricks: [],
    heartsBroken: false,
    leadSuit: null,
    selectedCardsToPass: [],
    passedCards: [],
    gamePhase: state.passDirection === 'none' ? 'playing' : 'passing',
  };
}

/**
 * Pass 3 cards to another player
 */
export function passCards(
  state: HeartsGameState,
  playerIndex: number,
  cards: Card[]
): HeartsGameState {
  if (cards.length !== 3 || state.gamePhase !== 'passing') {
    return state;
  }

  const newPlayers = [...state.players];
  const player = { ...newPlayers[playerIndex] };

  // Remove cards from player's hand
  player.cards = player.cards.filter(c => !cards.some(pc => pc.id === c.id));
  newPlayers[playerIndex] = player;

  const newPassedCards = [...state.passedCards];
  
  // Determine recipient based on pass direction
  let recipientId = playerIndex;
  if (state.passDirection === 'left') {
    recipientId = (playerIndex + 1) % 4;
  } else if (state.passDirection === 'right') {
    recipientId = (playerIndex + 3) % 4;
  } else if (state.passDirection === 'across') {
    recipientId = (playerIndex + 2) % 4;
  }

  newPassedCards.push({
    fromId: playerIndex,
    toId: recipientId,
    cards,
  });

  let newState = {
    ...state,
    players: newPlayers,
    passedCards: newPassedCards,
  };

  // Check if all players have passed
  if (newPassedCards.length === 4) {
    // Distribute passed cards
    const updatedPlayers = [...newPlayers];
    newPassedCards.forEach(pass => {
      const recipient = { ...updatedPlayers[pass.toId] };
      recipient.cards.push(...pass.cards);
      // Re-sort cards
      recipient.cards.sort((a, b) => {
        const suitOrder = { clubs: 0, diamonds: 1, spades: 2, hearts: 3 };
        if (a.suit !== b.suit) {
          return suitOrder[a.suit] - suitOrder[b.suit];
        }
        return getRankValue(a.rank) - getRankValue(b.rank);
      });
      updatedPlayers[pass.toId] = recipient;
    });

    // Find who has 2 of clubs to start
    let startingPlayer = 0;
    for (let i = 0; i < updatedPlayers.length; i++) {
      if (updatedPlayers[i].cards.some(c => c.suit === 'clubs' && c.rank === '2')) {
        startingPlayer = i;
        break;
      }
    }

    newState = {
      ...newState,
      players: updatedPlayers,
      currentPlayerIndex: startingPlayer,
      gamePhase: 'playing',
    };
  }

  return newState;
}

/**
 * Check if a card can be legally played
 */
export function canPlayCard(state: HeartsGameState, player: Player, card: Card): boolean {
  const { currentTrick, heartsBroken, leadSuit } = state;

  // First trick of the round: must play 2 of clubs if you have it
  if (state.completedTricks.length === 0 && currentTrick.cards.length === 0) {
    return card.suit === 'clubs' && card.rank === '2';
  }

  // First card of trick (leading)
  if (currentTrick.cards.length === 0) {
    // Can't lead hearts until hearts are broken
    if (card.suit === 'hearts' && !heartsBroken) {
      // Unless player only has hearts
      return player.cards.every(c => c.suit === 'hearts');
    }
    return true;
  }

  // Following suit
  if (leadSuit) {
    const hasLeadSuit = player.cards.some(c => c.suit === leadSuit);
    if (hasLeadSuit) {
      return card.suit === leadSuit;
    }
  }

  // First trick: can't play hearts or queen of spades
  if (state.completedTricks.length === 0) {
    if (card.suit === 'hearts' || (card.suit === 'spades' && card.rank === 'Q')) {
      // Unless they have no other cards
      return player.cards.every(c => 
        c.suit === 'hearts' || (c.suit === 'spades' && c.rank === 'Q')
      );
    }
  }

  return true;
}

/**
 * Play a card
 */
export function playCard(
  state: HeartsGameState,
  playerIndex: number,
  card: Card
): HeartsGameState {
  const player = state.players[playerIndex];

  if (!canPlayCard(state, player, card)) {
    return state;
  }

  const newPlayers = [...state.players];
  const updatedPlayer = { ...newPlayers[playerIndex] };
  updatedPlayer.cards = updatedPlayer.cards.filter(c => c.id !== card.id);
  newPlayers[playerIndex] = updatedPlayer;

  const newTrick = { ...state.currentTrick };
  newTrick.cards = [...newTrick.cards, { card, playerId: playerIndex }];

  let newLeadSuit = state.leadSuit;
  if (newTrick.cards.length === 1) {
    newLeadSuit = card.suit;
  }

  let newHeartsBroken = state.heartsBroken;
  if (card.suit === 'hearts') {
    newHeartsBroken = true;
  }

  let newState = {
    ...state,
    players: newPlayers,
    currentTrick: newTrick,
    leadSuit: newLeadSuit,
    heartsBroken: newHeartsBroken,
  };

  // Check if trick is complete (4 cards played)
  if (newTrick.cards.length === 4) {
    const winnerId = evaluateTrick(newTrick, newLeadSuit!);
    newTrick.winner = winnerId;

    const newCompletedTricks = [...state.completedTricks, newTrick];

    newState = {
      ...newState,
      currentTrick: { cards: [], winner: null },
      completedTricks: newCompletedTricks,
      currentPlayerIndex: winnerId,
      leadSuit: null,
    };

    // Check if round is over (all 13 tricks played)
    if (newCompletedTricks.length === 13) {
      return endRound(newState);
    }
  } else {
    // Move to next player
    newState = {
      ...newState,
      currentPlayerIndex: (playerIndex + 1) % 4,
    };
  }

  return newState;
}

/**
 * Evaluate trick to determine winner
 */
export function evaluateTrick(trick: Trick, leadSuit: string): number {
  if (trick.cards.length === 0) return 0;

  let highestCard = trick.cards[0];
  let winnerId = trick.cards[0].playerId;

  for (let i = 1; i < trick.cards.length; i++) {
    const current = trick.cards[i];
    // Only cards of lead suit can win
    if (current.card.suit === leadSuit) {
      if (highestCard.card.suit !== leadSuit || 
          getRankValue(current.card.rank) > getRankValue(highestCard.card.rank)) {
        highestCard = current;
        winnerId = current.playerId;
      }
    }
  }

  return winnerId;
}

/**
 * Calculate points from completed tricks
 */
export function calculateScore(player: Player, tricks: Trick[]): number {
  let points = 0;

  tricks.forEach(trick => {
    if (trick.winner === player.id) {
      trick.cards.forEach(tc => {
        if (tc.card.suit === 'hearts') {
          points += 1;
        }
        if (tc.card.suit === 'spades' && tc.card.rank === 'Q') {
          points += 13;
        }
      });
    }
  });

  return points;
}

/**
 * Check if a player shot the moon (got all 26 points)
 */
export function checkShootMoon(players: Player[]): Player[] {
  const moonShooter = players.find(p => p.score === 26);
  
  if (moonShooter) {
    return players.map(p => ({
      ...p,
      score: p.id === moonShooter.id ? 0 : 26,
      totalScore: p.totalScore + (p.id === moonShooter.id ? 0 : 26),
    }));
  }

  return players.map(p => ({
    ...p,
    totalScore: p.totalScore + p.score,
  }));
}

/**
 * End the current round
 */
function endRound(state: HeartsGameState): HeartsGameState {
  let newPlayers = state.players.map(player => ({
    ...player,
    score: calculateScore(player, state.completedTricks),
  }));

  // Check for shooting the moon
  newPlayers = checkShootMoon(newPlayers);

  // Check if game is over (someone reached 100)
  const gameOver = newPlayers.some(p => p.totalScore >= 100);

  if (gameOver) {
    return {
      ...state,
      players: newPlayers,
      gamePhase: 'gameOver',
    };
  }

  // Determine next pass direction
  const passDirections: PassDirection[] = ['left', 'right', 'across', 'none'];
  const nextPassDirection = passDirections[state.roundNumber % 4];

  return {
    ...state,
    players: newPlayers,
    gamePhase: 'roundEnd',
    passDirection: nextPassDirection,
  };
}

/**
 * Start a new round
 */
export function startNewRound(state: HeartsGameState): HeartsGameState {
  const newState = dealCards({
    ...state,
    roundNumber: state.roundNumber + 1,
  });

  return newState;
}

/**
 * Get AI's cards to pass
 */
export function getAICardsToPass(player: Player, difficulty: Difficulty): Card[] {
  const cards = [...player.cards];

  if (difficulty === 'easy') {
    // Easy: Random 3 cards
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }

  // Medium/Hard: Pass high cards, especially spades and hearts
  const scored = cards.map(card => {
    let score = getRankValue(card.rank);
    
    if (card.suit === 'spades') {
      if (card.rank === 'Q') score += 100; // Queen of spades priority
      else if (card.rank === 'A' || card.rank === 'K') score += 50; // High spades
    } else if (card.suit === 'hearts') {
      score += 30; // Hearts are bad
    }
    
    return { card, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 3).map(s => s.card);
}

/**
 * Get AI's card to play
 */
export function getAICardToPlay(state: HeartsGameState, playerIndex: number, difficulty: Difficulty): Card {
  const player = state.players[playerIndex];
  const legalCards = player.cards.filter(card => canPlayCard(state, player, card));

  if (legalCards.length === 0) {
    return player.cards[0];
  }

  const { currentTrick, leadSuit, completedTricks } = state;

  if (difficulty === 'easy') {
    // Easy: Play first legal card
    return legalCards[0];
  }

  // Medium/Hard strategy
  if (currentTrick.cards.length === 0) {
    // Leading: Play low safe card, avoid hearts
    const nonHearts = legalCards.filter(c => c.suit !== 'hearts');
    if (nonHearts.length > 0) {
      // Play lowest card
      nonHearts.sort((a, b) => getRankValue(a.rank) - getRankValue(b.rank));
      return nonHearts[0];
    }
    return legalCards[0];
  } else {
    // Following
    const leadCards = legalCards.filter(c => c.suit === leadSuit);
    
    if (leadCards.length > 0) {
      // Must follow suit
      // Try to play under the current highest card
      const currentHighest = currentTrick.cards
        .filter(tc => tc.card.suit === leadSuit)
        .reduce((highest, tc) => 
          getRankValue(tc.card.rank) > getRankValue(highest.card.rank) ? tc : highest
        );
      
      const underCards = leadCards.filter(c => 
        getRankValue(c.rank) < getRankValue(currentHighest.card.rank)
      );
      
      if (underCards.length > 0) {
        // Play highest card under the current highest
        underCards.sort((a, b) => getRankValue(b.rank) - getRankValue(a.rank));
        return underCards[0];
      } else {
        // Must play over - play lowest over card
        leadCards.sort((a, b) => getRankValue(a.rank) - getRankValue(b.rank));
        return leadCards[0];
      }
    } else {
      // Can't follow suit - dump high point cards
      const queenOfSpades = legalCards.find(c => c.suit === 'spades' && c.rank === 'Q');
      if (queenOfSpades) return queenOfSpades;
      
      const hearts = legalCards.filter(c => c.suit === 'hearts');
      if (hearts.length > 0) {
        hearts.sort((a, b) => getRankValue(b.rank) - getRankValue(a.rank));
        return hearts[0];
      }
      
      // Play highest card
      legalCards.sort((a, b) => getRankValue(b.rank) - getRankValue(a.rank));
      return legalCards[0];
    }
  }
}
