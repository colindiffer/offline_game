import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View, Animated } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Header from '../../components/Header';
import GameOverOverlay from '../../components/GameOverOverlay';
import GameBoardContainer from '../../components/GameBoardContainer';
import PremiumButton from '../../components/PremiumButton';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { useSound } from '../../contexts/SoundContext';
import { getHighScore, setHighScore } from '../../utils/storage';
import { recordGameResult } from '../../utils/stats';
import { Difficulty } from '../../types';
import { ThemeColors } from '../../utils/themes';
import { generateMaze, canMove, hasWon, getMazeConfig, MazeGrid } from './logic';
import { spacing, radius, shadows, typography } from '../../utils/designTokens';

const SCREEN_WIDTH = Dimensions.get('window').width;
const MAX_MAZE_SIZE = Math.min(SCREEN_WIDTH - 40, 400);

interface Props {
  difficulty: Difficulty;
}

export default function Maze({ difficulty }: Props) {
  const { colors } = useTheme();
  const { playSound } = useSound();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const config = getMazeConfig(difficulty);
  const CELL_SIZE = Math.floor(MAX_MAZE_SIZE / Math.max(config.rows, config.cols));

  const [maze, setMaze] = useState<MazeGrid>(() => generateMaze(difficulty));
  const [playerPos, setPlayerPos] = useState({ row: 0, col: 0 });
  const [gameWon, setGameWon] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [highScore, setHighScoreState] = useState<number | null>(null);

  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    getHighScore('maze').then((score) => {
      setHighScoreState(score);
    });
  }, []);

  useEffect(() => {
    // Reset game when difficulty changes
    resetGame();
  }, [difficulty]);

  useEffect(() => {
    if (!gameWon && startTimeRef.current) {
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTimeRef.current!) / 1000));
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [gameWon]);

  const movePlayer = useCallback(
    (direction: 'up' | 'down' | 'left' | 'right') => {
      if (gameWon) return;

      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
      }

      let currentRow = playerPos.row;
      let currentCol = playerPos.col;
      let moved = false;

      // Keep moving in the direction until we hit a wall
      while (canMove(maze, currentRow, currentCol, direction)) {
        switch (direction) {
          case 'up':
            currentRow--;
            break;
          case 'down':
            currentRow++;
            break;
          case 'left':
            currentCol--;
            break;
          case 'right':
            currentCol++;
            break;
        }
        moved = true;
        
        // Check if we won at any point during the slide
        if (hasWon(currentRow, currentCol, config.rows, config.cols)) {
          break;
        }
      }

      if (moved) {
        setPlayerPos({ row: currentRow, col: currentCol });
        playSound('tap');

        if (hasWon(currentRow, currentCol, config.rows, config.cols)) {
          setGameWon(true);
          playSound('win');
          const finalTime = Math.floor((Date.now() - startTimeRef.current!) / 1000);
          recordGameResult('maze', 'win', finalTime);

          if (highScore === null || finalTime < highScore) {
            setHighScoreState(finalTime);
            setHighScore('maze', finalTime);
          }
        }
      }
    },
    [maze, playerPos, gameWon, config, highScore, playSound]
  );

  // Keyboard support for web
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = (e: KeyboardEvent) => {
      if (gameWon) return;
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          movePlayer('up');
          break;
        case 'ArrowDown':
          e.preventDefault();
          movePlayer('down');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          movePlayer('left');
          break;
        case 'ArrowRight':
          e.preventDefault();
          movePlayer('right');
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [movePlayer, gameWon]);

  const panGesture = Gesture.Pan()
    .minDistance(20)
    .onEnd((e) => {
      const { translationX, translationY } = e;
      const absX = Math.abs(translationX);
      const absY = Math.abs(translationY);

      if (absX > absY) {
        movePlayer(translationX > 0 ? 'right' : 'left');
      } else {
        movePlayer(translationY > 0 ? 'down' : 'up');
      }
    });

  const resetGame = useCallback(() => {
    setMaze(generateMaze(difficulty));
    setPlayerPos({ row: 0, col: 0 });
    setGameWon(false);
    setElapsedTime(0);
    startTimeRef.current = null;
  }, [difficulty]);

  const renderMaze = () => {
    return maze.map((row, r) => (
      <View key={`row-${r}`} style={styles.mazeRow}>
        {row.map((cell, c) => {
          const isPlayer = playerPos.row === r && playerPos.col === c;
          const isExit = r === config.rows - 1 && c === config.cols - 1;

          return (
            <View key={`cell-${r}-${c}`} style={[styles.cell, { width: CELL_SIZE, height: CELL_SIZE }]}>
              {/* Walls */}
              {cell.walls.top && <View style={[styles.wall, styles.wallTop]} />}
              {cell.walls.right && <View style={[styles.wall, styles.wallRight]} />}
              {cell.walls.bottom && <View style={[styles.wall, styles.wallBottom]} />}
              {cell.walls.left && <View style={[styles.wall, styles.wallLeft]} />}

              {/* Start/Exit Icons */}
              {isExit && (
                <View style={styles.exitPortal}>
                  <LinearGradient
                    colors={['#fdcb6e', '#e17055']}
                    style={styles.exitGradient}
                  />
                </View>
              )}

              {/* Player */}
              {isPlayer && (
                <Animated.View style={styles.playerWrapper}>
                  <View style={styles.player}>
                    <LinearGradient
                      colors={['#74b9ff', '#0984e3']}
                      style={styles.playerGradient}
                    />
                    <View style={styles.playerGlow} />
                  </View>
                </Animated.View>
              )}
            </View>
          );
        })}
      </View>
    ));
  };

  return (
    <View style={styles.container}>
      <Header
        score={elapsedTime}
        scoreLabel="TIME"
        highScore={highScore || 0}
        highScoreLabel="BEST"
      />

      <GestureDetector gesture={panGesture}>
        <View style={styles.mazeContainer}>
          <GameBoardContainer style={styles.boardWrapper}>
            <View style={styles.maze}>
              {renderMaze()}
            </View>
          </GameBoardContainer>
        </View>
      </GestureDetector>

      <View style={styles.footer}>
        <PremiumButton variant="secondary" height={56} onPress={resetGame} style={styles.newGameBtn}>
          <Text style={styles.newGameText}>GENERATE NEW MAZE</Text>
        </PremiumButton>
      </View>

      {gameWon && (
        <GameOverOverlay
          result="win"
          title="MAZE ESCAPED!"
          subtitle={`TIME: ${elapsedTime}s${highScore !== null && elapsedTime < highScore ? ' \nNEW RECORD!' : ''}`}
          onPlayAgain={resetGame}
        />
      )}
    </View>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: spacing.md,
      backgroundColor: colors.background,
    },
    mazeContainer: {
      marginTop: spacing.xl,
      alignItems: 'center',
    },
    boardWrapper: {
      padding: 4,
      backgroundColor: '#2d3436',
      borderRadius: radius.sm,
    },
    maze: {
      backgroundColor: '#1e272e',
      position: 'relative',
    },
    mazeRow: {
      flexDirection: 'row',
    },
    cell: {
      position: 'relative',
      justifyContent: 'center',
      alignItems: 'center',
    },
    wall: {
      position: 'absolute',
      backgroundColor: '#dfe6e9',
      borderRadius: 2,
    },
    wallTop: {
      top: 0,
      left: 0,
      right: 0,
      height: 4,
    },
    wallRight: {
      top: 0,
      right: 0,
      bottom: 0,
      width: 4,
    },
    wallBottom: {
      bottom: 0,
      left: 0,
      right: 0,
      height: 4,
    },
    wallLeft: {
      top: 0,
      left: 0,
      bottom: 0,
      width: 4,
    },
    playerWrapper: {
      width: '80%',
      height: '80%',
      zIndex: 10,
    },
    player: {
      flex: 1,
      borderRadius: 100,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.4)',
    },
    playerGradient: {
      flex: 1,
    },
    playerGlow: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(116, 185, 255, 0.2)',
    },
    exitPortal: {
      width: '60%',
      height: '60%',
      borderRadius: 4,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: '#fdcb6e',
      transform: [{ rotate: '45deg' }],
    },
    exitGradient: {
      flex: 1,
    },
    footer: {
      marginTop: spacing.xl,
      width: '100%',
      paddingHorizontal: spacing.md,
    },
    newGameBtn: {
      width: '100%',
    },
    newGameText: {
      color: colors.text,
      fontWeight: '900',
      fontSize: 14,
      letterSpacing: 1,
    },
  });
