import { Difficulty } from '../../types';
import { Card, Pile, GameState } from './types';
import { Suit, Rank } from '../../types/cards';

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export interface SolitaireConfig {
  drawCount: number; // 1 or 3 cards from stock
  passesAllowed: number | null; // null = unlimited
}

const SOLITAIRE_CONFIGS: Record<Difficulty, SolitaireConfig> = {
  easy: { drawCount: 1, passesAllowed: null },
  medium: { drawCount: 3, passesAllowed: null },
  hard: { drawCount: 3, passesAllowed: 3 },
};

export function getSolitaireConfig(difficulty: Difficulty): SolitaireConfig {
  return SOLITAIRE_CONFIGS[difficulty];
}

// Create a shuffled deck
function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        suit,
        rank,
        faceUp: false,
        id: `${rank}-${suit}`
      });
    }
  }
  // Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// Initialize a new game
export function initializeGame(): GameState {
  const deck = createDeck();
  const tableau: GameState['tableau'] = [[], [], [], [], [], [], []];

  // Deal cards to tableau
  let deckIndex = 0;
  for (let i = 0; i < 7; i++) {
    for (let j = i; j < 7; j++) {
      const card = deck[deckIndex++];
      if (j === i) {
        card.faceUp = true; // Top card face up
      }
      tableau[j].push(card);
    }
  }

  // Remaining cards go to stock
  const stock = deck.slice(deckIndex);

  return {
    stock,
    waste: [],
    foundations: [[], [], [], []],
    tableau,
  };
}

// Get rank value (A=1, 2=2, ..., K=13)
export function getRankValue(rank: Rank): number {
  const values: Record<Rank, number> = {
    A: 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
    '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13,
  };
  return values[rank];
}

// Check if card is red
export function isRed(suit: Suit): boolean {
  return suit === 'hearts' || suit === 'diamonds';
}

// Check if can move card to foundation
export function canMoveToFoundation(card: Card, foundation: Pile): boolean {
  if (foundation.length === 0) {
    return card.rank === 'A';
  }
  const topCard = foundation[foundation.length - 1];
  return (
    card.suit === topCard.suit &&
    getRankValue(card.rank) === getRankValue(topCard.rank) + 1
  );
}

// Check if can move card(s) to tableau pile
export function canMoveToTableau(card: Card, tableauPile: Pile): boolean {
  if (tableauPile.length === 0) {
    return card.rank === 'K';
  }
  const topCard = tableauPile[tableauPile.length - 1];
  return (
    isRed(card.suit) !== isRed(topCard.suit) &&
    getRankValue(card.rank) === getRankValue(topCard.rank) - 1
  );
}

// Check if game is won
export function isGameWon(foundations: GameState['foundations']): boolean {
  return foundations.every((f) => f.length === 13);
}

// Draw cards from stock
export function drawFromStock(
  stock: Pile,
  waste: Pile,
  drawCount: number
): { newStock: Pile; newWaste: Pile } {
  const newStock = [...stock];
  const newWaste = [...waste];

  for (let i = 0; i < drawCount && newStock.length > 0; i++) {
    const card = newStock.pop()!;
    card.faceUp = true;
    newWaste.push(card);
  }

  return { newStock, newWaste };
}

// Reset stock from waste
export function resetStock(waste: Pile): { newStock: Pile; newWaste: Pile } {
  const newStock = [...waste].reverse().map((c) => ({ ...c, faceUp: false }));
  return { newStock, newWaste: [] };
}
