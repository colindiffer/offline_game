import { Card } from '../../types/cards';
import { createDeck, shuffleDeck, getSuitColor } from '../../utils/cardUtils';
import { FreeCellGameState } from './types';

// FreeCell uses Ace-LOW ordering: A=1, 2=2, ..., 10=10, J=11, Q=12, K=13
function fcRankValue(rank: string): number {
  const order = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  return order.indexOf(rank) + 1;
}

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

export function canMoveToFoundation(card: Card, foundationPile: Card[]): boolean {
  if (foundationPile.length === 0) {
    return card.rank === 'A';
  }
  const topCard = foundationPile[foundationPile.length - 1];
  return card.suit === topCard.suit && fcRankValue(card.rank) === fcRankValue(topCard.rank) + 1;
}

export function canMoveToTableau(card: Card, targetPile: Card[]): boolean {
  if (targetPile.length === 0) return true;
  const topCard = targetPile[targetPile.length - 1];
  const cardColor = getSuitColor(card.suit);
  const topColor = getSuitColor(topCard.suit);
  return cardColor !== topColor && fcRankValue(card.rank) === fcRankValue(topCard.rank) - 1;
}

export function getEmptyFreeCellsCount(freeCells: (Card | null)[]): number {
  return freeCells.filter(cell => cell === null).length;
}

export function getMaxMovableCards(freeCellsCount: number, emptyTableauCount: number): number {
  // Classic FreeCell formula: (1 + freeCells) * 2^emptyTableaus
  return (1 + freeCellsCount) * Math.pow(2, emptyTableauCount);
}

export function findCardInState(
  state: FreeCellGameState,
  cardToFind: Card
): { type: 'tableau'; pileIndex: number; cardIndex: number } | { type: 'freeCell'; index: number } | null {
  // Search tableau
  for (let pIdx = 0; pIdx < state.tableau.length; pIdx++) {
    const pile = state.tableau[pIdx];
    for (let cIdx = 0; cIdx < pile.length; cIdx++) {
      if (pile[cIdx].suit === cardToFind.suit && pile[cIdx].rank === cardToFind.rank) {
        return { type: 'tableau', pileIndex: pIdx, cardIndex: cIdx };
      }
    }
  }

  // Search free cells
  for (let fcIdx = 0; fcIdx < state.freeCells.length; fcIdx++) {
    const cell = state.freeCells[fcIdx];
    if (cell && cell.suit === cardToFind.suit && cell.rank === cardToFind.rank) {
      return { type: 'freeCell', index: fcIdx };
    }
  }

  return null;
}

export function tryMoveCard(
  state: FreeCellGameState,
  from: { type: 'tableau'; pileIndex: number; cardIndex: number } | { type: 'freeCell'; index: number },
  to: { type: 'tableau'; pileIndex: number } | { type: 'freeCell'; index: number } | { type: 'foundation'; pileIndex: number }
): FreeCellGameState | null {
  const newState = JSON.parse(JSON.stringify(state)) as FreeCellGameState;
  let cardsToMove: Card[] = [];

  // 1. Extract cards from source
  if (from.type === 'freeCell') {
    const card = newState.freeCells[from.index];
    if (!card) return null; // No card in free cell
    cardsToMove.push(card);
    newState.freeCells[from.index] = null;
  } else {
    // Moving from tableau
    const fromPile = newState.tableau[from.pileIndex];
    if (from.cardIndex < fromPile.length - 1) {
      // Moving multiple cards from tableau
      cardsToMove = fromPile.slice(from.cardIndex);
      
      // Check if moving multiple cards is valid
      const numCardsToMove = cardsToMove.length;
      const emptyFreeCells = getEmptyFreeCellsCount(newState.freeCells);
      const emptyTableauPiles = newState.tableau.filter(p => p.length === 0).length;
      const maxMovable = getMaxMovableCards(emptyFreeCells, emptyTableauPiles);

      if (numCardsToMove > maxMovable) {
        return null; // Not enough space to move stack
      }

      // Check if the stack itself is in valid alternating color/rank order
      for (let i = 0; i < cardsToMove.length - 1; i++) {
        const card1 = cardsToMove[i];
        const card2 = cardsToMove[i + 1];
        if (!canMoveToTableau(card2, [card1])) { // Check if card2 can be placed on card1
          return null; // Invalid stack order
        }
      }

      newState.tableau[from.pileIndex] = fromPile.slice(0, from.cardIndex);
    } else {
      // Moving single card from tableau
      cardsToMove.push(fromPile.pop()!);
    }
    
    if (cardsToMove.length === 0) return null; // No cards to move
  }

  // 2. Place cards to destination
  if (to.type === 'freeCell') {
    if (cardsToMove.length > 1) return null; // Only single cards to free cells
    const emptyFreeCellIndex = newState.freeCells.findIndex(cell => cell === null);
    if (emptyFreeCellIndex === -1) return null; // No empty free cells
    newState.freeCells[emptyFreeCellIndex] = cardsToMove[0];
  } else if (to.type === 'foundation') {
    // Only single cards to foundation
    if (cardsToMove.length > 1) return null;
    const card = cardsToMove[0];
    const targetFoundationPile = newState.foundations[to.pileIndex];

    if (!canMoveToFoundation(card, targetFoundationPile)) {
        return null; // Cannot move to foundation
    }
    targetFoundationPile.push(card);
  } else {
    // Moving to tableau
    const targetPile = newState.tableau[to.pileIndex];
    const firstCardToMove = cardsToMove[0];

    if (canMoveToTableau(firstCardToMove, targetPile)) {
      targetPile.push(...cardsToMove);
    } else {
      return null; // Invalid move to tableau
    }
  }

  return newState;
}

export function isGameWon(foundations: Card[][]): boolean {
  return foundations.every(f => f.length === 13);
}
