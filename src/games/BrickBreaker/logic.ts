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

export function initializeBrickBreaker(difficulty: Difficulty, boardWidth: number, boardHeight: number, level: number = 1): BrickBreakerState {
  let baseRows = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 5 : 7;
  let cols = difficulty === 'easy' ? 6 : difficulty === 'medium' ? 8 : 10;
  
  // Growth: Add a row every 5 levels
  let rows = Math.min(baseRows + Math.floor((level - 1) / 5), 12);
  
  // Speed growth: increase by 0.5 every level
  let baseSpeed = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 6 : 8;
  let ballSpeed = baseSpeed + (level - 1) * 0.5;
  ballSpeed = Math.min(ballSpeed, 15); // Cap speed

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
