import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Header from '../../components/Header';
import { useTheme } from '../../contexts/ThemeContext';
import { useSound } from '../../contexts/SoundContext';
import { getHighScore, setHighScore } from '../../utils/storage';
import { recordGameResult } from '../../utils/stats';
import { Difficulty } from '../../types';
import { ThemeColors } from '../../utils/themes';
import { generateMaze, canMove, hasWon, getMazeConfig, MazeGrid } from './logic';

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

      const { row, col } = playerPos;

      if (canMove(maze, row, col, direction)) {
        let newRow = row;
        let newCol = col;

        switch (direction) {
          case 'up':
            newRow--;
            break;
          case 'down':
            newRow++;
            break;
          case 'left':
            newCol--;
            break;
          case 'right':
            newCol++;
            break;
        }

        setPlayerPos({ row: newRow, col: newCol });
        playSound('tap');

        if (hasWon(newRow, newCol, config.rows, config.cols)) {
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
      <View key={r} style={[styles.mazeRow, { height: CELL_SIZE }]}>
        {row.map((cell, c) => {
          const isPlayer = playerPos.row === r && playerPos.col === c;
          const isStart = r === 0 && c === 0;
          const isExit = r === config.rows - 1 && c === config.cols - 1;

          return (
            <View
              key={`${r}-${c}`}
              style={[
                styles.cell,
                {
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  borderTopWidth: cell.walls.top ? 2 : 0,
                  borderRightWidth: cell.walls.right ? 2 : 0,
                  borderBottomWidth: cell.walls.bottom ? 2 : 0,
                  borderLeftWidth: cell.walls.left ? 2 : 0,
                  backgroundColor: isPlayer
                    ? colors.primary
                    : isStart
                    ? colors.success
                    : isExit
                    ? colors.warning
                    : colors.surface,
                },
              ]}
            />
          );
        })}
      </View>
    ));
  };

  return (
    <View style={styles.container}>
      <Header
        title="Maze"
        score={elapsedTime}
        scoreLabel="Time"
        highScore={highScore || 0}
        highScoreLabel="Best"
      />

      <GestureDetector gesture={panGesture}>
        <View style={styles.mazeContainer}>
          <View
            style={[
              styles.maze,
              {
                width: CELL_SIZE * config.cols,
                height: CELL_SIZE * config.rows,
              },
            ]}
          >
            {renderMaze()}
          </View>
        </View>
      </GestureDetector>

      <TouchableOpacity style={styles.newGameBtn} onPress={resetGame} activeOpacity={0.7}>
        <Text style={styles.newGameText}>New Maze</Text>
      </TouchableOpacity>

      {gameWon && (
        <View style={styles.overlay}>
          <Text style={styles.winText}>You Win!</Text>
          <Text style={styles.timeText}>Time: {elapsedTime}s</Text>
          {highScore !== null && elapsedTime < highScore && (
            <Text style={styles.recordText}>New Record!</Text>
          )}
          <TouchableOpacity style={styles.playAgain} onPress={resetGame} activeOpacity={0.7}>
            <Text style={styles.playAgainText}>Play Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      alignItems: 'center',
    },
    mazeContainer: {
      marginTop: 20,
      alignItems: 'center',
    },
    maze: {
      backgroundColor: colors.surface,
    },
    mazeRow: {
      flexDirection: 'row',
    },
    cell: {
      borderColor: colors.textSecondary,
    },
    newGameBtn: {
      backgroundColor: colors.card,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 24,
      marginTop: 20,
    },
    newGameText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    winText: {
      color: colors.warning,
      fontSize: 36,
      fontWeight: 'bold',
      marginBottom: 16,
    },
    timeText: {
      color: colors.text,
      fontSize: 24,
      marginBottom: 8,
    },
    recordText: {
      color: colors.success,
      fontSize: 20,
      marginBottom: 24,
    },
    playAgain: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 24,
    },
    playAgainText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
  });
