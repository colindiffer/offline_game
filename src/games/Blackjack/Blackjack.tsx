import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView, Dimensions } from 'react-native';
import Header from '../../components/Header';
import PlayingCard from '../../components/PlayingCard';
import TutorialScreen from '../../components/TutorialScreen';
import { useTheme } from '../../contexts/ThemeContext';
import { useSound } from '../../contexts/SoundContext';
import { getHighScore, setHighScore as saveHighScore } from '../../utils/storage';
import { recordGameResult } from '../../utils/stats';
import { Difficulty } from '../../types';
import { ThemeColors } from '../../utils/themes';
import { GAME_TUTORIALS } from '../../utils/tutorials';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlackjackGameState } from './types';
import {
  initializeBlackjackGame,
  dealInitialHand,
  playerHit,
  playerStand,
  playerDouble,
  dealerPlay,
} from './logic';

const SCREEN_WIDTH = Dimensions.get('window').width;
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
    AsyncStorage.getItem('@tutorial_blackjack').then(shown => {
      if (!shown) setShowTutorial(true);
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

  const getResultText = () => {
    if (!gameState.result) return '';
    
    switch (gameState.result) {
      case 'blackjack':
        return 'BLACKJACK! 🎉';
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
    if (!gameState.result) return colors.text;
    
    switch (gameState.result) {
      case 'blackjack':
      case 'win':
        return colors.success;
      case 'loss':
        return colors.error;
      case 'push':
        return colors.warning;
      default:
        return colors.text;
    }
  };

  if (showTutorial && GAME_TUTORIALS.blackjack) {
    return (
      <TutorialScreen
        gameName="Blackjack"
        steps={GAME_TUTORIALS.blackjack}
        onClose={handleTutorialClose}
      />
    );
  }

  const isGameOver = gameState.tokens <= 0 && gameState.gamePhase === 'finished';
  const showDealerSecondCard = gameState.gamePhase === 'dealer' || gameState.gamePhase === 'finished';

  return (
    <View style={styles.container}>
      <Header
        title="Blackjack"
        score={gameState.tokens}
        scoreLabel="Tokens"
        highScore={highScore}
        highScoreLabel="Best"
      />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Tokens and Bet Display */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Tokens</Text>
            <Text style={styles.statValue}>{gameState.tokens}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>High Score</Text>
            <Text style={styles.statValue}>{highScore}</Text>
          </View>
          {gameState.bet > 0 && (
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Current Bet</Text>
              <Text style={styles.statValue}>{gameState.bet}</Text>
            </View>
          )}
        </View>

        {/* Dealer's Hand */}
        <View style={styles.handSection}>
          <Text style={styles.handLabel}>
            Dealer's Hand
            {showDealerSecondCard && !gameState.dealerHand.isBust && 
              ` (${gameState.dealerHand.value})`}
            {gameState.dealerHand.isBust && ' (BUST!)'}
          </Text>
          <View style={styles.cardsContainer}>
            {gameState.dealerHand.cards.map((card, index) => (
              <PlayingCard
                key={card.id}
                card={card}
                faceDown={index === 1 && !showDealerSecondCard}
                size="medium"
              />
            ))}
            {gameState.dealerHand.cards.length === 0 && (
              <>
                <PlayingCard card={null} size="medium" />
                <PlayingCard card={null} size="medium" />
              </>
            )}
          </View>
        </View>

        {/* Player's Hand */}
        <View style={styles.handSection}>
          <Text style={styles.handLabel}>
            Your Hand ({gameState.playerHand.value})
            {gameState.playerHand.isBlackjack && ' - BLACKJACK!'}
            {gameState.playerHand.isBust && ' - BUST!'}
            {gameState.playerHand.isSoft && gameState.playerHand.value <= 21 && ' (Soft)'}
          </Text>
          <View style={styles.cardsContainer}>
            {gameState.playerHand.cards.map(card => (
              <PlayingCard key={card.id} card={card} size="medium" />
            ))}
            {gameState.playerHand.cards.length === 0 && (
              <>
                <PlayingCard card={null} size="medium" />
                <PlayingCard card={null} size="medium" />
              </>
            )}
          </View>
        </View>

        {/* Result Display */}
        {gameState.result && (
          <View style={styles.resultContainer}>
            <Text style={[styles.resultText, { color: getResultColor() }]}>
              {getResultText()}
            </Text>
          </View>
        )}

        {/* Game Over Message */}
        {isGameOver && (
          <View style={styles.gameOverContainer}>
            <Text style={styles.gameOverText}>GAME OVER</Text>
            <Text style={styles.gameOverSubtext}>You ran out of chips!</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          {gameState.gamePhase === 'betting' && (
            <View style={styles.bettingContainer}>
              <Text style={styles.bettingLabel}>Select Your Bet:</Text>
              <View style={styles.betButtonsContainer}>
                {BET_OPTIONS.map(bet => (
                  <TouchableOpacity
                    key={bet}
                    style={[
                      styles.betButton,
                      bet > gameState.tokens && styles.betButtonDisabled,
                    ]}
                    onPress={() => handleBetSelect(bet)}
                    disabled={bet > gameState.tokens}
                  >
                    <Text style={[
                      styles.betButtonText,
                      bet > gameState.tokens && styles.betButtonTextDisabled,
                    ]}>
                      {bet}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {gameState.gamePhase === 'playing' && (
            <View style={styles.playButtonsContainer}>
              <TouchableOpacity
                style={[styles.actionButton, styles.hitButton]}
                onPress={handleHit}
              >
                <Text style={styles.actionButtonText}>HIT</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.standButton]}
                onPress={handleStand}
              >
                <Text style={styles.actionButtonText}>STAND</Text>
              </TouchableOpacity>

              {gameState.canDouble && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.doubleButton]}
                  onPress={handleDouble}
                >
                  <Text style={styles.actionButtonText}>DOUBLE</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {gameState.gamePhase === 'dealer' && (
            <View style={styles.dealerPlayingContainer}>
              <Text style={styles.dealerPlayingText}>Dealer is playing...</Text>
            </View>
          )}

          {gameState.gamePhase === 'finished' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.newHandButton]}
              onPress={handleNewHand}
            >
              <Text style={styles.actionButtonText}>
                {isGameOver ? 'PLAY AGAIN' : 'NEW HAND'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      padding: 16,
      gap: 20,
    },
    statsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      gap: 10,
    },
    statBox: {
      backgroundColor: colors.surface,
      padding: 12,
      borderRadius: 8,
      flex: 1,
      alignItems: 'center',
    },
    statLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    statValue: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.primary,
    },
    handSection: {
      backgroundColor: colors.surface,
      padding: 16,
      borderRadius: 12,
    },
    handLabel: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 12,
    },
    cardsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      justifyContent: 'center',
    },
    resultContainer: {
      alignItems: 'center',
      padding: 16,
    },
    resultText: {
      fontSize: 28,
      fontWeight: 'bold',
    },
    gameOverContainer: {
      alignItems: 'center',
      padding: 20,
      backgroundColor: colors.error + '20',
      borderRadius: 12,
    },
    gameOverText: {
      fontSize: 32,
      fontWeight: 'bold',
      color: colors.error,
      marginBottom: 8,
    },
    gameOverSubtext: {
      fontSize: 16,
      color: colors.text,
    },
    actionContainer: {
      marginTop: 8,
    },
    bettingContainer: {
      alignItems: 'center',
    },
    bettingLabel: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 16,
    },
    betButtonsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      justifyContent: 'center',
    },
    betButton: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      paddingHorizontal: 28,
      borderRadius: 8,
      minWidth: 80,
      alignItems: 'center',
    },
    betButtonDisabled: {
      backgroundColor: colors.textSecondary,
      opacity: 0.5,
    },
    betButtonText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#FFFFFF',
    },
    betButtonTextDisabled: {
      color: colors.surface,
    },
    playButtonsContainer: {
      flexDirection: 'row',
      gap: 12,
      justifyContent: 'center',
      flexWrap: 'wrap',
    },
    actionButton: {
      paddingVertical: 16,
      paddingHorizontal: 32,
      borderRadius: 8,
      minWidth: 100,
      alignItems: 'center',
    },
    hitButton: {
      backgroundColor: colors.primary,
    },
    standButton: {
      backgroundColor: colors.warning,
    },
    doubleButton: {
      backgroundColor: colors.accent,
    },
    newHandButton: {
      backgroundColor: colors.success,
      alignSelf: 'center',
    },
    actionButtonText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#FFFFFF',
    },
    dealerPlayingContainer: {
      alignItems: 'center',
      padding: 20,
    },
    dealerPlayingText: {
      fontSize: 18,
      fontStyle: 'italic',
      color: colors.textSecondary,
    },
  });
