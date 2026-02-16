import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Dimensions, Platform, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Header from '../../components/Header';
import GameOverOverlay from '../../components/GameOverOverlay';
import PremiumButton from '../../components/PremiumButton';
import { useTheme } from '../../contexts/ThemeContext';
import { useSound } from '../../contexts/SoundContext';
import { getHighScore, setHighScore, getLevel, setLevel } from '../../utils/storage';
import { recordGameResult } from '../../utils/stats';
import { Difficulty } from '../../types';
import { ThemeColors } from '../../utils/themes';
import { spacing, radius, shadows, typography } from '../../utils/designTokens';
import { initializeWordGuess, checkGuess, WordGuessState, LetterStatus } from './logic';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_WIDTH = Math.min(SCREEN_WIDTH - 64, 350);
const CELL_SIZE = (GRID_WIDTH - 20) / 5;

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫']
];

export default function WordGuess({ difficulty }: Props) {
  const { colors } = useTheme();
  const { playSound } = useSound();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [level, setLevelState] = useState(1);
  const [gameState, setGameState] = useState<WordGuessState | null>(null);
  const [isReady, setIsReady] = useState(false);

  const init = useCallback(async () => {
    const savedLevel = await getLevel('word-guess', difficulty);
    setLevelState(savedLevel);
    setGameState(initializeWordGuess(difficulty, savedLevel));
    setIsReady(true);
  }, [difficulty]);

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
          
          // Update row statuses
          results.forEach((status, i) => {
            guesses[currentRow][i].status = status;
            
            // Update keyboard status
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
      case 'absent': return '#3a3a3c';
      default: return 'transparent';
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.background, colors.surface]} style={StyleSheet.absoluteFill} />
      <Header title="Word Guess" score={level} scoreLabel="LEVEL" highScore={0} highScoreLabel="BEST" />
      
      <View style={styles.gameArea}>
        <View style={styles.grid}>
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
                  <Text style={styles.cellText}>{letter.char}</Text>
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
                  style={[
                    styles.key,
                    key === 'ENTER' || key === '⌫' ? styles.wideKey : null,
                    gameState.keyboardStatus[key] && { backgroundColor: getStatusColor(gameState.keyboardStatus[key]) }
                  ]}
                >
                  <Text style={[styles.keyText, key.length > 1 && styles.smallKeyText]}>{key}</Text>
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
          onPlayAgain={gameState.gameWon ? init : resetLevel}
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
  gameArea: { flex: 1, padding: spacing.md, alignItems: 'center', justifyContent: 'space-around' },
  grid: { gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
  cell: { width: CELL_SIZE, height: CELL_SIZE, borderWidth: 2, borderColor: colors.border, borderRadius: 4, justifyContent: 'center', alignItems: 'center' },
  activeCell: { transform: [{ scale: 1.1 }], borderColor: colors.primary },
  cellText: { fontSize: 32, fontWeight: '900', color: colors.text },
  keyboard: { width: '100%', gap: 8, paddingBottom: Platform.OS === 'ios' ? 40 : 10 },
  keyboardRow: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  key: { minWidth: (SCREEN_WIDTH - 80) / 10, height: 50, backgroundColor: colors.surface, borderRadius: 4, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderWidth: 1, borderColor: colors.border, ...shadows.sm },
  wideKey: { minWidth: 50 },
  keyText: { color: colors.text, fontSize: 16, fontWeight: 'bold' },
  smallKeyText: { fontSize: 12 },
});
