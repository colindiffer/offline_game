import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView, Dimensions, Platform, Animated, PanResponder } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Header from '../../components/Header';
import PlayingCard from '../../components/PlayingCard';
import PremiumButton from '../../components/PremiumButton';
import GameOverOverlay from '../../components/GameOverOverlay';
import { useTheme } from '../../contexts/ThemeContext';
import { useSound } from '../../contexts/SoundContext';
import { getHighScore, setHighScore } from '../../utils/storage';
import { recordGameResult } from '../../utils/stats';
import { Difficulty } from '../../types';
import { ThemeColors } from '../../utils/themes';
import { spacing, radius, shadows, typography } from '../../utils/designTokens';
import { initializeSpadesGame, handleBid, playCard, collectTrick, canPlayCard, getAIBid, dealCards } from './logic';
import { SpadesGameState, SpadesPlayer, SpadesTrickCard } from './types';
import { Card } from '../../types/cards';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_PADDING = 16;
const AVAILABLE_WIDTH = SCREEN_WIDTH - (SCREEN_PADDING * 2);
const CARD_WIDTH = Math.floor(AVAILABLE_WIDTH / 4.5);
const CARD_HEIGHT = Math.floor(CARD_WIDTH * 1.4);
const OVERLAP = (13 * CARD_WIDTH - AVAILABLE_WIDTH) / 12;

