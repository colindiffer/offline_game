import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Header from '../../components/Header';
import PlayingCard from '../../components/PlayingCard';
import TutorialScreen from '../../components/TutorialScreen';
import PremiumButton from '../../components/PremiumButton';
import GameOverOverlay from '../../components/GameOverOverlay';
import { useTheme } from '../../contexts/ThemeContext';
import { useSound } from '../../contexts/SoundContext';
import { getHighScore, setHighScore as saveHighScore } from '../../utils/storage';
import { recordGameResult } from '../../utils/stats';
import { Difficulty } from '../../types';
import { ThemeColors } from '../../utils/themes';
import { GAME_TUTORIALS } from '../../utils/tutorials';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HeartsGameState } from './types';
import { spacing, radius, shadows, typography } from '../../utils/designTokens';
import {
  initializeHeartsGame,
  passCards,
  playCard,
  canPlayCard,
  getAICardsToPass,
  getAICardToPlay,
  startNewRound,
  collectTrick,
} from './logic';
import { Card } from '../../types/cards';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_PADDING = 16;
const AVAILABLE_WIDTH = SCREEN_WIDTH - (SCREEN_PADDING * 2);
const CARD_WIDTH = Math.floor(AVAILABLE_WIDTH / 5.5); // Reduced card size
const CARD_HEIGHT = Math.floor(CARD_WIDTH * 1.4);

