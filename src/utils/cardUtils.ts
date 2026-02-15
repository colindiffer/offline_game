import { Card, Deck, Rank, Suit } from '../types/cards';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

/**
 * Creates a standard 52-card deck
 */
export function createDeck(): Deck {
  const cards: Card[] = [];
  
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({
        suit,
        rank,
        id: `${rank}-${suit}`,
      });
    }
  }
  
  return { cards };
}

/**
 * Creates multiple decks (for games like Blackjack that use 6-deck shoes)
 */
export function createMultipleDecks(count: number): Deck {
  const cards: Card[] = [];
  
  for (let i = 0; i < count; i++) {
    const deck = createDeck();
    // Add deck index to card IDs to make them unique
    deck.cards.forEach(card => {
      cards.push({
        ...card,
        id: `${card.id}-deck${i}`,
      });
    });
  }
  
  return { cards };
}

/**
 * Shuffles a deck using Fisher-Yates algorithm
 */
export function shuffleDeck(deck: Deck): Deck {
  const cards = [...deck.cards];
  
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  
  return { cards };
}

/**
 * Deals cards from the deck
 * Returns an array of dealt cards and the remaining deck
 */
export function dealCards(deck: Deck, count: number): { dealt: Card[]; remaining: Deck } {
  const cards = [...deck.cards];
  const dealt = cards.splice(0, count);
  
  return {
    dealt,
    remaining: { cards },
  };
}

/**
 * Gets the numeric value of a card (for Blackjack)
 * Ace can be 1 or 11, face cards are 10
 */
export function getCardValue(card: Card, aceAsEleven: boolean = false): number {
  if (card.rank === 'A') {
    return aceAsEleven ? 11 : 1;
  }
  if (['J', 'Q', 'K'].includes(card.rank)) {
    return 10;
  }
  return parseInt(card.rank, 10);
}

/**
 * Gets the rank value for comparison (A=14, K=13, Q=12, J=11, 10-2=face value)
 */
export function getRankValue(rank: Rank): number {
  switch (rank) {
    case 'A': return 14;
    case 'K': return 13;
    case 'Q': return 12;
    case 'J': return 11;
    default: return parseInt(rank, 10);
  }
}

/**
 * Gets the suit symbol
 */
export function getSuitSymbol(suit: Suit): string {
  switch (suit) {
    case 'hearts': return '♥';
    case 'diamonds': return '♦';
    case 'clubs': return '♣';
    case 'spades': return '♠';
  }
}

/**
 * Gets the suit color
 */
export function getSuitColor(suit: Suit): 'red' | 'black' {
  return suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black';
}

/**
 * Checks if a card is red
 */
export function isRedCard(card: Card): boolean {
  return getSuitColor(card.suit) === 'red';
}

/**
 * Checks if a card is black
 */
export function isBlackCard(card: Card): boolean {
  return getSuitColor(card.suit) === 'black';
}
