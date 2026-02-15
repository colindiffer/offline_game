import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View, Animated, ScrollView } from 'react-native';
import Header from '../../components/Header';
import { useTheme } from '../../contexts/ThemeContext';
import { useSound } from '../../contexts/SoundContext';
import { getHighScore, setHighScore } from '../../utils/storage';
import { recordGameResult } from '../../utils/stats';
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
  const [gameStarted, setGameStarted] = useState(false);

  const startTimeRef = useRef<number | null>(null);
  const fallIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const levelRef = useRef(level);
  const gameStateRef = useRef({ board, currentTetromino, tetrominoPos, gameOver, gameStarted });
  const pausedRef = useRef(false);

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


  const renderBoard = () => {
    const displayBoard = board.map(row => [...row]);

    // Draw current tetromino on board
    for (let r = 0; r < currentTetromino.shape.length; r++) {
      for (let c = 0; c < currentTetromino.shape[0].length; c++) {
        if (currentTetromino.shape[r][c] !== 0) {
          const boardRow = tetrominoPos.row + r;
          const boardCol = tetrominoPos.col + c;
          if (boardRow >= 0 && boardRow < BOARD_HEIGHT && boardCol >= 0 && boardCol < BOARD_WIDTH) {
            displayBoard[boardRow][boardCol] = currentTetromino.type;
          }
        }
      }
    }

    return displayBoard.map((row, r) => (
      <View key={r} style={styles.tetrisRow}>
        {row.map((cell, c) => (
          <View
            key={`${r}-${c}`}
            style={[
              styles.tetrisCell,
              {
                width: CELL_SIZE,
                height: CELL_SIZE,
                backgroundColor: cell === 0 ? colors.surface : TETROMINO_COLORS[cell as TetrominoType],
                borderColor: colors.background,
              },
            ]}
          />
        ))}
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
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <Header title="Tetris" score={score} highScore={highScore} />

      <View style={styles.gameArea}>
        <View style={[styles.tetrisBoard, { width: GAME_AREA_WIDTH, height: GAME_AREA_HEIGHT }]}>
          {renderBoard()}
        </View>
        <View style={styles.sidebar}>
          <Text style={styles.sidebarTitle}>Next</Text>
          <View style={styles.nextTetrominoPreview}>
            {nextTetromino.shape.map((row, r) => (
              <View key={r} style={styles.tetrisRow}>
                {row.map((cell, c) => (
                  <View
                    key={`${r}-${c}`}
                    style={[
                      styles.tetrisCell,
                      {
                        width: CELL_SIZE / 1.5,
                        height: CELL_SIZE / 1.5,
                        backgroundColor: cell === 0 ? colors.surface : TETROMINO_COLORS[nextTetromino.type],
                        borderColor: colors.background,
                      },
                    ]}
                  />
                ))}
              </View>
            ))}
          </View>
          <Text style={styles.sidebarTitle}>Level: {level}</Text>
          <Text style={styles.sidebarTitle}>Lines: {linesCleared}</Text>
        </View>
      </View>

      {!gameStarted && !gameOver && (
        <TouchableOpacity style={styles.startButton} onPress={startGame} activeOpacity={0.7}>
          <Text style={styles.startButtonText}>Start Game</Text>
        </TouchableOpacity>
      )}

      {(gameOver) && (
        <View style={styles.overlay}>
          <Text style={styles.gameOverText}>Game Over!</Text>
          <Text style={styles.finalScore}>Score: {score}</Text>
          <TouchableOpacity style={styles.playAgain} onPress={resetGame} activeOpacity={0.7}>
            <Text style={styles.playAgainText}>Play Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {paused && !gameOver && (
        <View style={styles.overlay}>
          <Text style={styles.pausedText}>Paused</Text>
          <TouchableOpacity 
            style={styles.resumeButton} 
            onPress={() => setPaused(false)} 
            activeOpacity={0.7}
          >
            <Text style={styles.playAgainText}>Resume</Text>
          </TouchableOpacity>
        </View>
      )}

      {gameStarted && !gameOver && Platform.OS !== 'web' && (
        <View style={styles.controls}>
          <View style={styles.controlRow}>
            <TouchableOpacity style={styles.pauseButton} onPress={() => setPaused(!paused)} activeOpacity={0.7}>
              <Text style={styles.pauseIcon}>{paused ? '▶️' : '⏸️'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.controlRow}>
            <TouchableOpacity style={styles.controlButton} onPress={() => moveTetromino('rotate')}>
              <Text style={styles.controlButtonText}>Rotate</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.controlRow}>
            <TouchableOpacity style={styles.controlButton} onPress={() => moveTetromino('left')}>
              <Text style={styles.controlButtonText}>{'<'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={() => moveTetromino('softdrop')}>
              <Text style={styles.controlButtonText}>{'v'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={() => moveTetromino('right')}>
              <Text style={styles.controlButtonText}>{'>'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.controlRow}>
            <TouchableOpacity style={styles.controlButton} onPress={() => moveTetromino('harddrop')}>
              <Text style={styles.controlButtonText}>Drop</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
    </ScrollView>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  gameArea: {
    flexDirection: 'row',
    marginTop: 10,
  },
  tetrisBoard: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.textSecondary,
  },
  tetrisRow: {
    flexDirection: 'row',
  },
  tetrisCell: {
    borderWidth: 1,
    borderColor: colors.background,
  },
  sidebar: {
    marginLeft: 10,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  sidebarTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  nextTetrominoPreview: {
    backgroundColor: colors.card,
    padding: 5,
    borderRadius: 5,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButton: {
    backgroundColor: colors.primary,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginTop: 30,
  },
  startButtonText: {
    color: colors.text,
    fontSize: 24,
    fontWeight: 'bold',
  },
  controls: {
    marginTop: 20,
    width: '100%',
    alignItems: 'center',
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  controlButton: {
    backgroundColor: colors.card,
    padding: 15,
    marginHorizontal: 5,
    borderRadius: 8,
  },
  controlButtonText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  pauseButton: {
    backgroundColor: colors.primary,
    padding: 15,
    marginHorizontal: 5,
    borderRadius: 8,
  },
  pauseIcon: {
    fontSize: 20,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameOverText: {
    color: colors.primary,
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  finalScore: {
    color: colors.text,
    fontSize: 24,
    marginBottom: 30,
  },
  playAgain: {
    backgroundColor: colors.primary,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  playAgainText: {
    color: colors.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  pausedText: {
    color: colors.warning,
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  resumeButton: {
    backgroundColor: colors.success,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
});
