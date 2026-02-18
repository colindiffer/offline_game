export type ShipType = 'carrier' | 'battleship' | 'destroyer' | 'submarine' | 'patrolBoat';

export interface Ship {
  type: ShipType;
  size: number;
  positions: { row: number; col: number }[];
  hits: number;
  sunk: boolean;
}

export type CellState = 'empty' | 'ship' | 'hit' | 'miss';

export interface GridCell {
  row: number;
  col: number;
  state: CellState;
  shipType?: ShipType;
  shipPart?: number;
  shipHorizontal?: boolean;
}

export type Board = GridCell[][];

export interface BattleshipGameState {
  playerBoard: Board;
  enemyBoard: Board;
  playerShips: Ship[];
  enemyShips: Ship[];
  gamePhase: 'placement' | 'playing' | 'finished';
  currentPlayer: 'player' | 'enemy';
  winner: 'player' | 'enemy' | null;
  lastStrike: { row: number; col: number; result: CellState; player: 'player' | 'enemy' } | null;
}

export const SHIP_CONFIG: Record<ShipType, { size: number; name: string }> = {
  carrier: { size: 5, name: 'Carrier' },
  battleship: { size: 4, name: 'Battleship' },
  destroyer: { size: 3, name: 'Destroyer' },
  submarine: { size: 3, name: 'Submarine' },
  patrolBoat: { size: 2, name: 'Patrol Boat' },
};
