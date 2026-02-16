import { Difficulty } from '../../types';
import { Card, Suit, Rank } from '../../types/cards';

export type Pile = Card[];

export interface SpiderGameState {
  tableau: Pile[];
  stock: Pile;
  suits: number;
}

const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export function initializeSpider(difficulty: Difficulty): SpiderGameState {
  let suitCount = 1;
  if (difficulty === 'medium') suitCount = 2;
  else if (difficulty === 'hard') suitCount = 4;

  const suits: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'].slice(0, suitCount) as Suit[];
  let deck: Card[] = [];

  while (deck.length < 104) {
    for (const suit of suits) {
      for (const rank of RANKS) {
        if (deck.length >= 104) break;
        deck.push({
          suit,
          rank,
          faceUp: false,
          id: `spider-${deck.length}-${rank}-${suit}`
        });
      }
    }
  }

  // Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  const tableau: Pile[] = Array(10).fill(null).map(() => []);
  
  // Deal to tableau: 4 piles of 6, 6 piles of 5
  let deckIndex = 0;
  for (let i = 0; i < 54; i++) {
    const col = i % 10;
    const card = deck[deckIndex++];
    if (i >= 44) card.faceUp = true; 
    tableau[col].push(card);
  }

  const stock = deck.slice(deckIndex);

  return {
    tableau,
    stock,
    suits: suitCount,
  };
}

export function getRankValue(rank: Rank): number {
  const values: Record<Rank, number> = {
    A: 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
    '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13,
  };
  return values[rank];
}

export function canMoveCards(cards: Card[]): boolean {
  if (cards.length === 0) return false;
  if (cards.some(c => !c.faceUp)) return false;
  
  for (let i = 0; i < cards.length - 1; i++) {
    if (cards[i].suit !== cards[i+1].suit) return false;
    if (getRankValue(cards[i].rank) !== getRankValue(cards[i+1].rank) + 1) return false;
  }
  
  return true;
}

export function canPlaceOn(movingCard: Card, targetPile: Pile): boolean {
  if (targetPile.length === 0) return true;
  const topCard = targetPile[targetPile.length - 1];
  return getRankValue(topCard.rank) === getRankValue(movingCard.rank) + 1;
}
