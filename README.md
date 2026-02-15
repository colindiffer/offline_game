# Offline Games App 🎮

A comprehensive mobile + web app with **15 classic games** built with React Native (Expo) and TypeScript. Features include intelligent AI opponents, multiple difficulty levels, high scores, tutorials, themes, and more!

---

## 🎯 Games Included

### Classic Arcade (6 Games)
1. **Tic Tac Toe** — Player (X) vs AI (O) on a 3x3 grid with minimax algorithm
2. **Snake** — Grid-based snake game with D-pad controls (+ arrow keys on web)
3. **2048** — Swipe-based tile merging with undo feature (+ arrow keys on web)
4. **Minesweeper** — Classic mine-clearing game with flagging
5. **Connect Four** — Player vs AI, get four in a row (vertical/horizontal/diagonal)
6. **Tetris** — Classic falling block puzzle with pause functionality

### Puzzle & Strategy (3 Games)
7. **Maze** — Navigate to the exit using swipe or arrow key controls
8. **Solitaire** — Classic Klondike card game with smooth animations
9. **Sudoku** — Number puzzle with smart hint system

### Board Games (3 Games)
10. **Reversi** — Flip opponent's discs to control the board
11. **Checkers** — Classic checkers with mandatory jumps and king pieces
12. **Chess** — Full chess implementation with castling, en passant, and checkmate detection

### Card Games (3 Games)
13. **Blackjack** — Hit, Stand, Double Down against the dealer (tokens-based)
14. **Poker** — 5-Card Draw with 1-3 AI opponents and betting rounds
15. **Hearts** — 4-player trick-taking game with card passing and shooting the moon

---

## ✨ Key Features

### 🎓 Tutorial System
- Interactive step-by-step tutorials for every game
- Accessible from difficulty picker screen
- Swipeable tutorial steps with visual aids

### 🏆 High Scores & Statistics
- Per-difficulty high scores for each game
- Game statistics tracking (games played, wins, losses, time played)
- High scores accessible from individual game screens

### 🎮 Enhanced Gameplay
- **Undo System**: 2048 allows undo of last 5 moves
- **Hint System**: Sudoku provides smart hints for single-candidate cells
- **Pause Functionality**: Snake and Tetris support pausing mid-game
- **Resume Game**: Return to in-progress games or start fresh

### 🎨 Customization
- **4 Themes**: Dark (default), Light, Retro, Ocean
- **Sound Effects**: Tap, win, lose, and game-specific sounds with mute toggle
- **Responsive Layout**: 3-column grid layout that works at any zoom level

### 🤖 Intelligent AI
- Difficulty-based AI behaviors across all games
- Minimax for Tic Tac Toe and Connect Four
- Strategic AI for board games (Chess, Checkers, Reversi)
- Poker and Blackjack AI with varying skill levels

---

## 🎲 Platform
- **Framework**: React Native with Expo (SDK 54), TypeScript
- **Platforms**: Mobile (iOS/Android via Expo Go) + Web (browser via `react-native-web`)
- **Web support** enables testing directly on laptops without emulators

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

### Puzzle & Strategy Games
| Game | Easy | Medium | Hard |
|------|------|--------|------|
| **Maze** | 10×10 grid | 15×15 grid | 20×20 grid |
| **Solitaire** | Draw 1 card | Draw 1 card | Draw 3 cards |
| **Sudoku** | Many clues | Some clues | Few clues |

### Board Games
| Game | Easy | Medium | Hard |
|------|------|--------|------|
| **Reversi** | Basic AI | Intermediate AI | Advanced AI |
| **Checkers** | Basic AI | Intermediate AI | Advanced AI |
| **Chess** | Depth 2 search | Depth 3 search | Depth 4 search |

### Card Games
| Game | Easy | Medium | Hard |
|------|------|--------|------|
| **Blackjack** | 1 deck | 2 decks | 6 decks + S17 |
| **Poker** | 1 AI opponent | 2 AI opponents | 3 AI opponents |
| **Hearts** | Basic AI | Intermediate AI | Advanced AI |

**Design Philosophy**: No difficulty is unbeatable — even Hard mode is challenging but winnable with skill.

## 🎮 Controls

### Mobile
- **Touch/Tap**: Tic Tac Toe, Minesweeper, Connect Four, board games, card games
- **D-pad Buttons**: Snake movement
- **Swipe Gestures**: 2048, Maze
- **On-screen Controls**: Tetris (rotate, move, drop), card selection and actions

### Web
- **Mouse Clicks**: All tap-based games
- **Arrow Keys**: Snake, 2048, Tetris, Maze
- **Keyboard Shortcuts**: 
  - Connect Four: Number keys 1-7
  - Tetris: Arrow keys + Space (drop)
  - Card games: Click-based UI

---

## 💾 Data Persistence

- **High Scores**: Per-game, per-difficulty tracking via AsyncStorage
- **Game Statistics**: Games played, wins, losses, win rate, total time
- **Resume Games**: Auto-save current game state to continue later
- **Tutorial Progress**: Track which tutorials have been viewed
- **Settings**: Theme preference, sound on/off saved locally

---

## 🎨 UI & Themes

