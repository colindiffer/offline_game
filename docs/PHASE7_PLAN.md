# Phase 7: Visual Overhaul & Premium Feel

## Overview
Transform the app's aesthetic from a basic, functional layout to a premium, playful, and high-quality user experience. This phase focuses on "depth-based" design, custom game assets, and refined animations inspired by modern mobile puzzle games.

---

## 7.1 Design System Upgrade
- **Themes**: Refine 'Light', 'Dark', 'Retro', and 'Ocean' with curated color palettes.
- **Tokens**: Add `radius.capsule`, `shadows.premium` (multi-layered), and `depth` tokens.
- **PremiumButton**: A new flexible component with a 3D pressed effect (shifting the top layer down).

## 7.2 Component Refresh
- **Stylized Header**: Replace the flat header with a "capsule" design. Scores and game name will appear in distinct badges.
- **Modern GameCards**: Update the home screen grid with better icons and subtle shadow depth.
- **Polished Overlays**: Redesign Game Over and Tutorial screens with glassmorphism and soft shadows.

---

## 7.3 Game-Specific Polishing

### Snake
- **Board**: Implement a light/dark "checkered" grid pattern.
- **Assets**: 
    - Snake head with eyes that rotate to face the move direction.
    - Snake body segments with rounded joints.
    - Replace red circle with a stylized "Apple" icon.
- **Controls**: Depth-based D-pad buttons.

### 2048
- **Tiles**: Use a soft pastel palette. 
- **Animations**: Add "pop" on appearance and "bounce" on merge.
- **Undo**: Stylized button with an icon and move counter badge.

### Sudoku
- **Grid**: Cleaner lines with bold 3x3 section dividers.
- **Lives**: Use heart icons (❤️) instead of numbers.
- **Input**: Stylized circular number pad.

### Card Games
- **PlayingCard**: Modern, rounded design with distinct suit icons and clean typography.

---

## Global Changes
- Update `designTokens.ts` with new premium constants.
- Replace `AnimatedButton` usage with `PremiumButton` for a more tactile feel.
- Global update to `Header.tsx` for capsule-style UI.

---

## Implementation Order
1. **Design System**: `themes.ts`, `designTokens.ts`, `PremiumButton.tsx`.
2. **Global Components**: `Header.tsx`, `GameCard.tsx`.
3. **Snake Refresh**: The most visual game-specific update.
4. **2048 & Sudoku Refresh**: Refining the puzzle aesthetics.
5. **Shared UI**: `PlayingCard.tsx`, Overlays.

---

## Verification Checklist
- [ ] Visual audit against reference images.
- [ ] Multi-theme consistency (Dark/Light/Retro/Ocean).
- [ ] Responsive scaling of the checkered Snake board.
- [ ] Tactile feedback of `PremiumButton` across all platforms.

---

## Timeline Estimate
- Design Tokens & PremiumButton: 2-3 hours
- Global Header & Home Screen: 3-4 hours
- Game-Specific Polishing: 10-12 hours
- Final Polish & Animations: 4 hours

**Total: ~20-24 hours**
