import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View, Animated } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import Header from '../../components/Header';
import GameOverOverlay from '../../components/GameOverOverlay';
import GameBoardContainer from '../../components/GameBoardContainer';
import PremiumButton from '../../components/PremiumButton';
import { useTheme } from '../../contexts/ThemeContext';
import { useSound } from '../../contexts/SoundContext';
import { getHighScore, setHighScore } from '../../utils/storage';
import { recordGameResult } from '../../utils/stats';
import { spacing, radius, shadows, typography } from '../../utils/designTokens';
import { Difficulty } from '../../types';
import { ThemeColors } from '../../utils/themes';
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  TETROMINO_COLORS,
  TetrominoType,
  BlockDropBoard,
  createEmptyBoard,
  getRandomTetromino,
  isValidMove,
  mergeTetromino,
  rotateTetromino,
  clearLines,
  getSpeed,
  calculateScore,
} from './logic';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const MAX_BOARD_HEIGHT = SCREEN_HEIGHT * 0.6;
// Initial estimate; overridden by onLayout measurement for pixel-perfect fit
const DEFAULT_CELL_SIZE = Math.floor(Math.min(((SCREEN_WIDTH - 36) * 0.75 - 8) / BOARD_WIDTH, MAX_BOARD_HEIGHT / BOARD_HEIGHT));

interface Props {
  difficulty: Difficulty;
}

