import { DominoTile, DominoGameState } from './types';
import { Difficulty } from '../../types';

export function initializeDominoes(difficulty: Difficulty): DominoGameState {
  const allTiles: DominoTile[] = [];
  for (let i = 0; i <= 6; i++) {
    for (let j = i; j <= 6; j++) {
      allTiles.push({ id: `d-${i}-${j}`, sideA: i, sideB: j });
    }
  }

  // Shuffle
  const shuffled = allTiles.sort(() => Math.random() - 0.5);
  
  const playerHand = shuffled.slice(0, 7);
  const aiHands = [shuffled.slice(7, 14)];
  const stock = shuffled.slice(14);

  return {
    playerHand,
    aiHands,
    board: [],
    stock,
    currentPlayerIndex: 0,
    gameOver: false,
    winner: null,
  };
}

export function canPlayTile(tile: DominoTile, board: DominoGameState['board']): 'left' | 'right' | 'both' | null {
  if (board.length === 0) return 'both';

  const leftEnd = getBoardEnd(board, 'left');
  const rightEnd = getBoardEnd(board, 'right');

  const matchesLeft = tile.sideA === leftEnd || tile.sideB === leftEnd;
  const matchesRight = tile.sideA === rightEnd || tile.sideB === rightEnd;

  if (matchesLeft && matchesRight) return 'both';
  if (matchesLeft) return 'left';
  if (matchesRight) return 'right';
  return null;
}

export function getBoardEnd(board: DominoGameState['board'], side: 'left' | 'right'): number {
    if (board.length === 0) return -1;
    if (side === 'left') {
        const root = board[0];
        if (root.end === 'root') return (root as any).outLeft;
        return (root as any).outValue;
    } else {
        const last = board[board.length - 1];
        if (last.end === 'root') return (last as any).outRight;
        return (last as any).outValue;
    }
}

export function playTile(state: DominoGameState, tile: DominoTile, side: 'left' | 'right'): DominoGameState {
    const newBoard = [...state.board];
    const playerIdx = state.currentPlayerIndex;
    
    // Remove from correct hand
    let newPlayerHand = state.playerHand;
    let newAiHands = [...state.aiHands];
    if (playerIdx === 0) {
        newPlayerHand = state.playerHand.filter(t => t.id !== tile.id);
    } else {
        newAiHands[playerIdx - 1] = newAiHands[playerIdx - 1].filter(t => t.id !== tile.id);
    }
    
    if (newBoard.length === 0) {
        newBoard.push({ 
            tile, 
            end: 'root', 
            outLeft: tile.sideA, 
            outRight: tile.sideB,
            displaySideA: tile.sideA,
            displaySideB: tile.sideB
        } as any);
    } else if (side === 'left') {
        const currentLeft = getBoardEnd(state.board, 'left');
        const isAMatch = tile.sideA === currentLeft;
        const outValue = isAMatch ? tile.sideB : tile.sideA;
        // For the left side, the 'inward' side (matched) should be on the right of the tile
        newBoard.unshift({ 
            tile, 
            end: 'left', 
            outValue,
            displaySideA: outValue,
            displaySideB: isAMatch ? tile.sideA : tile.sideB
        } as any);
    } else {
        const currentRight = getBoardEnd(state.board, 'right');
        const isAMatch = tile.sideA === currentRight;
        const outValue = isAMatch ? tile.sideB : tile.sideA;
        // For the right side, the 'inward' side (matched) should be on the left of the tile
        newBoard.push({ 
            tile, 
            end: 'right', 
            outValue,
            displaySideA: isAMatch ? tile.sideA : tile.sideB,
            displaySideB: outValue
        } as any);
    }

    const nextPlayer = (playerIdx + 1) % (1 + state.aiHands.length);

    return {
        ...state,
        board: newBoard,
        playerHand: newPlayerHand,
        aiHands: newAiHands,
        currentPlayerIndex: nextPlayer,
    };
}

export function getAIMove(state: DominoGameState, aiIndex: number): { tile: DominoTile, side: 'left' | 'right' } | null {
    const hand = state.aiHands[aiIndex];
    for (const tile of hand) {
        const side = canPlayTile(tile, state.board);
        if (side) {
            return { tile, side: side === 'both' ? 'right' : side };
        }
    }
    return null;
}

export function drawFromStock(state: DominoGameState): DominoGameState {
    if (state.stock.length === 0) return state;
    const newStock = [...state.stock];
    const tile = newStock.pop()!;
    return {
        ...state,
        playerHand: [...state.playerHand, tile],
        stock: newStock,
    };
}
