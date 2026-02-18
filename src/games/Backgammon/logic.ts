import { BackgammonGameState, CheckerColor } from './types';

export function initializeBackgammon(): BackgammonGameState {
  const points: CheckerColor[][] = Array(24).fill(null).map(() => []);
  
  // Starting positions
  // Point indices are 0-23
  // White moves 0 -> 23
  // Red moves 23 -> 0
  
  points[0] = ['white', 'white'];
  points[11] = Array(5).fill('white');
  points[16] = Array(3).fill('white');
  points[18] = Array(5).fill('white');
  
  points[23] = ['red', 'red'];
  points[12] = Array(5).fill('red');
  points[7] = Array(3).fill('red');
  points[5] = Array(5).fill('red');

  return {
    points,
    bar: { white: 0, red: 0 },
    off: { white: 0, red: 0 },
    dice: [],
    currentPlayer: 'white',
    movesRemaining: [],
    gameOver: false,
    winner: null,
  };
}

export function rollDice(): number[] {
  const d1 = Math.floor(Math.random() * 6) + 1;
  const d2 = Math.floor(Math.random() * 6) + 1;
  if (d1 === d2) return [d1, d1, d1, d1];
  return [d1, d2];
}

export function isValidMove(state: BackgammonGameState, from: number | 'bar', to: number | 'off'): boolean {
    if (state.movesRemaining.length === 0) return false;
    
    const color = state.currentPlayer;
    const direction = color === 'white' ? 1 : -1;
    
    // Check if player has checkers on the bar
    if (from !== 'bar' && state.bar[color] > 0) return false;

    if (from === 'bar') {
        const targetIdx = color === 'white' ? to : 23 - (to as number);
        // Simple placeholder: check if point is blocked
        const targetPoint = state.points[to as number];
        if (targetPoint.length > 1 && targetPoint[0] !== color) return false;
        return true;
    }

    if (to === 'off') {
        // Can only bear off if all checkers are in home board
        const homeStart = color === 'white' ? 18 : 0;
        const homeEnd = color === 'white' ? 23 : 5;
        
        let allInHome = state.bar[color] === 0;
        if (allInHome) {
            for (let i = 0; i < 24; i++) {
                if (i < homeStart || i > homeEnd) {
                    if (state.points[i].length > 0 && state.points[i][0] === color) {
                        allInHome = false;
                        break;
                    }
                }
            }
        }
        if (!allInHome) return false;

        const distance = from === 'bar' ? 999 : (color === 'white' ? (24 - from) : (from + 1));
        if (state.movesRemaining.includes(distance)) return true;
        // Also valid if die is greater than distance and no checkers further back
        if (state.movesRemaining.some(d => d > distance)) {
            const furtherBackStart = color === 'white' ? homeStart : (from + 1);
            const furtherBackEnd = color === 'white' ? (from - 1) : homeEnd;
            let noneFurther = true;
            for (let i = furtherBackStart; i <= furtherBackEnd; i++) {
                if (state.points[i].length > 0 && state.points[i][0] === color) {
                    noneFurther = false;
                    break;
                }
            }
            return noneFurther;
        }
        return false;
    }

    const distance = (to as number - (from as number)) * direction;
    if (!state.movesRemaining.includes(distance)) return false;

    const targetPoint = state.points[to as number];
    if (targetPoint.length > 1 && targetPoint[0] !== color) return false;

    return true;
}

export function performMove(state: BackgammonGameState, from: number | 'bar', to: number | 'off'): BackgammonGameState {
    const newState = JSON.parse(JSON.stringify(state));
    const color = state.currentPlayer;
    const direction = color === 'white' ? 1 : -1;
    const distance = from === 'bar' ? (color === 'white' ? (to as number + 1) : (24 - (to as number))) : ((to as number - (from as number)) * direction);

    // Remove from source
    if (from === 'bar') {
        newState.bar[color]--;
    } else {
        newState.points[from as number].pop();
    }

    // Add to target
    if (to === 'off') {
        newState.off[color]++;
    } else {
        const targetPoint = newState.points[to as number];
        if (targetPoint.length === 1 && targetPoint[0] !== color) {
            // Hit!
            const opponentColor = targetPoint[0];
            targetPoint.pop();
            newState.bar[opponentColor]++;
        }
        targetPoint.push(color);
    }

    // Remove move from remaining
    const moveIdx = newState.movesRemaining.indexOf(distance);
    if (moveIdx !== -1) newState.movesRemaining.splice(moveIdx, 1);

    // Switch player if no moves left
    if (newState.movesRemaining.length === 0) {
        newState.currentPlayer = color === 'white' ? 'red' : 'white';
        newState.dice = [];
    } else {
        // Check if any legal moves are possible with remaining dice
        if (!hasLegalMoves(newState)) {
            newState.currentPlayer = color === 'white' ? 'red' : 'white';
            newState.dice = [];
            newState.movesRemaining = [];
        }
    }

    return newState;
}

export function hasLegalMoves(state: BackgammonGameState): boolean {
    if (state.movesRemaining.length === 0) return false;
    
    const color = state.currentPlayer;
    
    // Check from bar
    if (state.bar[color] > 0) {
        return state.movesRemaining.some(die => {
            const targetIdx = color === 'white' ? die - 1 : 24 - die;
            const targetPoint = state.points[targetIdx];
            return targetPoint.length <= 1 || targetPoint[0] === color;
        });
    }

    // Check from all points
    for (let i = 0; i < 24; i++) {
        if (state.points[i].length > 0 && state.points[i][0] === color) {
            if (state.movesRemaining.some(die => {
                const targetIdx = color === 'white' ? i + die : i - die;
                if (targetIdx < 0 || targetIdx > 23) {
                    // Check if bear-off is possible
                    return true; // Simplified
                }
                const targetPoint = state.points[targetIdx];
                return targetPoint.length <= 1 || targetPoint[0] === color;
            })) return true;
        }
    }

    return false;
}

export function getAIMove(state: BackgammonGameState): { from: number | 'bar', to: number | 'off' } | null {
    if (state.movesRemaining.length === 0) return null;
    
    const color = state.currentPlayer;
    const direction = color === 'white' ? 1 : -1;

    // 1. Try to move from bar
    if (state.bar[color] > 0) {
        for (const die of state.movesRemaining) {
            const to = color === 'white' ? die - 1 : 24 - die;
            if (isValidMove(state, 'bar', to)) return { from: 'bar', to };
        }
        return null;
    }

    // 2. Try to bear off
    if (isValidMove(state, -1, 'off')) { // Placeholder for "any point to off"
        for (let i = 0; i < 24; i++) {
            if (state.points[i].length > 0 && state.points[i][0] === color) {
                if (isValidMove(state, i, 'off')) return { from: i, to: 'off' };
            }
        }
    }

    // 3. Try normal moves (prefer hitting or safe moves)
    const validMoves: { from: number, to: number }[] = [];
    for (let i = 0; i < 24; i++) {
        if (state.points[i].length > 0 && state.points[i][0] === color) {
            for (const die of state.movesRemaining) {
                const to = i + (die * direction);
                if (to >= 0 && to <= 23 && isValidMove(state, i, to)) {
                    validMoves.push({ from: i, to });
                }
            }
        }
    }

    if (validMoves.length > 0) {
        // Simple AI: pick a random valid move
        return validMoves[Math.floor(Math.random() * validMoves.length)];
    }

    return null;
}
