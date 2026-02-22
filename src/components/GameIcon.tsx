import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GameId } from '../types';
import DominoTile from './DominoTile';

const W = '#FFFFFF';
const WD = 'rgba(255,255,255,0.9)';
const WM = 'rgba(255,255,255,0.4)';

interface Props { gameId: GameId; }

export default function GameIcon({ gameId }: Props) {
  switch (gameId) {
    case 'tic-tac-toe': return <TicTacToeIcon />;
    case 'snake': return <SnakeIcon />;
    case '2048': return <Icon2048 />;
    case 'minesweeper': return <MinesweeperIcon />;
    case 'connect-four': return <ConnectFourIcon />;
    case 'block-drop': return <TetrisIcon />;
    case 'maze': return <MazeIcon />;
    case 'solitaire': return <SolitaireIcon />;
    case 'sudoku': return <SudokuIcon />;
    case 'reversi': return <ReversiIcon />;
    case 'checkers': return <CheckersIcon />;
    case 'chess': return <ChessIcon />;
    case 'blackjack': return <BlackjackIcon />;
    case 'poker': return <PokerIcon />;
    case 'hearts': return <HeartsIcon />;
    case 'water-sort': return <WaterSortIcon />;
    case 'word-search': return <WordSearchIcon />;
    case 'brick-breaker': return <BrickBreakerIcon />;
    case 'mahjong': return <MahjongIcon />;
    case 'hangman': return <HangmanIcon />;
    case 'simon-says': return <SimonSaysIcon />;
    case 'memory-match': return <MemoryMatchIcon />;
    case 'word-guess': return <WordGuessIcon />;
    case 'spider-solitaire': return <SpiderSolitaireIcon />;
    case 'battleship': return <BattleshipIcon />;
    case 'spades': return <SpadesIcon />;
    case 'code-breaker': return <CodeBreakerIcon />;
    case 'freecell': return <FreecellIcon />;
    case 'dominoes': return <DominoesIcon />;
    case 'backgammon': return <BackgammonIcon />;
    default: return null;
  }
}

/* ── Tic-Tac-Toe ── */
function TicTacToeIcon() {
  return (
    <View style={s.container}>
      {/* Grid lines */}
      <View style={[s.tttHBar, { top: 22 }]} />
      <View style={[s.tttHBar, { top: 40 }]} />
      <View style={[s.tttVBar, { left: 22 }]} />
      <View style={[s.tttVBar, { left: 40 }]} />
      {/* X */}
      <View style={[s.tttX1]} />
      <View style={[s.tttX2]} />
      {/* O */}
      <View style={s.tttO} />
    </View>
  );
}

/* ── Snake ── */
function SnakeIcon() {
  const segments = [
    { top: 10, left: 30 }, { top: 10, left: 42 }, { top: 10, left: 54 },
    { top: 22, left: 54 }, { top: 34, left: 54 }, { top: 34, left: 42 },
    { top: 34, left: 30 }, { top: 34, left: 18 },
  ];
  return (
    <View style={s.container}>
      {/* Head */}
      <View style={[s.snakeHead, { top: 8, left: 16 }]} />
      {/* Body segments */}
      {segments.map((pos, i) => (
        <View key={i} style={[s.snakeSeg, pos]} />
      ))}
    </View>
  );
}

/* ── 2048 ── */
function Icon2048() {
  return (
    <View style={s.tile2048}>
      <Text style={s.text2048}>2048</Text>
    </View>
  );
}

/* ── Minesweeper ── */
function MinesweeperIcon() {
  return (
    <View style={s.container}>
      {[0, 1, 2].map(row =>
        [0, 1, 2].map(col => {
          const isCenter = row === 1 && col === 1;
          return (
            <View
              key={`${row}-${col}`}
              style={[
                s.mineCell,
                { top: 14 + row * 18, left: 14 + col * 18 },
                isCenter && s.mineCellCenter,
              ]}
            />
          );
        })
      )}
      {/* Starburst lines from center */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
        <View
          key={i}
          style={[s.mineLine, { top: 31, left: 31, transform: [{ rotate: `${angle}deg` }] }]}
        />
      ))}
    </View>
  );
}

