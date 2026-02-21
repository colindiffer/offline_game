import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Platform, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Header from '../../components/Header';
import GameOverOverlay from '../../components/GameOverOverlay';
import { useTheme } from '../../contexts/ThemeContext';
import { useSound } from '../../contexts/SoundContext';
import { getLevel, setLevel } from '../../utils/storage';
import { recordGameResult } from '../../utils/stats';
import { Difficulty } from '../../types';
import { ThemeColors } from '../../utils/themes';
import { spacing, radius, shadows } from '../../utils/designTokens';
import { initializeWordGuess, checkGuess, WordGuessState, LetterStatus } from './logic';
import { useInterstitialAd } from '../../lib/useInterstitialAd';

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫']
];

// Fixed keyboard metrics
const KEY_H = 44;
const KEY_GAP = 6;
const ROW_GAP = 8;
// Keyboard total height (3 rows + 2 row-gaps + bottom padding)
const KB_PADDING_BOTTOM = 56;
const KB_H = 3 * KEY_H + 2 * ROW_GAP + KB_PADDING_BOTTOM;
// Grid: 6 rows + 5 row-gaps
const GRID_ROW_GAP = 8;
const GRID_ROWS = 6;
const GRID_COLS = 5;
// Approximate fixed overhead: nav header + game header + gameArea top padding
const OVERHEAD = 210;

interface Props {
  difficulty: Difficulty;
}

