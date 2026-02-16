import { Difficulty } from '../../types';

export interface MemoryCard {
  id: string;
  type: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const EMOJI_POOL = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌', '🐞', '🐜', '🪰', '🪲', '🪳', '🦟', '🦗', '🕷️', '🕸️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🦣', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🦬', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐈‍⬛', '🐓', '🦃', '🦤', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇', '🦝', '🦨', '🦡', '🦦', '🦥', '🐁', '🐀', '🐿️', '🦔'];

export function initializeMemoryMatch(difficulty: Difficulty, level: number = 1): MemoryCard[] {
  // Grid size grows with level
  // level 1: 4x3 (6 pairs)
  // level 5: 4x4 (8 pairs)
  // level 10: 6x4 (12 pairs)
  // level 15: 6x5 (15 pairs)
  // level 20+: 6x6 (18 pairs)
  
  let pairCount = 6;
  if (level > 20) pairCount = 18;
  else if (level > 15) pairCount = 15;
  else if (level > 10) pairCount = 12;
  else if (level > 5) pairCount = 8;
  else pairCount = 6;

  // Difficulty adjustment
  if (difficulty === 'medium') pairCount = Math.min(pairCount + 2, 18);
  if (difficulty === 'hard') pairCount = Math.min(pairCount + 4, 18);

  const selectedEmojis: string[] = [];
  const pool = [...EMOJI_POOL].sort(() => Math.random() - 0.5);
  
  for (let i = 0; i < pairCount; i++) {
    selectedEmojis.push(pool[i], pool[i]);
  }

  // Shuffle
  const shuffled = selectedEmojis.sort(() => Math.random() - 0.5);

  return shuffled.map((type, index) => ({
    id: `card-${index}`,
    type,
    isFlipped: false,
    isMatched: false,
  }));
}
