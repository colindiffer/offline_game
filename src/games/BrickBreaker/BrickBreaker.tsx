import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { StyleSheet, Text, View, Dimensions, Platform } from 'react-native';
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

  const [gameState, setGameState] = useState<BrickBreakerState>(() => initializeBrickBreaker(difficulty, BOARD_WIDTH, BOARD_HEIGHT));
  const [score, setScore] = useState(0);
  const [highScore, setHighScoreState] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const stateRef = useRef(gameState);
  stateRef.current = gameState;
  const scoreRef = useRef(score);
  scoreRef.current = score;
  const requestRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    getHighScore('brick-breaker').then(setHighScoreState);
  }, []);

  const update = useCallback(() => {
    if (!isPlaying || stateRef.current.gameOver || stateRef.current.gameWon) return;

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
      nextY >= BOARD_HEIGHT - PADDLE_HEIGHT - BALL_SIZE &&
      nextY <= BOARD_HEIGHT - BALL_SIZE &&
      nextX + BALL_SIZE >= paddleX &&
      nextX <= paddleX + PADDLE_WIDTH
    ) {
      ballVel.y *= -1;
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
      setGameState(prev => ({ ...prev, gameOver: true }));
      playSound('lose');
      const finalTime = Math.floor((Date.now() - startTimeRef.current!) / 1000);
      recordGameResult('brick-breaker', 'loss', finalTime);
      return;
    }

    // Win
    if (newBricks.every(b => !b.active)) {
      setGameState(prev => ({ ...prev, gameWon: true }));
      playSound('win');
      const finalTime = Math.floor((Date.now() - startTimeRef.current!) / 1000);
      recordGameResult('brick-breaker', 'win', finalTime);
      if (newScore > highScore) {
        setHighScoreState(newScore);
        setHighScore('brick-breaker', newScore);
      }
      return;
    }

    setGameState({
      ...stateRef.current,
      ball: { x: nextX, y: nextY },
      ballVel,
      bricks: newBricks,
    });
    setScore(newScore);

    requestRef.current = requestAnimationFrame(update);
  }, [isPlaying, playSound, highScore]);

  useEffect(() => {
    if (isPlaying) {
      startTimeRef.current = Date.now();
      requestRef.current = requestAnimationFrame(update);
    }
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [isPlaying, update]);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      const newX = Math.max(0, Math.min(BOARD_WIDTH - PADDLE_WIDTH, e.x - PADDLE_WIDTH / 2));
      setGameState(prev => ({ ...prev, paddleX: newX }));
    });

  const resetGame = useCallback(() => {
    setGameState(initializeBrickBreaker(difficulty, BOARD_WIDTH, BOARD_HEIGHT));
    setScore(0);
    setIsPlaying(false);
    startTimeRef.current = null;
  }, [difficulty]);

  return (
    <View style={styles.container}>
      <Header score={score} highScore={highScore} />
      
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
          <Text style={styles.footerText}>RESET</Text>
        </PremiumButton>
      </View>

      {(gameState.gameOver || gameState.gameWon) && (
        <GameOverOverlay 
          result={gameState.gameWon ? 'win' : 'lose'} 
          title={gameState.gameWon ? 'VICTORY!' : 'GAME OVER'} 
          subtitle={`Score: ${score}`} 
          onPlayAgain={resetGame} 
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
  gameArea: { flex: 1, padding: spacing.md, justifyContent: 'center', alignItems: 'center' },
  boardWrapper: { padding: 0, backgroundColor: '#1a1a2e', borderRadius: radius.sm, borderWidth: 4, borderColor: '#2b2b45', overflow: 'hidden' },
  board: { width: BOARD_WIDTH, height: BOARD_HEIGHT, position: 'relative' },
  brick: { position: 'absolute', borderRadius: 2, ...shadows.sm },
  ball: { position: 'absolute', width: BALL_SIZE, height: BALL_SIZE, borderRadius: BALL_SIZE / 2, backgroundColor: '#fff', ...shadows.md },
  paddle: { position: 'absolute', bottom: 10, width: PADDLE_WIDTH, height: PADDLE_HEIGHT, borderRadius: radius.full, overflow: 'hidden', ...shadows.lg },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  overlayText: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: 2 },
  footer: { padding: spacing.xl },
  footerText: { color: colors.text, fontWeight: 'bold' },
});
