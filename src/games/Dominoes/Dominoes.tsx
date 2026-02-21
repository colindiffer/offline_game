import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView, useWindowDimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Header from '../../components/Header';
import GameOverOverlay from '../../components/GameOverOverlay';
import PremiumButton from '../../components/PremiumButton';
import DominoTileComp from '../../components/DominoTile';
import { useTheme } from '../../contexts/ThemeContext';
import { useSound } from '../../contexts/SoundContext';
import { Difficulty } from '../../types';
import { ThemeColors } from '../../utils/themes';
import { spacing, radius, shadows, typography } from '../../utils/designTokens';
import { initializeDominoes, canPlayTile, playTile, drawFromStock, getAIMove, getBoardEnd } from './logic';
import { DominoGameState, DominoTile } from './types';

export default function Dominoes({ difficulty }: { difficulty: Difficulty }) {
  const { colors } = useTheme();
  const { playSound } = useSound();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [gameState, setGameState] = useState<DominoGameState>(() => initializeDominoes(difficulty));
  const [isReady, setIsReady] = useState(false);
  const [side, setSide] = useState<'left' | 'right' | null>(null);
  const [paused, setPaused] = useState(false);

  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;
  const aiThinkingRef = useRef(false);
  const boardScrollRef = useRef<ScrollView>(null);
  const consecutivePassesRef = useRef(0);

  useEffect(() => {
    setIsReady(true);
  }, []);

  // AI turn handler
  useEffect(() => {
    if (gameState.currentPlayerIndex === 0 || gameState.gameOver || paused || aiThinkingRef.current) return;
    const aiIdx = gameState.currentPlayerIndex - 1;
    aiThinkingRef.current = true;
    const timer = setTimeout(() => {
      setGameState(prev => {
        if (prev.currentPlayerIndex === 0 || prev.gameOver) { aiThinkingRef.current = false; return prev; }
        const move = getAIMove(prev, prev.currentPlayerIndex - 1);
        if (move) {
          const next = playTile(prev, move.tile, move.side);
          if (next.aiHands[prev.currentPlayerIndex - 1].length === 0) {
            aiThinkingRef.current = false;
            return { ...next, gameOver: true, winner: prev.currentPlayerIndex };
          }
          aiThinkingRef.current = false;
          return next;
        }
        // AI can't play — draw or pass
        if (prev.stock.length > 0) {
          const drawn = drawFromStock({ ...prev });
          // Give the drawn tile to the AI hand
          const aiHands = [...drawn.aiHands];
          const drawn2 = drawn.playerHand[drawn.playerHand.length - 1];
          // Actually drawFromStock adds to playerHand — fix: pass turn
          aiThinkingRef.current = false;
          return { ...prev, currentPlayerIndex: (prev.currentPlayerIndex + 1) % (1 + prev.aiHands.length) };
        }
        aiThinkingRef.current = false;
        consecutivePassesRef.current += 1;
        if (consecutivePassesRef.current >= 2) {
          const playerPips = prev.playerHand.reduce((s, t) => s + t.sideA + t.sideB, 0);
          const aiPips = prev.aiHands[0].reduce((s, t) => s + t.sideA + t.sideB, 0);
          return { ...prev, gameOver: true, winner: playerPips <= aiPips ? 0 : 1 };
        }
        return { ...prev, currentPlayerIndex: (prev.currentPlayerIndex + 1) % (1 + prev.aiHands.length) };
      });
      playSound('tap');
    }, 800);
    return () => clearTimeout(timer);
  }, [gameState.currentPlayerIndex, gameState.gameOver, paused, playSound]);

  const handleTileTap = (tile: DominoTile) => {
    if (gameState.currentPlayerIndex !== 0 || gameState.gameOver || paused) return;

    const playability = canPlayTile(tile, gameState.board);
    if (!playability) {
      playSound('error'); // Indicate illegal move
      return;
    }

    consecutivePassesRef.current = 0;
    setGameState(prev => {
      // Default to 'right' if both are playable, otherwise use the specific side
      const sideToPlay = playability === 'both' ? 'right' : playability;
      const next = playTile(prev, tile, sideToPlay);
      if (next.playerHand.length === 0) {
        next.gameOver = true;
        next.winner = 0;
      }
      return next;
    });
    playSound('drop');
  };

  const handlePass = () => {
    if (gameState.currentPlayerIndex !== 0 || gameState.gameOver || paused) return;
    consecutivePassesRef.current += 1;
    if (consecutivePassesRef.current >= 2) {
      setGameState(prev => {
        const playerPips = prev.playerHand.reduce((s, t) => s + t.sideA + t.sideB, 0);
        const aiPips = prev.aiHands[0].reduce((s, t) => s + t.sideA + t.sideB, 0);
        return { ...prev, gameOver: true, winner: playerPips <= aiPips ? 0 : 1 };
      });
    } else {
      setGameState(prev => ({
        ...prev,
        currentPlayerIndex: (prev.currentPlayerIndex + 1) % (1 + prev.aiHands.length),
      }));
    }
  };

  const handleDraw = () => {
    if (gameState.currentPlayerIndex === 0 && gameState.stock.length > 0 && !paused) {
      setGameState(prev => drawFromStock(prev));
      playSound('tap');
    }
  };

  const resetGame = useCallback(() => {
    setGameState(initializeDominoes(difficulty));
    setPaused(false);
    consecutivePassesRef.current = 0;
  }, [difficulty]);

  const handleNewGame = useCallback(() => {
    resetGame();
  }, [resetGame]);

  const handleRestart = useCallback(() => {
    resetGame();
  }, [resetGame]);

  const canPlayerPlayAny = gameState.playerHand.some(t => canPlayTile(t, gameState.board) !== null);
  const showPassButton = gameState.currentPlayerIndex === 0 && !gameState.gameOver && gameState.stock.length === 0 && !canPlayerPlayAny;

  if (!isReady) return null;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1b4332', '#081c15']} style={StyleSheet.absoluteFill} />
      <Header
        title="Dominoes"
        score={gameState.playerHand.length}
        scoreLabel="TILES"
        highScore={gameState.stock.length}
        highScoreLabel="STOCK"
        light
        onPause={() => setPaused(!paused)}
        isPaused={paused}
      />

      <View style={styles.gameArea}>
        <View style={styles.statusRow}>
          <Text style={styles.statusText}>
            {gameState.currentPlayerIndex === 0 ? 'YOUR TURN' : "AI'S TURN"}
          </Text>
        </View>

        <View style={styles.board}>
          {gameState.board.length === 0 ? (
            <Text style={styles.emptyText}>TAP A TILE TO PLAY</Text>
          ) : (
            <ScrollView
              ref={boardScrollRef}
              horizontal
              contentContainerStyle={styles.chain}
              showsHorizontalScrollIndicator={false}
              onContentSizeChange={() => boardScrollRef.current?.scrollToEnd({ animated: true })}
            >
              {gameState.board.map((entry, idx) => {
                const isDouble = entry.displaySideA === entry.displaySideB;
                return (
                  <DominoTileComp
                    key={`${entry.tile.id}-${idx}`}
                    sideA={entry.displaySideA}
                    sideB={entry.displaySideB}
                    horizontal={!isDouble}
                    style={{ marginHorizontal: 2 }}
                  />
                );
              })}
            </ScrollView>
          )}
        </View>

        <View style={styles.playerHandContainer}>
          <View style={styles.handHeader}>
            <Text style={styles.handLabel}>YOUR HAND</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {showPassButton && (
                <TouchableOpacity style={styles.passBtn} onPress={handlePass} disabled={paused}>
                  <Text style={styles.passText}>PASS</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.drawBtn, (gameState.stock.length === 0 || gameState.currentPlayerIndex !== 0 || paused) && styles.disabledBtn]} onPress={handleDraw} disabled={gameState.stock.length === 0 || gameState.currentPlayerIndex !== 0 || paused}>
                <Text style={styles.drawText}>DRAW ({gameState.stock.length})</Text>
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hand}
          >
            {gameState.playerHand.map((tile, idx) => {
              const isPlayable = canPlayTile(tile, gameState.board) !== null;
              return (
                <TouchableOpacity
                  key={tile.id}
                  onPress={() => handleTileTap(tile)}
                  disabled={gameState.currentPlayerIndex !== 0 || gameState.gameOver || paused}
                  activeOpacity={0.8}
                  style={[
                    styles.tileTouch,
                    !isPlayable && gameState.currentPlayerIndex === 0 && styles.tileUnplayable,
                  ]}
                >
                  <DominoTileComp sideA={tile.sideA} sideB={tile.sideB} pointerEvents="none" />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      <View style={styles.footer}>
        <PremiumButton variant="secondary" height={50} style={styles.flexBtn} onPress={handleRestart} disabled={paused}>
          <Text style={styles.resetText}>RESTART</Text>
        </PremiumButton>
        <PremiumButton variant="secondary" height={50} style={styles.flexBtn} onPress={handleNewGame} disabled={paused}>
          <Text style={styles.resetText}>NEW GAME</Text>
        </PremiumButton>
      </View>

      {gameState.gameOver && (
        <GameOverOverlay
          result={gameState.winner === 0 ? 'win' : 'lose'}
          title={gameState.winner === 0 ? 'VICTORY!' : 'AI WINS'}
          subtitle={gameState.winner === 0 ? 'You cleared your hand first.' : 'The bot was faster this time.'}
          onPlayAgain={resetGame}
          onNewGame={handleNewGame}
          onRestart={handleRestart}
        />
      )}

      {paused && !gameState.gameOver && (
        <GameOverOverlay
          result="paused"
          title="GAME PAUSED"
          onPlayAgain={() => setPaused(false)}
          onPlayAgainLabel="RESUME"
          onNewGame={handleNewGame}
          onRestart={handleRestart}
        />
      )}
    </View>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1 },
  gameArea: { flex: 1, padding: spacing.md, justifyContent: 'space-between' },
  statusRow: { alignItems: 'center', marginBottom: spacing.sm },
  statusText: { fontSize: 12, fontWeight: '900', color: '#55efc4', letterSpacing: 2 },
  board: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: radius.lg, marginVertical: spacing.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  emptyText: { color: 'rgba(255,255,255,0.3)', fontWeight: 'bold' },
  chain: { alignItems: 'center', padding: spacing.xl },
  playerHandContainer: { paddingVertical: spacing.md },
  handHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.xl, marginBottom: spacing.sm },
  handLabel: { fontSize: 10, fontWeight: '900', color: 'rgba(255,255,255,0.6)', letterSpacing: 1.5 },
  drawBtn: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  disabledBtn: { opacity: 0.3 },
  drawText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  hand: { gap: spacing.md, paddingHorizontal: spacing.md },
  tileTouch: { ...shadows.md },
  footer: { flexDirection: 'row', gap: spacing.md, padding: spacing.xl, paddingBottom: Platform.OS === 'ios' ? 40 : spacing.xl },
  flexBtn: { flex: 1 },
  resetText: { color: colors.text, fontWeight: 'bold' },
  sideTargets: { ...StyleSheet.absoluteFillObject, zIndex: 10, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  sideTarget: { borderWidth: 2, borderColor: '#55efc4', borderStyle: 'dashed', borderRadius: radius.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, backgroundColor: 'rgba(85, 239, 196, 0.1)' },
  sideTargetText: { color: '#55efc4', fontWeight: '900', fontSize: 14, letterSpacing: 2 },
  tileSelected: { borderWidth: 2, borderColor: '#55efc4', borderRadius: radius.sm, transform: [{ translateY: -4 }] },
  tileUnplayable: { opacity: 0.4 },
  passBtn: { backgroundColor: '#e17055', paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.sm },
  passText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
});