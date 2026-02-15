# Phase 6: Card Games

## Overview
Add 3 popular card games to bring the total from 12 to 15 games. Focus on single-player card games with AI opponents.

---

## Game 1: Blackjack (21)

### Overview
Classic casino card game where the goal is to get as close to 21 as possible without going over, while beating the dealer.

### Difficulty Settings
| Level | Dealer Strategy | Deck Penetration |
|-------|----------------|------------------|
| Easy | Dealer stands on soft 17, favorable rules | Single deck |
| Medium | Standard casino rules | 2 decks |
| Hard | Dealer hits on soft 17, strict rules | 6 decks |

### Features
- **Controls**: 
  - Tap "Hit" to take another card
  - Tap "Stand" to hold current hand
  - Tap "Double Down" (on first two cards only)
  - Automatic split offered for pairs
- **Visual**:
  - Dealer hand (one card face down until stand)
  - Player hand with running total
  - Standard playing card graphics
  - Chip/betting display
- **Gameplay**:
  - Start with bet of 10 points
  - Win pays 1:1, Blackjack pays 3:2
  - Track running score/bankroll
  - Bust detection and automatic loss
- **High Score**: Highest bankroll achieved
- **Stats**: Games played, wins, losses, blackjacks, busts
- **Sounds**: Card flip, win, lose, blackjack
- **Special Rules**: Insurance, surrender (medium/hard)

### Win Condition
Beat dealer's hand without busting (going over 21)

### Files
- `src/games/Blackjack/Blackjack.tsx` - Main component
- `src/games/Blackjack/logic.ts` - Card dealing, hand evaluation, dealer AI
- `src/games/Blackjack/types.ts` - Card, Hand, Game state types

---

## Game 2: Poker (5-Card Draw)

### Overview
5-Card Draw poker against AI opponents. Draw cards to make the best poker hand.

### Difficulty Settings
| Level | AI Opponents | AI Skill |
|-------|-------------|----------|
| Easy | 1 opponent | Basic (plays high cards) |
| Medium | 2 opponents | Intermediate (understands hands) |
| Hard | 3 opponents | Advanced (bluffs, calculates odds) |

### Features
- **Controls**:
  - Tap cards to mark for discard
  - Tap "Draw" to exchange selected cards
  - Tap "Fold", "Call", "Raise" for betting
- **Visual**:
  - 5-card hand display
  - Opponent cards (face down)
  - Pot in center
  - Chip stacks for each player
  - Hand rank display (Pair, Flush, etc.)
- **Gameplay**:
  - Start with 100 chips
  - Betting round → Draw phase → Final betting round
  - AI opponents with personality (aggressive, conservative)
  - Show winning hand at showdown
- **High Score**: Most chips won in a session
- **Stats**: Games played, hands won, best hand made
- **Sounds**: Chip sounds, card shuffle, win fanfare
- **Hand Rankings**: High card → Royal flush

### Win Condition
Win the pot by having the best hand or making all opponents fold

### Files
- `src/games/Poker/Poker.tsx` - Main component
- `src/games/Poker/logic.ts` - Hand evaluation, betting logic, AI decision making
- `src/games/Poker/types.ts` - Card, Hand, Player, Betting types

---

## Game 3: Hearts

### Overview
Classic trick-taking card game. Avoid taking hearts and the Queen of Spades.

### Difficulty Settings
| Level | AI Opponents | AI Strategy |
|-------|-------------|-------------|
| Easy | 3 basic AI | Random play, avoid obvious hearts |
| Medium | 3 intermediate AI | Card counting, shooting the moon awareness |
| Hard | 3 advanced AI | Perfect information play, strategic passing |

### Features
- **Controls**:
  - Tap card to play it
  - Drag 3 cards to pass (at start of each hand)
  - Arrow showing pass direction
- **Visual**:
  - 4-player layout (player at bottom)
  - Current trick in center
  - Cards in hand arranged by suit
  - Score tracker for all players
  - Point values shown (hearts = 1, Q♠ = 13)
