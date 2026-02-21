import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView, Animated, useWindowDimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Header from '../../components/Header';
import GameOverOverlay from '../../components/GameOverOverlay';
import PremiumButton from '../../components/PremiumButton';
import { useTheme } from '../../contexts/ThemeContext';
import { useSound } from '../../contexts/SoundContext';
import { getHighScore, setHighScore } from '../../utils/storage';
import { recordGameResult } from '../../utils/stats';
import { Difficulty } from '../../types';
import { ThemeColors } from '../../utils/themes';
import { spacing, radius, shadows, typography } from '../../utils/designTokens';
import { initializeCodeBreaker, evaluateGuess } from './logic';
import { CodeBreakerGameState, CODE_BREAKER_COLORS, CodeColor } from './types';

export default function CodeBreaker({ difficulty }: Props) {
  const { colors } = useTheme();
  const { playSound } = useSound();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [gameState, setGameState] = useState<CodeBreakerGameState>(() => initializeCodeBreaker(difficulty));
  const [highScore, setHighScoreState] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  const handleColorSelect = (color: CodeColor) => {
    if (gameState.gamePhase !== 'playing' || gameState.currentGuess.length >= 4 || paused) return;
    
    setGameState(prev => ({
      ...prev,
      currentGuess: [...prev.currentGuess, color]
    }));
    playSound('tap');
  };

  const removeColor = (index: number) => {
    if (gameState.gamePhase !== 'playing' || paused) return;
    setGameState(prev => {
      const nextGuess = [...prev.currentGuess];
      nextGuess.splice(index, 1);
      return { ...prev, currentGuess: nextGuess };
    });
    playSound('tap');
  };

  const submitGuess = () => {
    if (gameState.currentGuess.length !== 4 || paused) return;

    const result = evaluateGuess(gameState.secretCode, gameState.currentGuess);
    const isWin = result.feedback.black === 4;
    const isLoss = !isWin && gameState.guesses.length >= 9;

    setGameState(prev => ({
      ...prev,
      guesses: [...prev.guesses, result],
      currentGuess: [],
      gamePhase: (isWin || isLoss) ? 'finished' : 'playing',
      winner: isWin ? true : isLoss ? false : null,
    }));

    if (isWin) {
      playSound('win');
      recordGameResult('code-breaker', 'win', 0);
    } else if (isLoss) {
      playSound('lose');
      recordGameResult('code-breaker', 'loss', 0);
    } else {
      playSound('drop');
    }
  };

  const resetGame = useCallback(() => {
    setGameState(initializeCodeBreaker(difficulty));
    setPaused(false);
  }, [difficulty]);

  const handleNewGame = useCallback(() => {
    resetGame();
  }, [resetGame]);

  const handleRestart = useCallback(() => {
    resetGame();
  }, [resetGame]);

  if (!isReady) return null;

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.background, colors.surface]} style={StyleSheet.absoluteFill} />
      <Header
        title="Code Breaker"
        score={10 - gameState.guesses.length}
        scoreLabel="TRIES"
        highScore={0}
        highScoreLabel="BEST"
        onPause={() => setPaused(!paused)}
        isPaused={paused}
      />

      <View style={styles.gameArea}>
        <ScrollView style={styles.history} contentContainerStyle={styles.historyContent}>
          {gameState.guesses.map((guess, idx) => (
            <View key={idx} style={styles.historyRow}>
              <View style={styles.guessIndex}>
                <Text style={styles.indexText}>{idx + 1}</Text>
              </View>
              <View style={styles.guessDots}>
                {guess.colors.map((c, i) => (
                  <View key={i} style={[styles.dot, { backgroundColor: c }]} />
                ))}
              </View>
              <View style={styles.feedback}>
                <View style={styles.pegGrid}>
                  {Array.from({ length: guess.feedback.black }).map((_, i) => (
                    <View key={`b-${i}`} style={[styles.peg, { backgroundColor: colors.text }]} />
                  ))}
                  {Array.from({ length: guess.feedback.white }).map((_, i) => (
                    <View key={`w-${i}`} style={[styles.peg, { backgroundColor: colors.textSecondary, opacity: 0.5 }]} />
                  ))}
                </View>
              </View>
            </View>
          ))}
          {gameState.gamePhase === 'playing' && (
            <View style={[styles.historyRow, styles.activeRow]}>
              <View style={styles.guessIndex}>
                <Text style={styles.indexText}>{gameState.guesses.length + 1}</Text>
              </View>
              <View style={styles.guessDots}>
                {[0, 1, 2, 3].map((i) => (
                  <TouchableOpacity 
                    key={i} 
                    onPress={() => removeColor(i)}
                    disabled={paused}
                    style={[styles.dot, styles.emptyDot, gameState.currentGuess[i] && { backgroundColor: gameState.currentGuess[i] }]} 
                  />
                ))}
              </View>
              <TouchableOpacity 
                style={[styles.submitBtn, (gameState.currentGuess.length < 4 || paused) && styles.submitDisabled]} 
                onPress={submitGuess}
                disabled={gameState.currentGuess.length < 4 || paused}
              >
                <Text style={styles.submitText}>CHECK</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        <View style={styles.colorPicker}>
          <Text style={styles.pickerLabel}>SELECT COLOR</Text>
          <View style={styles.colorsRow}>
            {CODE_BREAKER_COLORS.map((color) => (
              <TouchableOpacity 
                key={color} 
                style={[styles.colorBtn, { backgroundColor: color }]} 
                onPress={() => handleColorSelect(color)}
                disabled={paused}
              />
            ))}
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <PremiumButton variant="secondary" height={44} style={styles.flexBtn} onPress={handleRestart} disabled={paused}>
          <Text style={styles.footerBtnText}>RESTART</Text>
        </PremiumButton>
        <PremiumButton variant="secondary" height={44} style={styles.flexBtn} onPress={handleNewGame} disabled={paused}>
          <Text style={styles.footerBtnText}>NEW GAME</Text>
        </PremiumButton>
      </View>

      {gameState.gamePhase === 'finished' && (
        <GameOverOverlay
          result={gameState.winner ? 'win' : 'lose'}
          title={gameState.winner ? 'CODE BROKEN!' : 'MISSION FAILED'}
          subtitle={gameState.winner ? `You cracked it in ${gameState.guesses.length} tries.` : 'The secret code remains hidden.'}
          onPlayAgain={resetGame}
          onNewGame={handleNewGame}
          onRestart={handleRestart}
        />
      )}

      {paused && gameState.gamePhase === 'playing' && (
        <GameOverOverlay
          result="paused"
          title="GAME PAUSED"
          onPlayAgain={() => setPaused(false)}
          onPlayAgainLabel="RESUME"
          onNewGame={handleNewGame}
          onRestart={handleRestart}
        />
      )}
    </View>
  );
}

