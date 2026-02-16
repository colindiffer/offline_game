import { GameMetadata } from '../types';



export const GAMES: GameMetadata[] = [
  {
    id: 'tic-tac-toe',
    name: 'Tic Tac Toe',
    icon: '❌⭕',
    description: 'Classic X vs O — beat the AI!',
    color: '#ff7675',
  },
  {
    id: 'snake',
    name: 'Snake',
    icon: '🐍',
    description: 'Eat, grow, and survive!',
    color: '#55efc4',
  },
  {
    id: '2048',
    name: '2048',
    icon: '🔢',
    description: 'Slide and merge to 2048!',
    color: '#fab1a0',
  },
  {
    id: 'minesweeper',
    name: 'Minesweeper',
    icon: '💣',
    description: 'Clear the minefield without detonating a bomb!',
    color: '#a29bfe',
  },
  {
    id: 'connect-four',
    name: 'Connect Four',
    icon: '🔴🟡',
    description: 'Get four in a row!',
    color: '#ffeaa7',
  },
  {
    id: 'tetris',
    name: 'Tetris',
    icon: '🧱',
    description: 'Rotate and drop falling blocks!',
    color: '#74b9ff',
  },
  {
    id: 'maze',
    name: 'Maze',
    icon: '🔀',
    description: 'Find your way to the exit!',
    color: '#e17055',
  },
  {
    id: 'solitaire',
    name: 'Solitaire',
    icon: '🃏',
    description: 'Classic Klondike card game!',
    color: '#e84393',
  },
  {
    id: 'sudoku',
    name: 'Sudoku',
    icon: '🔢',
    description: 'Fill the grid with numbers!',
    color: '#00b894',
  },
  {
    id: 'reversi',
    name: 'Reversi',
    icon: '⚪',
    description: 'Flip pieces to win against AI!',
    color: '#636e72',
  },
  {
    id: 'checkers',
    name: 'Checkers',
    icon: '⚫',
    description: 'Jump and king your way to victory!',
    color: '#2d3436',
  },
  {
    id: 'chess',
    name: 'Chess',
    icon: '♟️',
    description: 'Classic chess vs AI opponent!',
    color: '#d63031',
  },
  {
    id: 'blackjack',
    name: 'Blackjack',
    icon: '🃏',
    description: 'Beat the dealer and reach 21!',
    color: '#0984e3',
  },
  {
    id: 'poker',
    name: 'Poker',
    icon: '🎰',
    description: '5-Card Draw against AI opponents!',
    color: '#6c5ce7',
  },
  {
    id: 'hearts',
    name: 'Hearts',
    icon: '♥️',
    description: 'Avoid hearts and the Queen of Spades!',
    color: '#fd79a8',
  },
];

export const SNAKE_GRID_SIZE = 15;
export const SNAKE_TICK_MS = 150;
