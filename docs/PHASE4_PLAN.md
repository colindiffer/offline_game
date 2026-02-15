# Offline Games App - Phase 4: Strategy Board Games

## Context
Phase 3 completed with 9 working games. Now adding 3 classic two-player strategy board games with AI opponents, bringing the total to 12 games.

---

## Phase 4 Goals
Add three classic strategy board games with AI opponents:
1. **Chess** - Classic chess with standard rules
2. **Checkers** (Draughts) - Classic 8x8 checkers
3. **Reversi** (Othello) - Flip strategy game

Each game integrates with existing systems: themes, sounds, stats, high scores, and difficulty settings (AI strength).

---

## Game 1: Chess

### Overview
Full chess game with standard rules, AI opponent, and move validation.

### Difficulty Settings
| Level | AI Strategy | Search Depth |
|-------|-------------|--------------|
| Easy | Random valid moves | 1 |
| Medium | Minimax with basic evaluation | 2 |
| Hard | Minimax with piece-square tables | 3 |

### Features
- **Board**: Standard 8x8 chessboard with algebraic notation
- **Pieces**: Unicode chess symbols (♔♕♖♗♘♙)
- **Rules**: 
  - All standard chess moves (including castling, en passant)
  - Check/checkmate detection
  - Stalemate detection
  - Move validation
- **Controls**:
  - Mobile: Tap piece, tap destination
  - Web: Click piece, click destination
- **Visual**:
  - Highlight selected piece
  - Show valid moves for selected piece
  - Highlight king when in check
  - Show last move made
- **AI**: Minimax algorithm with alpha-beta pruning
- **Stats**: Games played, wins, losses, draws
- **Sounds**:
  - `tap` on piece selection
  - `drop` on valid move
  - `win` on checkmate
  - `error` on invalid move
- **Features**:
  - Undo move
  - New game button
  - Flip board option
  - Move history display (optional)

### Win Condition
Checkmate opponent's king (or AI resignation)

### Files
- `src/games/Chess/Chess.tsx` - Main component
- `src/games/Chess/logic.ts` - Chess rules, move generation, validation
- `src/games/Chess/ai.ts` - Minimax AI implementation
- `src/games/Chess/types.ts` - Piece, Move, Board types

---

## Game 2: Checkers

### Overview
Classic 8x8 checkers (American/English draughts) with AI opponent.

### Difficulty Settings
| Level | AI Strategy | Search Depth |
|-------|-------------|--------------|
| Easy | Random valid moves | 2 |
| Medium | Minimax evaluation | 4 |
| Hard | Minimax with endgame tables | 6 |

### Features
- **Board**: 8x8 checkerboard (only dark squares used)
- **Pieces**: 12 pieces per player (⚫⚪ for normal, ⬤⬜ for kings)
- **Rules**:
  - Diagonal moves only
  - Mandatory captures (must jump if possible)
  - Multiple jumps in one turn
  - Kinging when reaching opposite end
  - Kings can move/jump backwards
- **Controls**:
  - Mobile: Tap piece, tap destination
  - Web: Click piece, click destination
- **Visual**:
  - Highlight valid moves
  - Animate jumps
  - Show captured pieces
  - Highlight mandatory jumps
- **AI**: Minimax with capture prioritization
- **Stats**: Games played, wins, losses, draws
- **Sounds**:
  - `tap` on piece selection
  - `drop` on move
  - `win` on victory
  - Special sound for captures/jumps

### Win Condition
Capture all opponent pieces or block all legal moves

### Files
- `src/games/Checkers/Checkers.tsx` - Main component
- `src/games/Checkers/logic.ts` - Rules, move validation, jump detection
- `src/games/Checkers/ai.ts` - Minimax AI
- `src/games/Checkers/types.ts` - Piece, Move types

---

## Game 3: Reversi (Othello)

### Overview
8x8 board game where pieces flip between colors. Place pieces to trap opponent's pieces.

### Difficulty Settings
| Level | AI Strategy | Search Depth |
|-------|-------------|--------------|
| Easy | Greedy (most flips) | 1 |
| Medium | Minimax with corner strategy | 3 |
| Hard | Minimax with positional weights | 5 |

### Features
- **Board**: 8x8 grid with initial 4 pieces in center
- **Pieces**: Two colors (⚫⚪)
- **Rules**:
  - Must place piece to flip at least one opponent piece
  - Flip all opponent pieces in straight lines (8 directions)
  - Pass turn if no valid moves
  - Game ends when board full or both players pass
