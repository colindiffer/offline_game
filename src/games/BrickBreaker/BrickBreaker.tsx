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
import { initializeBrickBreaker, BrickBreakerState, Point, PowerUp, PowerUpType } from './logic';

const SCREEN_WIDTH = Dimensions.get('window').width;
const BOARD_WIDTH = SCREEN_WIDTH - 32;
const BOARD_HEIGHT = 450;
let PADDLE_WIDTH_INITIAL = 100;
let PADDLE_WIDTH_ACTIVE = PADDLE_WIDTH_INITIAL;
const PADDLE_HEIGHT = 12;
let BALL_SIZE_INITIAL = 12;
let BALL_SIZE_ACTIVE = BALL_SIZE_INITIAL;
const POWER_UP_SIZE = 20;

export default function BrickBreaker({ difficulty }: Props) {
  const { colors } = useTheme();
  const { playSound } = useSound();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [level, setLevelState] = useState(1);
  const [gameState, setGameState] = useState<BrickBreakerState | null>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScoreState] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false); // Game starts paused
  const [isReady, setIsReady] = useState(false);
  const [paused, setPaused] = useState(false); // Explicit pause state
  const [lives, setLives] = useState(3);
  const [activePowerUps, setActivePowerUps] = useState<{ type: PowerUpType, duration: number }[]>([]);

  const stateRef = useRef<BrickBreakerState | null>(null);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const requestRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const paddleWidthRef = useRef(PADDLE_WIDTH_INITIAL);
  const ballSizeRef = useRef(BALL_SIZE_INITIAL);

  const initializeGame = useCallback(async (currentLevel: number) => {
    const savedLevel = await getLevel('brick-breaker', difficulty);
    const best = await getHighScore('brick-breaker', difficulty);
    setLevelState(currentLevel);
    setHighScoreState(best);
    const initialState = initializeBrickBreaker(difficulty, BOARD_WIDTH, BOARD_HEIGHT, currentLevel);
    setGameState(initialState);
    stateRef.current = initialState;
    setScore(0);
    scoreRef.current = 0;
    setLives(3);
    livesRef.current = 3;
    setIsPlaying(false);
    setPaused(false);
    startTimeRef.current = null;
    setIsReady(true);
    setActivePowerUps([]);
    paddleWidthRef.current = PADDLE_WIDTH_INITIAL;
    ballSizeRef.current = BALL_SIZE_INITIAL;
  }, [difficulty]);

  useEffect(() => {
    initializeGame(level); // Initialize with current level on mount
  }, [initializeGame, level]);

  const applyPowerUp = useCallback((type: PowerUpType) => {
    switch (type) {
      case 'extraLife':
        setLives(prev => prev + 1);
        livesRef.current++;
        break;
      case 'paddleGrow':
        paddleWidthRef.current = PADDLE_WIDTH_INITIAL * 1.5;
        setActivePowerUps(prev => [...prev, { type, duration: 5000 }]); // 5 seconds
        break;
      case 'multiBall':
        // TODO: Implement multi-ball logic
        break;
      case 'slowBall':
        ballSizeRef.current = BALL_SIZE_INITIAL * 1.5; // Visual cue for slow ball, and logic will use this
        setActivePowerUps(prev => [...prev, { type, duration: 5000 }]); // 5 seconds
        break;
    }
    playSound('win'); // Generic power-up sound
  }, [playSound]);

  const update = useCallback(() => {
    if (!isPlaying || paused || !stateRef.current || stateRef.current.gameOver || stateRef.current.gameWon) return;

    let { ball, ballVel, paddleX, bricks, powerUps } = stateRef.current;
    let currentLives = livesRef.current;
    let currentScore = scoreRef.current;

    // --- Update Power-ups ---
    const newPowerUps: PowerUp[] = [];
    powerUps.forEach(p => {
      if (!p.active) return;
      let newY = p.y + 2; // Power-up fall speed
      // Check collision with paddle
      if (
        newY + POWER_UP_SIZE >= BOARD_HEIGHT - PADDLE_HEIGHT &&
        newY <= BOARD_HEIGHT - PADDLE_HEIGHT + POWER_UP_SIZE &&
        p.x + POWER_UP_SIZE >= paddleX &&
        p.x <= paddleX + paddleWidthRef.current
      ) {
        applyPowerUp(p.type);
        // Don't add to newPowerUps, it's collected
      } else if (newY < BOARD_HEIGHT) { // Still on screen
        newPowerUps.push({ ...p, y: newY });
      }
    });

    // --- Update Active Power-up Durations ---
    const updatedActivePowerUps = activePowerUps.filter(p => {
      p.duration -= 16; // Assuming ~60fps (1000ms / 60 frames = 16.6ms per frame)
      if (p.duration <= 0) {
        // Remove power-up effect
        if (p.type === 'paddleGrow') {
          paddleWidthRef.current = PADDLE_WIDTH_INITIAL;
        } else if (p.type === 'slowBall') {
          ballSizeRef.current = BALL_SIZE_INITIAL;
        }
        return false;
      }
      return true;
    });
    setActivePowerUps(updatedActivePowerUps);

    // --- Update Ball Movement ---
    let nextX = ball.x + ballVel.x;
    let nextY = ball.y + ballVel.y;

    // Wall collisions
    if (nextX <= 0 || nextX >= BOARD_WIDTH - ballSizeRef.current) {
      ballVel.x *= -1;
      playSound('tap');
    }
    if (nextY <= 0) {
      ballVel.y *= -1;
      playSound('tap');
    }

    // Paddle collision
    if (
      nextY >= BOARD_HEIGHT - PADDLE_HEIGHT - ballSizeRef.current &&
      nextY <= BOARD_HEIGHT - ballSizeRef.current &&
      nextX + ballSizeRef.current >= paddleX &&
      nextX <= paddleX + paddleWidthRef.current
    ) {
      ballVel.y = -Math.abs(ballVel.y); // Ensure it goes up
      // Add angle based on hit location
      const hitPos = (nextX + ballSizeRef.current / 2 - (paddleX + paddleWidthRef.current / 2)) / (paddleWidthRef.current / 2);
      ballVel.x = hitPos * 8;
      playSound('tap');
    }

    // Brick collisions
    let hitBrick = false;
    const updatedBricks = bricks.map(b => {
      if (!b.active || hitBrick) return b;
      if (
        nextX + ballSizeRef.current >= b.x &&
        nextX <= b.x + b.width &&
        nextY + ballSizeRef.current >= b.y &&
        nextY <= b.y + b.height
      ) {
        b.active = false;
        ballVel.y *= -1;
        currentScore += 10;
        hitBrick = true;
        playSound('drop');
        if (b.type === 'powerUp' && b.powerUp) {
          powerUps.push({ x: b.x + b.width / 2, y: b.y + b.height / 2, type: b.powerUp, active: true });
        }
      }
      return b;
    });

    // Lose a life
    if (nextY >= BOARD_HEIGHT) {
      currentLives--;
      if (currentLives <= 0) {
        setGameState(prev => prev ? ({ ...prev, gameOver: true }) : null);
        playSound('lose');
        const finalTime = Math.floor((Date.now() - startTimeRef.current!) / 1000);
        recordGameResult('brick-breaker', 'loss', finalTime);
        return;
      } else {
        // Reset ball and paddle, but keep lives
        ball.x = BOARD_WIDTH / 2;
        ball.y = BOARD_HEIGHT - 100;
        ballVel.x = (stateRef.current?.ballVel.x || 6) * (Math.random() > 0.5 ? 1 : -1);
        ballVel.y = -(stateRef.current?.ballVel.y || 6);
        paddleX = BOARD_WIDTH / 2 - paddleWidthRef.current / 2;
        setIsPlaying(false); // Pause game to let user restart ball
      }
    }
    setLives(currentLives);
    livesRef.current = currentLives;

    // Win
    if (updatedBricks.every(b => !b.active)) {
      setGameState(prev => prev ? ({ ...prev, gameWon: true }) : null);
      playSound('win');
      const finalTime = Math.floor((Date.now() - startTimeRef.current!) / 1000);
      recordGameResult('brick-breaker', 'win', finalTime);
      
      const nextLvl = level + 1;
      setLevel('brick-breaker', difficulty, nextLvl);
      
      if (currentScore > highScore) {
        setHighScoreState(currentScore);
        setHighScore('brick-breaker', currentScore, difficulty);
      }
      return;
    }

    const newState = {
      ...stateRef.current,
      ball: { x: nextX, y: nextY },
      ballVel,
      bricks: updatedBricks,
      powerUps: newPowerUps,
      paddleX,
    };
    stateRef.current = newState;
    setGameState(newState);
    setScore(currentScore);
    scoreRef.current = currentScore;

    requestRef.current = requestAnimationFrame(update);
  }, [isPlaying, paused, playSound, highScore, level, difficulty, activePowerUps, applyPowerUp]);

  useEffect(() => {
    if (isPlaying) {
      startTimeRef.current = Date.now();
      requestRef.current = requestAnimationFrame(update);
    }
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [isPlaying, update, paused]);

  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .onUpdate((e) => {
      if (!stateRef.current) return;
      const newX = Math.max(0, Math.min(BOARD_WIDTH - paddleWidthRef.current, e.x - paddleWidthRef.current / 2));
      const newState = { ...stateRef.current, paddleX: newX };
      stateRef.current = newState;
      setGameState(newState);
    });

  const handlePlay = () => {
    if (!isPlaying) {
      setIsPlaying(true);
      startTimeRef.current = Date.now();
      playSound('tap');
    }
  };

  const handleRestart = useCallback(() => {
    initializeGame(level);
    setIsPlaying(false);
    setPaused(false);
  }, [initializeGame, level]);

  const handleNewGame = useCallback(() => {
    initializeGame(1); // Start from level 1 for a new game
    setLevelState(1);
    setIsPlaying(false);
    setPaused(false);
  }, [initializeGame]);

  const nextLevel = useCallback(async () => {
    const nextLvl = level + 1;
    await setLevel('brick-breaker', difficulty, nextLvl);
    setLevelState(nextLvl);
    const initialState = initializeBrickBreaker(difficulty, BOARD_WIDTH, BOARD_HEIGHT, nextLvl);
    setGameState(initialState);
    stateRef.current = initialState;
    setScore(0);
    scoreRef.current = 0;
    setIsPlaying(false); // New level starts paused, wait for tap
    startTimeRef.current = null;
    setPaused(false);
  }, [difficulty, level]);

  if (!isReady || !gameState) return <View style={styles.container} />;

  return (
    <View style={styles.container}>
      <Text style={styles.bgIcon}>➖</Text>
      <Header
        title="Brick Breaker"
        score={score}
        highScore={highScore}
        onPause={() => setPaused(!paused)}
        isPaused={paused}
      />
      
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
                
                <View style={[styles.ball, { left: gameState.ball.x, top: gameState.ball.y, width: ballSizeRef.current, height: ballSizeRef.current, borderRadius: ballSizeRef.current / 2 }]} />
                
                <View style={[styles.paddle, { left: gameState.paddleX, width: paddleWidthRef.current }]}>
                  <LinearGradient colors={['#74b9ff', '#0984e3']} style={StyleSheet.absoluteFill} />
                </View>

                {gameState.powerUps.map((p, i) => p.active && (
                  <View 
                    key={`powerup-${i}`} 
                    style={[styles.powerUp, { left: p.x, top: p.y, backgroundColor: getPowerUpColor(p.type) }]} 
                  >
                    <Text style={styles.powerUpText}>{getPowerUpIcon(p.type)}</Text>
                  </View>
                ))}


                {(!isPlaying && !gameState.gameOver && !gameState.gameWon) && (
                  <TouchableOpacity style={styles.overlay} onPress={handlePlay} activeOpacity={0.7}>
                    <Text style={styles.overlayText}>TAP TO PLAY</Text>
                  </TouchableOpacity>
                )}
              </View>
            </GameBoardContainer>
          </View>
        </GestureDetector>
      </View>

      <View style={styles.heartsContainer}>
        {Array.from({ length: lives }).map((_, i) => (
          <Text key={i} style={styles.heartIcon}>❤️</Text>
        ))}
      </View>

      <View style={styles.footer}>
        <PremiumButton variant="secondary" height={50} onPress={handleRestart} disabled={paused}>
          <Text style={styles.footerBtnText}>RESTART</Text>
        </PremiumButton>
        <PremiumButton variant="secondary" height={50} onPress={handleNewGame} disabled={paused}>
          <Text style={styles.footerBtnText}>NEW GAME</Text>
        </PremiumButton>
      </View>

      {(gameState.gameOver || gameState.gameWon || paused) && (
        <GameOverOverlay
          result={gameState.gameWon ? 'win' : (gameState.gameOver ? 'lose' : 'paused')}
          title={gameState.gameWon ? 'LEVEL COMPLETE!' : (gameState.gameOver ? 'GAME OVER' : 'GAME PAUSED')}
          subtitle={gameState.gameWon ? `Score: ${score}` : (gameState.gameOver ? `Final Score: ${score}` : '')}
          onPlayAgain={paused ? handlePlay : (gameState.gameWon ? nextLevel : handleRestart)}
          onPlayAgainLabel={paused ? "RESUME" : (gameState.gameWon ? "NEXT LEVEL" : "TRY AGAIN")}
          onRestart={handleRestart}
          onNewGame={handleNewGame}
        />
      )}
    </View>
  );
}

