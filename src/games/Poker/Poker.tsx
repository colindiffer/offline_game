import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView, Dimensions, Alert, Platform } from 'react-native';
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
import { Card } from '../../types/cards';
import { ThemeColors } from '../../utils/themes';
import { GAME_TUTORIALS } from '../../utils/tutorials';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PokerGameState, HandRank, Player } from './types';
import { spacing, radius, shadows, typography } from '../../utils/designTokens';
import {
  initializePokerGame,
  dealInitialHands,
  playerAction,
  getAIAction,
  determineWinners,
  startNewRound,
  evaluateHand,
} from './logic';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = Math.floor((SCREEN_WIDTH - 64) / 5);
const CARD_HEIGHT = Math.floor(CARD_WIDTH * 1.4);
const INITIAL_CHIPS = 1000; // Increased for Hold'em

interface Props {
  difficulty: Difficulty;
}

export default function Poker({ difficulty }: Props) {
  const { colors } = useTheme();
  const { playSound } = useSound();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [gameState, setGameState] = useState<PokerGameState>(() => {
    const initialState = initializePokerGame(difficulty, INITIAL_CHIPS);
    return dealInitialHands(startNewRound(initialState));
  });
  const [highScore, setHighScore] = useState(INITIAL_CHIPS);
  const [showTutorial, setShowTutorial] = useState(false);
  const [raiseAmount, setRaiseAmount] = useState(50);

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

  useEffect(() => {
    const playerTokens = gameState.players[0]?.tokens || 0;
    if (playerTokens > highScore) {
      setHighScore(playerTokens);
      saveHighScore('poker', playerTokens, difficulty);
    }
  }, [gameState.players, highScore, difficulty]);

  // AI Turn Handling
  useEffect(() => {
    if (aiProcessingRef.current) return;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.folded || gameState.gamePhase === 'finished' || gameState.gamePhase === 'showdown') return;

    if (currentPlayer.isAI) {
      aiProcessingRef.current = true;
      const timer = setTimeout(() => {
        const aiDecision = getAIAction(gameState, gameState.currentPlayerIndex, difficulty);
        const newState = playerAction(gameState, aiDecision.action, aiDecision.amount);
        setGameState(newState);
        aiProcessingRef.current = false;
        if (aiDecision.action !== 'fold') playSound('tap');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [gameState, difficulty, playSound]);

  // Handle showdown
  useEffect(() => {
    if (gameState.gamePhase === 'showdown') {
      const timer = setTimeout(() => {
        const finalState = determineWinners(gameState);
        setGameState(finalState);
        const roundDuration = Math.floor((Date.now() - roundStartTimeRef.current) / 1000);
        const playerWon = finalState.players[0].tokens > gameState.players[0].tokens;
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

  const handleFold = useCallback(() => {
    if (gameState.currentPlayerIndex !== 0) return;
    setGameState(playerAction(gameState, 'fold'));
    playSound('tap');
  }, [gameState, playSound]);

  const handleCall = useCallback(() => {
    if (gameState.currentPlayerIndex !== 0) return;
    setGameState(playerAction(gameState, 'call'));
    playSound('tap');
  }, [gameState, playSound]);

  const handleRaise = useCallback(() => {
    if (gameState.currentPlayerIndex !== 0) return;
    const player = gameState.players[0];
    const callAmount = gameState.roundBet - player.bet;
    if (player.tokens < callAmount + raiseAmount) {
      Alert.alert('Insufficient Tokens', 'Not enough chips for this raise.');
      return;
    }
    setGameState(playerAction(gameState, 'raise', raiseAmount));
    playSound('tap');
  }, [gameState, raiseAmount, playSound]);

  const handleNewRound = useCallback(() => {
    playSound('tap');
    const player = gameState.players[0];
    if (!player || player.tokens <= 0) {
      const newState = initializePokerGame(difficulty, INITIAL_CHIPS);
      setGameState(dealInitialHands(startNewRound(newState)));
    } else {
      setGameState(dealInitialHands(startNewRound(gameState)));
    }
    roundStartTimeRef.current = Date.now();
  }, [gameState, difficulty, playSound]);

  const getPhaseDescription = () => {
    switch (gameState.gamePhase) {
      case 'preFlop': return 'Pre-Flop Betting';
      case 'flop': return 'The Flop';
      case 'turn': return 'The Turn';
      case 'river': return 'The River';
      case 'showdown': return 'Showdown!';
      case 'finished': return 'Round Complete';
      default: return '';
    }
  };

  const isPlayerTurn = gameState.currentPlayerIndex === 0 && gameState.gamePhase !== 'showdown' && gameState.gamePhase !== 'finished';
  const player = gameState.players[0];
  const callAmount = player ? Math.max(0, gameState.roundBet - player.bet) : 0;
  const canCheck = player && player.bet === gameState.roundBet;

  return (
    <View style={styles.container}>
      <Text style={[styles.bgIcon, { color: '#fff' }]}>🎰</Text>
      <Header title="Poker" score={player?.tokens || 0} scoreLabel="CHIPS" highScore={highScore} highScoreLabel="BEST" light />

      <View style={styles.table}>
        <LinearGradient colors={['#1b4332', '#081c15']} style={StyleSheet.absoluteFill} />

        {/* Opponents */}
        <View style={styles.opponentsRow}>
          {gameState.players.slice(1).map((p, i) => (
            <View key={i} style={styles.opponentSpot}>
              <View style={[styles.playerAvatar, gameState.currentPlayerIndex === i + 1 && styles.activeAvatar]}>
                <Text style={styles.avatarEmoji}>🤖</Text>
              </View>
              <Text style={styles.opponentName}>{p.name}</Text>
              <Text style={styles.chipValue}>{p.tokens}</Text>
              {!p.folded && (
                <View style={styles.oppCards}>
                  {p.cards.map((c, ci) => (
                    <View key={ci} style={styles.miniCard}>
                      <PlayingCard card={c} faceDown={gameState.gamePhase !== 'showdown' && gameState.gamePhase !== 'finished'} size="small" />
                    </View>
                  ))}
                </View>
              )}
              {p.folded && <View style={styles.foldedBadge}><Text style={styles.foldedText}>FOLD</Text></View>}
              {p.bet > 0 && <View style={styles.betBubble}><Text style={styles.betText}>{p.bet}</Text></View>}
            </View>
          ))}
        </View>

        {/* Community Cards Area */}
        <View style={styles.centerStage}>
          <View style={styles.communityCardsRow}>
            {[0, 1, 2, 3, 4].map((idx) => (
              <View key={idx} style={styles.communityCardSpot}>
                {gameState.communityCards[idx] ? (
                  <PlayingCard card={gameState.communityCards[idx]} width={CARD_WIDTH} height={CARD_HEIGHT} />
                ) : (
                  <View style={styles.cardPlaceholder} />
                )}
              </View>
            ))}
          </View>
          <View style={styles.potContainer}>
            <Text style={styles.potLabel}>POT</Text>
            <Text style={styles.potValue}>{gameState.pot}</Text>
          </View>
          <Text style={styles.phaseText}>{getPhaseDescription().toUpperCase()}</Text>
        </View>

        {/* Player Area */}
        <View style={styles.playerZone}>
          <View style={styles.playerMeta}>
            <Text style={styles.playerName}>{player?.name}</Text>
            {player?.hand && (
              <View style={styles.handBadge}>
                <Text style={styles.handText}>{player.hand.description.toUpperCase()}</Text>
              </View>
            )}
            {player?.bet > 0 && <Text style={styles.playerBetText}>BET: {player.bet}</Text>}
          </View>
          <View style={styles.playerCardsRow}>
            {player?.cards.map((card, i) => (
              <View key={i} style={styles.playerCardWrapper}>
                <PlayingCard card={card} width={CARD_WIDTH} height={CARD_HEIGHT} />
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.controls}>
        {isPlayerTurn ? (
          <View style={styles.actionGrid}>
                        <View style={styles.primaryActions}>
                          <PremiumButton variant="danger" height={55} style={styles.actionBtn} onPress={handleFold}><Text style={styles.btnLabel}>FOLD</Text></PremiumButton>
                          <PremiumButton variant="primary" height={55} style={styles.actionBtn} onPress={handleCall}>                <Text style={styles.btnLabel}>{canCheck ? 'CHECK' : `CALL ${callAmount}`}</Text>
              </PremiumButton>
            </View>
            <View style={styles.raiseZone}>
              <View style={styles.raiseInput}>
                <TouchableOpacity onPress={() => setRaiseAmount(Math.max(10, raiseAmount - 10))} style={styles.adjustBtn}><Text style={styles.adjustText}>-</Text></TouchableOpacity>
                <Text style={styles.raiseValue}>{raiseAmount}</Text>
                <TouchableOpacity onPress={() => setRaiseAmount(raiseAmount + 10)} style={styles.adjustBtn}><Text style={styles.adjustText}>+</Text></TouchableOpacity>
              </View>
              <PremiumButton variant="primary" height={50} style={styles.raiseBtn} onPress={handleRaise}><Text style={styles.btnLabelSmall}>RAISE</Text></PremiumButton>
            </View>
          </View>
        ) : gameState.gamePhase === 'finished' ? (
          <PremiumButton variant="primary" height={60} style={styles.fullBtn} onPress={handleNewRound}>
            <Text style={styles.btnLabel}>{player && player.tokens > 0 ? 'NEXT ROUND' : 'RE-BUY'}</Text>
          </PremiumButton>
        ) : (
          <View style={styles.waitingState}><Text style={styles.waitingText}>WAITING FOR OTHERS...</Text></View>
        )}
      </View>

      {showTutorial && <TutorialScreen gameName="Poker" steps={GAME_TUTORIALS.poker} onClose={handleTutorialClose} />}
    </View>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  table: { flex: 1, margin: spacing.sm, borderRadius: radius.lg, overflow: 'hidden', paddingVertical: spacing.md, justifyContent: 'space-between', borderWidth: 4, borderColor: '#2d3436' },
  opponentsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: spacing.sm },
  opponentSpot: { alignItems: 'center', width: '25%' },
  playerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)' },
  activeAvatar: { borderColor: '#fab1a0', ...shadows.md },
  avatarEmoji: { fontSize: 18 },
  opponentName: { color: '#fff', fontSize: 10, fontWeight: 'bold', marginTop: 4 },
  chipValue: { color: '#fab1a0', fontSize: 10, fontWeight: '900' },
  oppCards: { flexDirection: 'row', marginTop: 4 },
  miniCard: { marginHorizontal: -12, transform: [{ scale: 0.85 }] },
  foldedBadge: { backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
  foldedText: { color: '#ff7675', fontSize: 8, fontWeight: '900' },
  betBubble: { position: 'absolute', bottom: -15, backgroundColor: '#ffeaa7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  betText: { color: '#000', fontSize: 9, fontWeight: '900' },
  centerStage: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  communityCardsRow: { flexDirection: 'row', gap: 6, marginBottom: spacing.lg },
  communityCardSpot: { width: CARD_WIDTH, height: CELL_SIZE * 1.4 },
  cardPlaceholder: { flex: 1, borderRadius: radius.xs, backgroundColor: 'rgba(0,0,0,0.2)', borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.1)' },
  potContainer: { backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 30, paddingVertical: 10, borderRadius: radius.md, alignItems: 'center', marginBottom: spacing.sm, ...shadows.sm },
  potLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  potValue: { color: '#fab1a0', fontSize: 24, fontWeight: '900' },
  phaseText: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 1, opacity: 0.8 },
  playerZone: { paddingHorizontal: spacing.md, alignItems: 'center' },
  playerMeta: { alignItems: 'center', marginBottom: spacing.sm },
  playerName: { color: '#fff', fontSize: 12, fontWeight: '900', marginBottom: 4 },
  handBadge: { backgroundColor: 'rgba(250, 177, 160, 0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(250, 177, 160, 0.4)' },
  handText: { color: '#fab1a0', fontSize: 10, fontWeight: '900' },
  playerBetText: { color: '#ffeaa7', fontSize: 12, fontWeight: '900', marginTop: 4 },
  playerCardsRow: { flexDirection: 'row', gap: 10 },
  playerCardWrapper: { ...shadows.md },
  controls: { padding: spacing.lg, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  actionGrid: { gap: spacing.md },
  primaryActions: { flexDirection: 'row', gap: spacing.md },
  actionBtn: { flex: 1 },
  btnLabel: { color: '#fff', fontWeight: '900', fontSize: 16 },
  btnLabelSmall: { color: '#fff', fontWeight: '900', fontSize: 14 },
  raiseZone: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  raiseInput: { flexDirection: 'row', flex: 2, backgroundColor: colors.background, borderRadius: radius.md, alignItems: 'center', padding: 4, borderWidth: 1, borderColor: colors.border },
  adjustBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 20 },
  adjustText: { color: colors.text, fontSize: 20, fontWeight: 'bold' },
  raiseValue: { flex: 1, textAlign: 'center', color: colors.success, fontWeight: '900', fontSize: 16 },
  raiseBtn: { flex: 3 },
  fullBtn: { width: '100%' },
  waitingState: { height: 60, justifyContent: 'center', alignItems: 'center' },
  waitingText: { color: colors.textSecondary, fontWeight: 'bold', letterSpacing: 1 },
  bgIcon: {
    position: 'absolute',
    bottom: '5%',
    right: '-10%',
    fontSize: 200,
    opacity: 0.05,
    transform: [{ rotate: '15deg' }],
  },
});
