import { Difficulty } from '../../types';

export type Cell = {
  row: number;
  col: number;
  walls: {
    top: boolean;
    right: boolean;
    bottom: boolean;
    left: boolean;
  };
  visited: boolean;
};

export type MazeGrid = Cell[][];

export interface MazeConfig {
  rows: number;
  cols: number;
}

export function getMazeConfig(difficulty: Difficulty, level: number = 1): MazeConfig {
  const baseSize = difficulty === 'easy' ? 8 : difficulty === 'medium' ? 12 : 16;
  const size = Math.min(baseSize + Math.floor((level - 1) / 4), 30);
  return { rows: size, cols: size };
}

function createEmptyGrid(rows: number, cols: number): MazeGrid {
  const grid: MazeGrid = [];
  for (let r = 0; r < rows; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < cols; c++) {
      row.push({
        row: r,
        col: c,
        walls: { top: true, right: true, bottom: true, left: true },
        visited: false,
      });
    }
    grid.push(row);
  }
  return grid;
}

function removeWall(current: Cell, next: Cell) {
  const dx = current.col - next.col;
  const dy = current.row - next.row;

  if (dx === 1) {
    // Next is to the left
    current.walls.left = false;
    next.walls.right = false;
  } else if (dx === -1) {
    // Next is to the right
    current.walls.right = false;
    next.walls.left = false;
  }

  if (dy === 1) {
    // Next is above
    current.walls.top = false;
    next.walls.bottom = false;
  } else if (dy === -1) {
    // Next is below
    current.walls.bottom = false;
    next.walls.top = false;
  }
}

function getUnvisitedNeighbors(grid: MazeGrid, cell: Cell): Cell[] {
  const neighbors: Cell[] = [];
  const { row, col } = cell;
  const rows = grid.length;
  const cols = grid[0].length;

  if (row > 0 && !grid[row - 1][col].visited) neighbors.push(grid[row - 1][col]);
  if (col < cols - 1 && !grid[row][col + 1].visited) neighbors.push(grid[row][col + 1]);
  if (row < rows - 1 && !grid[row + 1][col].visited) neighbors.push(grid[row + 1][col]);
  if (col > 0 && !grid[row][col - 1].visited) neighbors.push(grid[row][col - 1]);

  return neighbors;
}

// Recursive backtracker algorithm
export function generateMaze(difficulty: Difficulty, level: number = 1): MazeGrid {
  const config = getMazeConfig(difficulty, level);
  const grid = createEmptyGrid(config.rows, config.cols);
  const stack: Cell[] = [];

  // Start at top-left
  let current = grid[0][0];
  current.visited = true;

  while (true) {
    const unvisitedNeighbors = getUnvisitedNeighbors(grid, current);

    if (unvisitedNeighbors.length > 0) {
      // Choose random unvisited neighbor
      const next = unvisitedNeighbors[Math.floor(Math.random() * unvisitedNeighbors.length)];
      
      stack.push(current);
      removeWall(current, next);
      
      next.visited = true;
      current = next;
    } else if (stack.length > 0) {
      // Backtrack
      current = stack.pop()!;
    } else {
      // Done
      break;
    }
  }

  return grid;
}

export function canMove(
  grid: MazeGrid,
  row: number,
  col: number,
  direction: 'up' | 'down' | 'left' | 'right'
): boolean {
  const rows = grid.length;
  const cols = grid[0].length;

  if (row < 0 || row >= rows || col < 0 || col >= cols) return false;

  const cell = grid[row][col];

  switch (direction) {
    case 'up':
      return !cell.walls.top && row > 0;
    case 'down':
      return !cell.walls.bottom && row < rows - 1;
    case 'left':
      return !cell.walls.left && col > 0;
    case 'right':
      return !cell.walls.right && col < cols - 1;
    default:
      return false;
  }
}

export function hasWon(row: number, col: number, rows: number, cols: number): boolean {
  return row === rows - 1 && col === cols - 1;
}