/* ── Connect Four ── */
function ConnectFourIcon() {
  const diag = new Set(['0-0', '1-1', '2-2', '0-3']);
  return (
    <View style={s.container}>
      {[0, 1, 2].map(row =>
        [0, 1, 2, 3].map(col => {
          const key = `${row}-${col}`;
          const filled = diag.has(key);
          return (
            <View
              key={key}
              style={[
                s.c4Circle,
                { top: 12 + row * 18, left: 6 + col * 16 },
                filled ? s.c4Filled : s.c4Empty,
              ]}
            />
          );
        })
      )}
    </View>
  );
}

/* ── Tetris (T-piece) ── */
function TetrisIcon() {
  return (
    <View style={s.container}>
      <View style={[s.tetBlock, { top: 24, left: 12 }]} />
      <View style={[s.tetBlock, { top: 24, left: 30 }]} />
      <View style={[s.tetBlock, { top: 24, left: 48 }]} />
      <View style={[s.tetBlock, { top: 42, left: 30 }]} />
    </View>
  );
}

/* ── Maze ── */
function MazeIcon() {
  return (
    <View style={s.container}>
      {/* Outer border */}
      <View style={s.mazeBorderTop} />
      <View style={s.mazeBorderBottom} />
      <View style={s.mazeBorderLeft} />
      {/* Right border with gap at top */}
      <View style={[s.mazeBorderRightSeg, { top: 26, height: 34 }]} />
      {/* C-shaped inner path */}
      <View style={s.mazeInnerTop} />
      <View style={s.mazeInnerBottom} />
      <View style={s.mazeInnerRight} />
    </View>
  );
}

/* ── Solitaire ── */
function SolitaireIcon() {
  return (
    <View style={s.container}>
      {/* Back card */}
      <View style={[s.card, { top: 14, left: 14 }, s.cardBack]} />
      {/* Front card */}
      <View style={[s.card, { top: 20, left: 22 }]}>
        <Text style={s.cardSuit}>♠</Text>
      </View>
    </View>
  );
}

/* ── Sudoku ── */
function SudokuIcon() {
  const nums = ['1','2','3','4','5','6','7','8','9'];
  return (
    <View style={s.container}>
      {[0,1,2].map(row =>
        [0,1,2].map(col => (
          <View key={`${row}-${col}`} style={[s.sudokuCell, { top: 10 + row * 20, left: 10 + col * 20 }]}>
            <Text style={s.sudokuNum}>{nums[row * 3 + col]}</Text>
          </View>
        ))
      )}
    </View>
  );
}

/* ── Reversi ── */
function ReversiIcon() {
  return (
    <View style={s.reversiContainer}>
      <View style={s.reversiLeft} />
      <View style={s.reversiRight} />
    </View>
  );
}

/* ── Checkers ── */
function CheckersIcon() {
  const dark = new Set(['0-1','0-3','1-0','1-2','2-1','2-3','3-0','3-2']);
  const pieces = new Set(['1-2','2-1']);
  return (
    <View style={s.container}>
      {[0,1,2,3].map(row =>
        [0,1,2,3].map(col => {
          const key = `${row}-${col}`;
          return (
            <View key={key} style={[s.checkSq, { top: 8 + row * 15, left: 8 + col * 15 }, dark.has(key) && s.checkSqDark]}>
              {pieces.has(key) && <View style={s.checkPiece} />}
            </View>
          );
        })
      )}
    </View>
  );
}

