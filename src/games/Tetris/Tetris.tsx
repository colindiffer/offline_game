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
  TetrisBoard,
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
const MAX_BOARD_HEIGHT = SCREEN_HEIGHT * 0.6; // Use 60% of screen height
const CELL_SIZE = Math.floor(Math.min((SCREEN_WIDTH - 100) / BOARD_WIDTH, MAX_BOARD_HEIGHT / BOARD_HEIGHT));
const GAME_AREA_WIDTH = CELL_SIZE * BOARD_WIDTH;
const GAME_AREA_HEIGHT = CELL_SIZE * BOARD_HEIGHT;

interface Props {
  difficulty: Difficulty;
}

export default function Tetris({ difficulty }: Props) {
  const { colors } = useTheme();
  const { playSound } = useSound();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [board, setBoard] = useState<TetrisBoard>(createEmptyBoard());
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

  useEffect(() => {
    getHighScore('tetris').then(setHighScoreState);
  }, []);

  const stopGameLoop = useCallback(() => {
    if (fallIntervalRef.current) {
      clearInterval(fallIntervalRef.current);
      fallIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    levelRef.current = level;
    gameStateRef.current = { board, currentTetromino, tetrominoPos, gameOver, gameStarted };
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
              setHighScore('tetris', newScore);
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
      recordGameResult('tetris', score > 0 ? 'win' : 'loss', gameDuration);
    }
  }, [gameOver, score]);

  const moveTetromino = useCallback((direction: 'left' | 'right' | 'down' | 'rotate' | 'harddrop' | 'softdrop') => {
    if (gameOver || !gameStarted || paused) return;

    let { row, col } = tetrominoPos;
    let newShape = currentTetromino.shape;

    if (direction === 'rotate') {
      const rotatedShape = rotateTetromino(newShape);
      if (isValidMove(board, rotatedShape, row, col)) {
        setCurrentTetromino({ ...currentTetromino, shape: rotatedShape });
        playSound('tap');
      }
    } else if (direction === 'left') {
      if (isValidMove(board, newShape, row, col - 1)) {
        col--;
        setTetrominoPos({ row, col });
        playSound('tap');
      }
    } else if (direction === 'right') {
      if (isValidMove(board, newShape, row, col + 1)) {
        col++;
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
              setHighScore('tetris', newScore);
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
      <View key={r} style={styles.tetrisRow}>
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
              <View key={`${r}-${c}`} style={[styles.tetrisCell, styles.ghostCell]}>
                <View style={[styles.ghostInner, { borderColor: TETROMINO_COLORS[currentTetromino.type] }]} />
              </View>
            );
          }

          const color = TETROMINO_COLORS[cellType as TetrominoType];

          return (
            <View key={`${r}-${c}`} style={[styles.tetrisCell, { backgroundColor: color }]}>
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

  return (
    <View style={styles.container}>
      <Header
        score={score}
        highScore={highScore}
        onPause={() => setPaused(!paused)}
        isPaused={paused}
      />

      <View style={styles.gameContainer}>
        <View style={styles.mainColumn}>
          <GestureDetector gesture={combinedGesture}>
            <View>
              <GameBoardContainer style={styles.boardWrapper}>
                <View style={styles.tetrisBoard}>
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

      {gameOver && (
        <GameOverOverlay
          result="lose"
          title="MISSION FAILED"
          subtitle={`FINAL SCORE: ${score}`}
          onPlayAgain={resetGame}
        />
      )}
    </View>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
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
    backgroundColor: '#1a1a2e',
    borderRadius: radius.sm,
    borderWidth: 4,
    borderColor: '#2b2b45',
    overflow: 'hidden',
  },
  tetrisBoard: {
    width: GAME_AREA_WIDTH,
    height: GAME_AREA_HEIGHT,
  },
  tetrisRow: {
    flexDirection: 'row',
  },
  tetrisCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  emptyCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
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
    borderColor: 'rgba(255,255,255,0.2)',
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
});