### Available Themes
- **Dark** (default) — Sleek dark mode with vibrant accents
- **Light** — Clean light mode for daytime play
- **Retro** — Nostalgic 80s-inspired color scheme
- **Ocean** — Calming blues and teals

### Visual Features
- Dynamic navigation header colors per theme
- Smooth animations (card flips, tile merges, piece movements)
- Color-coded difficulty indicators (🟢 Easy, 🟡 Medium, 🔴 Hard)
- Responsive 3-column grid layout on home screen
- Game-specific color schemes and visual feedback

### Sound Effects
- Game actions: Tap, move, place, capture
- Outcomes: Win, lose, draw
- Special events: Line clear (Tetris), food eat (Snake), tile merge (2048)
- Mute toggle in Settings screen

## 📁 Project Structure

```
App.tsx                          # Navigation container
src/
  screens/
    HomeScreen.tsx               # 3-column game grid + settings button
    GameScreen.tsx               # Game router with resume/difficulty picker
    SettingsScreen.tsx           # Theme picker, sound toggle, data management
  games/
    TicTacToe/                   # Tic Tac Toe with minimax AI
    Snake/                       # Snake with pause functionality
    Game2048/                    # 2048 with undo system
    Minesweeper/                 # Minesweeper with flagging
    ConnectFour/                 # Connect Four with AI
    Tetris/                      # Tetris with pause and responsive sizing
    Maze/                        # Maze generation and solving
    Solitaire/                   # Klondike Solitaire with animations
    Sudoku/                      # Sudoku with hint system
    Reversi/                     # Reversi/Othello with AI
    Checkers/                    # Checkers with forced jumps
    Chess/                       # Full chess with special moves
    Blackjack/                   # Blackjack with betting (tokens)
    Poker/                       # 5-Card Draw Poker
    Hearts/                      # Hearts trick-taking game
  components/
    AnimatedButton.tsx           # Reusable button with press animation
    GameCard.tsx                 # Home screen game card (icon + name)
    Header.tsx                   # In-game header with score
    DifficultyPicker.tsx         # Difficulty + tutorial + high scores
    ResumeGamePicker.tsx         # Continue or restart game option
    TutorialScreen.tsx           # Swipeable tutorial modal
    HighScoresScreen.tsx         # Per-difficulty high scores
    HintButton.tsx               # Hint button with cooldown
    PlayingCard.tsx              # Reusable playing card component
  contexts/
    ThemeContext.tsx             # Theme provider
    SoundContext.tsx             # Sound manager
  utils/
    constants.ts                 # Game metadata (all 15 games)
    storage.ts                   # AsyncStorage (high scores, resume)
    themes.ts                    # Theme definitions (4 themes)
    sounds.ts                    # Sound loading and playback
    stats.ts                     # Game statistics tracking
    tutorials.ts                 # Tutorial content for all games
    cardUtils.ts                 # Card deck utilities (create, shuffle, deal)
  types/
    index.ts                     # Core types (GameId, Difficulty, etc.)
    cards.ts                     # Card types (Suit, Rank, Card, Deck)
```

---

## 📦 Dependencies

### Core
- `expo` (SDK 54) — React Native framework
- `react-native` — Mobile UI framework
- `typescript` — Type safety

### Navigation
- `@react-navigation/native` + `@react-navigation/native-stack` — Screen navigation
- `react-native-screens` + `react-native-safe-area-context` — Navigation support

### Features
- `react-native-gesture-handler` — Swipe detection for 2048 and Maze
- `@react-native-async-storage/async-storage` — Local storage for high scores, stats, settings
- `expo-av` — Audio playback for sound effects

### Web Platform
- `react-native-web` + `react-dom` + `@expo/metro-runtime` — Web platform support

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
npx expo start
```

### Running the App
- **Web**: Press `w` in the terminal or open http://localhost:8081 in your browser
- **iOS**: Press `i` or scan QR code with Camera app (requires Expo Go)
- **Android**: Press `a` or scan QR code with Expo Go app

---

## 🏗️ Development Phases

### ✅ Phase 1: Foundation (6 Games)
Core infrastructure with Tic Tac Toe, Snake, 2048, Minesweeper, Connect Four, Tetris

### ✅ Phase 2: Polish & Features
Themes, sounds, statistics, animations, responsive design

### ✅ Phase 3: Puzzle & Strategy (3 Games)
Added Maze, Solitaire, Sudoku with advanced features

### ✅ Phase 4: Board Games (3 Games)
Implemented Reversi, Checkers, Chess with AI opponents

### ✅ Phase 5: Quality of Life
Tutorials, hints, undo, pause, resume game, per-difficulty high scores

### ✅ Phase 6: Card Games (3 Games)
Blackjack, Poker, Hearts with shared card system and AI players

---

## 🎯 Future Enhancements (Potential)

- Online multiplayer for selected games
- Achievements and badges system
- Daily challenges
- Customizable game rules
- More games (Phase 7)
- Leaderboards with friends

---

## 📄 License

This project is open source and available under the MIT License.

---

## 👨‍💻 Developer

Built with ❤️ using React Native, Expo, and TypeScript

Repository: [github.com/colindiffer/offline_game](https://github.com/colindiffer/offline_game)
