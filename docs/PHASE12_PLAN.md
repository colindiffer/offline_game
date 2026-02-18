# Phase 12: Strategy, Logic & Card Classics

## Overview
Phase 12 expands the collection to 27 games, introducing a strategic naval combat game, a logic-focused code-breaking challenge, and the classic partner-based trick-taking card game, Spades.

## New Games

### 1. Battleship (Sea Battle)
- **Goal**: Sink the opponent's entire fleet before they find and sink yours.
- **Visuals**: Radar-style grids, splash/explosion effects, and a strategic placement phase.
- **Controls**: Tap grid to strike; drag-and-drop to place ships.
- **Progression**: Advanced AI that learns your patterns on higher difficulty levels.

### 2. Spades
- **Goal**: Bid and win the number of tricks predicted. Spades are always trump.
- **Visuals**: Full-width fanned card layout (consistent with Hearts), bidding UI, and a detailed score summary.
- **Controls**: Tap to bid and play cards.
- **Progression**: Advanced partner AI and varying opponent difficulty levels.

### 3. Code Breaker (Logic)
- **Goal**: Deduce a hidden sequence of 4 colored pegs in 10 tries or less.
- **Visuals**: Modern logic-grid layout with satisfying feedback pegs (black/white) for hints.
- **Controls**: Tap to place colors; submit to check code.
- **Progression**: Hard mode increases code length or number of possible colors.

## Implementation Standards
- **Dynamic Scaling**: All 3 games will utilize the `useWindowDimensions` pattern to maximize screen usage.
- **Theme Support**: Full compatibility with "Midnight" and "Arctic" themes, ensuring high contrast and legibility.
- **Persistent Progress**: Win/Loss records and highest win streaks saved via `storage.ts`.