- **Controls**:
  - Mobile: Tap empty square to place
  - Web: Click empty square to place
- **Visual**:
  - Highlight valid moves
  - Show pieces that would flip (preview)
  - Animate flipping pieces
  - Display piece count for each player
- **AI**: Minimax with positional evaluation (corners worth more)
- **Stats**: Games played, wins, losses, draws
- **Sounds**:
  - `tap` on placement
  - Flip sound for pieces turning
  - `win` on victory

### Win Condition
Most pieces on board when game ends

### Files
- `src/games/Reversi/Reversi.tsx` - Main component
- `src/games/Reversi/logic.ts` - Rules, flip detection, valid moves
- `src/games/Reversi/ai.ts` - Minimax AI with positional weights
- `src/games/Reversi/types.ts` - Board, Move types

---

## Implementation Order

1. **Reversi** (simplest - fewer rules, simpler AI)
2. **Checkers** (medium - jump mechanics, mandatory captures)
3. **Chess** (most complex - special moves, complex AI)

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
  | 'sudoku'
  | 'chess'
  | 'checkers'
  | 'reversi';
```

### Update GAMES Array
```typescript
// src/utils/constants.ts
export const GAMES: GameMetadata[] = [
  // ... existing 9 games
  { id: 'chess', name: 'Chess', icon: '♟️', color: '#2c3e50' },
  { id: 'checkers', name: 'Checkers', icon: '⚫', color: '#c0392b' },
  { id: 'reversi', name: 'Reversi', icon: '⚪', color: '#27ae60' },
];
```

### Update GameScreen.tsx
Add switch cases for new games.

### Update App.tsx
Add screen titles for new games in navigation config.

### Update stats.ts
Add empty stats for new games.

---

## AI Implementation Notes

### Minimax Algorithm
All three games will use variations of the minimax algorithm with alpha-beta pruning:

1. **Evaluation Functions**:
   - Chess: Material count + piece-square tables
   - Checkers: Piece count + king value + mobility
   - Reversi: Piece count + positional weights (corners high value)

2. **Search Depth**:
   - Configurable per difficulty level
   - Easy: 1-2 moves ahead
   - Medium: 3-4 moves ahead
   - Hard: 5-6 moves ahead

3. **Performance**:
   - Use memoization for repeated positions
   - Implement move ordering (good moves first)
   - Time-limited search for responsive UI

---

## Verification Checklist (Per Game)

- [ ] TypeScript compiles with no errors
- [ ] Game renders correctly on web and mobile
- [ ] Difficulty picker works
- [ ] All game rules implemented correctly
- [ ] Move validation works
- [ ] AI makes reasonable moves at all difficulty levels
- [ ] Win/loss/draw detection works
- [ ] High score/stats tracked
- [ ] Sounds play at appropriate times
- [ ] Theme colors apply correctly
- [ ] Controls work on both web and mobile
- [ ] New game button works
- [ ] Navigation back to home works

---

## Optional Enhancements (If Time Permits)

- **Chess**: 
  - Pawn promotion UI (choose piece)
  - Move timer/clock
  - Opening book for AI
  - Save/load game
  
- **Checkers**:
  - Animated jump sequences
  - Multiple board sizes (10x10 International)
  
- **Reversi**:
  - Hint system (show best move)
  - Move prediction visualization
  
- **All Games**:
  - Replay last game
  - AI vs AI mode (watch AI play)
  - Tutorial mode for rules
  - Difficulty progression (unlock harder levels)

---

## Dependencies

No new dependencies required - all games use existing React Native built-in components and APIs.

---

## Technical Challenges

1. **Chess Complexity**: 
   - Many special rules (castling, en passant, promotion)
   - Large move space requires efficient AI
   - Solution: Use proven chess libraries or implement incrementally

2. **AI Performance**:
   - Deep search can be slow on mobile
   - Solution: Implement iterative deepening, time limits, and web workers (if needed)

3. **Board Rendering**:
   - 8x8 boards need proper sizing for mobile
   - Solution: Use responsive sizing similar to Connect Four

4. **Move Validation**:
   - Complex rules need thorough testing
   - Solution: Unit tests for all move types

---

## Timeline Estimate

- Reversi: 4-5 hours (simpler rules, AI)
- Checkers: 5-6 hours (jump mechanics, mandatory moves)
- Chess: 8-10 hours (complex rules, special moves, AI)
- Testing & Polish: 3 hours

**Total: ~23 hours**
