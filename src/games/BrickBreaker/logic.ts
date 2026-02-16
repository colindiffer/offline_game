import { Difficulty } from '../../types';

export interface Point { x: number; y: number; }
export interface Brick { x: number; y: number; width: number; height: number; active: boolean; color: string; }

export interface BrickBreakerState {
  ball: Point;
  ballVel: Point;
  paddleX: number;
  bricks: Brick[];
  gameOver: boolean;
  gameWon: boolean;
}

const BRICK_COLORS = ['#ff7675', '#fdcb6e', '#55efc4', '#74b9ff', '#a29bfe'];

export function initializeBrickBreaker(difficulty: Difficulty, boardWidth: number, boardHeight: number): BrickBreakerState {
  let rows = 4;
  let cols = 6;
  let ballSpeed = 4;

  if (difficulty === 'medium') {
    rows = 6;
    cols = 8;
    ballSpeed = 6;
  } else if (difficulty === 'hard') {
    rows = 8;
    cols = 10;
    ballSpeed = 8;
  }

  const bricks: Brick[] = [];
  const brickWidth = (boardWidth - 40) / cols;
  const brickHeight = 20;
  const padding = 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      bricks.push({
        x: 20 + c * brickWidth + padding,
        y: 60 + r * brickHeight + padding,
        width: brickWidth - padding * 2,
        height: brickHeight - padding * 2,
        active: true,
        color: BRICK_COLORS[r % BRICK_COLORS.length],
      });
    }
  }

  return {
    ball: { x: boardWidth / 2, y: boardHeight - 100 },
    ballVel: { x: ballSpeed * (Math.random() > 0.5 ? 1 : -1), y: -ballSpeed },
    paddleX: boardWidth / 2 - 50,
    bricks,
    gameOver: false,
    gameWon: false,
  };
}