/* ── Chess ── */
function ChessIcon() {
  return (
    <View style={s.container}>
      {/* Base */}
      <View style={s.chessBase} />
      {/* Neck */}
      <View style={s.chessNeck} />
      {/* Head */}
      <View style={s.chessHead} />
      {/* Crown bumps */}
      <View style={[s.chessBump, { left: 24 }]} />
      <View style={[s.chessBump, { left: 31 }]} />
      <View style={[s.chessBump, { left: 38 }]} />
    </View>
  );
}

/* ── Blackjack ── */
function BlackjackIcon() {
  return (
    <View style={s.container}>
      <View style={[s.card, { top: 14, left: 12 }, s.cardBack]} />
      <View style={[s.card, { top: 20, left: 22 }]}>
        <Text style={s.cardA}>A</Text>
        <Text style={s.cardSuit}>♠</Text>
      </View>
    </View>
  );
}

/* ── Poker ── */
function PokerIcon() {
  return (
    <View style={s.container}>
      {/* 3 fanned cards */}
      <View style={[s.card, { top: 12, left: 6, transform: [{ rotate: '-15deg' }] }, s.cardBack]} />
      <View style={[s.card, { top: 12, left: 18 }, s.cardBack]} />
      <View style={[s.card, { top: 12, left: 30, transform: [{ rotate: '15deg' }] }, s.cardBack]} />
      {/* Chip */}
      <View style={s.pokerChip}>
        <View style={s.pokerChipStripe} />
      </View>
    </View>
  );
}

/* ── Hearts ── */
function HeartsIcon() {
  return (
    <View style={s.container}>
      <View style={[s.heartCircle, { top: 20, left: 16 }]} />
      <View style={[s.heartCircle, { top: 20, left: 30 }]} />
      <View style={s.heartPoint} />
    </View>
  );
}

/* ── Water Sort ── */
function WaterSortIcon() {
  const fills = [
    { color: 'rgba(255,100,100,0.9)', height: 20, top: 24 },
    { color: 'rgba(100,200,255,0.9)', height: 30, top: 14 },
    { color: 'rgba(100,255,150,0.9)', height: 14, top: 30 },
  ];
  return (
    <View style={s.container}>
      {fills.map((f, i) => (
        <View key={i} style={[s.waterTube, { left: 10 + i * 24 }]}>
          <View style={[s.waterFill, { backgroundColor: f.color, height: f.height, top: f.top }]} />
        </View>
      ))}
    </View>
  );
}

/* ── Word Search ── */
function WordSearchIcon() {
  const letters = ['W','O','R','D','S','E','A','R','C','H','F','I','N','D','I','T'];
  const highlighted = new Set([0, 5, 10]);
  return (
    <View style={s.container}>
      {[0,1,2,3].map(row =>
        [0,1,2,3].map(col => {
          const idx = row * 4 + col;
          return (
            <View key={idx} style={[s.wsCell, { top: 8 + row * 16, left: 8 + col * 16 }, highlighted.has(idx) && s.wsCellHL]}>
              <Text style={s.wsLetter}>{letters[idx]}</Text>
            </View>
          );
        })
      )}
    </View>
  );
}

/* ── Brick Breaker ── */
function BrickBreakerIcon() {
  return (
    <View style={s.bbContainer}>
      <View style={s.bbBricksRow}>
        <View style={[s.bbBrick, { backgroundColor: '#ff7675' }]} />
        <View style={[s.bbBrick, { backgroundColor: '#fdcb6e' }]} />
        <View style={[s.bbBrick, { backgroundColor: '#55efc4' }]} />
      </View>
      <View style={s.bbBricksRow}>
        <View style={[s.bbBrick, { backgroundColor: '#74b9ff' }]} />
        <View style={[s.bbBrick, { backgroundColor: '#a29bfe' }]} />
        <View style={[s.bbBrick, { backgroundColor: '#ff7675' }]} />
      </View>
      <View style={s.bbBall} />
      <View style={s.bbPaddle} />
    </View>
  );
}

