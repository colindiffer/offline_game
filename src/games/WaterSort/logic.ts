import { Difficulty } from '../../types';

export type Color = string;
export type Tube = Color[];

export interface WaterSortGameState {
  tubes: Tube[];
  selectedTubeIndex: number | null;
  moves: number;
}

const COLORS: Color[] = [
  '#ff7675', '#55efc4', '#fab1a0', '#a29bfe', '#ffeaa7', 
  '#74b9ff', '#e17055', '#00b894', '#6c5ce7', '#fd79a8', 
  '#00cec9', '#d63031', '#0984e3'
];

export const TUBE_CAPACITY = 4;

export function initializeWaterSort(difficulty: Difficulty): Tube[] {
  let colorCount = 5;
  let emptyTubes = 2;

  if (difficulty === 'medium') {
    colorCount = 8;
  } else if (difficulty === 'hard') {
    colorCount = 11;
  }

  const tubes: Tube[] = [];
  const allColors: Color[] = [];

  // Create pool of colors (4 of each)
  for (let i = 0; i < colorCount; i++) {
    for (let j = 0; j < TUBE_CAPACITY; j++) {
      allColors.push(COLORS[i % COLORS.length]);
    }
  }

  // Shuffle colors
  for (let i = allColors.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allColors[i], allColors[j]] = [allColors[j], allColors[i]];
  }

  // Fill tubes
  for (let i = 0; i < colorCount; i++) {
    tubes.push(allColors.slice(i * TUBE_CAPACITY, (i + 1) * TUBE_CAPACITY));
  }

  // Add empty tubes
  for (let i = 0; i < emptyTubes; i++) {
    tubes.push([]);
  }

  return tubes;
}

export function canPour(tubes: Tube[], fromIndex: number, toIndex: number): boolean {
  if (fromIndex === toIndex) return false;
  
  const fromTube = tubes[fromIndex];
  const toTube = tubes[toIndex];

  if (fromTube.length === 0) return false;
  if (toTube.length === TUBE_CAPACITY) return false;

  const colorToPour = fromTube[fromTube.length - 1];
  
  if (toTube.length === 0) return true;
  
  return toTube[toTube.length - 1] === colorToPour;
}

export function pour(tubes: Tube[], fromIndex: number, toIndex: number): Tube[] {
  const newTubes = tubes.map(t => [...t]);
  const fromTube = newTubes[fromIndex];
  const toTube = newTubes[toIndex];

  const colorToPour = fromTube[fromTube.length - 1];
  
  // Pour all consecutive layers of the same color that fit
  while (
    fromTube.length > 0 && 
    fromTube[fromTube.length - 1] === colorToPour && 
    toTube.length < TUBE_CAPACITY
  ) {
    toTube.push(fromTube.pop()!);
  }

  return newTubes;
}

export function isWin(tubes: Tube[]): boolean {
  return tubes.every(tube => {
    if (tube.length === 0) return true;
    if (tube.length < TUBE_CAPACITY) return false;
    return tube.every(color => color === tube[0]);
  });
}
