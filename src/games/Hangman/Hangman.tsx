import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Dimensions, Platform } from 'react-native';
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
import { initializeHangman, guessLetter, HangmanState } from './logic';

const SCREEN_WIDTH = Dimensions.get('window').width;

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export default function Hangman({ difficulty }: Props) {
  const { colors } = useTheme();
  const { playSound } = useSound();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [level, setLevelState] = useState(1);
  const [gameState, setGameState] = useState<HangmanState | null>(null);
  const [highScore, setHighScoreState] = useState(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      const savedLevel = await getLevel('hangman', difficulty);
      const best = await getHighScore('hangman', difficulty);
      setLevelState(savedLevel);
      setHighScoreState(best);
      setGameState(initializeHangman(difficulty, savedLevel));
      setIsReady(true);
    };
    init();
  }, [difficulty]);

  const handleGuess = useCallback((letter: string) => {
    if (!gameState || gameState.gameOver || gameState.gameWon) return;
    
    const newState = guessLetter(gameState, letter);
    setGameState(newState);
    
    if (newState.gameWon) {
      playSound('win');
      const nextLvl = level + 1;
      setLevel('hangman', difficulty, nextLvl);
      
      if (nextLvl > highScore) {
        setHighScoreState(nextLvl);
        setHighScore('hangman', nextLvl, difficulty);
      }

      recordGameResult('hangman', 'win', 0);
    } else if (newState.gameOver) {
      playSound('lose');
      recordGameResult('hangman', 'loss', 0);
    } else {
      playSound('tap');
    }
  }, [gameState, level, difficulty, playSound]);

  const resetLevel = useCallback(() => {
    setGameState(initializeHangman(difficulty, level));
  }, [difficulty, level]);

  const nextLevel = useCallback(async () => {
    const savedLevel = await getLevel('hangman', difficulty);
    setLevelState(savedLevel);
    setGameState(initializeHangman(difficulty, savedLevel));
  }, [difficulty]);

  if (!isReady || !gameState) return <View style={styles.container} />;

  const renderHangman = () => {
    const attempts = gameState.incorrectAttempts;
    return (
      <View style={styles.hangmanDrawing}>
        {/* Gallows */}
        <View style={styles.base} />
        <View style={styles.upright} />
        <View style={styles.topBeam} />
        <View style={styles.rope} />
        
        {/* Person */}
        {attempts > 0 && <View style={styles.head} />}
        {attempts > 1 && <View style={styles.body} />}
        {attempts > 2 && <View style={styles.leftArm} />}
        {attempts > 3 && <View style={styles.rightArm} />}
        {attempts > 4 && <View style={styles.leftLeg} />}
        {attempts > 5 && <View style={styles.rightLeg} />}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.bgIcon}>😵</Text>
      <Header title="Hangman" score={level} scoreLabel="LEVEL" highScore={highScore} highScoreLabel="BEST" />
      
      <View style={styles.levelHeader}>
        <Text style={styles.themeText}>{gameState.theme}</Text>
        <Text style={styles.levelText}>Level {level}</Text>
      </View>

      <View style={styles.gameArea}>
        {renderHangman()}

        <View style={styles.wordDisplay}>
          {gameState.word.split('').map((char, i) => (
            <View key={i} style={styles.letterSlot}>
              <Text style={styles.letterText}>
                {gameState.guessedLetters.includes(char) || gameState.gameOver ? char : ''}
              </Text>
              <View style={styles.underline} />
            </View>
          ))}
        </View>

        <View style={styles.keyboard}>
          {ALPHABET.map(letter => {
            const isGuessed = gameState.guessedLetters.includes(letter);
            const isCorrect = isGuessed && gameState.word.includes(letter);
            const isWrong = isGuessed && !gameState.word.includes(letter);

            return (
              <TouchableOpacity
                key={letter}
                onPress={() => handleGuess(letter)}
                disabled={isGuessed || gameState.gameOver || gameState.gameWon}
                style={[
                  styles.key,
                  isCorrect && styles.keyCorrect,
                  isWrong && styles.keyWrong,
                  isGuessed && { opacity: 0.5 }
                ]}
              >
                <Text style={styles.keyText}>{letter}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.footer}>
        <PremiumButton variant="secondary" height={50} onPress={resetLevel}>
          <Text style={styles.footerText}>RESET LEVEL</Text>
        </PremiumButton>
      </View>

      {(gameState.gameOver || gameState.gameWon) && (
        <GameOverOverlay 
          result={gameState.gameWon ? 'win' : 'lose'} 
          title={gameState.gameWon ? 'SURVIVED!' : 'GAME OVER'} 
          subtitle={gameState.gameWon ? 'You guessed it!' : `The word was: ${gameState.word}`} 
          onPlayAgain={gameState.gameWon ? nextLevel : resetLevel}
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
  themeText: { color: colors.primary, fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  levelText: { color: colors.text, fontSize: 24, fontWeight: '900' },
  gameArea: { flex: 1, padding: spacing.md, alignItems: 'center', justifyContent: 'space-between' },
  hangmanDrawing: { width: 200, height: 200, position: 'relative', marginTop: 20 },
  base: { position: 'absolute', bottom: 0, width: 100, height: 4, backgroundColor: colors.text, left: 0 },
  upright: { position: 'absolute', bottom: 0, left: 20, width: 4, height: 180, backgroundColor: colors.text },
  topBeam: { position: 'absolute', top: 20, left: 20, width: 100, height: 4, backgroundColor: colors.text },
  rope: { position: 'absolute', top: 20, left: 116, width: 2, height: 30, backgroundColor: '#f1c40f' },
  head: { position: 'absolute', top: 50, left: 101, width: 30, height: 30, borderRadius: 15, borderWidth: 3, borderColor: colors.text },
  body: { position: 'absolute', top: 80, left: 115, width: 3, height: 60, backgroundColor: colors.text },
  leftArm: { position: 'absolute', top: 100, left: 95, width: 20, height: 3, backgroundColor: colors.text, transform: [{ rotate: '-30deg' }] },
  rightArm: { position: 'absolute', top: 100, left: 118, width: 20, height: 3, backgroundColor: colors.text, transform: [{ rotate: '30deg' }] },
  leftLeg: { position: 'absolute', top: 138, left: 100, width: 25, height: 3, backgroundColor: colors.text, transform: [{ rotate: '-45deg' }] },
  rightLeg: { position: 'absolute', top: 138, left: 108, width: 25, height: 3, backgroundColor: colors.text, transform: [{ rotate: '45deg' }] },
  wordDisplay: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginVertical: 30 },
  letterSlot: { width: 25, alignItems: 'center' },
  letterText: { fontSize: 20, fontWeight: '900', color: colors.text, marginBottom: 2 },
  underline: { width: '100%', height: 3, backgroundColor: colors.primary, borderRadius: 2 },
  keyboard: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, paddingBottom: 20 },
  key: { width: (SCREEN_WIDTH - 80) / 7, height: 40, backgroundColor: colors.card, borderRadius: radius.sm, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  keyCorrect: { backgroundColor: colors.success + '40', borderColor: colors.success },
  keyWrong: { backgroundColor: colors.error + '40', borderColor: colors.error },
  keyText: { color: colors.text, fontWeight: 'bold' },
  footer: { padding: spacing.xl, paddingBottom: Platform.OS === 'ios' ? 40 : spacing.xl },
  footerText: { color: colors.text, fontWeight: 'bold' },
  bgIcon: {
    position: 'absolute',
    top: '40%',
    left: '-15%',
    fontSize: 250,
    opacity: 0.03,
    transform: [{ rotate: '-15deg' }],
  },
});
