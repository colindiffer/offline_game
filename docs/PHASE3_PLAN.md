# Offline Games App - Phase 3: Three New Games

## Context
Phase 1 delivered 3 working games (Tic Tac Toe, Snake, 2048). Phase 2 added themes, sounds, stats, animations, and 3 more games (Minesweeper, Connect Four, Tetris). All 6 games are fully functional with difficulty settings, high scores, and statistics tracking.

---

## Phase 3 Goals
Add three new level-based/puzzle games to bring the total to 9 games:
1. **Maze** - Navigate from start to finish
2. **Solitaire** (Klondike) - Classic card game
3. **Sudoku** - Number puzzle game

Each game should integrate with existing systems: themes, sounds, stats, high scores, and difficulty settings.

---

## Game 1: Maze

### Overview
Navigate a randomly generated maze from a start point (top-left) to an exit (bottom-right).

### Difficulty Settings
| Level | Grid Size | Generation Algorithm |
|-------|-----------|---------------------|
| Easy | 15x15 | Recursive Backtracker |
| Medium | 20x20 | Recursive Backtracker |
| Hard | 25x25 | Recursive Backtracker |

### Features
- **Controls**: 
  - Mobile: Swipe gestures (up/down/left/right)
  - Web: Arrow keys
- **Visual**: 
  - Current position highlighted (player color from theme)
  - Start cell: Green marker
  - Exit cell: Gold marker
  - Walls: Dark color, paths: lighter background
- **Timer**: Display elapsed time (no time limit)
- **High Score**: Best time to complete each difficulty
- **Stats**: Games played, completion rate, average time
- **Sounds**: 
  - `tap` on move
  - `win` on maze completion
- **Maze Generation**: Use recursive backtracker algorithm to ensure perfect maze (exactly one path between any two cells)
- **Reset**: Button to generate new maze

### Win Condition
Reach the exit cell

### Files
- `src/games/Maze/Maze.tsx` - Main component
- `src/games/Maze/logic.ts` - Maze generation algorithm, movement validation

---

## Game 2: Solitaire (Klondike)

### Overview
Classic Klondike Solitaire with drag-and-drop card movement.

### Difficulty Settings
| Level | Cards Drawn | Passes Through Deck |
|-------|-------------|---------------------|
| Easy | 1 card at a time | Unlimited |
| Medium | 3 cards at a time | Unlimited |
| Hard | 3 cards at a time | 3 passes only |

### Features
- **Controls**:
  - Mobile: Tap to select, tap destination to move
  - Web: Click to select, click destination (or drag-and-drop if time permits)
- **Visual**:
  - 7 tableau piles
  - 4 foundation piles (Ace to King, by suit)
  - Stock and waste piles
  - Standard playing card graphics (simple text-based: "A♠", "K♥", etc.)
- **Auto-complete**: When all cards are revealed, button to auto-complete to foundations
- **High Score**: Best time to complete
- **Stats**: Games played, win rate, average time
- **Sounds**:
  - `tap` on card move
  - `win` on completion
  - `drop` on valid placement
- **Scoring**: Track moves made (optional display)
- **Hint**: Optional button to suggest a valid move
- **Undo**: Optional button to undo last move

### Win Condition
All cards moved to foundation piles (Ace to King, all 4 suits)

### Files
- `src/games/Solitaire/Solitaire.tsx` - Main component
- `src/games/Solitaire/logic.ts` - Card logic, move validation, auto-complete
- `src/games/Solitaire/types.ts` - Card, Pile types

---

## Game 3: Sudoku

### Overview
9x9 Sudoku puzzle with number input and validation.

### Difficulty Settings
| Level | Pre-filled Cells | Estimated Solve Time |
|-------|------------------|---------------------|
| Easy | 40-45 | 5-10 minutes |
| Medium | 30-35 | 10-20 minutes |
| Hard | 25-28 | 20-40 minutes |

### Features
- **Controls**:
  - Mobile: Tap cell, tap number button (1-9) or clear button
  - Web: Click cell, type number (1-9) or press Backspace/Delete to clear
- **Visual**:
  - 9x9 grid with bold 3x3 box borders
  - Pre-filled cells (non-editable, darker text)
  - Player-filled cells (editable, lighter text)
  - Invalid entries highlighted in red (duplicate in row/column/box)
  - Selected cell highlighted with border
- **Validation**: Real-time highlighting of conflicts (duplicates in same row/column/box)
- **Hints**: Optional button to reveal one correct cell
- **Notes/Pencil Mode**: Allow small candidate numbers in cells (if time permits)
- **High Score**: Best time to complete each difficulty
- **Stats**: Games played, completion rate, average time
- **Sounds**:
  - `tap` on number entry
  - `win` on completion
  - `error` on invalid move (optional)
- **Puzzle Generation**: Use backtracking algorithm to generate valid puzzles, then remove cells
- **Check**: Button to validate current board (optional)

### Win Condition
All cells filled correctly (no conflicts, all constraints satisfied)

### Files
- `src/games/Sudoku/Sudoku.tsx` - Main component
- `src/games/Sudoku/logic.ts` - Puzzle generation, validation, solving
- `src/games/Sudoku/types.ts` - Grid types

---

## Implementation Order

1. **Maze** (simplest - just pathfinding)
2. **Sudoku** (medium complexity - grid logic, validation)
3. **Solitaire** (most complex - card states, drag-drop, multiple piles)

---

## Global Changes

### Update GameId Type
```typescript
// src/types/index.ts
export type GameId = 
  | 'tic-tac-toe' 
  | 'snake' 
  | '2048' 
  | 'minesweeper' 
  | 'connect-four' 
  | 'tetris'
  | 'maze'
  | 'solitaire'
  | 'sudoku';
```

### Update GAMES Array
```typescript
// src/utils/constants.ts
export const GAMES: GameMetadata[] = [
  // ... existing 6 games
  { id: 'maze', name: 'Maze', icon: '🔀', color: '#9b59b6' },
  { id: 'solitaire', name: 'Solitaire', icon: '🃏', color: '#34495e' },
  { id: 'sudoku', name: 'Sudoku', icon: '🔢', color: '#16a085' },
];
```

### Update GameScreen.tsx
Add switch cases for new games.

### Update App.tsx
Add screen titles for new games in navigation config.

---

## Verification Checklist (Per Game)

- [ ] TypeScript compiles with no errors
- [ ] Game renders correctly on web
- [ ] Difficulty picker works
- [ ] Game logic works correctly
- [ ] Win condition triggers properly
- [ ] High score saves and displays
- [ ] Stats are tracked (games played, wins, time)
- [ ] Sounds play at appropriate times
- [ ] Theme colors apply correctly
- [ ] Controls work (keyboard on web, touch on mobile)
- [ ] Reset/New Game button works
- [ ] Navigation back to home works

---

## Optional Enhancements (If Time Permits)

- **Maze**: Show solution path on win, add move counter
- **Solitaire**: Drag-and-drop support, card animations
- **Sudoku**: Pencil marks for candidate numbers, auto-fill singles
- **All Games**: Tutorial/help screen explaining rules
- **All Games**: Pause button (for timed games)

---

## Dependencies

No new dependencies required - all games use existing React Native built-in components and APIs.

---

## Timeline Estimate

- Maze: 2-3 hours
- Sudoku: 3-4 hours  
- Solitaire: 4-5 hours
- Testing & Polish: 2 hours

**Total: ~13 hours**
