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
import { HeartsGameState } from './types';
import {
  initializeHeartsGame,
  passCards,
  playCard,
  canPlayCard,
  getAICardsToPass,
  getAICardToPlay,
  startNewRound,
} from './logic';
import { Card } from '../../types/cards';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface Props {
  difficulty: Difficulty;
}

export default function Hearts({ difficulty }: Props) {
  const { colors } = useTheme();
  const { playSound } = useSound();
  const styles = useMemo(() => getStyles(colors), [colors]);
  
  const [gameState, setGameState] = useState<HeartsGameState>(() => 
    initializeHeartsGame(difficulty)
  );
  const [highScore, setHighScore] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  
  const startTimeRef = useRef<number>(Date.now());
  const roundStartTimeRef = useRef<number>(Date.now());
  const aiProcessingRef = useRef<boolean>(false);

  useEffect(() => {
    getHighScore('hearts', difficulty).then(score => {
      setHighScore(score || 0);
    });
    AsyncStorage.getItem('@tutorial_hearts').then(shown => {
      if (!shown) setShowTutorial(true);
    });
  }, [difficulty]);

  // Update high score (lower is better, so we store as negative for sorting)
  useEffect(() => {
    if (gameState.gamePhase === 'gameOver') {
      const playerScore = gameState.players[0].totalScore;
      // Store negative score so lower scores appear higher in leaderboard
      const scoreValue = 1000 - playerScore; // Max 1000, lower actual score = higher stored score
      if (scoreValue > highScore) {
        setHighScore(scoreValue);
        saveHighScore('hearts', scoreValue, difficulty);
      }
    }
  }, [gameState.gamePhase, gameState.players, highScore, difficulty]);

  // Auto-process AI turns during passing phase
  useEffect(() => {
    if (gameState.gamePhase === 'passing' && !aiProcessingRef.current) {
      aiProcessingRef.current = true;
      
      const timer = setTimeout(() => {
        let newState = { ...gameState };
        
        // Get AI players who haven't passed yet
        const aiPlayersNeedingToPass = gameState.players.filter(
          p => !p.isHuman && !gameState.passedCards.some(pc => pc.fromId === p.id)
        );

        aiPlayersNeedingToPass.forEach(player => {
          const cardsToPass = getAICardsToPass(player, difficulty);
          newState = passCards(newState, player.id, cardsToPass);
        });

        setGameState(newState);
        aiProcessingRef.current = false;
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [gameState, difficulty]);

  // Auto-process AI turns during playing phase
  useEffect(() => {
    if (gameState.gamePhase === 'playing' && !aiProcessingRef.current) {
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      
      if (currentPlayer && !currentPlayer.isHuman) {
        aiProcessingRef.current = true;
        
        const timer = setTimeout(() => {
          const cardToPlay = getAICardToPlay(gameState, gameState.currentPlayerIndex, difficulty);
          const newState = playCard(gameState, gameState.currentPlayerIndex, cardToPlay);
          setGameState(newState);
          playSound('tap');
          aiProcessingRef.current = false;
        }, 800);

        return () => clearTimeout(timer);
      }
    }
  }, [gameState, difficulty, playSound]);

  // Handle round end
  useEffect(() => {
    if (gameState.gamePhase === 'roundEnd') {
      const roundDuration = Math.floor((Date.now() - roundStartTimeRef.current) / 1000);
      const playerScore = gameState.players[0].score;
      
      if (playerScore === 0) {
        // Player did well (shot the moon or avoided points)
        recordGameResult('hearts', 'win', roundDuration);
        playSound('win');
      } else if (playerScore >= 13) {
        recordGameResult('hearts', 'loss', roundDuration);
        playSound('lose');
      } else {
        playSound('tap');
      }
    }
  }, [gameState.gamePhase, gameState.players, playSound]);

  const handleTutorialClose = useCallback(() => {
    AsyncStorage.setItem('@tutorial_hearts', 'true');
    setShowTutorial(false);
  }, []);

  const handleCardSelect = useCallback((card: Card) => {
    if (gameState.gamePhase === 'passing') {
      // Toggle card selection for passing
      const isSelected = selectedCards.some(c => c.id === card.id);
      if (isSelected) {
        setSelectedCards(selectedCards.filter(c => c.id !== card.id));
      } else if (selectedCards.length < 3) {
        setSelectedCards([...selectedCards, card]);
      }
      playSound('tap');
    } else if (gameState.gamePhase === 'playing' && gameState.currentPlayerIndex === 0) {
      // Play card
      const player = gameState.players[0];
      if (canPlayCard(gameState, player, card)) {
        const newState = playCard(gameState, 0, card);
        setGameState(newState);
        playSound('tap');
      }
    }
  }, [gameState, selectedCards, playSound]);

  const handlePassCards = useCallback(() => {
    if (selectedCards.length === 3) {
      const newState = passCards(gameState, 0, selectedCards);
      setGameState(newState);
      setSelectedCards([]);
      playSound('tap');
    }
  }, [gameState, selectedCards, playSound]);

  const handleNewRound = useCallback(() => {
    const newState = startNewRound(gameState);
    setGameState(newState);
    setSelectedCards([]);
    roundStartTimeRef.current = Date.now();
    playSound('tap');
  }, [gameState, playSound]);

  const handleNewGame = useCallback(() => {
    const newState = initializeHeartsGame(difficulty);
    setGameState(newState);
    setSelectedCards([]);
    startTimeRef.current = Date.now();
    roundStartTimeRef.current = Date.now();
    playSound('tap');
  }, [difficulty, playSound]);

  const getPassDirectionText = () => {
    switch (gameState.passDirection) {
      case 'left': return 'Pass 3 cards LEFT';
      case 'right': return 'Pass 3 cards RIGHT';
      case 'across': return 'Pass 3 cards ACROSS';
      case 'none': return 'No passing this round';
      default: return '';
    }
  };

  const renderPlayer = (playerIndex: number, position: 'top' | 'left' | 'right') => {
    const player = gameState.players[playerIndex];
    if (!player) return null;

    const containerStyle = position === 'top' ? styles.topPlayer :
                          position === 'left' ? styles.leftPlayer :
                          styles.rightPlayer;

    return (
      <View style={containerStyle}>
        <View style={styles.playerInfo}>
          <Text style={styles.playerName}>{player.name}</Text>
          <Text style={styles.playerScore}>
            {player.score > 0 && `+${player.score} `}
            Total: {player.totalScore}
          </Text>
        </View>
        <View style={styles.playerCardCount}>
          <Text style={styles.cardCountText}>{player.cards.length} cards</Text>
        </View>
      </View>
    );
  };

  const renderTrick = () => {
    if (gameState.currentTrick.cards.length === 0) return null;

    return (
      <View style={styles.trickContainer}>
        {gameState.currentTrick.cards.map((tc, index) => {
          const player = gameState.players[tc.playerId];
          const positionStyle = 
            tc.playerId === 0 ? styles.trickCardBottom :
            tc.playerId === 1 ? styles.trickCardLeft :
            tc.playerId === 2 ? styles.trickCardTop :
            styles.trickCardRight;

          return (
            <View key={index} style={[styles.trickCard, positionStyle]}>
              <PlayingCard card={tc.card} size="medium" faceDown={false} />
              <Text style={styles.trickPlayerName}>{player.name}</Text>
            </View>
          );
        })}
      </View>
    );
  };

  if (showTutorial) {
    return (
      <TutorialScreen
        gameName="Hearts"
        steps={GAME_TUTORIALS.hearts}
        onClose={handleTutorialClose}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Header 
        title="Hearts"
        highScore={highScore}
        highScoreLabel={`Best: ${1000 - highScore} pts`}
      />

      <ScrollView style={styles.gameArea} contentContainerStyle={styles.gameContent}>
        {/* Top Player */}
        {renderPlayer(2, 'top')}

        {/* Middle Section with Left Player, Trick Area, Right Player */}
        <View style={styles.middleSection}>
          {renderPlayer(1, 'left')}
          
          <View style={styles.centerArea}>
            {renderTrick()}
            
            {gameState.gamePhase === 'playing' && (
              <View style={styles.gameInfo}>
                {gameState.heartsBroken && (
                  <Text style={styles.infoText}>♥ Hearts Broken</Text>
                )}
                {gameState.leadSuit && (
                  <Text style={styles.infoText}>
                    Lead: {gameState.leadSuit}
                  </Text>
                )}
                <Text style={styles.infoText}>Round {gameState.roundNumber}</Text>
              </View>
            )}
          </View>
          
          {renderPlayer(3, 'right')}
        </View>

        {/* Human Player */}
        <View style={styles.humanPlayer}>
          <View style={styles.playerInfo}>
            <Text style={styles.playerName}>{gameState.players[0].name}</Text>
            <Text style={styles.playerScore}>
              {gameState.players[0].score > 0 && `+${gameState.players[0].score} `}
              Total: {gameState.players[0].totalScore}
            </Text>
          </View>

          {gameState.gamePhase === 'passing' && gameState.passDirection !== 'none' && (
            <View style={styles.passingSection}>
              <Text style={styles.passDirectionText}>{getPassDirectionText()}</Text>
              <TouchableOpacity
                style={[
                  styles.passButton,
                  selectedCards.length !== 3 && styles.passButtonDisabled
                ]}
                onPress={handlePassCards}
                disabled={selectedCards.length !== 3}
              >
                <Text style={styles.passButtonText}>
                  Pass Cards ({selectedCards.length}/3)
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <ScrollView 
            horizontal 
            style={styles.handScrollView}
            contentContainerStyle={styles.handContainer}
            showsHorizontalScrollIndicator={false}
          >
            {gameState.players[0].cards.map((card, index) => {
              const isSelected = selectedCards.some(c => c.id === card.id);
              const isLegal = gameState.gamePhase === 'playing' && 
                             gameState.currentPlayerIndex === 0 &&
                             canPlayCard(gameState, gameState.players[0], card);
              
              return (
                <TouchableOpacity
                  key={card.id}
                  onPress={() => handleCardSelect(card)}
                  disabled={
                    (gameState.gamePhase === 'playing' && gameState.currentPlayerIndex !== 0) ||
                    (gameState.gamePhase === 'playing' && !isLegal)
                  }
                  style={[
                    styles.cardWrapper,
                    isSelected && styles.selectedCard,
                  ]}
                >
                  <PlayingCard 
                    card={card} 
                    size="medium" 
                    faceDown={false} 
                    style={!isLegal && gameState.gamePhase === 'playing' && gameState.currentPlayerIndex === 0 
                      ? styles.illegalCard 
                      : undefined
                    }
                  />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Round End Screen */}
        {gameState.gamePhase === 'roundEnd' && (
          <View style={styles.modal}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Round {gameState.roundNumber} Complete</Text>
              
              {gameState.players.map(player => (
                <View key={player.id} style={styles.scoreRow}>
                  <Text style={styles.scoreName}>{player.name}</Text>
                  <Text style={styles.scoreValue}>
                    +{player.score} (Total: {player.totalScore})
                  </Text>
                </View>
              ))}

              {gameState.players.some(p => p.score === 0 && gameState.completedTricks.length > 0) && (
                <Text style={styles.moonText}>
                  {gameState.players.find(p => p.score === 0)?.name} shot the moon!
                </Text>
              )}

              <TouchableOpacity style={styles.continueButton} onPress={handleNewRound}>
                <Text style={styles.continueButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Game Over Screen */}
        {gameState.gamePhase === 'gameOver' && (
          <View style={styles.modal}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Game Over</Text>
              
              {[...gameState.players]
                .sort((a, b) => a.totalScore - b.totalScore)
                .map((player, index) => (
                  <View key={player.id} style={styles.scoreRow}>
                    <Text style={styles.scoreName}>
                      {index === 0 ? '🏆 ' : ''}{player.name}
                    </Text>
                    <Text style={styles.scoreValue}>{player.totalScore} points</Text>
                  </View>
                ))}

              {gameState.players[0].totalScore === 
                Math.min(...gameState.players.map(p => p.totalScore)) && (
                <Text style={styles.winText}>You Win! 🎉</Text>
              )}

              <TouchableOpacity style={styles.continueButton} onPress={handleNewGame}>
                <Text style={styles.continueButtonText}>New Game</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  gameArea: {
    flex: 1,
  },
  gameContent: {
    padding: 10,
  },
  topPlayer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  leftPlayer: {
    width: 80,
  },
  rightPlayer: {
    width: 80,
  },
  playerInfo: {
    backgroundColor: colors.surface,
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 5,
  },
  playerName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  playerScore: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  playerCardCount: {
    backgroundColor: colors.primary,
    padding: 4,
    borderRadius: 4,
    alignItems: 'center',
  },
  cardCountText: {
    fontSize: 11,
    color: 'white',
    fontWeight: 'bold',
  },
  middleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 20,
  },
  centerArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
  },
  trickContainer: {
    width: 200,
    height: 200,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trickCard: {
    position: 'absolute',
    alignItems: 'center',
  },
  trickCardBottom: {
    bottom: 0,
  },
  trickCardTop: {
    top: 0,
  },
  trickCardLeft: {
    left: 0,
  },
  trickCardRight: {
    right: 0,
  },
  trickPlayerName: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  gameInfo: {
    alignItems: 'center',
    marginTop: 10,
  },
  infoText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginVertical: 2,
  },
  humanPlayer: {
    marginTop: 20,
  },
  passingSection: {
    alignItems: 'center',
    marginBottom: 10,
  },
  passDirectionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  passButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  passButtonDisabled: {
    backgroundColor: colors.textSecondary,
  },
  passButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  handScrollView: {
    flexGrow: 0,
  },
  handContainer: {
    flexDirection: 'row',
    paddingHorizontal: 10,
  },
  cardWrapper: {
    marginHorizontal: 2,
  },
  selectedCard: {
    transform: [{ translateY: -20 }],
  },
  illegalCard: {
    opacity: 0.5,
  },
  modal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 12,
    minWidth: 300,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 20,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.textSecondary,
  },
  scoreName: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
  },
  scoreValue: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  moonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: 'bold',
    marginTop: 10,
  },
  winText: {
    fontSize: 18,
    color: colors.success,
    fontWeight: 'bold',
    marginTop: 10,
  },
  continueButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  continueButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
