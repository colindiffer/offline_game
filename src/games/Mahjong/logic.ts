import { Difficulty } from '../../types';

export interface Tile {
  id: string;
  type: string;
  row: number;
  col: number;
  layer: number;
  visible: boolean;
}

export interface MahjongState {
  tiles: Tile[];
  selectedTileId: string | null;
  gameOver: boolean;
  gameWon: boolean;
}

const TILE_TYPES = ['🀀', '🀁', '🀂', '🀃', '🀄', '🀅', '🀆', '🀇', '🀈', '🀉', '🀊', '🀋', '🀌', '🀍', '🀎', '🀏', '🀐', '🀑', '🀒', '🀓', '🀔', '🀕', '🀖', '🀗', '🀘', '🀙', '🀚', '🀛', '🀜', '🀝', '🀞', '🀟', '🀠', '🀡', '🀢', '🀣'];

export function initializeMahjong(difficulty: Difficulty, level: number = 1): Tile[] {
  let pairs = 18; // 36 tiles
  if (difficulty === 'medium') pairs = 24;
  else if (difficulty === 'hard') pairs = 32;
  
  // Growth: add 2 pairs every 5 levels
  pairs = Math.min(pairs + Math.floor((level - 1) / 5) * 2, 72);

  const tiles: Tile[] = [];
  const selectedTypes: string[] = [];
  for (let i = 0; i < pairs; i++) {
    const type = TILE_TYPES[i % TILE_TYPES.length];
    selectedTypes.push(type, type);
  }

  // Simple pyramid layout generation
  // Layers: 0 (bottom), 1, 2...
  let typeIndex = 0;
  // Shuffle types
  selectedTypes.sort(() => Math.random() - 0.5);

  const totalTiles = pairs * 2;
  let placedCount = 0;

  // Layout params based on totalTiles
  const cols = Math.ceil(Math.sqrt(totalTiles)) + 1;
  const rows = Math.ceil(totalTiles / cols) + 1;

  for (let layer = 0; layer < 4 && placedCount < totalTiles; layer++) {
    const layerRows = Math.max(2, rows - layer * 2);
    const layerCols = Math.max(2, cols - layer * 2);
    const offsetR = layer;
    const offsetC = layer;

    for (let r = 0; r < layerRows && placedCount < totalTiles; r++) {
      for (let c = 0; c < layerCols && placedCount < totalTiles; c++) {
        // Leave some gaps for "interesting" shapes
        if ((r + c + layer) % 2 === 0) continue;

        tiles.push({
          id: `tile-${placedCount}`,
          type: selectedTypes[placedCount],
          row: r + offsetR,
          col: c + offsetC,
          layer: layer,
          visible: true,
        });
        placedCount++;
      }
    }
  }

  return tiles;
}

export function isTileFree(tile: Tile, allTiles: Tile[]): boolean {
  const visibleTiles = allTiles.filter(t => t.visible && t.id !== tile.id);
  
  // Rule 1: No tile on top
  const hasTileOnTop = visibleTiles.some(t => 
    t.layer > tile.layer && 
    Math.abs(t.row - tile.row) < 1 && 
    Math.abs(t.col - tile.col) < 1
  );
  if (hasTileOnTop) return false;

  // Rule 2: Either left or right must be empty
  const hasLeft = visibleTiles.some(t => 
    t.layer === tile.layer && 
    t.row === tile.row && 
    t.col === tile.col - 1
  );
  const hasRight = visibleTiles.some(t => 
    t.layer === tile.layer && 
    t.row === tile.row && 
    t.col === tile.col + 1
  );

  return !hasLeft || !hasRight;
}
