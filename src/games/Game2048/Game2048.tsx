import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View, Animated } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Header from '../../components/Header';
import TutorialScreen from '../../components/TutorialScreen';
import GameBoardContainer from '../../components/GameBoardContainer';
import GameOverOverlay from '../../components/GameOverOverlay';
import { useTheme } from '../../contexts/ThemeContext';
import { useSound } from '../../contexts/SoundContext';
import { getHighScore, setHighScore } from '../../utils/storage';
import { recordGameResult } from '../../utils/stats';
import { spacing, radius, shadows, typography } from '../../utils/designTokens';
import { Difficulty } from '../../types';
import { Board2048, addRandomTile, hasWon, initBoard, isGameOver, swipe } from './logic';
import { ThemeColors } from '../../utils/themes';
import { GAME_TUTORIALS } from '../../utils/tutorials';
import PremiumButton from '../../components/PremiumButton';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useInterstitialAd } from '../../lib/useInterstitialAd';
import { useGameArea } from '../../hooks/useGameArea';

const BOARD_PADDING = 8;
const TILE_GAP = 6;

const TILE_COLORS: Record<number, { bg: string; text: string }> = {
  0: { bg: '#3d3d5c', text: 'transparent' },
  2: { bg: '#f0f3ff', text: '#2d3436' },
  4: { bg: '#dff9fb', text: '#2d3436' },
  8: { bg: '#ffeaa7', text: '#2d3436' },
  16: { bg: '#fab1a0', text: '#fff' },
  32: { bg: '#ff7675', text: '#fff' },
  64: { bg: '#fd79a8', text: '#fff' },
  128: { bg: '#a29bfe', text: '#fff' },
  256: { bg: '#55efc4', text: '#2d3436' },
  512: { bg: '#81ecec', text: '#2d3436' },
  1024: { bg: '#74b9ff', text: '#fff' },
  2048: { bg: '#00b894', text: '#fff' },
};

function getTileStyle(value: number) {
  return TILE_COLORS[value] || { bg: '#3c3a32', text: '#f9f6f2' };
}

interface Props {
  difficulty: Difficulty;
}