export default function Spades({ difficulty }: Props) {
  const { colors } = useTheme();
  const { playSound } = useSound();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [gameState, setGameState] = useState<SpadesGameState>(() => initializeSpadesGame(difficulty));
  const [highScore, setHighScoreState] = useState(0);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);

  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;
  const dragPosition = useRef(new Animated.ValueXY()).current;
  const trickTablePosition = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const containerPos = useRef({ x: 0, y: 0 });
  const pausedRef = useRef(false);
  pausedRef.current = paused;

  const aiProcessingRef = useRef(false);

  useEffect(() => {
    getHighScore('spades', difficulty).then(setHighScoreState);
  }, [difficulty]);

  // AI Bidding
  useEffect(() => {
    if (gameState.gamePhase === 'bidding' && gameState.currentPlayerIndex !== 0 && !paused) {
      const timer = setTimeout(() => {
        const player = gameState.players[gameState.currentPlayerIndex];
        const bid = getAIBid(player.cards);
        setGameState(prev => handleBid(prev, prev.currentPlayerIndex, bid));
        playSound('tap');
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [gameState.gamePhase, gameState.currentPlayerIndex, playSound, paused]);

  // AI Playing
  useEffect(() => {
    if (gameState.gamePhase === 'playing' && gameState.currentPlayerIndex !== 0 && gameState.currentTrick.cards.length < 4 && !paused) {
      const timer = setTimeout(() => {
        const player = gameState.players[gameState.currentPlayerIndex];
        const legalCards = player.cards.filter(c => canPlayCard(gameState, player, c));
        if (legalCards.length > 0) {
          const cardToPlay = legalCards[Math.floor(Math.random() * legalCards.length)];
          setGameState(prev => playCard(prev, prev.currentPlayerIndex, cardToPlay));
          playSound('tap');
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [gameState.gamePhase, gameState.currentPlayerIndex, gameState.currentTrick.cards.length, playSound, paused]);

  // Trick Completion
  useEffect(() => {
    if (gameState.currentTrick.cards.length === 4 && !paused) {
      const timer = setTimeout(() => {
        setGameState(prev => collectTrick(prev));
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [gameState.currentTrick.cards.length, paused]);

  const handlePlayerBid = (bid: number) => {
    if (paused) return;
    setGameState(prev => handleBid(prev, 0, bid));
    playSound('tap');
  };

  const handlePlayCard = (card: Card) => {
    if (paused) return;
    const player = gameState.players[0];
    if (gameState.gamePhase === 'playing' && gameState.currentPlayerIndex === 0 && canPlayCard(gameState, player, card)) {
      setGameState(prev => playCard(prev, 0, card));
      playSound('drop');
    }
  };

  const handleCardTap = (card: Card) => {
    if (paused || gameState.gamePhase !== 'playing' || gameState.currentPlayerIndex !== 0) return;
    const player = gameState.players[0];
    if (canPlayCard(gameState, player, card)) {
      setSelectedCardId(prev => prev === card.id ? null : card.id);
      playSound('tap');
    } else {
      playSound('tap');
    }
  };

  const handleCenterTap = () => {
    if (!selectedCardId || paused) return;
    const player = gameState.players[0];
    const card = player.cards.find(c => c.id === selectedCardId);
    if (card && canPlayCard(gameState, player, card)) {
      handlePlayCard(card);
      setSelectedCardId(null);
    }
  };

  const renderPlayerBadge = (playerIndex: number, position: 'top' | 'left' | 'right') => {
    const player = gameState.players[playerIndex];
    const isCurrent = gameState.currentPlayerIndex === playerIndex;

    return (
      <View style={[styles.playerBadge, position === 'top' ? styles.topPlayer : position === 'left' ? styles.leftPlayer : styles.rightPlayer]}>
        <View style={[styles.avatar, { backgroundColor: player.teamId === 0 ? colors.primary : colors.textSecondary }]}>
          <Text style={styles.avatarText}>{player.name.charAt(0)}</Text>
        </View>
        <View style={styles.playerMeta}>
          <Text style={styles.playerName}>{player.name}</Text>
          <Text style={styles.playerStats}>Bid: {player.bid ?? '-'} | Won: {player.tricksWon}</Text>
        </View>
        {isCurrent && <View style={styles.currentIndicator} />}
      </View>
    );
  };

  if (!gameState.players[0]) return null;

  return (
    <View
      style={styles.container}
      onLayout={(e) => e.currentTarget.measureInWindow((x, y) => {
        containerPos.current = { x, y };
      })}
    >
      <LinearGradient colors={['#1b4332', '#081c15']} style={StyleSheet.absoluteFill} />
      <Header
        title="Spades"
        score={gameState.teamScores[0]}
        scoreLabel="TEAM"
        highScore={gameState.teamScores[1]}
        highScoreLabel="AI"
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
          onPress={handleCenterTap}
          style={[styles.centerFelt, selectedCardId && styles.centerFeltHighlight]}
          onLayout={(e) => e.currentTarget.measureInWindow((x, y, width, height) => {
            trickTablePosition.current = { x, y, width, height };
          })}
        >
          {gameState.currentTrick.cards.length > 0 && (
            <View style={styles.trickTable} pointerEvents="none">
              {gameState.currentTrick.cards.map((tc, idx) => {
                const pos = tc.playerId === 0 ? styles.trickBottom : tc.playerId === 1 ? styles.trickLeft : tc.playerId === 2 ? styles.trickTop : styles.trickRight;
                return (
                  <View key={idx} style={[styles.trickCard, pos]}>
                    <PlayingCard card={tc.card} width={CARD_WIDTH * 0.8} height={CARD_HEIGHT * 0.8} />
                  </View>
                );
              })}
            </View>
          )}
          {selectedCardId && (
            <View style={styles.dropIndicator} pointerEvents="none">
              <Text style={styles.dropIndicatorText}>TAP TO PLAY</Text>
            </View>
          )}
          {gameState.gamePhase === 'playing' && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>TEAM BID: {(gameState.players[0].bid || 0) + (gameState.players[2].bid || 0)}</Text>
              <Text style={styles.infoText}>TRICKS: {gameState.players[0].tricksWon + gameState.players[2].tricksWon}</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.humanSection}>
          {gameState.gamePhase === 'bidding' && gameState.currentPlayerIndex === 0 && !paused && (
            <View style={styles.biddingOverlay}>
              <Text style={styles.biddingTitle}>MAKE YOUR BID</Text>
              <View style={styles.bidGrid}>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(b => (
                  <TouchableOpacity key={b} style={styles.bidBtn} onPress={() => handlePlayerBid(b)}>
                    <Text style={styles.bidBtnText}>{b}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.handList}>
            {gameState.players[0].cards.map((card, idx) => {
              const isSelected = selectedCardId === card.id;
              const isLegal = canPlayCard(gameState, gameState.players[0], card);
              return (
                <TouchableOpacity
                  key={card.id}
                  onPress={() => handleCardTap(card)}
                  disabled={paused}
                  style={[
                    styles.cardWrapper,
                    { zIndex: idx },
                    isSelected && styles.cardSelected,
                    !isLegal && gameState.gamePhase === 'playing' && styles.cardDimmed
                  ]}
                >
                  <PlayingCard card={card} width={CARD_WIDTH} height={CARD_HEIGHT} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* Removed dragging overlay */}

      {gameState.gamePhase === 'roundEnd' && (
        <GameOverOverlay
          result="draw"
          title={`ROUND ${gameState.roundNumber} COMPLETE`}
          subtitle={`Your Team: ${gameState.teamScores[0]} (${gameState.teamBags[0]} bags)\nOpponents: ${gameState.teamScores[1]} (${gameState.teamBags[1]} bags)`}
          onPlayAgain={() => setGameState(dealCards(gameState))}
          onPlayAgainLabel="NEXT ROUND"
        />
      )}

      {paused && gameState.gamePhase !== 'roundEnd' && (
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

interface Props {
  difficulty: Difficulty;
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1 },
  tableArea: { flex: 1, justifyContent: 'space-between', padding: spacing.md },
  playerBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', padding: 8, borderRadius: radius.md, width: 140, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  topPlayer: { alignSelf: 'center' },
  sidePlayers: { flexDirection: 'row', justifyContent: 'space-between' },
  leftPlayer: {},
  rightPlayer: {},
  avatar: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  playerMeta: { flex: 1 },
  playerName: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  playerStats: { color: 'rgba(255,255,255,0.6)', fontSize: 8 },
  currentIndicator: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#55efc4', position: 'absolute', top: 4, right: 4 },
  centerFelt: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  trickTable: { width: 200, height: 200, position: 'relative' },
  trickCard: { position: 'absolute' },
  trickBottom: { bottom: 0, left: 60 },
  trickTop: { top: 0, left: 60 },
  trickLeft: { left: 0, top: 60 },
  trickRight: { right: 0, top: 60 },
  infoBox: { position: 'absolute', bottom: -40, alignItems: 'center' },
  infoText: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  humanSection: { height: CARD_HEIGHT + 20, marginBottom: Platform.OS === 'ios' ? 20 : 0 },
  handList: { paddingHorizontal: SCREEN_PADDING },
  cardWrapper: { marginRight: -OVERLAP },
  cardSelected: { transform: [{ translateY: -20 }], zIndex: 100 },
  cardDimmed: { opacity: 0.5 },
  centerFeltHighlight: { backgroundColor: 'rgba(85, 239, 196, 0.1)', borderWidth: 2, borderColor: '#55efc4', borderStyle: 'dashed', borderRadius: 100 },
  dropIndicator: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  dropIndicatorText: { color: '#55efc4', fontWeight: '900', fontSize: 14, letterSpacing: 2 },
  biddingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000, justifyContent: 'center', alignItems: 'center', borderRadius: radius.lg },
  biddingTitle: { color: '#fff', fontSize: 18, fontWeight: '900', marginBottom: 20, letterSpacing: 2 },
  bidGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, padding: 20 },
  bidBtn: { width: 45, height: 45, borderRadius: 23, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  bidBtnText: { color: '#000', fontWeight: '900', fontSize: 16 },
  dragOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 5000 },
  draggedCard: { position: 'absolute', zIndex: 5001, ...shadows.lg },
});