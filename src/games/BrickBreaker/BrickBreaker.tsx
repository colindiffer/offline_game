import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { StyleSheet, Text, View, Dimensions, Platform, TouchableOpacity } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import Header from '../../components/Header';
import GameOverOverlay from '../../components/GameOverOverlay';
import GameBoardContainer from '../../components/GameBoardContainer';
import PremiumButton from '../../components/PremiumButton';
import { useTheme } from '../../contexts/ThemeContext';
import { useSound } from '../../contexts/SoundContext';
import { getHighScore, setHighScore, getLevel, setLevel } from '../../utils/storage';
import { recordGameResult } from '../../utils/stats';
import { Difficulty } from '../../types';
import { ThemeColors } from '../../utils/themes';
import { spacing, radius, shadows, typography } from '../../utils/designTokens';
import { initializeBrickBreaker, BrickBreakerState, Point, Brick } from './logic';

const SCREEN_WIDTH = Dimensions.get('window').width;
const BOARD_WIDTH = SCREEN_WIDTH - 32;
const BOARD_HEIGHT = 450;
const PADDLE_WIDTH = 100;
const PADDLE_HEIGHT = 12;
const BALL_SIZE = 12;

export default function BrickBreaker({ difficulty }: Props) {
  const { colors } = useTheme();
  const { playSound } = useSound();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [level, setLevelState] = useState(1);
  const [gameState, setGameState] = useState<BrickBreakerState | null>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScoreState] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const stateRef = useRef<BrickBreakerState | null>(null);
  const scoreRef = useRef(0);
  const requestRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const init = async () => {
      const savedLevel = await getLevel('brick-breaker', difficulty);
      const best = await getHighScore('brick-breaker', difficulty);
      setLevelState(savedLevel);
      setHighScoreState(best);
      const initialState = initializeBrickBreaker(difficulty, BOARD_WIDTH, BOARD_HEIGHT, savedLevel);
      setGameState(initialState);
      stateRef.current = initialState;
      setIsReady(true);
    };
    init();
  }, [difficulty]);

  const update = useCallback(() => {
    if (!isPlaying || !stateRef.current || stateRef.current.gameOver || stateRef.current.gameWon) return;

    let { ball, ballVel, paddleX, bricks } = stateRef.current;
    let newScore = scoreRef.current;

    // Move ball
    let nextX = ball.x + ballVel.x;
    let nextY = ball.y + ballVel.y;

    // Wall collisions
    if (nextX <= 0 || nextX >= BOARD_WIDTH - BALL_SIZE) {
      ballVel.x *= -1;
      playSound('tap');
    }
    if (nextY <= 0) {
      ballVel.y *= -1;
      playSound('tap');
    }

    // Paddle collision
    if (
      nextY >= BOARD_HEIGHT - PADDLE_HEIGHT - BALL_SIZE - 10 &&
      nextY <= BOARD_HEIGHT - BALL_SIZE &&
      nextX + BALL_SIZE >= paddleX &&
      nextX <= paddleX + PADDLE_WIDTH
    ) {
      ballVel.y = -Math.abs(ballVel.y); // Ensure it goes up
      // Add angle based on hit location
      const hitPos = (nextX + BALL_SIZE / 2 - (paddleX + PADDLE_WIDTH / 2)) / (PADDLE_WIDTH / 2);
      ballVel.x = hitPos * 8;
      playSound('tap');
    }

    // Brick collisions
    let hitBrick = false;
    const newBricks = bricks.map(b => {
      if (!b.active || hitBrick) return b;
      if (
        nextX + BALL_SIZE >= b.x &&
        nextX <= b.x + b.width &&
        nextY + BALL_SIZE >= b.y &&
        nextY <= b.y + b.height
      ) {
        b.active = false;
        ballVel.y *= -1;
        newScore += 10;
        hitBrick = true;
        playSound('drop');
      }
      return b;
    });

    // Lose
    if (nextY >= BOARD_HEIGHT) {
      setGameState(prev => prev ? ({ ...prev, gameOver: true }) : null);
      playSound('lose');
      const finalTime = Math.floor((Date.now() - startTimeRef.current!) / 1000);
      recordGameResult('brick-breaker', 'loss', finalTime);
      return;
    }

    // Win
    if (newBricks.every(b => !b.active)) {
      setGameState(prev => prev ? ({ ...prev, gameWon: true }) : null);
      playSound('win');
      const finalTime = Math.floor((Date.now() - startTimeRef.current!) / 1000);
      recordGameResult('brick-breaker', 'win', finalTime);
      
      const nextLvl = level + 1;
      setLevel('brick-breaker', difficulty, nextLvl);
      
      if (newScore > highScore) {
        setHighScoreState(newScore);
        setHighScore('brick-breaker', newScore, difficulty);
      }
      return;
    }

    const newState = {
      ...stateRef.current,
      ball: { x: nextX, y: nextY },
      ballVel,
      bricks: newBricks,
    };
    stateRef.current = newState;
    setGameState(newState);
    setScore(newScore);
    scoreRef.current = newScore;

    requestRef.current = requestAnimationFrame(update);
  }, [isPlaying, playSound, highScore, level, difficulty]);

  useEffect(() => {
    if (isPlaying) {
      startTimeRef.current = Date.now();
      requestRef.current = requestAnimationFrame(update);
    }
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [isPlaying, update]);

  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .onUpdate((e) => {
      if (!stateRef.current) return;
      const newX = Math.max(0, Math.min(BOARD_WIDTH - PADDLE_WIDTH, e.x - PADDLE_WIDTH / 2));
      const newState = { ...stateRef.current, paddleX: newX };
      stateRef.current = newState;
      setGameState(newState);
    });

  const nextLevel = useCallback(async () => {
    const savedLevel = await getLevel('brick-breaker', difficulty);
    setLevelState(savedLevel);
    const newState = initializeBrickBreaker(difficulty, BOARD_WIDTH, BOARD_HEIGHT, savedLevel);
    setGameState(newState);
    stateRef.current = newState;
    setScore(0);
    scoreRef.current = 0;
    setIsPlaying(false);
    startTimeRef.current = null;
  }, [difficulty]);

  const resetGame = useCallback(() => {
    const newState = initializeBrickBreaker(difficulty, BOARD_WIDTH, BOARD_HEIGHT, level);
    setGameState(newState);
    stateRef.current = newState;
    setScore(0);
    scoreRef.current = 0;
    setIsPlaying(false);
    startTimeRef.current = null;
  }, [difficulty, level]);

  if (!isReady || !gameState) return <View style={styles.container} />;

  return (
    <View style={styles.container}>
      <Text style={styles.bgIcon}>🎾</Text>
      <Header title="Brick Breaker" score={score} highScore={highScore} />
      
      <View style={styles.levelHeader}>
        <Text style={styles.levelText}>Level {level}</Text>
      </View>

      <View style={styles.gameArea}>
        <GestureDetector gesture={panGesture}>
          <View>
            <GameBoardContainer style={styles.boardWrapper}>
              <View style={styles.board}>
                {gameState.bricks.map((b, i) => b.active && (
                  <View 
                    key={i} 
                    style={[styles.brick, { left: b.x, top: b.y, width: b.width, height: b.height, backgroundColor: b.color }]} 
                  />
                ))}
                
                <View style={[styles.ball, { left: gameState.ball.x, top: gameState.ball.y }]} />
                
                <View style={[styles.paddle, { left: gameState.paddleX }]}>
                  <LinearGradient colors={['#74b9ff', '#0984e3']} style={StyleSheet.absoluteFill} />
                </View>

                {!isPlaying && !gameState.gameOver && !gameState.gameWon && (
                  <TouchableOpacity style={styles.overlay} onPress={() => setIsPlaying(true)}>
                    <Text style={styles.overlayText}>TAP TO START</Text>
                  </TouchableOpacity>
                )}
              </View>
            </GameBoardContainer>
          </View>
        </GestureDetector>
      </View>

      <View style={styles.footer}>
        <PremiumButton variant="secondary" height={50} onPress={resetGame}>
          <Text style={styles.footerText}>RESET LEVEL</Text>
        </PremiumButton>
      </View>

      {(gameState.gameOver || gameState.gameWon) && (
        <GameOverOverlay 
          result={gameState.gameWon ? 'win' : 'lose'} 
          title={gameState.gameWon ? 'LEVEL COMPLETE!' : 'GAME OVER'} 
          subtitle={`Score: ${score}`} 
          onPlayAgain={gameState.gameWon ? nextLevel : resetGame}
          onPlayAgainLabel={gameState.gameWon ? "NEXT LEVEL" : "TRY AGAIN"}
        />
      )}
    </View>
  );
}