interface Props {
  difficulty: Difficulty;
}

const getPowerUpColor = (type: PowerUpType) => {
  switch (type) {
    case 'extraLife': return '#d63031';
    case 'paddleGrow': return '#0984e3';
    case 'multiBall': return '#00b894';
    case 'slowBall': return '#fab1a0';
    default: return 'gray';
  }
};

const getPowerUpIcon = (type: PowerUpType) => {
  switch (type) {
    case 'extraLife': return '❤️';
    case 'paddleGrow': return '↔️';
    case 'multiBall': return '⚽';
    case 'slowBall': return '🐢';
    default: return '✨';
  }
};

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  levelHeader: { alignItems: 'center', marginTop: spacing.md },
  levelText: { color: colors.text, fontSize: 24, fontWeight: '900' },
  gameArea: { flex: 1, padding: spacing.md, justifyContent: 'center', alignItems: 'center' },
  boardWrapper: { padding: 0, backgroundColor: colors.card, borderRadius: radius.sm, borderWidth: 4, borderColor: colors.border, overflow: 'hidden' },
  board: { width: BOARD_WIDTH, height: BOARD_HEIGHT, position: 'relative' },
  brick: { position: 'absolute', borderRadius: 2, ...shadows.sm },
  ball: { position: 'absolute', backgroundColor: colors.text, ...shadows.md }, // Size is set inline
  paddle: { position: 'absolute', bottom: 10, height: PADDLE_HEIGHT, borderRadius: radius.full, overflow: 'hidden', ...shadows.lg }, // Width is set inline
  powerUp: {
    position: 'absolute',
    width: POWER_UP_SIZE,
    height: POWER_UP_SIZE,
    borderRadius: POWER_UP_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  powerUpText: {
    fontSize: POWER_UP_SIZE * 0.7,
    fontWeight: 'bold',
    color: '#fff',
  },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlayBackground, justifyContent: 'center', alignItems: 'center' },
  overlayText: { color: colors.text, fontSize: 24, fontWeight: '900', letterSpacing: 2 },
  heartsContainer: { flexDirection: 'row', justifyContent: 'center', paddingVertical: spacing.sm },
  heartIcon: { fontSize: 20, marginHorizontal: 2 },
  footer: { padding: spacing.xl, flexDirection: 'row', justifyContent: 'space-around' },
  footerBtnText: { color: colors.text, fontWeight: 'bold' },
  bgIcon: {
    position: 'absolute',
    bottom: '5%',
    left: '-10%',
    fontSize: 250,
    opacity: 0.03,
    transform: [{ rotate: '-15deg' }],
  },
});
