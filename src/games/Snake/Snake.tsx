import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View, Animated } from 'react-native';
import Header from '../../components/Header';
import TutorialScreen from '../../components/TutorialScreen';
import { SNAKE_GRID_SIZE } from '../../utils/constants';
import { getHighScore, setHighScore } from '../../utils/storage';
import { recordGameResult } from '../../utils/stats';
import { Difficulty } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import { useSound } from '../../contexts/SoundContext';
import { ThemeColors } from '../../utils/themes';
import { GAME_TUTORIALS } from '../../utils/tutorials';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Direction,
  Point,
  checkCollision,
  getInitialSnake,
  growSnake,
  isOppositeDirection,
  moveSnake,
  spawnFood,
} from './logic';

const SCREEN_WIDTH = Dimensions.get('window').width;
const BOARD_SIZE = Math.min(SCREEN_WIDTH - 40, 360);
const CELL_SIZE = Math.floor(BOARD_SIZE / SNAKE_GRID_SIZE);
const ACTUAL_BOARD = CELL_SIZE * SNAKE_GRID_SIZE;

const TICK_BY_DIFFICULTY: Record<Difficulty, number> = {
  easy: 200,
  medium: 150,
  hard: 100,
};

interface Props {
  difficulty: Difficulty;
}

export default function Snake({ difficulty }: Props) {
  const { colors } = useTheme();
  const { playSound } = useSound();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const [snake, setSnake] = useState<Point[]>(getInitialSnake());
  const [food, setFood] = useState<Point>(() => spawnFood(getInitialSnake(), SNAKE_GRID_SIZE));
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHigh] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);

  const dirRef = useRef<Direction>('RIGHT');
  const snakeRef = useRef<Point[]>(snake);
  const foodRef = useRef<Point>(food);
  const gameOverRef = useRef(false);
  const pausedRef = useRef(false);
  const startTimeRef = useRef<number | null>(null);
  const foodScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    getHighScore('snake').then(setHigh);
    AsyncStorage.getItem('@tutorial_snake').then((shown) => {
      if (!shown) setShowTutorial(true);
    });
  }, []);

  useEffect(() => {
    if (started && !gameOver) {
      startTimeRef.current = Date.now();
    } else if (gameOver && startTimeRef.current) {
      const gameDuration = Math.floor((Date.now() - startTimeRef.current) / 1000);
      recordGameResult('snake', score > 0 ? 'win' : 'loss', gameDuration);
      startTimeRef.current = null;
    }
  }, [started, gameOver, score]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(foodScale, {
          toValue: 1.2,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(foodScale, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [foodScale]);

  useEffect(() => { dirRef.current = direction; }, [direction]);
  useEffect(() => { snakeRef.current = snake; }, [snake]);
  useEffect(() => { foodRef.current = food; }, [food]);
  useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  useEffect(() => {
    if (!started || gameOver) return;
    const interval = setInterval(() => {
      if (gameOverRef.current || pausedRef.current) return;
      const currentSnake = snakeRef.current;
      const currentFood = foodRef.current;
      const currentDir = dirRef.current;

      const head = currentSnake[0];
      let newHead: Point;
      switch (currentDir) {
        case 'UP': newHead = { x: head.x, y: head.y - 1 }; break;
        case 'DOWN': newHead = { x: head.x, y: head.y + 1 }; break;
        case 'LEFT': newHead = { x: head.x - 1, y: head.y }; break;
        case 'RIGHT': newHead = { x: head.x + 1, y: head.y }; break;
      }

      // Check collision before moving
      if (checkCollision(newHead, currentSnake, SNAKE_GRID_SIZE)) {
        setGameOver(true);
        gameOverRef.current = true;
        playSound('lose');
        return;
      }

      const ateFood = newHead.x === currentFood.x && newHead.y === currentFood.y;
      let newSnake: Point[];
      if (ateFood) {
        newSnake = growSnake(currentSnake, currentDir);
        const newFood = spawnFood(newSnake, SNAKE_GRID_SIZE);
        setFood(newFood);
        foodRef.current = newFood;
        const newScore = newSnake.length - 3;
        setScore(newScore);
        setHigh((prev) => {
          if (newScore > prev) {
            setHighScore('snake', newScore);
            return newScore;
          }
          return prev;
        });
        playSound('eat');
      } else {
        newSnake = moveSnake(currentSnake, currentDir);
      }
      setSnake(newSnake);
      snakeRef.current = newSnake;
    }, TICK_BY_DIFFICULTY[difficulty]);
    return () => clearInterval(interval);
  }, [started, gameOver, difficulty, playSound]);

  const changeDirection = useCallback(
    (newDir: Direction) => {
      if (!started) setStarted(true);
      if (!isOppositeDirection(dirRef.current, newDir)) {
        setDirection(newDir);
        dirRef.current = newDir;
        playSound('tap');
      }
    },
    [started, playSound]
  );

  // Keyboard support for web
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = (e: KeyboardEvent) => {
      const map: Record<string, Direction> = {
        ArrowUp: 'UP',
        ArrowDown: 'DOWN',
        ArrowLeft: 'LEFT',
        ArrowRight: 'RIGHT',
      };
      const dir = map[e.key];
      if (dir) {
        e.preventDefault();
        changeDirection(dir);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [changeDirection]);

  const resetGame = () => {
    const initialSnake = getInitialSnake();
    setSnake(initialSnake);
    snakeRef.current = initialSnake;
    const newFood = spawnFood(initialSnake, SNAKE_GRID_SIZE);
    setFood(newFood);
    foodRef.current = newFood;
    setDirection('RIGHT');
    dirRef.current = 'RIGHT';
    setGameOver(false);
    gameOverRef.current = false;
    setStarted(false);
    setScore(0);
    foodScale.setValue(1); // Reset food animation
  };

  const snakeSet = new Set(snake.map((p) => `${p.x},${p.y}`));
  const headKey = `${snake[0].x},${snake[0].y}`;
  const foodKey = `${food.x},${food.y}`;

  return (
    <View style={styles.container}>
      <Header title="Snake" score={score} highScore={highScore} />

      <View style={styles.tutorialControls}>
        <TouchableOpacity
          style={styles.tutorialButton}
          onPress={() => setShowTutorial(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.tutorialIcon}>❓</Text>
        </TouchableOpacity>
        
        {started && !gameOver && (
          <TouchableOpacity
            style={styles.pauseButton}
            onPress={() => setPaused(!paused)}
            activeOpacity={0.7}
          >
            <Text style={styles.pauseIcon}>{paused ? '▶️' : '⏸️'}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.boardContainer}>
        <View style={[styles.board, { width: ACTUAL_BOARD, height: ACTUAL_BOARD }]}>
          {Array.from({ length: SNAKE_GRID_SIZE }, (_, y) => (
            <View key={y} style={styles.row}>
              {Array.from({ length: SNAKE_GRID_SIZE }, (_, x) => {
                const key = `${x},${y}`;
                const isSnake = snakeSet.has(key);
                const isHead = key === headKey;
                const isFood = key === foodKey;
                return (
                  <Animated.View
                    key={key}
                    style={[
                      styles.cell,
                      { width: CELL_SIZE, height: CELL_SIZE },
                      isHead && styles.headCell,
                      isSnake && !isHead && styles.snakeCell,
                      isFood && { transform: [{ scale: foodScale }] },
                      isFood && styles.foodCell,
                    ]}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </View>

      {!started && !gameOver && (
        <Text style={styles.startText}>Press a direction to start!</Text>
      )}

      {/* D-pad controls */}
      <View style={styles.controls}>
        <View style={styles.controlRow}>
          <TouchableOpacity
            style={styles.dpadButton}
            onPress={() => changeDirection('UP')}
            activeOpacity={0.6}
          >
            <Text style={styles.dpadText}>▲</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.controlRow}>
          <TouchableOpacity
            style={styles.dpadButton}
            onPress={() => changeDirection('LEFT')}
            activeOpacity={0.6}
          >
            <Text style={styles.dpadText}>◀</Text>
          </TouchableOpacity>
          <View style={styles.dpadSpacer} />
          <TouchableOpacity
            style={styles.dpadButton}
            onPress={() => changeDirection('RIGHT')}
            activeOpacity={0.6}
          >
            <Text style={styles.dpadText}>▶</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.controlRow}>
          <TouchableOpacity
            style={styles.dpadButton}
            onPress={() => changeDirection('DOWN')}
            activeOpacity={0.6}
          >
            <Text style={styles.dpadText}>▼</Text>
          </TouchableOpacity>
        </View>
      </View>

      {gameOver && (
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

      {showTutorial && (
        <TutorialScreen
          gameName="Snake"
          steps={GAME_TUTORIALS['snake']}
          onClose={() => {
            setShowTutorial(false);
            AsyncStorage.setItem('@tutorial_snake', 'true');
          }}
        />
      )}
    </View>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  tutorialControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
    gap: 12,
  },
  tutorialButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  pauseButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  pauseIcon: {
    fontSize: 20,
  },
  tutorialIcon: {
    fontSize: 24,
  },
  boardContainer: {
    alignItems: 'center',
    marginTop: 12,
  },
  board: {
    backgroundColor: '#0a0a1a',
    borderRadius: 4,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    backgroundColor: '#111125',
    borderWidth: 0.5,
    borderColor: '#1a1a30',
  },
  headCell: {
    backgroundColor: '#2ecc71',
    borderRadius: 3,
  },
  snakeCell: {
    backgroundColor: '#27ae60',
  },
  foodCell: {
    backgroundColor: colors.primary,
    borderRadius: 10,
  },
  startText: {
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  controls: {
    alignItems: 'center',
    marginTop: 20,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  dpadButton: {
    width: 56,
    height: 56,
    backgroundColor: colors.card,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 3,
  },
  dpadSpacer: {
    width: 56,
    height: 56,
    margin: 3,
  },
  dpadText: {
    color: colors.text,
    fontSize: 22,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(26, 26, 46, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameOverText: {
    color: colors.primary,
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  finalScore: {
    color: colors.text,
    fontSize: 20,
    marginBottom: 24,
  },
  playAgain: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  playAgainText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
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
