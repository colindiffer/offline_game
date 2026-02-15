export type Board2048 = number[][];

export function initBoard(
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): Board2048 {
  const board: Board2048 = Array.from({ length: 4 }, () => Array(4).fill(0));
  addRandomTile(board, difficulty);
  addRandomTile(board, difficulty);
  return board;
}

export function addRandomTile(
  board: Board2048,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  newTiles?: { r: number; c: number }[]
): void {
  const empty: [number, number][] = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (board[r][c] === 0) empty.push([r, c]);
    }
  }
  if (empty.length === 0) return;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  // Easy: only 2s, Medium: 90/10, Hard: 70/30
  const fourChance = difficulty === 'easy' ? 0 : difficulty === 'medium' ? 0.1 : 0.3;
  board[r][c] = Math.random() < (1 - fourChance) ? 2 : 4;
  if (newTiles) {
    newTiles.push({ r, c });
  }
}

function slideRow(row: number[]): { newRow: number[]; mergeScore: number } {
  // Remove zeros
  const filtered = row.filter((v) => v !== 0);
  const newRow: number[] = [];
  let mergeScore = 0;

  let i = 0;
  while (i < filtered.length) {
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      const merged = filtered[i] * 2;
      newRow.push(merged);
      mergeScore += merged;
      i += 2;
    } else {
      newRow.push(filtered[i]);
      i++;
    }
  }

  // Pad with zeros
  while (newRow.length < 4) newRow.push(0);
  return { newRow, mergeScore };
}

function rotateBoard(board: Board2048): Board2048 {
  const n = board.length;
  const rotated: Board2048 = Array.from({ length: n }, () => Array(n).fill(0));
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      rotated[c][n - 1 - r] = board[r][c];
    }
  }
  return rotated;
}

export function swipe(
  board: Board2048,
  direction: 'left' | 'right' | 'up' | 'down'
): { board: Board2048; score: number; moved: boolean } {
  let rotated = board.map((row) => [...row]);
  let rotations = 0;

  // Rotate so we always slide left
  switch (direction) {
    case 'left': rotations = 0; break;
    case 'right': rotations = 2; break;
    case 'up': rotations = 3; break;
    case 'down': rotations = 1; break;
  }

  for (let i = 0; i < rotations; i++) {
    rotated = rotateBoard(rotated);
  }

  let totalScore = 0;
  let moved = false;
  const result: Board2048 = [];

  for (let r = 0; r < 4; r++) {
    const { newRow, mergeScore } = slideRow(rotated[r]);
    if (newRow.some((v, i) => v !== rotated[r][i])) moved = true;
    result.push(newRow);
    totalScore += mergeScore;
  }

  // Rotate back
  let final = result;
  const reverseRotations = (4 - rotations) % 4;
  for (let i = 0; i < reverseRotations; i++) {
    final = rotateBoard(final);
  }

  return { board: final, score: totalScore, moved };
}

export function isGameOver(board: Board2048): boolean {
  // Any empty cell?
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (board[r][c] === 0) return false;
    }
  }
  // Any adjacent equal cells?
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (c + 1 < 4 && board[r][c] === board[r][c + 1]) return false;
      if (r + 1 < 4 && board[r][c] === board[r + 1][c]) return false;
    }
  }
  return true;
}

export function hasWon(board: Board2048): boolean {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (board[r][c] === 2048) return true;
    }
  }
  return false;
}