/* ── Mahjong ── */
function MahjongIcon() {
  return (
    <View style={s.container}>
      {/* Stacked tiles */}
      <View style={[s.mahjTile, { top: 20, left: 10, backgroundColor: 'rgba(255,255,255,0.5)' }]} />
      <View style={[s.mahjTile, { top: 16, left: 16, backgroundColor: 'rgba(255,255,255,0.7)' }]} />
      {/* Front tile */}
      <View style={[s.mahjTile, { top: 12, left: 22 }]}>
        {[0,1].map(row =>
          [0,1].map(col => (
            <View key={`${row}-${col}`} style={[s.mahjDot, { top: 10 + row * 14, left: 8 + col * 14 }]} />
          ))
        )}
      </View>
    </View>
  );
}

/* ── Hangman ── */
function HangmanIcon() {
  return (
    <View style={s.container}>
      {/* Vertical post */}
      <View style={s.hangPost} />
      {/* Horizontal beam */}
      <View style={s.hangBeam} />
      {/* Rope */}
      <View style={s.hangRope} />
      {/* Head */}
      <View style={s.hangHead} />
      {/* Body */}
      <View style={s.hangBody} />
    </View>
  );
}

/* ── Simon Says ── */
function SimonSaysIcon() {
  const quadrants = [
    { top: 10, left: 10, color: '#ff4757' },
    { top: 10, left: 38, color: '#2ed573' },
    { top: 38, left: 10, color: '#1e90ff' },
    { top: 38, left: 38, color: '#ffa502' },
  ];
  return (
    <View style={s.simonContainer}>
      {quadrants.map((q, i) => (
        <View key={i} style={[s.simonQ, { top: q.top, left: q.left, backgroundColor: q.color }]} />
      ))}
      {/* White cross dividers */}
      <View style={s.simonH} />
      <View style={s.simonV} />
    </View>
  );
}

/* ── Memory Match ── */
function MemoryMatchIcon() {
  return (
    <View style={s.container}>
      <View style={[s.memCard, { left: 10 }]}>
        <Text style={s.memText}>?</Text>
      </View>
      <View style={[s.memCard, { left: 42 }]}>
        <Text style={s.memText}>★</Text>
      </View>
    </View>
  );
}

/* ── Word Guess (Wordle-style) ── */
function WordGuessIcon() {
  const colors = ['rgba(120,120,120,0.8)', 'rgba(200,180,0,0.9)', 'rgba(80,180,80,0.9)', 'rgba(120,120,120,0.8)', 'rgba(120,120,120,0.8)'];
  return (
    <View style={s.wgRow}>
      {colors.map((c, i) => (
        <View key={i} style={[s.wgCell, { backgroundColor: c }]} />
      ))}
    </View>
  );
}

/* ── Spider Solitaire ── */
function SpiderSolitaireIcon() {
  return (
    <View style={s.container}>
      {[0,1,2,3].map(i => (
        <View
          key={i}
          style={[s.card, { top: 10 + i * 10, left: 10 + i * 12 }, s.cardBack]}
        />
      ))}
    </View>
  );
}

/* ── Battleship ── */
function BattleshipIcon() {
  const hits = new Set(['1-2', '3-1']);
  const misses = new Set(['0-3', '2-4']);
  return (
    <View style={s.container}>
      {[0,1,2,3,4].map(row =>
        [0,1,2,3,4].map(col => {
          const key = `${row}-${col}`;
          return (
            <View key={key} style={[s.bsCell, { top: 6 + row * 13, left: 6 + col * 13 }]}>
              {hits.has(key) && <Text style={s.bsHit}>●</Text>}
              {misses.has(key) && <Text style={s.bsMiss}>×</Text>}
            </View>
          );
        })
      )}
    </View>
  );
}