export default function Game2048({ difficulty }: Props) {
  const { colors } = useTheme();
  const { playSound } = useSound();
  const { areaWidth, areaHeight, onLayout: onGameAreaLayout } = useGameArea();
  const boardSize = Math.min(areaWidth - 32, areaHeight - 32);
  const tileSize = (boardSize - BOARD_PADDING * 2 - TILE_GAP * 5) / 4;
  const styles = useMemo(() => getStyles(colors, boardSize, tileSize), [colors, boardSize, tileSize]);
  const { showAd } = useInterstitialAd();
  const [board, setBoard] = useState<Board2048>(() => initBoard(difficulty));
  const [score, setScore] = useState(0);
  const [highScore, setHigh] = useState(0);
  const [won, setWon] = useState(false);
  const [lost, setLost] = useState(false);
  const [keepPlaying, setKeepPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [history, setHistory] = useState<Array<{ board: Board2048; score: number }>>([]);
  const [showTutorial, setShowTutorial] = useState(false);
  const isFirstGameRef = useRef(true);

  const processingRef = useRef(false);
  const startTimeRef = useRef<number | null>(null);
  const pausedRef = useRef(false);
  pausedRef.current = paused;

  const tileAnimations = useRef<Animated.Value[][]>(
    Array(4).fill(0).map(() => Array(4).fill(0).map(() => new Animated.Value(1)))
  ).current;

  useEffect(() => {
    getHighScore('2048', difficulty).then(setHigh);
  }, [difficulty]);

  useEffect(() => {
    startTimeRef.current = Date.now();
  }, []);

  const handleSwipe = useCallback((direction: 'left' | 'right' | 'up' | 'down') => {
    if (processingRef.current || lost || paused) return;
    if (won && !keepPlaying) return;

    processingRef.current = true;
    setBoard((prev) => {
      const result = swipe(prev, direction);
      if (!result.moved) {
        processingRef.current = false;
        return prev;
      }

      setHistory((h) => [...h.slice(-4), { board: prev, score }]);

      if (result.score > 0) {
        playSound('merge');
      }

      const newBoard = result.board.map((row) => [...row]);
      const newTiles: { r: number, c: number }[] = [];
      addRandomTile(newBoard, difficulty, newTiles);

      newTiles.forEach(({ r, c }) => {
        tileAnimations[r][c].setValue(0);
        Animated.spring(tileAnimations[r][c], {
          toValue: 1,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }).start();
      });

      const newScore = score + result.score;
      setScore(newScore);
      if (newScore > highScore) {
        setHigh(newScore);
        setHighScore('2048', newScore, difficulty);
      }

      if (!won && !keepPlaying && hasWon(newBoard)) {
        setWon(true);
        playSound('win');
      }
      if (isGameOver(newBoard)) {
        setLost(true);
        playSound('lose');
      }

      processingRef.current = false;
      return newBoard;
    });
  }, [lost, won, keepPlaying, score, highScore, difficulty, playSound, tileAnimations, paused]);

  const handleUndo = useCallback(() => {
    if (history.length === 0 || lost || (won && !keepPlaying) || paused) return;

    const lastState = history[history.length - 1];
    setBoard(lastState.board);
    setScore(lastState.score);
    setHistory((h) => h.slice(0, -1));
    playSound('tap');
  }, [history, lost, won, keepPlaying, playSound, paused]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = (e: KeyboardEvent) => {
      if (lost || paused) return;
      const map: Record<string, 'left' | 'right' | 'up' | 'down'> = {
        ArrowLeft: 'left',
        ArrowRight: 'right',
        ArrowUp: 'up',
        ArrowDown: 'down',
      };
      const dir = map[e.key];
      if (dir) {
        e.preventDefault();
        handleSwipe(dir);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSwipe, paused]);

  const panGesture = Gesture.Pan()
    .minDistance(20)
    .onEnd((e) => {
      if (paused) return;
      const { translationX, translationY } = e;
      const absX = Math.abs(translationX);
      const absY = Math.abs(translationY);

      if (absX > absY) {
        handleSwipe(translationX > 0 ? 'right' : 'left');
      } else {
        handleSwipe(translationY > 0 ? 'down' : 'up');
      }
    });

  const resetGame = () => {
    processingRef.current = false;
    tileAnimations.forEach(row => row.forEach(anim => anim.setValue(1)));
    setBoard(initBoard(difficulty));
    setScore(0);
    setWon(false);
    setLost(false);
    setKeepPlaying(false);
    setHistory([]);
    setPaused(false);
    startTimeRef.current = Date.now();
  };

  const handleRestart = () => {
    showAd(isFirstGameRef.current);
    isFirstGameRef.current = false;
    resetGame();
  };

  const handleNewGame = () => {
    showAd(isFirstGameRef.current);
    isFirstGameRef.current = false;
    resetGame();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.bgIcon}>2048</Text>
      <Header
        title="2048"
        score={score}
        highScore={highScore}
        onPause={() => setPaused(!paused)}
        isPaused={paused}
      />

      <GestureDetector gesture={panGesture}>
        <View style={styles.boardContainer} onLayout={onGameAreaLayout}>
          <GameBoardContainer>
            <View style={styles.board}>
              {board.map((row, r) => (
                <View key={r} style={styles.row}>
                  {row.map((value, c) => {
                    const tileStyle = getTileStyle(value);
                    return (
                      <Animated.View
                        key={`${r}-${c}`}
                        style={[
                          styles.tile,
                          { backgroundColor: tileStyle.bg },
                          { transform: [{ scale: tileAnimations[r][c] }] }
                        ]}
                      >
                        {value > 0 && (
                          <Text
                            style={[
                              styles.tileText,
                              { color: tileStyle.text },
                              value >= 100 && styles.smallText,
                              value >= 1000 && styles.extraSmallText,
                            ]}
                          >
                            {value}
                          </Text>
                        )}
                      </Animated.View>
                    );
                  })}
                </View>
              ))}
            </View>
          </GameBoardContainer>
        </View>
      </GestureDetector>

      <View style={styles.actions}>
        <PremiumButton
          variant="secondary"
          height={54}
          onPress={handleUndo}
          disabled={history.length === 0 || paused}
          style={styles.actionBtn}
        >
          <Text style={styles.actionText}>UNDO ({history.length})</Text>
        </PremiumButton>

        <PremiumButton
          variant="secondary"
          height={54}
          onPress={handleRestart}
          disabled={paused}
          style={styles.actionBtn}
        >
          <Text style={styles.actionText}>RESTART</Text>
        </PremiumButton>

        <PremiumButton
          variant="primary"
          height={54}
          onPress={handleNewGame}
          disabled={paused}
          style={styles.actionBtn}
        >
          <Text style={[styles.actionText, { color: colors.textOnPrimary }]}>NEW GAME</Text>
        </PremiumButton>
      </View>

      {won && !keepPlaying && (
        <GameOverOverlay
          result="win"
          title="YOU DID IT!"
          onPlayAgain={resetGame}
          onPlayAgainLabel="PLAY AGAIN"
          onRestart={handleRestart}
          onNewGame={handleNewGame}
          secondaryAction={{ label: 'KEEP GOING', onPress: () => setKeepPlaying(true) }}
        />
      )}

      {lost && (
        <GameOverOverlay
          result="lose"
          title="GAME OVER!"
          subtitle={`Final Score: ${score}`}
          onPlayAgain={resetGame}
          onPlayAgainLabel="TRY AGAIN"
          onRestart={handleRestart}
          onNewGame={handleNewGame}
        />
      )}

      {paused && (
        <GameOverOverlay
          result="paused"
          title="GAME PAUSED"
          onPlayAgain={() => setPaused(false)}
          onPlayAgainLabel="RESUME"
          onRestart={handleRestart}
          onNewGame={handleNewGame}
        />
      )}

      {showTutorial && (
        <TutorialScreen
          gameName="2048"
          steps={GAME_TUTORIALS['2048']}
          gameId="2048"
          onClose={() => {
            setShowTutorial(false);
            AsyncStorage.setItem('@tutorial_2048', 'true');
          }}
        />
      )}
    </View>
  );
}

const getStyles = (colors: ThemeColors, boardSize: number, tileSize: number) => StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.md,
    backgroundColor: colors.background,
  },
  boardContainer: {
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  board: {
    width: boardSize,
    height: boardSize,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: BOARD_PADDING,
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  tile: {
    width: tileSize,
    height: tileSize,
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    margin: TILE_GAP / 2,
  },
  tileText: {
    fontSize: 28,
    fontWeight: '900',
  },
  smallText: {
    fontSize: 20,
  },
  extraSmallText: {
    fontSize: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionBtn: {
    flex: 1,
  },
  actionText: {
    fontWeight: '900',
    fontSize: 14,
    color: colors.text,
    letterSpacing: 0.5,
  },
  bgIcon: {
    position: 'absolute',
    top: '40%',
    left: '-10%',
    fontSize: 120,
    fontWeight: '900',
    color: colors.primary,
    opacity: 0.05,
    transform: [{ rotate: '-15deg' }],
  },
});
