import { Board, Ship, ShipType, SHIP_CONFIG, BattleshipGameState, GridCell, CellState } from './types';
import { Difficulty } from '../../types';

const BOARD_SIZE = 10;

export function createEmptyBoard(): Board {
  const board: Board = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    const row: GridCell[] = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
      row.push({ row: r, col: c, state: 'empty' });
    }
    board.push(row);
  }
  return board;
}

export function initializeGame(): BattleshipGameState {
  const playerBoard = createEmptyBoard();
  const enemyBoard = createEmptyBoard();
  
  return {
    playerBoard,
    enemyBoard,
    playerShips: [],
    enemyShips: [],
    gamePhase: 'placement',
    currentPlayer: 'player',
    winner: null,
    lastStrike: null,
  };
}

export function canPlaceShip(board: Board, row: number, col: number, size: number, horizontal: boolean): boolean {
  if (horizontal) {
    if (col + size > BOARD_SIZE) return false;
    for (let i = 0; i < size; i++) {
      if (board[row][col + i].state !== 'empty') return false;
    }
  } else {
    if (row + size > BOARD_SIZE) return false;
    for (let i = 0; i < size; i++) {
      if (board[row + i][col].state !== 'empty') return false;
    }
  }
  return true;
}

export function placeShip(board: Board, type: ShipType, row: number, col: number, horizontal: boolean): Ship | null {
  const size = SHIP_CONFIG[type].size;
  if (!canPlaceShip(board, row, col, size, horizontal)) return null;

  const positions: { row: number; col: number }[] = [];
  for (let i = 0; i < size; i++) {
    const r = horizontal ? row : row + i;
    const c = horizontal ? col + i : col;
    board[r][c].state = 'ship';
    board[r][c].shipType = type;
    board[r][c].shipPart = i;
    board[r][c].shipHorizontal = horizontal;
    positions.push({ row: r, col: c });
  }

  return {
    type,
    size,
    positions,
    hits: 0,
    sunk: false,
  };
}

export function placeShipsRandomly(board: Board): Ship[] {
  const ships: Ship[] = [];
  const shipTypes: ShipType[] = ['carrier', 'battleship', 'destroyer', 'submarine', 'patrolBoat'];

  for (const type of shipTypes) {
    let placed = false;
    while (!placed) {
      const horizontal = Math.random() > 0.5;
      const row = Math.floor(Math.random() * BOARD_SIZE);
      const col = Math.floor(Math.random() * BOARD_SIZE);
      const ship = placeShip(board, type, row, col, horizontal);
      if (ship) {
        ships.push(ship);
        placed = true;
      }
    }
  }
  return ships;
}

export function handleStrike(board: Board, ships: Ship[], row: number, col: number): { state: CellState; sunkShip?: Ship } {
  const cell = board[row][col];
  if (cell.state === 'hit' || cell.state === 'miss') return { state: cell.state };

  if (cell.state === 'ship') {
    cell.state = 'hit';
    const ship = ships.find(s => s.positions.some(p => p.row === row && p.col === col));
    if (ship) {
      ship.hits++;
      if (ship.hits === ship.size) {
        ship.sunk = true;
        return { state: 'hit', sunkShip: ship };
      }
    }
    return { state: 'hit' };
  } else {
    cell.state = 'miss';
    return { state: 'miss' };
  }
}

export function getEnemyStrike(playerBoard: Board, difficulty: Difficulty, lastStrike: any): { row: number; col: number } {
  // Simple AI: Random strikes
  // TODO: Implement more advanced AI based on difficulty
  let row, col;
  do {
    row = Math.floor(Math.random() * BOARD_SIZE);
    col = Math.floor(Math.random() * BOARD_SIZE);
  } while (playerBoard[row][col].state === 'hit' || playerBoard[row][col].state === 'miss');

  return { row, col };
}