export default function WordGuess({ difficulty }: Props) {
  const { colors } = useTheme();
  const { playSound } = useSound();
  const { width: SW, height: SH } = useWindowDimensions();

  // Calculate cell size so grid + keyboard always fits the screen
  const availableForGrid = SH - OVERHEAD - KB_H - spacing.md * 2; // gameArea vertical padding
  const cellFromHeight = Math.floor((availableForGrid - (GRID_ROWS - 1) * GRID_ROW_GAP) / GRID_ROWS);
  const maxGridWidth = Math.min(SW - 64, 340);
  const cellFromWidth = Math.floor((maxGridWidth - (GRID_COLS - 1) * GRID_ROW_GAP) / GRID_COLS);
  const CELL_SIZE = Math.min(cellFromHeight, cellFromWidth, 62);
  const GRID_WIDTH = CELL_SIZE * GRID_COLS + (GRID_COLS - 1) * GRID_ROW_GAP;

  const styles = useMemo(
    () => getStyles(colors, CELL_SIZE, KEY_H, SW),
    [colors, CELL_SIZE, SW]
  );
  const { showAd } = useInterstitialAd();

  const [paused, setPaused] = useState(false);

  const init = useCallback(async () => {
    const savedLevel = await getLevel('word-guess', difficulty);
    setLevelState(savedLevel);
    setGameState(initializeWordGuess(difficulty, savedLevel));
    setIsReady(true);
    setPaused(false);
  }, [difficulty]);

  const handleNewGame = useCallback(() => {
    init();
  }, [init]);

  const handleRestart = useCallback(() => {
    if (gameState) {
      setGameState({
        ...initializeWordGuess(difficulty, level),
        targetWord: gameState.targetWord, // Keep the same word
      });
    }
    setPaused(false);
  }, [gameState, difficulty, level]);

  useEffect(() => {
    init();
  }, [init]);

  const handleKeyPress = useCallback((key: string) => {
    if (!gameState || gameState.gameOver || gameState.gameWon) return;

    setGameState(prev => {
      if (!prev) return null;
      const newState = { ...prev };
      const { currentRow, currentCol, guesses, targetWord } = newState;

      if (key === '⌫') {
        if (currentCol > 0) {
          guesses[currentRow][currentCol - 1].char = '';
          newState.currentCol = currentCol - 1;
          playSound('tap');
        }
      } else if (key === 'ENTER') {
        if (currentCol === 5) {
          const currentGuess = guesses[currentRow].map(l => l.char).join('');
          const results = checkGuess(targetWord, currentGuess);

          results.forEach((status, i) => {
            guesses[currentRow][i].status = status;
            const char = guesses[currentRow][i].char;
            const currentStatus = newState.keyboardStatus[char];
            if (status === 'correct' || (status === 'present' && currentStatus !== 'correct') || (!currentStatus && status === 'absent')) {
              newState.keyboardStatus[char] = status;
            }
          });

          if (currentGuess === targetWord) {
            newState.gameWon = true;
            newState.gameOver = true;
            playSound('win');
            const nextLvl = level + 1;
            setLevel('word-guess', difficulty, nextLvl);
            recordGameResult('word-guess', 'win', 0);
          } else if (currentRow === 5) {
            newState.gameOver = true;
            playSound('lose');
            recordGameResult('word-guess', 'loss', 0);
          } else {
            newState.currentRow = currentRow + 1;
            newState.currentCol = 0;
            playSound('drop');
          }
        }
      } else if (currentCol < 5) {
        guesses[currentRow][currentCol].char = key;
        newState.currentCol = currentCol + 1;
        playSound('tap');
      }

      return newState;
    });
  }, [gameState, level, difficulty, playSound]);

  const resetLevel = useCallback(() => {
    init();
  }, [init]);

  if (!isReady || !gameState) return <View style={styles.container} />;

  const getStatusColor = (status: LetterStatus) => {
    switch (status) {
      case 'correct': return colors.success;
      case 'present': return colors.warning;
      case 'absent': return colors.textSecondary;
      default: return 'transparent';
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.background, colors.surface]} style={StyleSheet.absoluteFill} />
      <Header
        title="Word Guess"
        score={level}
        scoreLabel="LEVEL"
        highScore={0}
        highScoreLabel="BEST"
        onPause={() => setPaused(!paused)}
        isPaused={paused}
      />

      <View style={styles.gameArea}>
        <View style={[styles.grid, { width: GRID_WIDTH }]}>
          {gameState.guesses.map((row, r) => (
            <View key={r} style={styles.row}>
              {row.map((letter, c) => (
                <View
                  key={c}
                  style={[
                    styles.cell,
                    letter.status !== 'empty' && { backgroundColor: getStatusColor(letter.status), borderColor: getStatusColor(letter.status) },
                    r === gameState.currentRow && c === gameState.currentCol - 1 && letter.char !== '' && styles.activeCell
                  ]}
                >
                  <Text style={[
                    styles.cellText,
                    letter.status !== 'empty' && letter.status !== 'absent' && { color: colors.textOnPrimary },
                    letter.status === 'absent' && { color: colors.background }
                  ]}>{letter.char}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.keyboard}>
          {KEYBOARD_ROWS.map((row, i) => (
            <View key={i} style={styles.keyboardRow}>
              {row.map(key => (
                <TouchableOpacity
                  key={key}
                  onPress={() => handleKeyPress(key)}
                  disabled={paused}
                  style={[
                    styles.key,
                    key === 'ENTER' || key === '⌫' ? styles.wideKey : null,
                    gameState.keyboardStatus[key] && { backgroundColor: getStatusColor(gameState.keyboardStatus[key]) }
                  ]}
                >
                  <Text style={[
                    styles.keyText,
                    key.length > 1 && styles.smallKeyText,
                    gameState.keyboardStatus[key] && gameState.keyboardStatus[key] !== 'absent' && { color: colors.textOnPrimary },
                    gameState.keyboardStatus[key] === 'absent' && { color: colors.background }
                  ]}>{key}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      </View>

      {(gameState.gameOver || gameState.gameWon) && (
        <GameOverOverlay
          result={gameState.gameWon ? 'win' : 'lose'}
          title={gameState.gameWon ? 'BRILLIANT!' : 'OUT OF TRIES'}
          subtitle={gameState.gameWon ? 'You found the word!' : `The word was: ${gameState.targetWord}`}
          onPlayAgain={gameState.gameWon ? init : handleRestart}
          onPlayAgainLabel={gameState.gameWon ? 'NEXT LEVEL' : 'TRY AGAIN'}
          onRestart={handleRestart}
          onNewGame={handleNewGame}
        />
      )}

      {paused && !gameState.gameOver && !gameState.gameWon && (
        <GameOverOverlay
          result="paused"
          title="GAME PAUSED"
          onPlayAgain={() => setPaused(false)}
          onPlayAgainLabel="RESUME"
          onRestart={handleRestart}
          onNewGame={handleNewGame}
        />
      )}
    </View>
  );
}

const getStyles = (colors: ThemeColors, CELL_SIZE: number, KEY_H: number, SCREEN_WIDTH: number) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    gameArea: {
      flex: 1,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    grid: { gap: GRID_ROW_GAP },
    row: { flexDirection: 'row', gap: GRID_ROW_GAP },
    cell: {
      width: CELL_SIZE,
      height: CELL_SIZE,
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: 4,
      justifyContent: 'center',
      alignItems: 'center',
    },
    activeCell: { transform: [{ scale: 1.05 }], borderColor: colors.primary },
    cellText: { fontSize: CELL_SIZE * 0.52, fontWeight: '900', color: colors.text },
    keyboard: {
      width: '100%',
      gap: ROW_GAP,
      paddingBottom: KB_PADDING_BOTTOM,
    },
    keyboardRow: { flexDirection: 'row', justifyContent: 'center', gap: KEY_GAP },
    key: {
      minWidth: (SCREEN_WIDTH - 80) / 10,
      height: KEY_H,
      backgroundColor: colors.surface,
      borderRadius: 4,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 4,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.sm,
    },
    wideKey: { minWidth: 52 },
    keyText: { color: colors.text, fontSize: 15, fontWeight: 'bold' },
    smallKeyText: { fontSize: 11 },
  });
