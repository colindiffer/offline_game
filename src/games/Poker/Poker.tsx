import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Alert, Platform, useWindowDimensions } from 'react-native';
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

const INITIAL_CHIPS = 1000;

interface Props {
  difficulty: Difficulty;
}

export default function Poker({ difficulty }: Props) {
  const { colors } = useTheme();
  const { playSound } = useSound();
  const { width: SCREEN_WIDTH } = useWindowDimensions();

  const CARD_WIDTH = Math.floor((SCREEN_WIDTH - 80) / 5);
  const CARD_HEIGHT = Math.floor(CARD_WIDTH * 1.4);

  const styles = useMemo(() => getStyles(colors, CARD_WIDTH, CARD_HEIGHT), [colors, CARD_WIDTH, CARD_HEIGHT]);

  const [gameState, setGameState] = useState<PokerGameState>(() => {
    const initialState = initializePokerGame(difficulty, INITIAL_CHIPS);
    return dealInitialHands(startNewRound(initialState));
  });
  const [highScore, setHighScore] = useState(INITIAL_CHIPS);
  const [showTutorial, setShowTutorial] = useState(false);
  const [raiseAmount, setRaiseAmount] = useState(50);
  const [roundResult, setRoundResult] = useState<{ won: boolean; chipChange: number } | null>(null);

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
      const prevTokens = gameState.players[0].tokens;
      const timer = setTimeout(() => {
        const finalState = determineWinners(gameState);
        setGameState(finalState);
        const roundDuration = Math.floor((Date.now() - roundStartTimeRef.current) / 1000);
        const playerWon = finalState.players[0].tokens > prevTokens;
        const chipChange = finalState.players[0].tokens - prevTokens;
        setRoundResult({ won: playerWon, chipChange });
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
    setRoundResult(null);
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
      case 'preFlop': return 'PRE-FLOP';
      case 'flop': return 'THE FLOP';
      case 'turn': return 'THE TURN';
      case 'river': return 'THE RIVER';
      case 'showdown': return 'SHOWDOWN!';
      case 'finished': return 'ROUND COMPLETE';
      default: return '';
    }
  };

  const isPlayerTurn = gameState.currentPlayerIndex === 0 && gameState.gamePhase !== 'showdown' && gameState.gamePhase !== 'finished';
  const player = gameState.players[0];
  const callAmount = player ? Math.max(0, gameState.roundBet - player.bet) : 0;
  const canCheck = player && player.bet === gameState.roundBet;

  return (
    <View style={styles.container}>
      <Header title="Poker" score={player?.tokens || 0} scoreLabel="CHIPS" highScore={highScore} highScoreLabel="BEST" light />

      {/* Green felt table — opponents + community cards only */}
      <View style={styles.table}>
        <LinearGradient colors={['#1b5e38', '#0a3d1f']} style={StyleSheet.absoluteFill} />

        {/* AI Opponents */}
        <View style={styles.opponentsRow}>
          {gameState.players.slice(1).map((p, i) => (
            <View key={i} style={styles.opponentSpot}>
              <View style={[styles.playerAvatar, gameState.currentPlayerIndex === i + 1 && styles.activeAvatar]}>
                <Text style={styles.avatarEmoji}>🤖</Text>
              </View>
              <Text style={styles.opponentName}>{p.name}</Text>
              <Text style={styles.chipValue}>{p.tokens}</Text>
              {p.bet > 0 && <Text style={styles.betInline}>+{p.bet}</Text>}
              {!p.folded ? (
                <View style={styles.oppCards}>
                  {p.cards.map((c, ci) => (
                    <View key={ci} style={styles.miniCard}>
                      <PlayingCard
                        card={c}
                        faceDown={gameState.gamePhase !== 'showdown' && gameState.gamePhase !== 'finished'}
                        size="small"
                      />
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.foldedBadge}><Text style={styles.foldedText}>FOLD</Text></View>
              )}
            </View>
          ))}
        </View>

        {/* Community Cards + Pot */}
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
          <View style={styles.potRow}>
            <View style={styles.potContainer}>
              <Text style={styles.potLabel}>POT</Text>
              <Text style={styles.potValue}>{gameState.pot}</Text>
            </View>
            <Text style={styles.phaseText}>{getPhaseDescription()}</Text>
          </View>
        </View>
      </View>

      {/* Player Hand — outside the table */}
      <View style={styles.playerSection}>
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

      {/* Controls */}
      <View style={styles.controls}>
        {gameState.gamePhase === 'finished' && roundResult && (
          <View style={[
            styles.roundResultBanner,
            { backgroundColor: roundResult.won ? 'rgba(0,184,148,0.15)' : 'rgba(214,48,49,0.15)', borderColor: roundResult.won ? '#00b894' : '#d63031' }
          ]}>
            <Text style={[styles.roundResultText, { color: roundResult.won ? '#00b894' : '#d63031' }]}>
              {roundResult.won
                ? `YOU WIN THE POT! +${roundResult.chipChange} CHIPS 🏆`
                : `YOU LOSE  ${Math.abs(roundResult.chipChange)} CHIPS`}
            </Text>
          </View>
        )}

        {isPlayerTurn ? (
          <View style={styles.actionArea}>
            {/* Raise amount selector */}
            <View style={styles.raiseRow}>
              <TouchableOpacity onPress={() => setRaiseAmount(a => Math.max(10, a - 10))} style={styles.adjustBtn}>
                <Text style={styles.adjustText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.raiseLabel}>RAISE: <Text style={styles.raiseValue}>{raiseAmount}</Text></Text>
              <TouchableOpacity onPress={() => setRaiseAmount(a => a + 10)} style={styles.adjustBtn}>
                <Text style={styles.adjustText}>+</Text>
              </TouchableOpacity>
            </View>
            {/* Action buttons row */}
            <View style={styles.actionRow}>
              <PremiumButton variant="danger" height={46} style={styles.actionBtn} onPress={handleFold}>
                <Text style={styles.btnLabel}>FOLD</Text>
              </PremiumButton>
              <PremiumButton variant="primary" height={46} style={styles.actionBtn} onPress={handleCall}>
                <Text style={styles.btnLabel}>{canCheck ? 'CHECK' : `CALL ${callAmount}`}</Text>
              </PremiumButton>
              <PremiumButton variant="secondary" height={46} style={styles.actionBtn} onPress={handleRaise}>
                <Text style={styles.btnLabel}>RAISE</Text>
              </PremiumButton>
            </View>
          </View>
        ) : gameState.gamePhase === 'finished' ? (
          <PremiumButton variant="primary" height={46} style={styles.fullBtn} onPress={handleNewRound}>
            <Text style={styles.btnLabel}>{player && player.tokens > 0 ? 'NEXT ROUND' : 'RE-BUY'}</Text>
          </PremiumButton>
        ) : (
          <View style={styles.waitingState}>
            <Text style={styles.waitingText}>WAITING FOR OTHERS...</Text>
          </View>
        )}
      </View>

      {showTutorial && <TutorialScreen gameName="Poker" steps={GAME_TUTORIALS.poker} onClose={handleTutorialClose} />}
    </View>
  );
}

const getStyles = (colors: ThemeColors, CARD_WIDTH: number, CARD_HEIGHT: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#0a3d1f',
    },
    // ── Green table (opponents + community cards) ──
    table: {
      flex: 1,
      marginHorizontal: spacing.sm,
      marginTop: spacing.xs,
      borderRadius: radius.lg,
      overflow: 'hidden',
      borderWidth: 3,
      borderColor: '#2d5a27',
      justifyContent: 'space-between',
      paddingVertical: spacing.sm,
    },
    opponentsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingHorizontal: spacing.xs,
    },
    opponentSpot: {
      alignItems: 'center',
      width: '25%',
    },
    playerAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.15)',
    },
    activeAvatar: {
      borderColor: '#fab1a0',
      ...shadows.sm,
    },
    avatarEmoji: { fontSize: 16 },
    opponentName: {
      color: '#fff',
      fontSize: 10,
      fontWeight: 'bold',
      marginTop: 2,
    },
    chipValue: {
      color: '#fab1a0',
      fontSize: 10,
      fontWeight: '900',
    },
    betInline: {
      color: '#ffeaa7',
      fontSize: 9,
      fontWeight: '900',
      marginTop: 1,
    },
    oppCards: {
      flexDirection: 'row',
      marginTop: 2,
    },
    miniCard: {
      marginHorizontal: -6,
    },
    foldedBadge: {
      backgroundColor: 'rgba(0,0,0,0.5)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      marginTop: 4,
    },
    foldedText: {
      color: '#ff7675',
      fontSize: 8,
      fontWeight: '900',
    },
    // ── Community cards + pot ──
    centerStage: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
      paddingVertical: spacing.xs,
    },
    communityCardsRow: {
      flexDirection: 'row',
      gap: 4,
      marginBottom: spacing.sm,
    },
    communityCardSpot: {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
    },
    cardPlaceholder: {
      flex: 1,
      borderRadius: radius.xs,
      backgroundColor: 'rgba(0,0,0,0.2)',
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: 'rgba(255,255,255,0.1)',
    },
    potRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    potContainer: {
      backgroundColor: 'rgba(0,0,0,0.4)',
      paddingHorizontal: 20,
      paddingVertical: 6,
      borderRadius: radius.md,
      alignItems: 'center',
    },
    potLabel: {
      color: 'rgba(255,255,255,0.5)',
      fontSize: 9,
      fontWeight: 'bold',
      letterSpacing: 1,
    },
    potValue: {
      color: '#fab1a0',
      fontSize: 20,
      fontWeight: '900',
    },
    phaseText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 1,
      opacity: 0.85,
    },
    // ── Player hand section ──
    playerSection: {
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      alignItems: 'center',
    },
    playerMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.xs,
    },
    playerName: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '900',
    },
    handBadge: {
      backgroundColor: colors.primary + '30',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.primary + '60',
    },
    handText: {
      color: colors.primary,
      fontSize: 9,
      fontWeight: '900',
    },
    playerBetText: {
      color: colors.warning,
      fontSize: 11,
      fontWeight: '900',
    },
    playerCardsRow: {
      flexDirection: 'row',
      gap: 10,
    },
    playerCardWrapper: {
      ...shadows.md,
    },
    // ── Controls ──
    controls: {
      paddingHorizontal: spacing.sm,
      paddingTop: spacing.sm,
      paddingBottom: Platform.OS === 'ios' ? 20 : spacing.sm,
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    roundResultBanner: {
      borderWidth: 1,
      borderRadius: radius.md,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      marginBottom: spacing.xs,
      alignItems: 'center',
    },
    roundResultText: {
      fontWeight: '900',
      fontSize: 14,
      letterSpacing: 0.5,
    },
    actionArea: {
      gap: spacing.xs,
    },
    raiseRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
      paddingVertical: 2,
    },
    adjustBtn: {
      width: 30,
      height: 30,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: colors.border,
    },
    adjustText: {
      color: colors.text,
      fontSize: 18,
      fontWeight: 'bold',
      lineHeight: 20,
    },
    raiseLabel: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: 'bold',
    },
    raiseValue: {
      color: colors.success,
      fontWeight: '900',
    },
    actionRow: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    actionBtn: {
      flex: 1,
    },
    btnLabel: {
      color: '#fff',
      fontWeight: '900',
      fontSize: 13,
    },
    fullBtn: {
      width: '100%',
    },
    waitingState: {
      height: 46,
      justifyContent: 'center',
      alignItems: 'center',
    },
    waitingText: {
      color: colors.textSecondary,
      fontWeight: 'bold',
      letterSpacing: 1,
      fontSize: 12,
    },
  });