/* ── Spades ── */
function SpadesIcon() {
  return (
    <View style={s.container}>
      {/* Inverted heart: two circles pointing up */}
      <View style={[s.spadeCircle, { top: 16, left: 16 }]} />
      <View style={[s.spadeCircle, { top: 16, left: 30 }]} />
      {/* Point (rotated square) */}
      <View style={s.spadePoint} />
      {/* Stem */}
      <View style={s.spadeStem} />
    </View>
  );
}

/* ── Code Breaker ── */
function CodeBreakerIcon() {
  const colors = ['#ff4757', '#1e90ff', '#2ed573', '#ffa502'];
  return (
    <View style={s.container}>
      <View style={s.cbRow}>
        {colors.map((c, i) => (
          <View key={i} style={[s.cbCircle, { backgroundColor: c }]} />
        ))}
      </View>
      <View style={s.cbFeedback}>
        <View style={[s.cbDot, { backgroundColor: W }]} />
        <View style={[s.cbDot, { backgroundColor: W }]} />
      </View>
    </View>
  );
}

/* ── Freecell ── */
function FreecellIcon() {
  return (
    <View style={s.container}>
      {[0,1,2,3].map(i => (
        <View
          key={i}
          style={[s.card, s.cardBack, { top: 10 + i * 11, left: 14 + i * 10 }]}
        />
      ))}
    </View>
  );
}

/* ── Dominoes ── */
function DominoesIcon() {
  return (
    <View style={[s.customIconContainer]}>
      <DominoTile sideA={6} sideB={6} style={s.gameCardDomino} pointerEvents="none" />
    </View>
  );
}

