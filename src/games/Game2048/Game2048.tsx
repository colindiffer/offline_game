import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View, Animated } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Header from '../../components/Header';
import TutorialScreen from '../../components/TutorialScreen';
import { useTheme } from '../../contexts/ThemeContext';
import { useSound } from '../../contexts/SoundContext';
import { getHighScore, setHighScore } from '../../utils/storage';
import { recordGameResult } from '../../utils/stats';
import { Difficulty } from '../../types';
import { Board2048, addRandomTile, hasWon, initBoard, isGameOver, swipe } from './logic';
import { ThemeColors } from '../../utils/themes';
import { GAME_TUTORIALS } from '../../utils/tutorials';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SCREEN_WIDTH = Dimensions.get('window').width;
const BOARD_PADDING = 8;
const BOARD_SIZE = Math.min(SCREEN_WIDTH - 40, 380);
const TILE_GAP = 6;
const TILE_SIZE = (BOARD_SIZE - BOARD_PADDING * 2 - TILE_GAP * 5) / 4;

const TILE_COLORS: Record<number, { bg: string; text: string }> = {
  0:    { bg: '#3d3a50', text: 'transparent' },
  2:    { bg: '#eee4da', text: '#776e65' },
  4:    { bg: '#ede0c8', text: '#776e65' },
  8:    { bg: '#f2b179', text: '#f9f6f2' },
  16:   { bg: '#f59563', text: '#f9f6f2' },
  32:   { bg: '#f67c5f', text: '#f9f6f2' },
  64:   { bg: '#f65e3b', text: '#f9f6f2' },
  128:  { bg: '#edcf72', text: '#f9f6f2' },
  256:  { bg: '#edcc61', text: '#f9f6f2' },
  512:  { bg: '#edc850', text: '#f9f6f2' },
  1024: { bg: '#edc53f', text: '#f9f6f2' },
  2048: { bg: '#edc22e', text: '#f9f6f2' },
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
  const styles = useMemo(() => getStyles(colors), [colors]);
  const [board, setBoard] = useState<Board2048>(() => initBoard(difficulty));
  const [score, setScore] = useState(0);
  const [highScore, setHigh] = useState(0);
  const [won, setWon] = useState(false);
  const [lost, setLost] = useState(false);
  const [keepPlaying, setKeepPlaying] = useState(false);
  const [history, setHistory] = useState<Array<{ board: Board2048; score: number }>>([]);
  const [showTutorial, setShowTutorial] = useState(false);

  const processingRef = useRef(false);
  const startTimeRef = useRef<number | null>(null);

  const tileAnimations = useRef<Animated.Value[][]>(
    Array(4).fill(0).map(() => Array(4).fill(0).map(() => new Animated.Value(1)))
  ).current;

  useEffect(() => {
    getHighScore('2048').then(setHigh);
    AsyncStorage.getItem('@tutorial_2048').then((shown) => {
      if (!shown) setShowTutorial(true);
    });
  }, []);

  useEffect(() => {
    startTimeRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (won || lost) {
      const gameDuration = Math.floor((Date.now() - startTimeRef.current!) / 1000);
      let result: 'win' | 'loss';
      if (won) {
        result = 'win';
      } else {
        result = 'loss';
      }
      recordGameResult('2048', result, gameDuration);
    }
  }, [won, lost]);

  const handleSwipe = useCallback((direction: 'left' | 'right' | 'up' | 'down') => {
    if (processingRef.current || lost) return;
    if (won && !keepPlaying) return;

    processingRef.current = true;
    setBoard((prev) => {
      const result = swipe(prev, direction);
      if (!result.moved) {
        processingRef.current = false;
        return prev;
      }

      // Save to history (limit to last 5 moves)
      setHistory((h) => [...h.slice(-4), { board: prev, score }]);

      if (result.score > 0) {
        playSound('merge');
      }

      const newBoard = result.board.map((row) => [...row]);
      const newTiles: { r: number, c: number }[] = [];
      addRandomTile(newBoard, difficulty, newTiles);

      // Animate merged tiles
      // result.mergedTiles.forEach(({ r, c }) => {
      //   Animated.sequence([
      //     Animated.spring(tileAnimations[r][c], { toValue: 1.15, useNativeDriver: true }),
      //     Animated.spring(tileAnimations[r][c], { toValue: 1, useNativeDriver: true }),
      //   ]).start();
      // });

      // Animate new tiles
      newTiles.forEach(({ r, c }) => {
        tileAnimations[r][c].setValue(0); // Reset scale
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
        setHighScore('2048', newScore);
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
  }, [lost, won, keepPlaying, score, highScore, difficulty, playSound, tileAnimations]);

  const handleUndo = useCallback(() => {
    if (history.length === 0 || lost || (won && !keepPlaying)) return;
    
    const lastState = history[history.length - 1];
    setBoard(lastState.board);
    setScore(lastState.score);
    setHistory((h) => h.slice(0, -1));
    playSound('tap');
  }, [history, lost, won, keepPlaying, playSound]);

  // Keyboard support for web
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = (e: KeyboardEvent) => {
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
  }, [handleSwipe]);

  const panGesture = Gesture.Pan()
    .minDistance(20)
    .onEnd((e) => {
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
    tileAnimations.forEach(row => row.forEach(anim => anim.setValue(1))); // Reset tile animations to visible
    setBoard(initBoard(difficulty));
    setScore(0);
    setWon(false);
    setLost(false);
    setKeepPlaying(false);
    setHistory([]);
    startTimeRef.current = Date.now(); // Reset start time
  };

  return (
    <View style={styles.container}>
      <Header title="2048" score={score} highScore={highScore} />

      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.tutorialButton}
          onPress={() => setShowTutorial(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.tutorialIcon}>❓</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.undoButton, history.length === 0 && styles.undoButtonDisabled]}
          onPress={handleUndo}
          disabled={history.length === 0 || lost || (won && !keepPlaying)}
          activeOpacity={0.7}
        >
          <Text style={styles.undoText}>↶ Undo</Text>
          <Text style={styles.undoCount}>({history.length}/5)</Text>
        </TouchableOpacity>
      </View>

      <GestureDetector gesture={panGesture}>
        <View style={styles.boardContainer}>
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
                            value >= 1000 && styles.smallText,
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
        </View>
      </GestureDetector>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.newGameBtn} onPress={resetGame} activeOpacity={0.7}>
          <Text style={styles.newGameText}>New Game</Text>
        </TouchableOpacity>
      </View>

      {won && !keepPlaying && (
        <View style={styles.overlay}>
          <Text style={styles.winText}>You Win!</Text>
          <View style={styles.overlayButtons}>
            <TouchableOpacity
              style={styles.playAgain}
              onPress={() => setKeepPlaying(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.playAgainText}>Keep Going</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.playAgain} onPress={resetGame} activeOpacity={0.7}>
              <Text style={styles.playAgainText}>New Game</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {lost && (
        <View style={styles.overlay}>
          <Text style={styles.loseText}>Game Over!</Text>
          <Text style={styles.finalScore}>Score: {score}</Text>
          <TouchableOpacity style={styles.playAgain} onPress={resetGame} activeOpacity={0.7}>
            <Text style={styles.playAgainText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {showTutorial && (
        <TutorialScreen
          gameName="2048"
          steps={GAME_TUTORIALS['2048']}
          onClose={() => {
            setShowTutorial(false);
            AsyncStorage.setItem('@tutorial_2048', 'true');
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
  boardContainer: {
    alignItems: 'center',
    marginTop: 12,
  },
  board: {
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    backgroundColor: '#2d2a3e',
    borderRadius: 8,
    padding: BOARD_PADDING,
    justifyContent: 'space-evenly',
  },
  controls: {
    alignItems: 'center',
    marginVertical: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 15,
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
  tutorialIcon: {
    fontSize: 24,
  },
  undoButton: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  undoButtonDisabled: {
    opacity: 0.5,
  },
  undoText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  undoCount: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    margin: TILE_GAP / 2,
  },
  tileText: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  smallText: {
    fontSize: 20,
  },
  buttonRow: {
    alignItems: 'center',
    marginTop: 20,
  },
  newGameBtn: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  newGameText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
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
  winText: {
    color: colors.warning,
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  loseText: {
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
  overlayButtons: {
    flexDirection: 'row',
    gap: 12,
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