// To fill the width with 13 cards: 12 * (CARD_WIDTH - Overlap) + CARD_WIDTH = AVAILABLE_WIDTH
// 12 * Overlap = 13 * CARD_WIDTH - AVAILABLE_WIDTH
const OVERLAP = (13 * CARD_WIDTH - AVAILABLE_WIDTH) / 12;

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
  const [paused, setPaused] = useState(false);

  const startTimeRef = useRef<number>(Date.now());
  const roundStartTimeRef = useRef<number>(Date.now());
  const aiProcessingRef = useRef<boolean>(false);
  const pausedRef = useRef(false);
  pausedRef.current = paused;

  useEffect(() => {
    getHighScore('hearts', difficulty).then(score => {
      setHighScore(score || 0);
    });
    AsyncStorage.getItem('@tutorial_hearts').then(shown => {
      if (!shown) setShowTutorial(true);
    });
  }, [difficulty]);

  useEffect(() => {
    if (gameState.gamePhase === 'gameOver') {
      const playerScore = gameState.players[0].totalScore;
      const scoreValue = 1000 - playerScore;
      if (scoreValue > highScore) {
        setHighScore(scoreValue);
        saveHighScore('hearts', scoreValue, difficulty);
      }
    }
  }, [gameState.gamePhase, gameState.players, highScore, difficulty]);

  // AI Passing
  useEffect(() => {
    if (gameState.gamePhase !== 'passing' || aiProcessingRef.current || paused) return;

    const needsPassing = gameState.players.some(
      p => !p.isHuman && !gameState.passedCards.some(pc => pc.fromId === p.id)
    );

    if (needsPassing) {
      aiProcessingRef.current = true;
      const timer = setTimeout(() => {
        setGameState(prev => {
          let newState = { ...prev };
          const aiPlayersNeedingToPass = prev.players.filter(
            p => !p.isHuman && !prev.passedCards.some(pc => pc.fromId === p.id)
          );

          aiPlayersNeedingToPass.forEach(player => {
            const cardsToPass = getAICardsToPass(player, difficulty);
            newState = passCards(newState, player.id, cardsToPass);
          });

          aiProcessingRef.current = false;
          return newState;
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [gameState.gamePhase, gameState.passedCards.length, difficulty, paused]);

  // AI Playing
  useEffect(() => {
    if (gameState.gamePhase !== 'playing' || aiProcessingRef.current || gameState.currentTrick.cards.length === 4 || paused) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer && !currentPlayer.isHuman) {
      aiProcessingRef.current = true;
      const timer = setTimeout(() => {
        setGameState(prev => {
          const cardToPlay = getAICardToPlay(prev, prev.currentPlayerIndex, difficulty);
          const newState = playCard(prev, prev.currentPlayerIndex, cardToPlay);
          aiProcessingRef.current = false;
          return newState;
        });
        playSound('tap');
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [gameState.currentPlayerIndex, gameState.gamePhase, gameState.currentTrick.cards.length, difficulty, playSound, paused]);

  // Trick Completion Delay
  useEffect(() => {
    if (gameState.gamePhase === 'playing' && gameState.currentTrick.cards.length === 4 && !paused) {
      const timer = setTimeout(() => {
        setGameState(prev => collectTrick(prev));
      }, 1500); // 1.5s delay to see the cards
      return () => clearTimeout(timer);
    }
  }, [gameState.currentTrick.cards.length, gameState.gamePhase, paused]);

  // Round End / Game Over
  useEffect(() => {
    if (gameState.gamePhase === 'roundEnd') {
      const roundDuration = Math.floor((Date.now() - roundStartTimeRef.current) / 1000);
      const playerScore = gameState.players[0].score;
      if (playerScore === 0 && gameState.completedTricks.length > 0) {
        recordGameResult('hearts', 'win', roundDuration);
        playSound('win');
      } else if (playerScore >= 13) {
        recordGameResult('hearts', 'loss', roundDuration);
        playSound('lose');
      } else {
        playSound('tap');
      }
    }
  }, [gameState.gamePhase, playSound]);

  const handleTutorialClose = useCallback(() => {
    AsyncStorage.setItem('@tutorial_hearts', 'true');
    setShowTutorial(false);
  }, []);

  const handleCardSelect = useCallback((card: Card) => {
    if (paused) return;
    if (gameState.gamePhase === 'passing') {
      const isSelected = selectedCards.some(c => c.id === card.id);
      if (isSelected) {
        setSelectedCards(selectedCards.filter(c => c.id !== card.id));
      } else if (selectedCards.length < 3) {
        setSelectedCards([...selectedCards, card]);
      }
      playSound('tap');
    } else if (gameState.gamePhase === 'playing' && gameState.currentPlayerIndex === 0) {
      const player = gameState.players[0];
      if (canPlayCard(gameState, player, card)) {
        const newState = playCard(gameState, 0, card);
        setGameState(newState);
        playSound('tap');
      } else {
        playSound('error'); // Indicate illegal move
      }
    }
  }, [gameState, selectedCards, playSound, paused]);

  // Remove handleTrickZoneTap as cards are played directly
  const handlePassCards = useCallback(() => {
    if (selectedCards.length === 3 && !paused) {
      const newState = passCards(gameState, 0, selectedCards);
      setGameState(newState);
      setSelectedCards([]);
      playSound('tap');
    }
  }, [gameState, selectedCards, playSound, paused]);

  const handleNewRound = useCallback(() => {
    const newState = startNewRound(gameState);
    setGameState(newState);
    setSelectedCards([]);
    setPaused(false);
    roundStartTimeRef.current = Date.now();
    playSound('tap');
  }, [gameState, playSound]);

  const handleNewGame = useCallback(() => {
    const newState = initializeHeartsGame(difficulty);
    setGameState(newState);
    setSelectedCards([]);
    setPaused(false);
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

  const renderPlayerBadge = (playerIndex: number, position: 'top' | 'left' | 'right') => {
    const player = gameState.players[playerIndex];
    if (!player) return null;
    const isCurrent = gameState.currentPlayerIndex === playerIndex;

    return (
      <View style={[styles.playerBadge, position === 'top' ? styles.topPlayer : position === 'left' ? styles.leftPlayer : styles.rightPlayer]}>
        <View style={[styles.avatarContainer, isCurrent && styles.activeAvatar]}>
          <Text style={styles.avatarText}>{player.name.charAt(0)}</Text>
        </View>
        <View style={styles.playerMeta}>
          <Text style={styles.playerNameText}>{player.name}</Text>
          <Text style={styles.playerScoreText}>Score: {player.totalScore}</Text>
          {player.score > 0 && <Text style={styles.roundPoints}>+{player.score}</Text>}
        </View>
        <View style={styles.cardIndicator}>
          <Text style={styles.cardIndicatorText}>{player.cards.length} C</Text>
        </View>
      </View>
    );
  };

  const renderTrick = () => {
    if (gameState.currentTrick.cards.length === 0) return null;
    return (
      <View style={styles.trickTable}>
        {gameState.currentTrick.cards.map((tc, index) => {
          const positionStyle =
            tc.playerId === 0 ? styles.trickCardBottom :
              tc.playerId === 1 ? styles.trickCardLeft :
                tc.playerId === 2 ? styles.trickCardTop :
                  styles.trickCardRight;

          return (
            <View key={index} style={[styles.trickCardStack, positionStyle]}>
              <PlayingCard card={tc.card} width={CARD_WIDTH} height={CARD_HEIGHT} faceDown={false} />
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
      <Text style={[styles.bgIcon, { color: '#fff' }]}>♥️</Text>
      <LinearGradient colors={['#1b4332', '#081c15']} style={StyleSheet.absoluteFill} />

      <Header
        title="Hearts"
        score={gameState.players[0].totalScore}
        scoreLabel="TOTAL"
        highScore={highScore}
        highScoreLabel={`BEST: ${1000 - highScore} PTS`}
        light
        onPause={() => setPaused(!paused)}
        isPaused={paused}
      />

      <View style={styles.tableArea}>
        {renderPlayerBadge(2, 'top')}
        <View style={styles.sidePlayers}>
          {renderPlayerBadge(1, 'left')}
          {renderPlayerBadge(3, 'right')}
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          // onPress={handleTrickZoneTap} // No longer needed as cards are played directly
          style={[styles.centerFelt]}
          disabled={gameState.gamePhase !== 'playing' || gameState.currentPlayerIndex !== 0}
        >
          <View style={styles.feltInner}>
            {renderTrick()}
            {gameState.gamePhase === 'playing' && (
              <View style={styles.tableInfo}>
                <Text style={styles.roundLabel}>ROUND {gameState.roundNumber}</Text>
                {gameState.heartsBroken && <Text style={styles.brokenLabel}>♥ BROKEN</Text>}
                {gameState.leadSuit && <Text style={styles.suitLabel}>LEAD: {gameState.leadSuit.toUpperCase()}</Text>}
              </View>
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.humanSection}>
          <View style={styles.humanDashboard}>
            <View style={styles.humanIdentity}>
              <Text style={styles.humanNameText}>{gameState.players[0].name}</Text>
              <Text style={styles.humanScoreLabel}>TOTAL: {gameState.players[0].totalScore} | ROUND: {gameState.players[0].score}</Text>
            </View>
            {gameState.gamePhase === 'passing' && gameState.passDirection !== 'none' && (
              <View style={styles.passingActions}>
                <Text style={styles.passHint}>{getPassDirectionText().toUpperCase()}</Text>
                <PremiumButton
                  variant="primary"
                  height={40}
                  style={styles.passButton}
                  disabled={selectedCards.length !== 3 || paused}
                  onPress={handlePassCards}
                >
                  <Text style={styles.passButtonLabel}>PASS {selectedCards.length}/3</Text>
                </PremiumButton>
              </View>
            )}
          </View>

          <ScrollView
            horizontal
            style={styles.handScroller}
            contentContainerStyle={styles.handList}
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
                  disabled={(gameState.gamePhase === 'playing' && (gameState.currentPlayerIndex !== 0 || !isLegal)) || paused}
                  style={[
                    styles.myCardWrapper,
                    isSelected && styles.selectedHandCard,
                    { zIndex: index } // Ensure consistent stacking
                  ]}
                >
                  <PlayingCard
                    card={card}
                    width={CARD_WIDTH}
                    height={CARD_HEIGHT}
                    faceDown={false}
                    style={!isLegal && gameState.gamePhase === 'playing' && !isSelected ? styles.dimmedCard : undefined}
                  />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {gameState.gamePhase === 'roundEnd' && (
        <GameOverOverlay
          result="draw"
          title="ROUND COMPLETE"
          subtitle={gameState.players.map(p => `${p.name}: ${p.totalScore} (+${p.score})`).join('\n')}
          onPlayAgain={handleNewRound}
          onPlayAgainLabel="CONTINUE"
        />
      )}

      {gameState.gamePhase === 'gameOver' && (
        <GameOverOverlay
          result={gameState.players[0].totalScore === Math.min(...gameState.players.map(p => p.totalScore)) ? 'win' : 'lose'}
          title={gameState.gamePhase === 'gameOver' ? 'GAME OVER' : ''}
          subtitle={gameState.players
            .sort((a, b) => a.totalScore - b.totalScore)
            .map((p, idx) => `${idx === 0 ? '🏆 ' : ''}${p.name}: ${p.totalScore} PTS`)
            .join('\n')}
          onPlayAgain={handleNewGame}
          onPlayAgainLabel="NEW GAME"
        />
      )}

      {paused && gameState.gamePhase !== 'gameOver' && gameState.gamePhase !== 'roundEnd' && (
        <GameOverOverlay
          result="paused"
          title="GAME PAUSED"
          onPlayAgain={() => setPaused(false)}
          onPlayAgainLabel="RESUME"
        />
      )}
    </View>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tableArea: { flex: 1, padding: spacing.sm, justifyContent: 'space-between' },
  playerBadge: {
    backgroundColor: colors.card,
    padding: spacing.xs,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    width: 130,
    ...shadows.sm,
  },
  topPlayer: { alignSelf: 'center', marginBottom: spacing.md },
  sidePlayers: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  leftPlayer: {},
  rightPlayer: {},
  avatarContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.xs,
  },
  activeAvatar: {
    borderWidth: 2,
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.8,
    shadowRadius: 5,
  },
  avatarText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  playerMeta: { flex: 1 },
  playerNameText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  playerScoreText: { color: 'rgba(255,255,255,0.6)', fontSize: 9 },
  roundPoints: { color: '#fab1a0', fontSize: 9, fontWeight: 'bold', position: 'absolute', right: 0, top: -12 },
  cardIndicator: { backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  cardIndicatorText: { color: '#fff', fontSize: 8, fontWeight: 'bold' },
  centerFelt: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  feltInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerFeltHighlight: { backgroundColor: 'rgba(85, 239, 196, 0.05)', borderRadius: 120 },
  playHint: { position: 'absolute', backgroundColor: 'rgba(85, 239, 196, 0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#55efc4' },
  playHintText: { color: '#55efc4', fontWeight: '900', fontSize: 12, letterSpacing: 2 },
  trickTable: { width: CARD_WIDTH * 2.5, height: CARD_HEIGHT * 2, position: 'relative' },
  trickCardStack: { position: 'absolute', ...shadows.md },
  trickCardBottom: { bottom: 0, left: '25%' },
  trickCardTop: { top: 0, left: '25%' },
  trickCardLeft: { left: 0, top: '25%' },
  trickCardRight: { right: 0, top: '25%' },
  tableInfo: { position: 'absolute', bottom: 10, alignItems: 'center' },
  roundLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 'bold', letterSpacing: 2 },
  brokenLabel: { color: '#fab1a0', fontSize: 10, fontWeight: '900', marginTop: 2 },
  suitLabel: { color: '#fff', fontSize: 9, fontWeight: 'bold', marginTop: 2 },
  humanSection: { paddingVertical: spacing.md },
  humanDashboard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md, paddingHorizontal: spacing.sm },
  humanIdentity: { flex: 1 },
  humanNameText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  humanScoreLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 'bold' },
  passingActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  passHint: { color: '#fab1a0', fontSize: 10, fontWeight: '900' },
  passButton: { minWidth: 110 },
  passButtonLabel: { color: '#fff', fontSize: 12, fontWeight: '900' },
  handScroller: { flexGrow: 0 },
  handList: {
    width: AVAILABLE_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
  },
  myCardWrapper: {
    marginRight: -OVERLAP,
    ...shadows.sm
  },
  selectedHandCard: { transform: [{ translateY: -20 }] },
  dimmedCard: { opacity: 0.5 },
  bgIcon: {
    position: 'absolute',
    top: '40%',
    left: '-10%',
    fontSize: 200,
    opacity: 0.05,
    transform: [{ rotate: '-15deg' }],
  },
});
