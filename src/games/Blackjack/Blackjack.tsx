import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView, Dimensions, Platform } from 'react-native';
import Header from '../../components/Header';
import PlayingCard from '../../components/PlayingCard';
import TutorialScreen from '../../components/TutorialScreen';
import PremiumButton from '../../components/PremiumButton';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { useSound } from '../../contexts/SoundContext';
import { getHighScore, setHighScore as saveHighScore } from '../../utils/storage';
import { recordGameResult } from '../../utils/stats';
import { Difficulty } from '../../types';
import { ThemeColors } from '../../utils/themes';
import { GAME_TUTORIALS } from '../../utils/tutorials';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlackjackGameState } from './types';
import { spacing, radius, shadows, typography } from '../../utils/designTokens';
import {
  initializeBlackjackGame,
  dealInitialHand,
  playerHit,
  playerStand,
  playerDouble,
  dealerPlay,
} from './logic';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = Math.floor((SCREEN_WIDTH - 64) / 4);
const CARD_HEIGHT = Math.floor(CARD_WIDTH * 1.4);
const BET_OPTIONS = [10, 25, 50, 100];
const INITIAL_BANKROLL = 100;

interface Props {
  difficulty: Difficulty;
}

export default function Blackjack({ difficulty }: Props) {
  const { colors } = useTheme();
  const { playSound } = useSound();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [gameState, setGameState] = useState<BlackjackGameState>(() =>
    initializeBlackjackGame(difficulty, INITIAL_BANKROLL)
  );
  const [highScore, setHighScore] = useState(INITIAL_BANKROLL);
  const [showTutorial, setShowTutorial] = useState(false);
  const [selectedBet, setSelectedBet] = useState(10);

  const startTimeRef = useRef<number>(Date.now());
  const handStartTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    getHighScore('blackjack', difficulty).then(score => {
      setHighScore(score || INITIAL_BANKROLL);
    });
  }, [difficulty]);

  // Update high score when tokens increase
  useEffect(() => {
    if (gameState.tokens > highScore) {
      setHighScore(gameState.tokens);
      saveHighScore('blackjack', gameState.tokens, difficulty);
    }
  }, [gameState.tokens, highScore, difficulty]);

  // Record game result when hand finishes
  useEffect(() => {
    if (gameState.gamePhase === 'finished' && gameState.result) {
      const handDuration = Math.floor((Date.now() - handStartTimeRef.current) / 1000);

      if (gameState.result === 'win' || gameState.result === 'blackjack') {
        recordGameResult('blackjack', 'win', handDuration);
        playSound('win');
      } else if (gameState.result === 'loss') {
        recordGameResult('blackjack', 'loss', handDuration);
        playSound('lose');
      } else {
        playSound('tap');
      }
    }
  }, [gameState.gamePhase, gameState.result, playSound]);

  // Auto-play dealer when phase changes to dealer
  useEffect(() => {
    if (gameState.gamePhase === 'dealer') {
      const timer = setTimeout(() => {
        const newState = dealerPlay(gameState, difficulty);
        setGameState(newState);
      }, 1000); // Delay for suspense
      return () => clearTimeout(timer);
    }
  }, [gameState, difficulty]);

  const handleTutorialClose = useCallback(() => {
    AsyncStorage.setItem('@tutorial_blackjack', 'true');
    setShowTutorial(false);
  }, []);

  const handleBetSelect = useCallback((bet: number) => {
    if (bet > gameState.tokens) return;

    playSound('tap');
    handStartTimeRef.current = Date.now();
    const newState = dealInitialHand(gameState, bet);
    setGameState(newState);
  }, [gameState, playSound]);

  const handleHit = useCallback(() => {
    playSound('tap');
    const newState = playerHit(gameState);
    setGameState(newState);
  }, [gameState, playSound]);

  const handleStand = useCallback(() => {
    playSound('tap');
    const newState = playerStand(gameState);
    setGameState(newState);
  }, [gameState, playSound]);

  const handleDouble = useCallback(() => {
    playSound('tap');
    const newState = playerDouble(gameState);
    setGameState(newState);
  }, [gameState, playSound]);

  const handleNewHand = useCallback(() => {
    playSound('tap');

    if (gameState.tokens <= 0) {
      // Game over - restart with initial tokens
      const totalGameDuration = Math.floor((Date.now() - startTimeRef.current) / 1000);
      recordGameResult('blackjack', 'loss', totalGameDuration);
      startTimeRef.current = Date.now();
      setGameState(initializeBlackjackGame(difficulty, INITIAL_BANKROLL));
    } else {
      // Start new hand with current tokens
      setGameState({
        ...initializeBlackjackGame(difficulty, gameState.tokens),
        tokens: gameState.tokens,
      });
    }
  }, [gameState, difficulty, playSound]);

  const handleNewGame = useCallback(() => {
    playSound('tap');
    const totalGameDuration = Math.floor((Date.now() - startTimeRef.current) / 1000);
    recordGameResult('blackjack', 'loss', totalGameDuration);
    startTimeRef.current = Date.now();
    setGameState(initializeBlackjackGame(difficulty, INITIAL_BANKROLL));
  }, [difficulty, playSound]);

  const handleRestart = useCallback(() => {
    handleNewHand();
  }, [handleNewHand]);

  const getResultText = () => {
    if (!gameState.result) return '';

    switch (gameState.result) {
      case 'blackjack':
        return 'BLACKJACK! 🎉';
      case '5-card-trick':
        return '5 CARD TRICK! 🎩';
      case 'win':
        return 'YOU WIN! 🎉';
      case 'loss':
        return 'YOU LOSE 😢';
      case 'push':
        return 'PUSH (TIE)';
      default:
        return '';
    }
  };

  const getResultColor = () => {
    if (!gameState.result) return '#fff';

    switch (gameState.result) {
      case 'blackjack':
      case '5-card-trick':
      case 'win':
        return '#55efc4';
      case 'loss':
        return '#ff7675';
      case 'push':
        return '#ffeaa7';
      default:
        return '#fff';
    }
  };

  const isGameOver = gameState.tokens <= 0 && gameState.gamePhase === 'finished';
  const showDealerSecondCard = gameState.gamePhase === 'dealer' || gameState.gamePhase === 'finished';

  return (
    <View style={styles.container}>
      <Text style={[styles.bgIcon, { color: '#fff' }]}>🃏</Text>
      <Header
        title="Blackjack"
        score={gameState.tokens}
        scoreLabel="CHIPS"
        highScore={highScore}
        highScoreLabel="BEST"
        light
      />

      <View style={styles.table}>
        <LinearGradient
          colors={['#1b4332', '#081c15']}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.dealerSection}>
          <View style={styles.handInfo}>
            <Text style={styles.handTitle}>DEALER</Text>
            {showDealerSecondCard && (
              <View style={styles.scoreBadge}>
                <Text style={styles.scoreText}>
                  {gameState.dealerHand.isBust ? 'BUST' : gameState.dealerHand.value}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.cardsRow}>
            {gameState.dealerHand.cards.map((card, index) => (
              <View key={card.id} style={styles.cardWrapper}>
                <PlayingCard
                  card={card}
                  faceDown={index === 1 && !showDealerSecondCard}
                  width={CARD_WIDTH}
                  height={CARD_HEIGHT}
                />
              </View>
            ))}
            {gameState.dealerHand.cards.length === 0 && (
              <View style={styles.placeholderHand}>
                <PlayingCard card={null} width={CARD_WIDTH} height={CARD_HEIGHT} />
                <PlayingCard card={null} width={CARD_WIDTH} height={CARD_HEIGHT} />
              </View>
            )}
          </View>
        </View>

        <View style={styles.centerArea}>
          {gameState.result ? (
            <View style={styles.resultBanner}>
              <Text style={[styles.resultText, { color: getResultColor() }]}>
                {getResultText()}
              </Text>
            </View>
          ) : gameState.gamePhase === 'dealer' ? (
            <View style={styles.dealerThinking}>
              <Text style={styles.thinkingText}>Dealer is playing...</Text>
            </View>
          ) : (
            <View style={styles.betDisplay}>
              <Text style={styles.betLabel}>CURRENT BET</Text>
              <Text style={styles.betValue}>{gameState.bet}</Text>
            </View>
          )}
        </View>

        <View style={styles.playerSection}>
          <View style={styles.cardsRow}>
            {gameState.playerHand.cards.map(card => (
              <View key={card.id} style={styles.cardWrapper}>
                <PlayingCard card={card} width={CARD_WIDTH} height={CARD_HEIGHT} />
              </View>
            ))}
            {gameState.playerHand.cards.length === 0 && (
              <View style={styles.placeholderHand}>
                <PlayingCard card={null} width={CARD_WIDTH} height={CARD_HEIGHT} />
                <PlayingCard card={null} width={CARD_WIDTH} height={CARD_HEIGHT} />
              </View>
            )}
          </View>
          <View style={styles.handInfo}>
            <Text style={styles.handTitle}>PLAYER</Text>
            {gameState.playerHand.cards.length > 0 && (
              <View style={styles.scoreBadge}>
                <Text style={styles.scoreText}>
                  {gameState.playerHand.isBust ? 'BUST' : gameState.playerHand.value}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.controls}>
        {gameState.gamePhase === 'betting' && (
          <View style={styles.bettingPhase}>
            <Text style={styles.phaseTitle}>PLACE YOUR BET</Text>
            <View style={styles.chipContainer}>
              {BET_OPTIONS.map(bet => (
                <TouchableOpacity
                  key={bet}
                  style={[styles.chip, bet > gameState.tokens && styles.chipDisabled]}
                  onPress={() => handleBetSelect(bet)}
                  disabled={bet > gameState.tokens}
                >
                  <LinearGradient
                    colors={bet === 10 ? ['#74b9ff', '#0984e3'] : bet === 25 ? ['#ff7675', '#d63031'] : bet === 50 ? ['#55efc4', '#00b894'] : ['#a29bfe', '#6c5ce7']}
                    style={styles.chipGradient}
                  >
                    <View style={styles.chipInner}>
                      <Text style={styles.chipText}>{bet}</Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {gameState.gamePhase === 'playing' && (
          <View style={styles.playingPhase}>
            <View style={styles.mainActions}>
              <PremiumButton variant="primary" height={64} style={styles.actionBtn} onPress={handleHit}>
                <Text style={styles.actionBtnText}>HIT</Text>
              </PremiumButton>
              <PremiumButton variant="warning" height={64} style={styles.actionBtn} onPress={handleStand}>
                <Text style={styles.actionBtnText}>STAND</Text>
              </PremiumButton>
            </View>
            {gameState.canDouble && (
              <PremiumButton variant="secondary" height={50} style={styles.doubleBtn} onPress={handleDouble}>
                <Text style={styles.doubleBtnText}>DOUBLE DOWN</Text>
              </PremiumButton>
            )}
          </View>
        )}

        {gameState.gamePhase === 'finished' && (
          <View style={styles.finishedPhase}>
            <PremiumButton variant="primary" height={60} style={styles.newHandBtn} onPress={handleNewHand}>
              <Text style={styles.actionBtnText}>
                {isGameOver ? 'RE-BUY CHIPS' : 'NEXT HAND'}
              </Text>
            </PremiumButton>
          </View>
        )}
      </View>

      <View style={styles.gameFooter}>
        <PremiumButton variant="secondary" height={40} style={styles.footerBtn} onPress={handleRestart}>
          <Text style={styles.footerBtnText}>RESTART</Text>
        </PremiumButton>
        <PremiumButton variant="secondary" height={40} style={styles.footerBtn} onPress={handleNewGame}>
          <Text style={styles.footerBtnText}>NEW GAME</Text>
        </PremiumButton>
      </View>

      {showTutorial && GAME_TUTORIALS.blackjack && (
        <TutorialScreen
          gameName="Blackjack"
          steps={GAME_TUTORIALS.blackjack}
          onClose={handleTutorialClose}
        />
      )}
    </View>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    table: {
      flex: 1,
      margin: spacing.sm,
      borderRadius: radius.lg,
      overflow: 'hidden',
      borderWidth: 8,
      borderColor: '#2d3436', // Dark frame
      justifyContent: 'space-between',
      paddingVertical: spacing.md,
    },
    dealerSection: {
      alignItems: 'center',
      gap: spacing.md,
    },
    playerSection: {
      alignItems: 'center',
      gap: spacing.md,
    },
    handInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    handTitle: {
      color: 'rgba(255,255,255,0.7)',
      fontWeight: '900',
      fontSize: 14,
      letterSpacing: 2,
    },
    scoreBadge: {
      backgroundColor: 'rgba(0,0,0,0.5)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
    },
    scoreText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 14,
    },
    cardsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      minHeight: CARD_HEIGHT + 20,
    },
    cardWrapper: {
      marginHorizontal: -CARD_WIDTH * 0.25, // Overlap cards based on width
      ...shadows.md,
    },
    placeholderHand: {
      flexDirection: 'row',
      opacity: 0.1,
      marginHorizontal: -CARD_WIDTH * 0.25,
    },
    centerArea: {
      minHeight: 60,
      justifyContent: 'center',
      alignItems: 'center',
    },
    betDisplay: {
      alignItems: 'center',
    },
    betLabel: {
      color: 'rgba(255,255,255,0.4)',
      fontSize: 10,
      fontWeight: 'bold',
      letterSpacing: 1,
    },
    betValue: {
      color: '#fab1a0',
      fontSize: 24,
      fontWeight: '900',
    },
    resultBanner: {
      backgroundColor: 'rgba(0,0,0,0.6)',
      paddingHorizontal: 30,
      paddingVertical: 12,
      borderRadius: radius.full,
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.1)',
      ...shadows.lg,
    },
    resultText: {
      fontSize: 22,
      fontWeight: '900',
      letterSpacing: 1,
    },
    dealerThinking: {
      opacity: 0.7,
    },
    thinkingText: {
      color: '#fff',
      fontStyle: 'italic',
      fontSize: 16,
    },
    controls: {
      padding: spacing.lg,
      paddingBottom: Platform.OS === 'ios' ? spacing.xxl : spacing.xxl,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    bettingPhase: {
      alignItems: 'center',
      gap: spacing.lg,
    },
    phaseTitle: {
      color: colors.textSecondary,
      fontWeight: '900',
      fontSize: 14,
      letterSpacing: 1,
    },
    chipContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      width: '100%',
    },
    chip: {
      width: 60,
      height: 60,
      borderRadius: 30,
      overflow: 'hidden',
      ...shadows.md,
    },
    chipDisabled: {
      opacity: 0.3,
    },
    chipGradient: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    chipInner: {
      width: 54,
      height: 54,
      borderRadius: 27,
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.4)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    chipText: {
      color: '#fff',
      fontWeight: '900',
      fontSize: 20,
      textShadowColor: 'rgba(0,0,0,0.5)',
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 2,
    },
    playingPhase: {
      gap: spacing.md,
    },
    mainActions: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    actionBtn: {
      flex: 1,
    },
    actionBtnText: {
      color: '#fff',
      fontWeight: '900',
      fontSize: 18,
      letterSpacing: 1,
    },
    doubleBtn: {
      width: '100%',
    },
    doubleBtnText: {
      color: colors.text,
      fontWeight: 'bold',
      fontSize: 14,
    },
    finishedPhase: {
      alignItems: 'center',
    },
    newHandBtn: {
      width: '80%',
    },
    gameFooter: {
      flexDirection: 'row',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
    },
    footerBtn: { flex: 1 },
    footerBtnText: { color: colors.text, fontWeight: 'bold', fontSize: 12 },
    bgIcon: {
      position: 'absolute',
      top: '40%',
      left: '-10%',
      fontSize: 200,
      opacity: 0.05,
      transform: [{ rotate: '-15deg' }],
    },
  });