/* ── Backgammon ── */
function BackgammonIcon() {
  return (
    <View style={s.container}>
      {/* 4 triangles alternating up/down */}
      {[0,1,2,3].map(i => (
        <View
          key={i}
          style={[
            s.bgTriangle,
            { left: 8 + i * 16 },
            i % 2 === 0 ? s.bgTriUp : s.bgTriDown,
          ]}
        />
      ))}
      {/* 2 piece circles */}
      <View style={[s.bgPiece, { left: 10, top: 50 }]} />
      <View style={[s.bgPiece, { left: 26, top: 50 }]} />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    width: 80,
    height: 80,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Tic-Tac-Toe */
  tttHBar: { position: 'absolute', width: 56, height: 3, backgroundColor: WD, borderRadius: 2, left: 12 },
  tttVBar: { position: 'absolute', height: 56, width: 3, backgroundColor: WD, borderRadius: 2, top: 12 },
  tttX1: { position: 'absolute', width: 20, height: 3, backgroundColor: WD, borderRadius: 2, top: 12, left: 48, transform: [{ rotate: '45deg' }] },
  tttX2: { position: 'absolute', width: 20, height: 3, backgroundColor: WD, borderRadius: 2, top: 12, left: 48, transform: [{ rotate: '-45deg' }] },
  tttO: { position: 'absolute', width: 16, height: 16, borderRadius: 8, borderWidth: 3, borderColor: WD, top: 46, left: 12 },

  /* Snake */
  snakeHead: { position: 'absolute', width: 14, height: 14, borderRadius: 3, backgroundColor: WD },
  snakeSeg: { position: 'absolute', width: 10, height: 10, borderRadius: 2, backgroundColor: WD },

  /* 2048 */
  tile2048: { width: 70, height: 70, backgroundColor: '#edc22e', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: W },
  text2048: { color: W, fontSize: 20, fontWeight: '900' },

  /* Minesweeper */
  mineCell: { position: 'absolute', width: 12, height: 12, backgroundColor: WM, borderRadius: 2 },
  mineCellCenter: { backgroundColor: 'transparent' },
  mineLine: { position: 'absolute', width: 14, height: 2, backgroundColor: WD, borderRadius: 1, marginLeft: -7 },

  /* Connect Four */
  c4Circle: { position: 'absolute', width: 12, height: 12, borderRadius: 6 },
  c4Filled: { backgroundColor: WD },
  c4Empty: { backgroundColor: WM },

  /* Tetris */
  tetBlock: { position: 'absolute', width: 16, height: 16, backgroundColor: WD, borderRadius: 3, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },

  /* Maze */
  mazeBorderTop: { position: 'absolute', top: 12, left: 12, right: 12, height: 3, backgroundColor: WD },
  mazeBorderBottom: { position: 'absolute', bottom: 12, left: 12, right: 12, height: 3, backgroundColor: WD },
  mazeBorderLeft: { position: 'absolute', top: 12, left: 12, width: 3, height: 56, backgroundColor: WD },
  mazeBorderRightSeg: { position: 'absolute', right: 12, width: 3, backgroundColor: WD },
  mazeInnerTop: { position: 'absolute', top: 26, left: 26, width: 3, height: 20, backgroundColor: WD },
  mazeInnerBottom: { position: 'absolute', top: 44, left: 26, width: 28, height: 3, backgroundColor: WD },
  mazeInnerRight: { position: 'absolute', top: 26, right: 24, width: 3, height: 21, backgroundColor: WD },

  /* Cards (shared) */
  card: { position: 'absolute', width: 38, height: 50, backgroundColor: WD, borderRadius: 6, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  cardBack: { backgroundColor: 'rgba(255,255,255,0.5)' },
  cardSuit: { fontSize: 20, color: '#222', fontWeight: '900' },
  cardA: { fontSize: 16, color: '#222', fontWeight: '900', lineHeight: 16 },

  /* Sudoku */
  sudokuCell: { position: 'absolute', width: 18, height: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', justifyContent: 'center', alignItems: 'center' },
  sudokuNum: { color: WD, fontSize: 9, fontWeight: '700' },

  /* Reversi */
  reversiContainer: { width: 52, height: 52, borderRadius: 26, overflow: 'hidden', flexDirection: 'row' },
  reversiLeft: { flex: 1, backgroundColor: WD },
  reversiRight: { flex: 1, backgroundColor: WM },

  /* Checkers */
  checkSq: { position: 'absolute', width: 13, height: 13, backgroundColor: WM },
  checkSqDark: { backgroundColor: 'rgba(255,255,255,0.15)' },
  checkPiece: { position: 'absolute', width: 9, height: 9, borderRadius: 5, backgroundColor: WD, top: 2, left: 2 },

  /* Chess */
  chessBase: { position: 'absolute', bottom: 14, width: 44, height: 6, backgroundColor: WD, borderRadius: 3 },
  chessNeck: { position: 'absolute', bottom: 20, width: 16, height: 16, backgroundColor: WD, left: 32 },
  chessHead: { position: 'absolute', bottom: 34, width: 20, height: 12, backgroundColor: WD, borderRadius: 6, left: 30 },
  chessBump: { position: 'absolute', bottom: 43, width: 7, height: 7, backgroundColor: WD, borderRadius: 4 },

  /* Poker */
  pokerChip: { position: 'absolute', bottom: 10, right: 10, width: 26, height: 26, borderRadius: 13, backgroundColor: WD, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  pokerChipStripe: { width: 18, height: 3, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 2 },

  /* Hearts */
  heartCircle: { position: 'absolute', width: 24, height: 24, borderRadius: 12, backgroundColor: WD },
  heartPoint: { position: 'absolute', bottom: 12, width: 24, height: 24, backgroundColor: WD, transform: [{ rotate: '45deg' }], left: 28 },

  /* Water Sort */
  waterTube: { position: 'absolute', top: 10, width: 18, height: 50, borderWidth: 2, borderColor: WD, borderRadius: 4, overflow: 'hidden' },
  waterFill: { position: 'absolute', left: 0, right: 0, bottom: 0 },

  /* Word Search */
  wsCell: { position: 'absolute', width: 14, height: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: WM },
  wsCellHL: { backgroundColor: 'rgba(255,255,255,0.3)' },
  wsLetter: { color: WD, fontSize: 7, fontWeight: '700' },

  /* Brick Breaker */
  bbContainer: { alignItems: 'center', justifyContent: 'space-between', height: 72, width: 90, paddingVertical: 2 },
  bbBricksRow: { flexDirection: 'row', gap: 4 },
  bbBrick: { width: 22, height: 9, borderRadius: 2 },
  bbBall: { width: 14, height: 14, borderRadius: 7, backgroundColor: W, position: 'absolute', bottom: 20, left: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4, elevation: 4 },
  bbPaddle: { width: 70, height: 10, borderRadius: 5, backgroundColor: W, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 4, elevation: 4 },

  /* Mahjong */
  mahjTile: { position: 'absolute', width: 36, height: 44, backgroundColor: WD, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  mahjDot: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.3)' },

  /* Hangman */
  hangPost: { position: 'absolute', left: 18, top: 10, width: 4, height: 52, backgroundColor: WD, borderRadius: 2 },
  hangBeam: { position: 'absolute', top: 10, left: 18, width: 32, height: 4, backgroundColor: WD, borderRadius: 2 },
  hangRope: { position: 'absolute', top: 14, right: 22, width: 2, height: 12, backgroundColor: WD },
  hangHead: { position: 'absolute', top: 26, right: 16, width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: WD },
  hangBody: { position: 'absolute', top: 42, right: 23, width: 2, height: 14, backgroundColor: WD },

  /* Simon Says */
  simonContainer: { width: 60, height: 60, borderRadius: 30, overflow: 'hidden', position: 'relative' },
  simonQ: { position: 'absolute', width: 28, height: 28, borderRadius: 4 },
  simonH: { position: 'absolute', top: 28, left: 0, right: 0, height: 4, backgroundColor: W },
  simonV: { position: 'absolute', left: 28, top: 0, bottom: 0, width: 4, backgroundColor: W },

  /* Memory Match */
  memCard: { position: 'absolute', top: 14, width: 28, height: 40, backgroundColor: WD, borderRadius: 5, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  memText: { fontSize: 18, color: '#222', fontWeight: '900' },

  /* Word Guess */
  wgRow: { flexDirection: 'row', gap: 4 },
  wgCell: { width: 12, height: 12, borderRadius: 2 },

  /* Battleship */
  bsCell: { position: 'absolute', width: 11, height: 11, borderWidth: 1, borderColor: WM, justifyContent: 'center', alignItems: 'center' },
  bsHit: { color: WD, fontSize: 8 },
  bsMiss: { color: WD, fontSize: 8, fontWeight: '900' },

  /* Spades */
  spadeCircle: { position: 'absolute', width: 20, height: 20, borderRadius: 10, backgroundColor: WD },
  spadePoint: { position: 'absolute', top: 26, width: 22, height: 22, backgroundColor: WD, left: 29, transform: [{ rotate: '45deg' }] },
  spadeStem: { position: 'absolute', bottom: 12, left: 37, width: 6, height: 14, backgroundColor: WD, borderRadius: 3 },

  /* Code Breaker */
  cbRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  cbCircle: { width: 14, height: 14, borderRadius: 7 },
  cbFeedback: { flexDirection: 'row', gap: 6 },
  cbDot: { width: 8, height: 8, borderRadius: 4 },

  /* Dominoes */
  customIconContainer: { transform: [{ rotate: '-15deg' }] },
  gameCardDomino: { transform: [{ scale: 0.8 }] },

  /* Backgammon */
  bgTriangle: { position: 'absolute', top: 10, width: 0, height: 0 },
  bgTriUp: { borderLeftWidth: 6, borderRightWidth: 6, borderBottomWidth: 30, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: WD },
  bgTriDown: { borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 30, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: WM },
  bgPiece: { position: 'absolute', width: 14, height: 14, borderRadius: 7, backgroundColor: WD },
});
