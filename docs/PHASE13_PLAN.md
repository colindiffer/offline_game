# Phase 13: The Grand Classics

## Overview
Phase 13 brings the total to 30 games, adding one of the most requested solitaire variants, a timeless tile-matching game, and one of the oldest known board games.

## New Games

### 1. FreeCell Solitaire
- **Goal**: Move all cards to the four foundation piles (Ace to King).
- **Visuals**: Full open-board layout.
- **Controls**: Drag and drop cards. Use the four "free cells" strategically to maneuver cards.
- **Difference**: Unlike Klondike, all cards are visible at the start, making it a game of almost pure skill.

### 2. Dominoes (Draw)
- **Goal**: Be the first to play all your tiles by matching pips on the open ends of the layout.
- **Visuals**: 3D-styled ceramic tiles with black pips. The chain curves around the screen.
- **Controls**: Drag a tile to a matching end.
- **Progression**: Play against 1-3 AI opponents.

### 3. Backgammon
- **Goal**: Move all your checkers into your home board and then bear them off before your opponent.
- **Visuals**: Classic wooden board with triangular points. Dice rolling animations.
- **Controls**: Tap dice to roll, drag checkers to move.
- **Mechanics**: Includes hitting blots, entering from the bar, and bearing off.

## Implementation Standards
- **Dynamic Scaling**: `useWindowDimensions` for all boards (especially important for the wide Dominoes layout and Backgammon board).
- **Theme Support**: High contrast visuals for "Midnight" and "Arctic" themes.
- **Persistence**: Save game state on close.