- **Gameplay**:
  - Pass 3 cards each hand (left, right, across, no pass rotation)
  - Must follow suit if possible
  - Hearts can't be led until broken
  - Track points per hand and cumulative
  - Game ends at 100 points
- **High Score**: Lowest total points at game end
- **Stats**: Games played, wins, times shot the moon
- **Sounds**: Card play, trick taken, moon shot
- **Special**: "Shooting the moon" (take all hearts + Q♠ = 0 points for you, 26 for others)

### Win Condition
Have the lowest score when any player reaches 100 points

### Files
- `src/games/Hearts/Hearts.tsx` - Main component
- `src/games/Hearts/logic.ts` - Trick taking, passing, scoring, AI strategy
- `src/games/Hearts/types.ts` - Card, Trick, Player, Game state types

---

## Shared Card System

### Card Component
Create reusable card components to share across all card games:
- `src/components/PlayingCard.tsx` - Displays a single card
- `src/utils/cardUtils.ts` - Card deck generation, shuffling, dealing
- Standard 52-card deck representation
- Card rendering: ♠♥♦♣ with rank (A, 2-10, J, Q, K)
- Face down card visual
- Card flip animation

---

## Global Changes

### Update GameId Type
```typescript
export type GameId = 
  | 'tic-tac-toe' | 'snake' | '2048' | 'minesweeper' | 'connect-four' | 'tetris'
  | 'maze' | 'solitaire' | 'sudoku' | 'reversi' | 'checkers' | 'chess'
  | 'blackjack' | 'poker' | 'hearts';
```

### Update GAMES Array
```typescript
{ id: 'blackjack', name: 'Blackjack', icon: '🃏', description: 'Beat the dealer' },
{ id: 'poker', name: 'Poker', icon: '🎰', description: '5-card draw' },
{ id: 'hearts', name: 'Hearts', icon: '♥️', description: 'Avoid hearts' },
```

### Update GameScreen.tsx, App.tsx
Add switch cases and navigation titles for new games.

---

## Implementation Order

1. **Shared Card System** (create reusable components first)
2. **Blackjack** (simplest - just dealer vs player)
3. **Poker** (medium complexity - multiple AI players)
4. **Hearts** (most complex - trick taking, passing, multiple rounds)

---

## Technical Considerations

### Card Utilities
- Shuffle algorithm (Fisher-Yates)
- Deal function with configurable hand sizes
- Suit/rank comparisons
- Hand evaluation (poker hands, trick winners)

### AI Opponents
- **Blackjack**: Basic strategy chart lookup
- **Poker**: Probability-based decisions, bluffing randomness
- **Hearts**: Minimax with card counting, moon shooting detection

### Animations
- Card dealing animation
- Card flip animation
- Chips sliding to pot/winner
- Trick collection animation (Hearts)

### State Management
- Game state saved between turns
- Betting/scoring persistence
- Hand history (for advanced strategies)

---

## Verification Checklist (Per Game)

- [ ] TypeScript compiles with no errors
- [ ] Game renders correctly on web
- [ ] Difficulty picker works
- [ ] All game rules work correctly
- [ ] AI opponents play reasonably
- [ ] Win/loss conditions trigger properly
- [ ] High score saves and displays
- [ ] Stats are tracked
- [ ] Sounds play at appropriate times
- [ ] Theme colors apply correctly
- [ ] Tutorial explains rules clearly
- [ ] Resume game works
- [ ] Cards render beautifully

---

## Optional Enhancements

- **Blackjack**: Card counting hints (hard mode), multi-hand play
- **Poker**: Texas Hold'em variant, tournament mode
- **Hearts**: Pass card preview, replay hand feature
- **All Games**: Animated card shuffling, victory celebrations

---

## Timeline Estimate

- Shared Card System: 2-3 hours
- Blackjack: 4-5 hours
- Poker: 5-6 hours
- Hearts: 6-7 hours
- Testing & Polish: 3 hours

**Total: ~23 hours**
