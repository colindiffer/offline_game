import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView, Dimensions, Alert } from 'react-native';
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
import { PokerGameState, HandRank } from './types';
import {
  initializePokerGame,
  dealInitialHands,
  drawCards,
  playerAction,
  getAIAction,
  getAIDiscards,
  determineWinners,
  startNewRound,
  evaluateHand,
} from './logic';

const SCREEN_WIDTH = Dimensions.get('window').width;
const INITIAL_CHIPS = 100;

interface Props {
  difficulty: Difficulty;
}

export default function Poker({ difficulty }: Props) {
  const { colors } = useTheme();
  const { playSound } = useSound();
  const styles = useMemo(() => getStyles(colors), [colors]);
  
  const [gameState, setGameState] = useState<PokerGameState>(() => {
    const initialState = initializePokerGame(difficulty, INITIAL_CHIPS);
    return dealInitialHands(initialState);
  });
  const [highScore, setHighScore] = useState(INITIAL_CHIPS);
  const [showTutorial, setShowTutorial] = useState(false);
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [raiseAmount, setRaiseAmount] = useState(10);
  
  const startTimeRef = useRef<number>(Date.now());
  const roundStartTimeRef = useRef<number>(Date.now());
  const aiProcessingRef = useRef<boolean>(false);

  useEffect(() => {
    getHighScore('poker', difficulty).then(score => {
      setHighScore(score || INITIAL_CHIPS);
    });
    AsyncStorage.getItem('@tutorial_poker').then(shown => {
      if (!shown) setShowTutorial(true);
    });
  }, [difficulty]);

  // Update high score when player tokens increase
  useEffect(() => {
    const playerTokens = gameState.players[0]?.tokens || 0;
    if (playerTokens > highScore) {
      setHighScore(playerTokens);
      saveHighScore('poker', playerTokens, difficulty);
    }
  }, [gameState.players, highScore, difficulty]);

  // Auto-process AI turns
  useEffect(() => {
    if (aiProcessingRef.current) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    
    if (!currentPlayer || currentPlayer.folded) return;
    
    if (currentPlayer.isAI) {
      aiProcessingRef.current = true;
      
      const timer = setTimeout(() => {
        if (gameState.gamePhase === 'betting' || gameState.gamePhase === 'finalBetting') {
          const aiDecision = getAIAction(gameState, gameState.currentPlayerIndex, difficulty);
          const newState = playerAction(gameState, aiDecision.action, aiDecision.amount);
          setGameState(newState);
        } else if (gameState.gamePhase === 'discard') {
          // AI discard phase
          const discards = getAIDiscards(currentPlayer.cards, difficulty);
          const newState = drawCards(gameState, gameState.currentPlayerIndex, discards);
          
          // Move to next player or final betting
          let nextIndex = (gameState.currentPlayerIndex + 1) % newState.players.length;
          while (newState.players[nextIndex].folded && nextIndex !== gameState.currentPlayerIndex) {
            nextIndex = (nextIndex + 1) % newState.players.length;
          }
          
          // Check if discard phase is complete
          if (nextIndex === 0 || gameState.players.filter(p => !p.folded).length === 1) {
            setGameState({
              ...newState,
              gamePhase: 'finalBetting',
              currentPlayerIndex: (gameState.button + 1) % newState.players.length,
            });
          } else {
            setGameState({
              ...newState,
              currentPlayerIndex: nextIndex,
            });
          }
        }
        
        aiProcessingRef.current = false;
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [gameState, difficulty]);

  // Handle showdown
  useEffect(() => {
    if (gameState.gamePhase === 'showdown') {
      const timer = setTimeout(() => {
        const finalState = determineWinners(gameState);
        setGameState(finalState);
        
        // Record result
        const roundDuration = Math.floor((Date.now() - roundStartTimeRef.current) / 1000);
        const playerWon = finalState.players[0].hand && 
          finalState.players.filter(p => !p.folded && p.hand?.rank === finalState.players[0].hand?.rank).length > 0;
        
        if (playerWon) {
          recordGameResult('poker', 'win', roundDuration);
          playSound('win');
        } else {
          recordGameResult('poker', 'loss', roundDuration);
          playSound('lose');
        }
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [gameState.gamePhase, playSound]);

  const handleTutorialClose = useCallback(() => {
    AsyncStorage.setItem('@tutorial_poker', 'true');
    setShowTutorial(false);
  }, []);

  const handleCardSelect = useCallback((index: number) => {
    if (gameState.gamePhase !== 'discard' || gameState.currentPlayerIndex !== 0) return;
    
    playSound('tap');
    setSelectedCards(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      }
      return [...prev, index];
    });
  }, [gameState.gamePhase, gameState.currentPlayerIndex, playSound]);

  const handleDiscard = useCallback(() => {
    if (gameState.gamePhase !== 'discard' || gameState.currentPlayerIndex !== 0) return;
    
    playSound('tap');
    const newState = drawCards(gameState, 0, selectedCards);
    setSelectedCards([]);
    
    // Move to next player or final betting
    let nextIndex = 1;
    while (nextIndex < newState.players.length && newState.players[nextIndex].folded) {
      nextIndex++;
    }
    
    if (nextIndex >= newState.players.length || newState.players.filter(p => !p.folded).length === 1) {
      setGameState({
        ...newState,
        gamePhase: 'finalBetting',
        currentPlayerIndex: (gameState.button + 1) % newState.players.length,
      });
    } else {
      setGameState({
        ...newState,
        currentPlayerIndex: nextIndex,
      });
    }
  }, [gameState, selectedCards, playSound]);

  const handleFold = useCallback(() => {
    if (gameState.currentPlayerIndex !== 0) return;
    
    playSound('tap');
    const newState = playerAction(gameState, 'fold');
    setGameState(newState);
  }, [gameState, playSound]);

  const handleCall = useCallback(() => {
    if (gameState.currentPlayerIndex !== 0) return;
    
    playSound('tap');
    const newState = playerAction(gameState, 'call');
    setGameState(newState);
  }, [gameState, playSound]);

  const handleRaise = useCallback(() => {
    if (gameState.currentPlayerIndex !== 0) return;
    
    const player = gameState.players[0];
    const callAmount = gameState.roundBet - player.bet;
    
    if (player.tokens < callAmount + raiseAmount) {
      Alert.alert('Insufficient Tokens', 'You do not have enough tokens to raise this amount.');
      return;
    }
    
    playSound('tap');
    const newState = playerAction(gameState, 'raise', raiseAmount);
    setGameState(newState);
  }, [gameState, raiseAmount, playSound]);

  const handleNewRound = useCallback(() => {
    playSound('tap');
    
    const player = gameState.players[0];
    if (!player || player.tokens <= 0) {
      // Game over - restart
      const totalGameDuration = Math.floor((Date.now() - startTimeRef.current) / 1000);
      recordGameResult('poker', 'loss', totalGameDuration);
      startTimeRef.current = Date.now();
      roundStartTimeRef.current = Date.now();
      const newState = initializePokerGame(difficulty, INITIAL_CHIPS);
      setGameState(dealInitialHands(newState));
    } else {
      // Start new round
      roundStartTimeRef.current = Date.now();
      const newState = startNewRound(gameState);
      setGameState(newState);
    }
    
    setSelectedCards([]);
  }, [gameState, difficulty, playSound]);

  const getPhaseDescription = () => {
    if (gameState.gamePhase === 'betting') return 'First Betting Round';
    if (gameState.gamePhase === 'discard') return 'Discard & Draw Phase';
    if (gameState.gamePhase === 'finalBetting') return 'Final Betting Round';
    if (gameState.gamePhase === 'showdown') return 'Showdown!';
    if (gameState.gamePhase === 'finished') return 'Round Complete';
    return '';
  };

  const getCurrentPlayerName = () => {
    const player = gameState.players[gameState.currentPlayerIndex];
    return player ? player.name : '';
  };

  const getCallAmount = () => {
    const player = gameState.players[0];
    if (!player) return 0;
    return Math.max(0, gameState.roundBet - player.bet);
  };

  const canCheck = () => {
    const player = gameState.players[0];
    return player && player.bet === gameState.roundBet;
  };

  const renderPlayer = (playerIndex: number, isTopPlayer: boolean = false) => {
    const player = gameState.players[playerIndex];
    if (!player) return null;

    const isCurrentPlayer = gameState.currentPlayerIndex === playerIndex;
    const isDealer = gameState.button === playerIndex;
    const showCards = !player.isAI || gameState.gamePhase === 'showdown' || gameState.gamePhase === 'finished';

    return (
      <View style={[styles.playerContainer, isTopPlayer && styles.topPlayerContainer]}>
        <View style={styles.playerInfo}>
          <Text style={[styles.playerName, player.folded && styles.foldedText]}>
            {player.name} {isDealer && '🔘'}
          </Text>
          <Text style={styles.playerChips}>💰 {player.tokens}</Text>
          {player.bet > 0 && (
            <Text style={styles.playerBet}>Bet: {player.bet}</Text>
          )}
          {player.folded && (
            <Text style={styles.foldedLabel}>FOLDED</Text>
          )}
          {player.hand && (
            <Text style={styles.handRank}>{player.hand.description}</Text>
          )}
        </View>
        
        {!player.folded && (
          <View style={[styles.cardsContainer, isCurrentPlayer && styles.currentPlayerBorder]}>
            {player.cards.map((card, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => handleCardSelect(i)}
                disabled={playerIndex !== 0 || gameState.gamePhase !== 'discard'}
              >
                <View style={[
                  styles.cardWrapper,
                  playerIndex === 0 && selectedCards.includes(i) && styles.selectedCard,
                ]}>
                  <PlayingCard
                    card={card}
                    faceDown={!showCards}
                    size="small"
                  />
                  {playerIndex === 0 && selectedCards.includes(i) && (
                    <Text style={styles.discardLabel}>DISCARD</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  if (showTutorial) {
    return (
      <TutorialScreen
        gameName="Poker"
        steps={GAME_TUTORIALS.poker}
        onClose={handleTutorialClose}
      />
    );
  }

  const player = gameState.players[0];
  const isPlayerTurn = gameState.currentPlayerIndex === 0 && !player?.folded;
  const callAmount = getCallAmount();

  return (
    <View style={styles.container}>
      <Header
        title="Poker"
        score={player?.tokens || 0}
        scoreLabel="Tokens"
        highScore={highScore}
        highScoreLabel="Best"
      />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Top AI players */}
        <View style={styles.topPlayersRow}>
          {gameState.players.slice(1).map((p, i) => renderPlayer(i + 1, true))}
        </View>

        {/* Pot */}
        <View style={styles.potContainer}>
          <Text style={styles.potLabel}>POT</Text>
          <Text style={styles.potAmount}>💰 {gameState.pot}</Text>
          <Text style={styles.phaseText}>{getPhaseDescription()}</Text>
          {!isPlayerTurn && gameState.gamePhase !== 'finished' && gameState.gamePhase !== 'showdown' && (
            <Text style={styles.turnText}>{getCurrentPlayerName()}'s turn...</Text>
          )}
        </View>

        {/* Player (bottom) */}
        {player && renderPlayer(0)}

        {/* Action buttons */}
        {isPlayerTurn && (
          <View style={styles.actionsContainer}>
            {(gameState.gamePhase === 'betting' || gameState.gamePhase === 'finalBetting') && (
              <>
                <TouchableOpacity
                  style={[styles.button, styles.foldButton]}
                  onPress={handleFold}
                >
                  <Text style={styles.buttonText}>Fold</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.callButton]}
                  onPress={handleCall}
                >
                  <Text style={styles.buttonText}>
                    {canCheck() ? 'Check' : `Call ${callAmount}`}
                  </Text>
                </TouchableOpacity>

                {player.tokens > callAmount && (
                  <View style={styles.raiseContainer}>
                    <TouchableOpacity
                      style={[styles.button, styles.raiseButton]}
                      onPress={handleRaise}
                    >
                      <Text style={styles.buttonText}>Raise {raiseAmount}</Text>
                    </TouchableOpacity>
                    <View style={styles.raiseButtons}>
                      <TouchableOpacity
                        style={styles.raiseAdjustButton}
                        onPress={() => setRaiseAmount(Math.max(10, raiseAmount - 10))}
                      >
                        <Text style={styles.raiseAdjustText}>-</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.raiseAdjustButton}
                        onPress={() => setRaiseAmount(raiseAmount + 10)}
                      >
                        <Text style={styles.raiseAdjustText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </>
            )}

            {gameState.gamePhase === 'discard' && (
              <View style={styles.discardActions}>
                <Text style={styles.discardInstructions}>
                  Select cards to discard (tap cards above)
                </Text>
                <TouchableOpacity
                  style={[styles.button, styles.drawButton]}
                  onPress={handleDiscard}
                >
                  <Text style={styles.buttonText}>
                    {selectedCards.length === 0 ? 'Stand Pat' : `Draw ${selectedCards.length}`}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* New round button */}
        {gameState.gamePhase === 'finished' && (
          <TouchableOpacity
            style={[styles.button, styles.newRoundButton]}
            onPress={handleNewRound}
          >
            <Text style={styles.buttonText}>
              {player && player.tokens > 0 ? 'Next Round' : 'New Game'}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

function getStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      padding: 16,
    },
    topPlayersRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: 20,
    },
    playerContainer: {
      marginBottom: 16,
      padding: 12,
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.primary + '30',
    },
    topPlayerContainer: {
      flex: 1,
      marginHorizontal: 4,
      marginBottom: 0,
    },
    playerInfo: {
      marginBottom: 8,
    },
    playerName: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 4,
    },
    playerChips: {
      fontSize: 14,
      color: colors.success,
      marginBottom: 2,
    },
    playerBet: {
      fontSize: 12,
      color: colors.warning,
    },
    foldedText: {
      color: colors.textSecondary,
      textDecorationLine: 'line-through',
    },
    foldedLabel: {
      fontSize: 12,
      color: colors.error,
      fontWeight: 'bold',
    },
    handRank: {
      fontSize: 12,
      color: colors.accent,
      fontWeight: 'bold',
      marginTop: 4,
    },
    cardsContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
    },
    currentPlayerBorder: {
      borderWidth: 2,
      borderColor: colors.accent,
      borderRadius: 8,
      padding: 8,
    },
    cardWrapper: {
      position: 'relative',
    },
    selectedCard: {
      opacity: 0.6,
      transform: [{ translateY: -10 }],
    },
    discardLabel: {
      position: 'absolute',
      top: -15,
      left: 0,
      right: 0,
      textAlign: 'center',
      fontSize: 10,
      fontWeight: 'bold',
      color: colors.error,
    },
    potContainer: {
      alignItems: 'center',
      padding: 20,
      backgroundColor: colors.surface,
      borderRadius: 16,
      marginBottom: 20,
      borderWidth: 3,
      borderColor: colors.accent,
    },
    potLabel: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.textSecondary,
      marginBottom: 4,
    },
    potAmount: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.success,
      marginBottom: 8,
    },
    phaseText: {
      fontSize: 14,
      color: colors.accent,
      fontWeight: '600',
    },
    turnText: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
      fontStyle: 'italic',
    },
    actionsContainer: {
      gap: 12,
      marginTop: 16,
    },
    button: {
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#FFFFFF',
    },
    foldButton: {
      backgroundColor: colors.error,
    },
    callButton: {
      backgroundColor: colors.primary,
    },
    raiseContainer: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
    },
    raiseButton: {
      flex: 1,
      backgroundColor: colors.success,
    },
    raiseButtons: {
      flexDirection: 'column',
      gap: 4,
    },
    raiseAdjustButton: {
      width: 40,
      height: 28,
      backgroundColor: colors.surface,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.primary,
    },
    raiseAdjustText: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
    },
    drawButton: {
      backgroundColor: colors.accent,
    },
    newRoundButton: {
      backgroundColor: colors.primary,
      marginTop: 16,
    },
    discardActions: {
      alignItems: 'center',
    },
    discardInstructions: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 12,
    },
  });
}
