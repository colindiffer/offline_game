import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Animated, useWindowDimensions, Platform } from 'react-native';
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
import { useInterstitialAd } from '../../lib/useInterstitialAd';
import { initializeMemoryMatch, MemoryCard } from './logic';

export default function MemoryMatch({ difficulty }: Props) {
  const { colors } = useTheme();
  const { playSound } = useSound();
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const GRID_WIDTH = SCREEN_WIDTH - 24;
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { showAd } = useInterstitialAd();

  const [level, setLevelState] = useState(1);
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const cardAnims = useRef<Animated.Value[]>([]).current;
  const [paused, setPaused] = useState(false);
  const isFirstGameRef = useRef(true);

  // Initialize animations
  if (cardAnims.length === 0) {
    for (let i = 0; i < 36; i++) {
      cardAnims.push(new Animated.Value(0));
    }
  }

  const initializeGame = useCallback(async (currentLevel: number) => {
    const initialCards = initializeMemoryMatch(difficulty, currentLevel);
    setCards(initialCards);
    setFlippedCards([]);
    setMoves(0);
    setGameWon(false);
    setElapsedTime(0);
    setIsProcessing(false);
    startTimeRef.current = Date.now();
    cardAnims.forEach(anim => anim.setValue(0));
  }, [difficulty, cardAnims]);

  const handleNewGame = useCallback(async () => {
    showAd(isFirstGameRef.current);
    isFirstGameRef.current = false;
    const savedLevel = await getLevel('memory-match', difficulty);
    setLevelState(savedLevel);
    initializeGame(savedLevel);
    setPaused(false);
  }, [difficulty, initializeGame, showAd]);

  const handleRestart = useCallback(() => {
    showAd(isFirstGameRef.current);
    isFirstGameRef.current = false;
    initializeGame(level);
    setPaused(false);
  }, [level, initializeGame, showAd]);

  const nextLevel = useCallback(async () => {
    showAd(isFirstGameRef.current);
    isFirstGameRef.current = false;
    const nextLvl = level + 1;
    await setLevel('memory-match', difficulty, nextLvl);
    setLevelState(nextLvl);
    initializeGame(nextLvl);
    setPaused(false);
  }, [level, difficulty, initializeGame, showAd]);


  useEffect(() => {
    handleNewGame();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [handleNewGame]);

  useEffect(() => {
    if (!gameWon && isReady && startTimeRef.current && !paused) {
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTimeRef.current!) / 1000));
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [gameWon, isReady, paused]);

  const handleCardPress = useCallback((index: number) => {
    if (isProcessing || gameWon || cards[index].isMatched || flippedCards.includes(index) || flippedCards.length >= 2) return;

    const newFlipped = [...flippedCards, index];
    setFlippedCards(newFlipped);
    playSound('tap');

    // Simple scale-pop for selection
    Animated.sequence([
      Animated.timing(cardAnims[index], { toValue: 1.1, duration: 100, useNativeDriver: true }),
      Animated.timing(cardAnims[index], { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      setIsProcessing(true);
      
      const [first, second] = newFlipped;
      if (cards[first].type === cards[second].type) {
        setTimeout(() => {
          setCards(prev => {
            const next = [...prev];
            next[first].isMatched = true;
            next[second].isMatched = true;
            if (next.every(c => c.isMatched)) {
              setGameWon(true);
              playSound('win');
              const finalTime = Math.floor((Date.now() - startTimeRef.current!) / 1000);
              recordGameResult('memory-match', 'win', finalTime);
              const nextLvl = level + 1;
              setLevel('memory-match', difficulty, nextLvl);
            }
            return next;
          });
          setFlippedCards([]);
          setIsProcessing(false);
          playSound('drop');
        }, 500);
      } else {
        setTimeout(() => {
          setFlippedCards([]);
          setIsProcessing(false);
        }, 1000);
      }
    }
  }, [cards, flippedCards, isProcessing, gameWon, playSound, cardAnims, level, difficulty]);

  if (!isReady) return <View style={styles.container} />;

  const cols = cards.length > 24 ? 6 : cards.length > 12 ? 4 : 3;
  const rows = Math.ceil(cards.length / cols);
  // Available height: screen minus header (~56px), footer (~70px), padding (~40px)
  const availableHeight = SCREEN_HEIGHT - 56 - 70 - 40;
  const cardSizeFromWidth = Math.floor((GRID_WIDTH - (cols * 4)) / cols);
  const cardSizeFromHeight = Math.floor((availableHeight - (rows * 4)) / rows / 1.3);
  const cardSize = Math.min(cardSizeFromWidth, cardSizeFromHeight);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.background, colors.surface]} style={StyleSheet.absoluteFill} />
      <Header title="Memory" score={moves} scoreLabel="MOVES" highScore={level} highScoreLabel="LEVEL"
        onPause={() => setPaused(!paused)} isPaused={paused} />
      
      <View style={styles.gameArea}>
        <View style={[styles.grid, { width: GRID_WIDTH }]}>
          {cards.map((card, index) => {
            const isFlipped = flippedCards.includes(index) || card.isMatched;

            return (
              <TouchableOpacity
                key={card.id}
                onPress={() => handleCardPress(index)}
                activeOpacity={0.9}
                style={{ width: cardSize - 4, height: (cardSize - 4) * 1.3, margin: 2 }}
                disabled={paused}
              >
                <Animated.View style={[
                  styles.card, 
                  isFlipped ? styles.cardFront : styles.cardBack,
                  { transform: [{ scale: cardAnims[index].interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }) }] }
                ]}>
                  {isFlipped ? (
                    <Text style={[styles.cardIcon, { fontSize: cardSize * 0.5 }]}>{card.type}</Text>
                  ) : (
                    <View style={styles.cardBackContent}>
                      <LinearGradient colors={['#4834d4', '#686de0']} style={StyleSheet.absoluteFill} />
                      <Text style={styles.cardBackLogo}>?</Text>
                    </View>
                  )}
                  {card.isMatched && <View style={styles.matchedOverlay} />}
                </Animated.View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.footer}>
        <PremiumButton variant="secondary" height={50} onPress={handleRestart} disabled={paused}>
          <Text style={styles.footerBtnText}>RESTART</Text>
        </PremiumButton>
        <PremiumButton variant="secondary" height={50} onPress={handleNewGame} disabled={paused}>
          <Text style={styles.footerBtnText}>NEW GAME</Text>
        </PremiumButton>
      </View>

      {gameWon && (
        <GameOverOverlay 
          result="win" 
          title="MATCHED!" 
          subtitle={`Completed in ${moves} moves.`} 
          onPlayAgain={nextLevel}
          onPlayAgainLabel="NEXT LEVEL"
          onRestart={handleRestart}
          onNewGame={handleNewGame}
        />
      )}

      {paused && !gameWon && (
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
    </View>
  );
}

interface Props {
  difficulty: Difficulty;
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  gameArea: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  card: { flex: 1, borderRadius: 12, ...shadows.md, overflow: 'hidden' },
  cardBack: { backgroundColor: '#4834d4', borderWidth: 3, borderColor: 'rgba(255,255,255,0.2)' },
  cardBackContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cardBackLogo: { fontSize: 32, fontWeight: '900', color: 'rgba(255,255,255,0.3)' },
  cardFront: { backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff' },
  cardIcon: { color: '#000' },
  matchedOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.4)' },
  footer: { padding: spacing.xl, paddingBottom: Platform.OS === 'ios' ? 40 : spacing.xl, flexDirection: 'row', justifyContent: 'space-around' },
  footerBtnText: { color: colors.text, fontWeight: 'bold' },
});