interface Props {
  difficulty: Difficulty;
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  levelHeader: { alignItems: 'center', marginTop: spacing.md },
  levelText: { color: colors.text, fontSize: 24, fontWeight: '900' },
  gameArea: { flex: 1, padding: spacing.md, justifyContent: 'center', alignItems: 'center' },
  boardWrapper: { padding: 0, backgroundColor: colors.card, borderRadius: radius.sm, borderWidth: 4, borderColor: colors.border, overflow: 'hidden' },
  board: { width: BOARD_WIDTH, height: BOARD_HEIGHT, position: 'relative' },
  brick: { position: 'absolute', borderRadius: 2, ...shadows.sm },
  ball: { position: 'absolute', width: BALL_SIZE, height: BALL_SIZE, borderRadius: BALL_SIZE / 2, backgroundColor: colors.text, ...shadows.md },
  paddle: { position: 'absolute', bottom: 10, width: PADDLE_WIDTH, height: PADDLE_HEIGHT, borderRadius: radius.full, overflow: 'hidden', ...shadows.lg },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlayBackground, justifyContent: 'center', alignItems: 'center' },
  overlayText: { color: colors.text, fontSize: 24, fontWeight: '900', letterSpacing: 2 },
  footer: { padding: spacing.xl },
  footerText: { color: colors.text, fontWeight: 'bold' },
  bgIcon: {
    position: 'absolute',
    bottom: '5%',
    left: '-10%',
    fontSize: 250,
    opacity: 0.03,
    transform: [{ rotate: '-15deg' }],
  },
});
