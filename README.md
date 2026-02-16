# Offline Games App 🎮

A comprehensive mobile + web app with **15 classic games** built with React Native (Expo) and TypeScript. Features include intelligent AI opponents, multiple difficulty levels, high scores, tutorials, themes, and more!

---

## 🎯 Games Included

### Classic Arcade (6 Games)
1. **Tic Tac Toe** — Player (X) vs AI (O) on a 3x3 grid with minimax algorithm
2. **Snake** — Grid-based snake game with intuitive swipe controls
3. **2048** — Swipe-based tile merging with undo feature (+ arrow keys on web)
4. **Minesweeper** — Classic mine-clearing game with flagging
5. **Connect Four** — Player vs AI, get four in a row with smooth falling animations
6. **Tetris** — Classic falling block puzzle with responsive swipe and tap gestures

### Puzzle & Strategy (3 Games)
7. **Maze** — Navigate to the exit using smooth sliding movement
8. **Solitaire** — Classic Klondike card game with large cards and undo system
9. **Sudoku** — Number puzzle with smart hint system and maximized board

### Board Games (3 Games)
10. **Reversi** — Flip opponent's discs to control the board
11. **Checkers** — Classic checkers with mandatory jumps and king pieces
12. **Chess** — Full chess implementation with castling, en passant, and checkmate detection

### Card Games (3 Games)
13. **Blackjack** — Hit, Stand, Double Down against the dealer (tokens-based)
14. **Poker** — 5-Card Hold'em with AI opponents and dynamic card sizing
15. **Hearts** — 4-player trick-taking game with a full-width fanned card layout
16. **Water Sort** — Color sorting puzzle with smooth animations and undo
17. **Word Search** — Find hidden words in dynamic grids with swipe selection
18. **Brick Breaker** — Classic arcade action with responsive touch paddle and physics
19. **Mahjong** — Match identical tiles in 3D layered layouts
20. **Hangman** — Guess the word with premium character drawing
21. **Simon Says** — Test your memory with high-speed color sequences

---

## ✨ Key Features

### ✅ Phase 10: Professional UI & High Scores
- **Overhauled Icons**: Made game icons 40% larger on the homepage for better "fit" and recognition.
- **Fixed Visibility**: Resolved "invisible text" in Tutorials and High Scores by using theme-aware contrast logic.
- **Granular Data Control**: Added ability to clear high scores for individual difficulty levels.
- **Consistent Progress**: Fixed high score logic for time-based games to handle "cleared" states correctly.

### ✅ Phase 9: Logic & Memory (3 Games)
Added Mahjong, Hangman, and Simon Says to reach 21 games.

### ✅ Phase 8: New Challenges (3 Games)
Added Water Sort, Word Search, and Brick Breaker to expand the collection.

### 🎨 Visual Overhaul (Premium Feel)
- **Maximized Board Sizes**: Every game board dynamically scales to fill the full width of the mobile screen.
- **Depth-Based Design**: Tactile borders, wood textures for board games, and premium button effects.
- **Polished Layouts**: Clean, centered UI for a professional mobile-native experience.
- **4 Themes**: Dark (default), Light, Retro, Ocean with curated color palettes.

### 🎮 Optimized Mobile Controls
- **Gesture-Based Play**: 
  - **Tetris**: Responsive drag-to-move, flick down for hard drop, flick up for soft drop, and tap to rotate.
  - **Snake/Maze**: Smooth swipe detection for movement.
  - **Hearts**: Full-width card fan with opaque stacking and corner rank indicators for easy reading.
- **Undo Systems**: Available in Solitaire, 2048, and Sudoku to improve gameplay flow.
- **Immediate Gameplay**: Games like Tetris start instantly without unnecessary splash screens.

### 🤖 Intelligent AI
- Difficulty-based AI behaviors across all games
- Minimax for Tic Tac Toe and Connect Four
- Strategic AI for board games (Chess, Checkers, Reversi)
- Poker and Blackjack AI with varying skill levels

### 🏆 High Scores & Statistics
- Per-difficulty high scores for each game
- Game statistics tracking (games played, wins, losses, time played)

---

## 🎲 Platform
- **Framework**: React Native with Expo (SDK 54), TypeScript
- **Platforms**: Mobile (iOS/Android via Expo Go) + Web (browser via `react-native-web`)

## 🎚️ Difficulty System

Every game offers **Easy / Medium / Hard** difficulty selection before starting.

### Classic Arcade Games
| Game | Easy | Medium | Hard |
|------|------|--------|------|
| **Tic Tac Toe** | AI 20% optimal | AI 55% optimal | AI 85% optimal |
| **Snake** | Slow (200ms) | Normal (150ms) | Fast (100ms) |
| **2048** | Only 2s spawn | 90% 2s, 10% 4s | 70% 2s, 30% 4s |
| **Minesweeper** | 8×8, 10 mines | 12×12, 25 mines | 16×16, 50 mines |
| **Connect Four** | AI 30% optimal | AI 60% optimal | AI 90% optimal |
| **Tetris** | 800ms, -30ms/lvl | 600ms, -40ms/lvl | 400ms, -50ms/lvl |

---

## 📁 Project Structure

```
App.tsx                          # Navigation container
src/
  screens/
    HomeScreen.tsx               # 3-column game grid + settings button
    GameScreen.tsx               # Game router with resume/difficulty picker
    SettingsScreen.tsx           # Theme picker, sound toggle, data management
  games/
    ... (All 15 games implementation)
  components/
    PremiumButton.tsx            # 3D tactile button with shadow depth
    GameOverOverlay.tsx          # Polished victory/defeat screen
    Header.tsx                   # Capsule-style header with score badges
    ... (Shared UI components)
```

## 🏗️ Core Development Standards

All games in this app must adhere to these standards:

1. **Dynamic Scaling**: Boards and game elements must fill the screen width (`SCREEN_WIDTH - 32`) and scale proportionally.
2. **Level-Based Progression**:
   - Every puzzle/arcade game must support a `level` parameter.
   - Difficulty must scale incrementally (e.g., speed +0.5, grid +1, clues -1).
   - Progress must be saved via `getLevel` and `setLevel` in `storage.ts`.
   - Victory screens must offer a "NEXT LEVEL" flow.
3. **Premium Visuals**:
   - Use `shadows.lg` and depth-based borders.
   - Every interaction should have a sound (`playSound`) and visual feedback.
   - Use `ThemeContext` for all colors.
4. **Mobile-First Controls**: Prioritize gestures (swipe, long-press, drag).
5. **Stability**: Zero TypeScript errors (`npx tsc --noEmit`) before committing.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Expo CLI: `npm install -g expo-cli`

### Installation
```bash
# Clone the repository
git clone https://github.com/colindiffer/offline_game.git
cd offline_game

# Install dependencies
npm install

# Start the development server
npm run web
```

---

## 📄 License

This project is open source and available under the MIT License.

---

## 👨‍💻 Developer

Built with ❤️ using React Native, Expo, and TypeScript
