import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View, Animated } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Header from '../../components/Header';
import TutorialScreen from '../../components/TutorialScreen';
import GameOverOverlay from '../../components/GameOverOverlay';
import GameBoardContainer from '../../components/GameBoardContainer';
import { SNAKE_GRID_SIZE } from '../../utils/constants';
import { getHighScore, setHighScore } from '../../utils/storage';
import { recordGameResult } from '../../utils/stats';
import { spacing, radius, shadows, typography } from '../../utils/designTokens';
import { Difficulty } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import { useSound } from '../../contexts/SoundContext';
import { ThemeColors } from '../../utils/themes';
import { GAME_TUTORIALS } from '../../utils/tutorials';
import PremiumButton from '../../components/PremiumButton';
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
const BOARD_SIZE = SCREEN_WIDTH - 32;
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
    getHighScore('snake', difficulty).then(setHigh);
    AsyncStorage.getItem('@tutorial_snake').then((shown) => {
      if (!shown) setShowTutorial(true);
    });
  }, [difficulty]);

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
            setHighScore('snake', newScore, difficulty);
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

  const panGesture = Gesture.Pan()
    .minDistance(20)
    .onEnd((e) => {
      const { translationX, translationY } = e;
      const absX = Math.abs(translationX);
      const absY = Math.abs(translationY);

      if (absX > absY) {
        if (translationX > 0) {
          changeDirection('RIGHT');
        } else {
          changeDirection('LEFT');
        }
      } else {
        if (translationY > 0) {
          changeDirection('DOWN');
        } else {
          changeDirection('UP');
        }
      }
    });

  const snakeSet = new Set(snake.map((p) => `${p.x},${p.y}`));
  const headKey = `${snake[0].x},${snake[0].y}`;
  const foodKey = `${food.x},${food.y}`;

  return (
    <View style={styles.container}>
      <Text style={styles.bgIcon}>🐍</Text>
      <Header
        title="Snake"
        score={score}
        highScore={highScore}
        onPause={() => setPaused(!paused)}
        isPaused={paused}
      />

      <View style={styles.boardContainer}>
        <GestureDetector gesture={panGesture}>
          <View>
            <GameBoardContainer>
              <View style={[styles.board, { width: ACTUAL_BOARD, height: ACTUAL_BOARD }]}>
                {/* Checkered Background */}
                <View style={StyleSheet.absoluteFill}>
                  {Array.from({ length: SNAKE_GRID_SIZE }, (_, y) => (
                    <View key={y} style={styles.row}>
                      {Array.from({ length: SNAKE_GRID_SIZE }, (_, x) => (
                        <View
                          key={`${x},${y}`}
                          style={[
                            styles.cell,
                            {
                              width: CELL_SIZE,
                              height: CELL_SIZE,
                              backgroundColor: (x + y) % 2 === 0 ? colors.background : colors.surface,
                              opacity: 0.5,
                            },
                          ]}
                        />
                      ))}
                    </View>
                  ))}
                </View>

                {/* Game Elements */}
                {snake.map((p, i) => {
                  const isHead = i === 0;
                  const rotation = dirRef.current === 'UP' ? '0deg' :
                    dirRef.current === 'DOWN' ? '180deg' :
                      dirRef.current === 'LEFT' ? '270deg' : '90deg';

                  return (
                    <View
                      key={`${p.x},${p.y}-${i}`}
                      style={[
                        styles.element,
                        {
                          width: CELL_SIZE,
                          height: CELL_SIZE,
                          left: p.x * CELL_SIZE,
                          top: p.y * CELL_SIZE,
                        },
                      ]}
                    >
                      <View style={[
                        isHead ? styles.headCell : styles.snakeCell,
                        { width: CELL_SIZE - 2, height: CELL_SIZE - 2, borderRadius: isHead ? 6 : 4 }
                      ]}>
                        {isHead && (
                          <View style={[styles.eyesContainer, { transform: [{ rotate: rotation }] }]}>
                            <View style={styles.eye} />
                            <View style={styles.eye} />
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}

                <Animated.View
                  style={[
                    styles.element,
                    {
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      left: food.x * CELL_SIZE,
                      top: food.y * CELL_SIZE,
                      transform: [{ scale: foodScale }],
                    },
                  ]}
                >
                  <View style={styles.foodCell}>
                    <View style={styles.appleLeaf} />
                  </View>
                </Animated.View>
              </View>
            </GameBoardContainer>
          </View>
        </GestureDetector>
      </View>

      {gameOver && (
        <GameOverOverlay
          result="lose"
          title="AWW, SNAP!"
          subtitle={`You scored ${score} points.`}
          onPlayAgain={resetGame}
        />
      )}

      {paused && !gameOver && (
        <GameOverOverlay
          result="paused"
          title="GAME PAUSED"
          onPlayAgain={() => setPaused(false)}
          onPlayAgainLabel="RESUME"
        />
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
    padding: spacing.md,
    backgroundColor: colors.background,
  },
  boardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  board: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    borderWidth: 0,
  },
  element: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headCell: {
    backgroundColor: '#00b894',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 4,
  },
  eye: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#fff',
  },
  snakeCell: {
    backgroundColor: '#55efc4',
  },
  foodCell: {
    width: '80%',
    height: '80%',
    backgroundColor: '#ff7675',
    borderRadius: radius.full,
    position: 'relative',
  },
  appleLeaf: {
    position: 'absolute',
    top: -2,
    right: 2,
    width: 6,
    height: 4,
    backgroundColor: '#00b894',
    borderRadius: 2,
    transform: [{ rotate: '45deg' }],
  },
  bgIcon: {
    position: 'absolute',
    bottom: '5%',
    right: '-10%',
    fontSize: 200,
    opacity: 0.05,
    transform: [{ rotate: '-15deg' }],
    color: colors.primary,
  },
});
