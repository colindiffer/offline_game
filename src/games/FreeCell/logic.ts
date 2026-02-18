import { Card } from '../../types/cards';
import { createDeck, shuffleDeck, getRankValue, getSuitColor } from '../../utils/cardUtils';
import { FreeCellGameState } from './types';

export function initializeFreeCell(): FreeCellGameState {
  const deck = shuffleDeck(createDeck());
  const tableau: Card[][] = Array(8).fill(null).map(() => []);
  
  // Deal all cards to 8 columns
  deck.cards.forEach((card, i) => {
    tableau[i % 8].push({ ...card, faceUp: true });
  });

  return {
    tableau,
    foundations: Array(4).fill(null).map(() => []),
    freeCells: Array(4).fill(null),
    history: [],
  };
}

export function canMoveToFreeCell(card: Card, freeCells: (Card | null)[]): boolean {
  return freeCells.some(cell => cell === null);
}

export function canMoveToFoundation(card: Card, foundation: Card[]): boolean {
  if (foundation.length === 0) {
    return card.rank === 'A';
  }
  const topCard = foundation[foundation.length - 1];
  return card.suit === topCard.suit && getRankValue(card.rank) === getRankValue(topCard.rank) + 1;
}

export function canMoveToTableau(card: Card, targetPile: Card[]): boolean {
  if (targetPile.length === 0) return true;
  const topCard = targetPile[targetPile.length - 1];
  const cardColor = getSuitColor(card.suit);
  const topColor = getSuitColor(topCard.suit);
  
  return cardColor !== topColor && getRankValue(card.rank) === getRankValue(topCard.rank) - 1;
}

export function getMaxMovableCards(freeCellsCount: number, emptyTableauCount: number): number {
  // Classic FreeCell formula: (1 + freeCells) * 2^emptyTableaus
  return (1 + freeCellsCount) * Math.pow(2, emptyTableauCount);
}

export function isGameWon(foundations: Card[][]): boolean {
  return foundations.every(f => f.length === 13);
}