export default function BlockDrop({ difficulty }: Props) {
  const { colors } = useTheme();
  const { playSound } = useSound();
  const styles = useMemo(() => getStyles(colors, cellSize), [colors, cellSize]);

  // Measure actual board container width to compute pixel-perfect cell size
  const handleBoardAreaLayout = useCallback((e: any) => {
    const availableWidth = e.nativeEvent.layout.width;
    const innerWidth = availableWidth - 8; // boardWrapper borderWidth: 4 each side
    const newCellSize = Math.floor(Math.min(innerWidth / BOARD_WIDTH, MAX_BOARD_HEIGHT / BOARD_HEIGHT));
    setCellSize(prev => (prev !== newCellSize ? newCellSize : prev));
  }, []);

  const [board, setBoard] = useState<BlockDropBoard>(createEmptyBoard());
  const [cellSize, setCellSize] = useState(DEFAULT_CELL_SIZE);
  const [currentTetromino, setCurrentTetromino] = useState(getRandomTetromino());
  const [nextTetromino, setNextTetromino] = useState(getRandomTetromino());
  const [tetrominoPos, setTetrominoPos] = useState({ row: 0, col: Math.floor(BOARD_WIDTH / 2) - 2 });
  const [gameOver, setGameOver] = useState(false);
  const [paused, setPaused] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScoreState] = useState(0);
  const [level, setLevel] = useState(1);
  const [linesCleared, setLinesCleared] = useState(0);
  const [gameStarted, setGameStarted] = useState(true);

  const startTimeRef = useRef<number | null>(Date.now());
  const fallIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const levelRef = useRef(level);
  const gameStateRef = useRef({ board, currentTetromino, tetrominoPos, gameOver, gameStarted });
  const pausedRef = useRef(false);
  const lastXRef = useRef(0);
  const tetrominoPosRef = useRef(tetrominoPos);

  useEffect(() => {
    getHighScore('block-drop', difficulty).then(setHighScoreState);
  }, [difficulty]);

  const stopGameLoop = useCallback(() => {
    if (fallIntervalRef.current) {
      clearInterval(fallIntervalRef.current);
      fallIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    levelRef.current = level;
    gameStateRef.current = { board, currentTetromino, tetrominoPos, gameOver, gameStarted };
    tetrominoPosRef.current = tetrominoPos;
  }, [level, board, currentTetromino, tetrominoPos, gameOver, gameStarted]);

  useEffect(() => { pausedRef.current = paused; }, [paused]);

  // Auto-fall game loop
  useEffect(() => {
    if (!gameStarted || gameOver) {
      stopGameLoop();
      return;
    }

    const interval = setInterval(() => {
      if (pausedRef.current) return;
      const state = gameStateRef.current;
      const { row, col } = state.tetrominoPos;
      const newShape = state.currentTetromino.shape;

      if (isValidMove(state.board, newShape, row + 1, col)) {
        setTetrominoPos({ row: row + 1, col });
      } else {
        // Piece has landed
        let newBoard = mergeTetromino(state.board, newShape, row, col, state.currentTetromino.type);
        const { newBoard: clearedBoard, clearedLines } = clearLines(newBoard);
        newBoard = clearedBoard;
        setBoard(newBoard);

        if (clearedLines > 0) {
          playSound('clear');
          setScore(s => {
            const newScore = s + calculateScore(clearedLines, levelRef.current);
            if (newScore > highScore) {
              setHighScoreState(newScore);
              setHighScore('block-drop', newScore, difficulty);
            }
            return newScore;
          });
          setLinesCleared(lc => {
            const newLinesCleared = lc + clearedLines;
            if (newLinesCleared >= levelRef.current * 10) {
              setLevel(l => l + 1);
            }
            return newLinesCleared;
          });
        }

        setCurrentTetromino(nextTetromino);
        setNextTetromino(getRandomTetromino());
        setTetrominoPos({ row: 0, col: Math.floor(BOARD_WIDTH / 2) - 2 });

        // Check for game over
        setTimeout(() => {
          const latestState = gameStateRef.current;
          if (!isValidMove(latestState.board, latestState.currentTetromino.shape, 0, Math.floor(BOARD_WIDTH / 2) - 2)) {
            setGameOver(true);
            playSound('lose');
          }
        }, 50);
      }
    }, getSpeed(difficulty, level));

    fallIntervalRef.current = interval;

    return () => {
      clearInterval(interval);
    };
  }, [gameStarted, gameOver, difficulty, level, nextTetromino, highScore, playSound]);

  useEffect(() => {
    if (gameOver && startTimeRef.current) {
      const gameDuration = Math.floor((Date.now() - startTimeRef.current) / 1000);
      recordGameResult('block-drop', score > 0 ? 'win' : 'loss', gameDuration);
    }
  }, [gameOver, score]);

  const moveTetromino = useCallback((direction: 'left' | 'right' | 'down' | 'rotate' | 'harddrop' | 'softdrop') => {
    if (gameOver || !gameStarted || paused) return;

    // Read from ref so gesture loop iterations see the latest position (avoids stale closure)
    let { row, col } = tetrominoPosRef.current;
    let newShape = currentTetromino.shape;

    if (direction === 'rotate') {
      if (isValidMove(board, newShape, row, col)) {
        const rotatedShape = rotateTetromino(newShape);
        if (isValidMove(board, rotatedShape, row, col)) {
          setCurrentTetromino({ ...currentTetromino, shape: rotatedShape });
          playSound('tap');
        }
      }
    } else if (direction === 'left') {
      if (isValidMove(board, newShape, row, col - 1)) {
        col--;
        tetrominoPosRef.current = { row, col }; // update ref synchronously for loop continuity
        setTetrominoPos({ row, col });
        playSound('tap');
      }
    } else if (direction === 'right') {
      if (isValidMove(board, newShape, row, col + 1)) {
        col++;
        tetrominoPosRef.current = { row, col }; // update ref synchronously for loop continuity
        setTetrominoPos({ row, col });
        playSound('tap');
      }
    } else if (direction === 'softdrop') {
      // Move down one line immediately
      if (isValidMove(board, newShape, row + 1, col)) {
        row++;
        setTetrominoPos({ row, col });
        setScore(s => s + 1); // 1 point for soft drop
      }
    } else if (direction === 'harddrop') {
      playSound('drop');
      let dropScore = 0;
      while (isValidMove(board, newShape, row + 1, col)) {
        row++;
        dropScore += 2;
      }
      if (dropScore > 0) {
        setScore(s => s + dropScore);
      }
      setTetrominoPos({ row, col });

      // Manually trigger landing
      setTimeout(() => {
        let newBoard = mergeTetromino(board, newShape, row, col, currentTetromino.type);
        const { newBoard: clearedBoard, clearedLines } = clearLines(newBoard);
        newBoard = clearedBoard;
        setBoard(newBoard);

        if (clearedLines > 0) {
          playSound('clear');
          setScore(s => {
            const newScore = s + calculateScore(clearedLines, level);
            if (newScore > highScore) {
              setHighScoreState(newScore);
              setHighScore('block-drop', newScore, difficulty);
            }
            return newScore;
          });
          setLinesCleared(lc => {
            const newLinesCleared = lc + clearedLines;
            if (newLinesCleared >= level * 10) {
              setLevel(l => l + 1);
            }
            return newLinesCleared;
          });
        }

        const newCurrentTetromino = nextTetromino;
        const newNextTetromino = getRandomTetromino();
        setCurrentTetromino(newCurrentTetromino);
        setNextTetromino(newNextTetromino);
        setTetrominoPos({ row: 0, col: Math.floor(BOARD_WIDTH / 2) - 2 });

        setTimeout(() => {
          if (!isValidMove(newBoard, newCurrentTetromino.shape, 0, Math.floor(BOARD_WIDTH / 2) - 2)) {
            setGameOver(true);
            playSound('lose');
          }
        }, 50);
      }, 0);
    }
  }, [board, currentTetromino, tetrominoPos, gameOver, gameStarted, paused, level, nextTetromino, highScore, playSound]);

  const startGame = useCallback(() => {
    setGameStarted(true);
    startTimeRef.current = Date.now();
  }, []);

  // Keyboard support for web
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = (e: KeyboardEvent) => {
      if (gameOver || !gameStarted) return;
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          moveTetromino('left');
          break;
        case 'ArrowRight':
          e.preventDefault();
          moveTetromino('right');
          break;
        case 'ArrowDown':
          e.preventDefault();
          moveTetromino('softdrop');
          break;
        case 'ArrowUp':
          e.preventDefault();
          moveTetromino('rotate');
          break;
        case ' ': // Spacebar for hard drop
        case 'Enter': // Enter also for hard drop
          e.preventDefault();
          moveTetromino('harddrop');
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [moveTetromino, gameOver, gameStarted]);


  const getGhostRow = useCallback(() => {
    let ghostRow = tetrominoPos.row;
    while (isValidMove(board, currentTetromino.shape, ghostRow + 1, tetrominoPos.col)) {
      ghostRow++;
    }
    return ghostRow;
  }, [board, currentTetromino, tetrominoPos]);

  // Gestures for touch support
  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .minDistance(10)
    .onStart(() => {
      lastXRef.current = 0;
    })
    .onUpdate((e) => {
      if (!gameStarted || gameOver || paused) return;
      const { translationX, translationY } = e;
      
      // Horizontal movement during drag
      if (Math.abs(translationX) > Math.abs(translationY)) {
        const threshold = 25; // Sensitivity: move every 25 pixels
        const diff = translationX - lastXRef.current;
        if (Math.abs(diff) >= threshold) {
          const steps = Math.floor(Math.abs(diff) / threshold);
          for (let i = 0; i < steps; i++) {
            moveTetromino(diff > 0 ? 'right' : 'left');
          }
          lastXRef.current += (diff > 0 ? threshold : -threshold) * steps;
        }
      }
    })
    .onEnd((e) => {
      if (!gameStarted || gameOver || paused) return;
      const { translationX, translationY } = e;
      const absX = Math.abs(translationX);
      const absY = Math.abs(translationY);

      // Vertical swipes (flicks) at the end of the gesture
      if (absY > absX && absY > 30) {
        if (translationY > 0) {
          moveTetromino('harddrop');
        } else {
          moveTetromino('softdrop');
        }
      }
    });

  const tapGesture = Gesture.Tap()
    .onEnd(() => {
      if (!gameStarted || gameOver || paused) return;
      moveTetromino('rotate');
    });

  const combinedGesture = Gesture.Exclusive(panGesture, tapGesture);

  const renderBoard = () => {
    const ghostRow = getGhostRow();

    return board.map((row, r) => (
      <View key={r} style={styles.blockDropRow}>
        {row.map((cell, c) => {
          let cellType: TetrominoType | 0 | 'ghost' = cell as any;

          // Check if current tetromino is here
          const inTetromino =
            r >= tetrominoPos.row && r < tetrominoPos.row + currentTetromino.shape.length &&
            c >= tetrominoPos.col && c < tetrominoPos.col + currentTetromino.shape[0].length &&
            currentTetromino.shape[r - tetrominoPos.row][c - tetrominoPos.col] !== 0;

          if (inTetromino) {
            cellType = currentTetromino.type;
          } else {
            // Check for ghost piece
            const inGhost =
              r >= ghostRow && r < ghostRow + currentTetromino.shape.length &&
              c >= tetrominoPos.col && c < tetrominoPos.col + currentTetromino.shape[0].length &&
              currentTetromino.shape[r - ghostRow][c - tetrominoPos.col] !== 0;

            if (inGhost && !gameOver && gameStarted && !paused) {
              cellType = 'ghost';
            }
          }

          if (cellType === 0) {
            return <View key={`${r}-${c}`} style={styles.emptyCell} />;
          }

          if (cellType === 'ghost') {
            return (
              <View key={`${r}-${c}`} style={[styles.blockDropCell, styles.ghostCell]}>
                <View style={[styles.ghostInner, { borderColor: TETROMINO_COLORS[currentTetromino.type] }]} />
              </View>
            );
          }

          const color = TETROMINO_COLORS[cellType as TetrominoType];

          return (
            <View key={`${r}-${c}`} style={[styles.blockDropCell, { backgroundColor: color }]}>
              <LinearGradient
                colors={['rgba(255,255,255,0.3)', 'rgba(0,0,0,0.1)']}
                style={styles.cellGradient}
              />
              <View style={styles.cellBevel} />
            </View>
          );
        })}
      </View>
    ));
  };

  const resetGame = useCallback(() => {
    stopGameLoop();
    setBoard(createEmptyBoard());
    setCurrentTetromino(getRandomTetromino());
    setNextTetromino(getRandomTetromino());
    setTetrominoPos({ row: 0, col: Math.floor(BOARD_WIDTH / 2) - 2 });
    setGameOver(false);
    setScore(0);
    setLevel(1);
    setLinesCleared(0);
    setGameStarted(true);
    startTimeRef.current = Date.now();
  }, [stopGameLoop]);

  const handleNewGame = useCallback(() => {
    resetGame();
  }, [resetGame]);

  const handleRestart = useCallback(() => {
    resetGame();
  }, [resetGame]);

  return (
    <View style={styles.container}>
      <Text style={styles.bgIcon}>🧱</Text>
      <Header
        score={score}
        highScore={highScore}
        onPause={() => setPaused(!paused)}
        isPaused={paused}
      />

      <View style={styles.gameContainer}>
        <View style={styles.mainColumn}>
          <GestureDetector gesture={combinedGesture}>
            <View onLayout={handleBoardAreaLayout}>
              <GameBoardContainer style={styles.boardWrapper}>
                <View style={styles.BlockDropBoard}>
                  {renderBoard()}
                </View>
              </GameBoardContainer>
            </View>
          </GestureDetector>
        </View>

        <View style={styles.sidebar}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>NEXT</Text>
            <View style={styles.previewContainer}>
              {nextTetromino.shape.map((row, r) => (
                <View key={`preview-row-${r}`} style={styles.previewRow}>
                  {row.map((cell, c) => (
                    <View
                      key={`preview-cell-${r}-${c}`}
                      style={[
                        styles.previewCell,
                        cell !== 0 && { backgroundColor: TETROMINO_COLORS[nextTetromino.type] }
                      ]}
                    >
                      {cell !== 0 && (
                        <LinearGradient
                          colors={['rgba(255,255,255,0.2)', 'rgba(0,0,0,0.1)']}
                          style={styles.cellGradient}
                        />
                      )}
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>LEVEL</Text>
            <Text style={styles.statValue}>{level}</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>LINES</Text>
            <Text style={styles.statValue}>{linesCleared}</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <PremiumButton variant="secondary" height={50} onPress={handleRestart} style={styles.flexBtn} disabled={paused}>
          <Text style={styles.footerBtnText}>RESTART</Text>
        </PremiumButton>
        <PremiumButton variant="secondary" height={50} onPress={handleNewGame} style={styles.flexBtn} disabled={paused}>
          <Text style={styles.footerBtnText}>NEW GAME</Text>
        </PremiumButton>
      </View>

      {gameOver && (
        <GameOverOverlay
          result="lose"
          title="MISSION FAILED"
          subtitle={`FINAL SCORE: ${score}`}
          onPlayAgain={resetGame}
          onNewGame={handleNewGame}
          onRestart={handleRestart}
        />
      )}

      {paused && !gameOver && (
        <GameOverOverlay
          result="paused"
          title="GAME PAUSED"
          onPlayAgain={() => setPaused(false)}
          onPlayAgainLabel="RESUME"
          onNewGame={handleNewGame}
          onRestart={handleRestart}
        />
      )}
    </View>
  );
}

const getStyles = (colors: ThemeColors, cellSize: number) => {
  const gameAreaWidth = cellSize * BOARD_WIDTH;
  const gameAreaHeight = cellSize * BOARD_HEIGHT;
  return StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.md,
    backgroundColor: colors.background,
  },
  gameContainer: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  mainColumn: {
    flex: 3,
  },
  boardWrapper: {
    padding: 0,
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    borderWidth: 4,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  BlockDropBoard: {
    width: gameAreaWidth,
    height: gameAreaHeight,
  },
  blockDropRow: {
    flexDirection: 'row',
  },
  blockDropCell: {
    width: cellSize,
    height: cellSize,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  emptyCell: {
    width: cellSize,
    height: cellSize,
    backgroundColor: 'transparent',
  },
  cellGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  cellBevel: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    bottom: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
  },
  ghostCell: {
    backgroundColor: 'transparent',
  },
  ghostInner: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 2,
    margin: 2,
    opacity: 0.4,
  },
  sidebar: {
    flex: 1,
    gap: spacing.md,
  },
  statCard: {
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
  },
  previewContainer: {
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
  },
  previewRow: {
    flexDirection: 'row',
  },
  previewCell: {
    width: 12,
    height: 12,
    margin: 1,
    borderRadius: 2,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 30 : spacing.md,
    paddingTop: spacing.sm,
  },
  flexBtn: { flex: 1 },
  footerBtnText: { color: colors.text, fontWeight: 'bold', fontSize: 12 },
  bgIcon: {
    position: 'absolute',
    bottom: '10%',
    left: '-10%',
    fontSize: 250,
    opacity: 0.03,
    transform: [{ rotate: '-15deg' }],
  },
  });
};
