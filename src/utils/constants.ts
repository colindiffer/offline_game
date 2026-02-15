import { GameMetadata } from '../types';



export const GAMES: GameMetadata[] = [
  {
    id: 'tic-tac-toe',
    name: 'Tic Tac Toe',
    icon: '❌⭕',
    description: 'Classic X vs O — beat the AI!',
  },
  {
    id: 'snake',
    name: 'Snake',
    icon: '🐍',
    description: 'Eat, grow, and survive!',
  },
  {
    id: '2048',
    name: '2048',
    icon: '🔢',
    description: 'Slide and merge to 2048!',
  },
  {
    id: 'minesweeper',
    name: 'Minesweeper',
    icon: '💣',
    description: 'Clear the minefield without detonating a bomb!',
  },
  {
    id: 'connect-four',
    name: 'Connect Four',
    icon: '🔴🟡',
    description: 'Get four in a row!',
  },
  {
    id: 'tetris',
    name: 'Tetris',
    icon: '🧱',
    description: 'Rotate and drop falling blocks!',
  },
  {
    id: 'maze',
    name: 'Maze',
    icon: '🔀',
    description: 'Find your way to the exit!',
  },
  {
    id: 'solitaire',
    name: 'Solitaire',
    icon: '🃏',
    description: 'Classic Klondike card game!',
  },
  {
    id: 'sudoku',
    name: 'Sudoku',
    icon: '🔢',
    description: 'Fill the grid with numbers!',
  },
  {
    id: 'reversi',
    name: 'Reversi',
    icon: '⚪',
    description: 'Flip pieces to win against AI!',
  },
  {
    id: 'checkers',
    name: 'Checkers',
    icon: '⚫',
    description: 'Jump and king your way to victory!',
  },
  {
    id: 'chess',
    name: 'Chess',
    icon: '♟️',
    description: 'Classic chess vs AI opponent!',
  },
  {
    id: 'blackjack',
    name: 'Blackjack',
    icon: '🃏',
    description: 'Beat the dealer and reach 21!',
  },
  {
    id: 'poker',
    name: 'Poker',
    icon: '🎰',
    description: '5-Card Draw against AI opponents!',
  },
  {
    id: 'hearts',
    name: 'Hearts',
    icon: '♥️',
    description: 'Avoid hearts and the Queen of Spades!',
  },
];

export const SNAKE_GRID_SIZE = 15;
export const SNAKE_TICK_MS = 150;