interface Props {
  difficulty: Difficulty;
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1 },
  footer: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.md, paddingBottom: Platform.OS === 'ios' ? 30 : spacing.md, paddingTop: spacing.sm },
  flexBtn: { flex: 1 },
  footerBtnText: { color: colors.text, fontWeight: 'bold', fontSize: 12 },
  gameArea: { flex: 1, padding: spacing.md },
  history: { flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg },
  historyContent: { padding: spacing.md },
  historyRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  activeRow: { borderBottomWidth: 0, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.sm },
  guessIndex: { width: 30 },
  indexText: { color: colors.textSecondary, fontSize: 12, fontWeight: 'bold' },
  guessDots: { flexDirection: 'row', gap: 12, flex: 1 },
  dot: { width: 32, height: 32, borderRadius: 16, ...shadows.sm },
  emptyDot: { borderWidth: 2, borderStyle: 'dashed', borderColor: colors.border, backgroundColor: 'transparent' },
  feedback: { width: 60, alignItems: 'center' },
  pegGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, width: 30, justifyContent: 'center' },
  peg: { width: 8, height: 8, borderRadius: 4 },
  submitBtn: { backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.sm },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: colors.textOnPrimary, fontSize: 12, fontWeight: '900' },
  colorPicker: { padding: spacing.lg, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  pickerLabel: { fontSize: 12, fontWeight: '900', color: colors.textSecondary, letterSpacing: 1.5, textAlign: 'center', marginBottom: spacing.md },
  colorsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.sm },
  colorBtn: { width: 50, height: 50, borderRadius: 25, ...shadows.md, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
});
