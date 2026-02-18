import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View, Animated, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Header from '../../components/Header';
import GameOverOverlay from '../../components/GameOverOverlay';
import PlayingCard from '../../components/PlayingCard';
import PremiumButton from '../../components/PremiumButton';
import { useTheme } from '../../contexts/ThemeContext';
import { useSound } from '../../contexts/SoundContext';
import { getHighScore, setHighScore } from '../../utils/storage';
import { recordGameResult } from '../../utils/stats';
import { Difficulty } from '../../types';
import { ThemeColors } from '../../utils/themes';
import {
  initializeGame,
  canMoveToFoundation,
  canMoveToTableau,
  isGameWon,
  drawFromStock,
  resetStock,
  getSolitaireConfig,
} from './logic';
import { Card, GameState, Pile } from './types';
import { spacing, radius, shadows } from '../../utils/designTokens';

interface Props {
  difficulty: Difficulty;
}

export default function Solitaire({ difficulty }: Props) {
  const { colors } = useTheme();
  const { playSound } = useSound();
  const { width: SCREEN_WIDTH } = useWindowDimensions();

  const { CARD_WIDTH, CARD_HEIGHT, COLUMN_GAP, SCREEN_PADDING } = useMemo(() => {
    const gap = 2;
    const padding = 4;
    const cw = Math.floor((SCREEN_WIDTH - (padding * 2) - (gap * 6)) / 7);
    const ch = Math.floor(cw * 1.45);
    return { CARD_WIDTH: cw, CARD_HEIGHT: ch, COLUMN_GAP: gap, SCREEN_PADDING: padding };
  }, [SCREEN_WIDTH]);

  const styles = useMemo(() => getStyles(colors, CARD_WIDTH, CARD_HEIGHT, COLUMN_GAP, SCREEN_PADDING), [colors, CARD_WIDTH, CARD_HEIGHT, COLUMN_GAP, SCREEN_PADDING]);
  const config = getSolitaireConfig(difficulty);

  const [gameState, setGameState] = useState<GameState>(() => initializeGame());
  const [undoHistory, setUndoHistory] = useState<GameState[]>([]);
  const [selected, setSelected] = useState<{ source: string; cardIndex: number } | null>(null);
  const [gameWon, setGameWon] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [highScore, setHighScoreState] = useState<number | null>(null);
  const [passes, setPasses] = useState(0);
  const [paused, setPaused] = useState(false);
  // Refs for logic
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;
  const gameWonRef = useRef(gameWon);
  gameWonRef.current = gameWon;
  const pausedRef = useRef(false);
  pausedRef.current = paused;

  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const cardAnimations = useRef<Map<string, Animated.Value>>(new Map());
  const pilePositions = useRef<Map<string, { x: number; y: number; width: number; height: number }>>(new Map());

  useEffect(() => {
    getHighScore('solitaire', difficulty).then((score) => {
      setHighScoreState(score);
    });
  }, [difficulty]);

  useEffect(() => {
    resetGame();
  }, [difficulty]);

  useEffect(() => {
    if (!gameWon && !paused && startTimeRef.current) {
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTimeRef.current!) / 1000));
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameWon, paused]);

  const getCardAnimation = (cardKey: string) => {
    if (!cardAnimations.current.has(cardKey)) {
      cardAnimations.current.set(cardKey, new Animated.Value(1));
    }
    return cardAnimations.current.get(cardKey)!;
  };

  const animateCardMove = (cardKey: string) => {
    const anim = getCardAnimation(cardKey);
    Animated.sequence([
      Animated.timing(anim, { toValue: 1.1, duration: 100, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  const saveToUndo = useCallback((state: GameState) => {
    setUndoHistory(prev => [...prev.slice(-19), JSON.parse(JSON.stringify(state))]);
  }, []);

  const handleUndo = useCallback(() => {
    if (undoHistory.length === 0 || paused) return;
    const previousState = undoHistory[undoHistory.length - 1];
    setGameState(previousState);
    setUndoHistory(prev => prev.slice(0, -1));
    playSound('tap');
  }, [undoHistory, paused, playSound]);

  const performMove = useCallback((srcSource: string, srcIndex: number, targetSource: string) => {
    if (paused) return;
    let srcPile: Pile = [];
    if (srcSource === 'waste') srcPile = gameStateRef.current.waste;
    else if (srcSource.startsWith('tableau')) {
      const tableauIndex = parseInt(srcSource.split('-')[1], 10);
      srcPile = gameStateRef.current.tableau[tableauIndex];
    }

    if (srcPile.length === 0 || srcIndex >= srcPile.length) return;

    const cards = srcPile.slice(srcIndex);
    const card = cards[0];
    let moved = false;

    // Foundation logic
    if (targetSource.startsWith('foundation') && cards.length === 1) {
      const fIdx = parseInt(targetSource.split('-')[1], 10);
      if (canMoveToFoundation(card, gameStateRef.current.foundations[fIdx])) {
        saveToUndo(gameStateRef.current);
        const newState = JSON.parse(JSON.stringify(gameStateRef.current));
        const newFoundations = newState.foundations;
        newFoundations[fIdx].push(card);

        if (srcSource === 'waste') newState.waste.pop();
        else if (srcSource.startsWith('tableau')) {
          const tIdx = parseInt(srcSource.split('-')[1], 10);
          newState.tableau[tIdx].splice(srcIndex);
          if (newState.tableau[tIdx].length > 0) newState.tableau[tIdx][newState.tableau[tIdx].length - 1].faceUp = true;
        }

        setGameState(newState);
        playSound('drop');
        moved = true;
        animateCardMove(`foundation-${fIdx}`);
        if (isGameWon(newState.foundations)) {
          setGameWon(true);
          playSound('win');
          const finalTime = Math.floor((Date.now() - startTimeRef.current!) / 1000);
          recordGameResult('solitaire', 'win', finalTime);
          if (highScore === null || finalTime < highScore || highScore === 0) {
            setHighScoreState(finalTime);
            setHighScore('solitaire', finalTime, difficulty);
          }
        }
      }
    }

    // Tableau logic
    if (!moved && targetSource.startsWith('tableau')) {
      const tIdx = parseInt(targetSource.split('-')[1], 10);
      if (canMoveToTableau(card, gameStateRef.current.tableau[tIdx])) {
        saveToUndo(gameStateRef.current);
        const newState = JSON.parse(JSON.stringify(gameStateRef.current));
        newState.tableau[tIdx] = [...newState.tableau[tIdx], ...cards];

        if (srcSource === 'waste') newState.waste.pop();
        else if (srcSource.startsWith('tableau')) {
          const srcTIdx = parseInt(srcSource.split('-')[1], 10);
          newState.tableau[srcTIdx].splice(srcIndex);
          if (newState.tableau[srcTIdx].length > 0) newState.tableau[srcTIdx][newState.tableau[srcTIdx].length - 1].faceUp = true;
        }

        setGameState(newState);
        playSound('drop');
        moved = true;
        animateCardMove(`tableau-${tIdx}-${newState.tableau[tIdx].length - 1}`);
      }
    }
  }, [highScore, playSound, saveToUndo, paused]);

  const handleCardClick = useCallback((source: string, cardIndex: number) => {
    if (gameWonRef.current || pausedRef.current) return;
    if (!startTimeRef.current) startTimeRef.current = Date.now();

    setSelected(prevSelected => {
      if (prevSelected) {
        const { source: srcSource, cardIndex: srcIndex } = prevSelected;
        if (srcSource === source && srcIndex === cardIndex) return null;
        performMove(srcSource, srcIndex, source);
        return null;
      } else {
        playSound('tap');
        return { source, cardIndex };
      }
    });
  }, [performMove, playSound]);

  const resetGame = useCallback(() => {
    setGameState(initializeGame());
    setUndoHistory([]);
    setSelected(null);
    setGameWon(false);
    setElapsedTime(0);
    setPasses(0);
    setPaused(false);
    startTimeRef.current = null;
  }, []);

  const handleDraw = useCallback(() => {
    if (paused) return;
    if (!startTimeRef.current) startTimeRef.current = Date.now();
    saveToUndo(gameStateRef.current);
    setGameState(prev => {
      if (prev.stock.length === 0) {
        if (config.passesAllowed !== null && passes >= config.passesAllowed) return prev;
        const { newStock, newWaste } = resetStock(prev.waste);
        setPasses(p => p + 1);
        playSound('tap');
        return { ...prev, stock: newStock, waste: newWaste };
      } else {
        const { newStock, newWaste } = drawFromStock(prev.stock, prev.waste, config.drawCount);
        playSound('tap');
        return { ...prev, stock: newStock, waste: newWaste };
      }
    });
  }, [config, passes, playSound, saveToUndo, paused]);

  const renderCard = (card: Card | null, source: string, cardIndex: number, isSelected: boolean) => {
    if (!card) return (
      <View
        style={[styles.cardPlaceholder, styles.emptyCard]}
        onLayout={(e) => e.currentTarget.measureInWindow((x, y, width, height) => {
          pilePositions.current.set(source, { x, y, width, height });
        })}
      >
        <View style={styles.cardPlaceholderInner} />
      </View>
    );

    const animValue = getCardAnimation(card.id);

    return (
      <TouchableOpacity
        onPress={() => handleCardClick(source, cardIndex)}
        onLayout={(e) => e.currentTarget.measureInWindow((x, y, width, height) => {
          pilePositions.current.set(`${source}-card-${cardIndex}`, { x, y, width, height });
        })}
        style={[
          styles.cardWrapper,
          isSelected && styles.selectedCardGlow,
        ]}
        disabled={gameWonRef.current || pausedRef.current}
        activeOpacity={0.8}
      >
        <Animated.View style={{ transform: [{ scale: animValue }] }} pointerEvents="none">
          <PlayingCard card={card} faceDown={!card.faceUp} width={CARD_WIDTH} height={CARD_HEIGHT} />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.bgIcon, { color: '#fff' }]}>🃏</Text>
      <LinearGradient colors={['#27ae60', '#1b4332']} style={StyleSheet.absoluteFill} />
      <Header
        title="Solitaire"
        score={elapsedTime}
        scoreLabel="TIME"
        highScore={highScore || 0}
        highScoreLabel="BEST"
        light
        onPause={() => setPaused(!paused)}
        isPaused={paused}
      />

      <View style={styles.gameArea}>
        <View style={styles.topRow}>
          <View style={styles.foundationRow}>
            {gameState.foundations.map((f, i) => {
              const targetSource = `foundation-${i}`;
              let isValidTarget = false;
              if (selected) {
                const { source: srcSource, cardIndex: srcIndex } = selected;
                let card: Card | null = null;
                if (srcSource === 'waste') card = gameState.waste[srcIndex];
                else if (srcSource.startsWith('tableau')) {
                  const tIdx = parseInt(srcSource.split('-')[1]);
                  const stack = gameState.tableau[tIdx].slice(srcIndex);
                  if (stack.length === 1) card = stack[0];
                }
                if (card && canMoveToFoundation(card, f)) isValidTarget = true;
              }

              return (
                <View key={i} style={[styles.foundationSpot, isValidTarget && styles.validTargetGlow]} onLayout={(e) => e.currentTarget.measureInWindow((x, y, width, height) => { pilePositions.current.set(targetSource, { x, y, width, height }); })}>
                  {f.length > 0 ? renderCard(f[f.length - 1], targetSource, f.length - 1, false) : (
                    <TouchableOpacity onPress={() => handleCardClick(targetSource, 0)} style={styles.cardPlaceholder} disabled={paused}>
                      <Text style={styles.suitHint}>{i === 0 ? '♥' : i === 1 ? '♦' : i === 2 ? '♣' : '♠'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>

          <View style={styles.stockWasteGroup}>
            <View style={styles.wastePile}>
              {gameState.waste.length > 0 && renderCard(gameState.waste[gameState.waste.length - 1], 'waste', gameState.waste.length - 1, selected?.source === 'waste')}
            </View>
            <TouchableOpacity style={styles.stockZone} onPress={handleDraw} disabled={gameWon || paused}>
              {gameState.stock.length > 0 ? (
                <View style={styles.stackBack} pointerEvents="none">
                  <PlayingCard card={gameState.stock[0]} faceDown={true} width={CARD_WIDTH} height={CARD_HEIGHT} />
                </View>
              ) : (
                <View style={[styles.cardPlaceholder, styles.emptyStock]}>
                  <Text style={styles.reloadIcon}>↺</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tableauContainer}>
          {gameState.tableau.map((pile, i) => {
            const targetSource = `tableau-${i}`;
            let isValidTarget = false;
            if (selected) {
              const { source: srcSource, cardIndex: srcIndex } = selected;
              if (srcSource !== targetSource) {
                let card: Card | null = null;
                if (srcSource === 'waste') card = gameState.waste[srcIndex];
                else if (srcSource.startsWith('tableau')) {
                  const tIdx = parseInt(srcSource.split('-')[1]);
                  card = gameState.tableau[tIdx][srcIndex];
                }
                if (card && canMoveToTableau(card, pile)) isValidTarget = true;
              }
            }

            return (
              <View key={i} style={[styles.tableauColumn, isValidTarget && styles.validTableauGlow]} onLayout={(e) => e.currentTarget.measureInWindow((x, y, width, height) => { pilePositions.current.set(targetSource, { x, y, width, height }); })}>
                {pile.length === 0 && (
                  <TouchableOpacity
                    style={[styles.cardPlaceholder, { width: CARD_WIDTH, height: CARD_HEIGHT }]}
                    onPress={() => handleCardClick(targetSource, 0)}
                    disabled={gameWon || paused}
                  />
                )}
                {pile.map((card, j) => (
                  <View key={j} style={[styles.tableauCardWrapper, { top: j * (CARD_HEIGHT * 0.25) }]}>
                    {renderCard(card, targetSource, j, selected?.source === targetSource && selected?.cardIndex === j)}
                  </View>
                ))}
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.bottomControls}>
        <TouchableOpacity style={styles.undoCircle} onPress={handleUndo} disabled={undoHistory.length === 0 || paused}>
          <View style={[styles.undoInner, (undoHistory.length === 0 || paused) && { opacity: 0.5 }]}>
            <Text style={styles.undoIcon}>↶</Text>
            <Text style={styles.undoText}>Undo</Text>
            {undoHistory.length > 0 && (
              <View style={styles.undoBadge}><Text style={styles.undoBadgeText}>{undoHistory.length}</Text></View>
            )}
          </View>
        </TouchableOpacity>

        <PremiumButton variant="secondary" height={44} style={styles.newGameBtn} onPress={resetGame} disabled={paused}>
          <Text style={styles.newGameText}>NEW GAME</Text>
        </PremiumButton>
      </View>

      {gameWon && <GameOverOverlay result="win" title="MATCH COMPLETE" subtitle={`Time: ${elapsedTime}s`} onPlayAgain={resetGame} />}

      {paused && !gameWon && (
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

const getStyles = (colors: ThemeColors, CARD_WIDTH: number, CARD_HEIGHT: number, COLUMN_GAP: number, SCREEN_PADDING: number) => StyleSheet.create({
  container: { flex: 1 },
  gameArea: { flex: 1, paddingHorizontal: SCREEN_PADDING, paddingTop: spacing.sm },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    zIndex: 100,
  },
  foundationRow: { flexDirection: 'row', gap: COLUMN_GAP },
  stockWasteGroup: { flexDirection: 'row', gap: COLUMN_GAP },
  stockZone: {},
  stackBack: { position: 'relative' },
  emptyStock: { justifyContent: 'center', alignItems: 'center', width: CARD_WIDTH, height: CARD_HEIGHT },
  reloadIcon: { fontSize: 24, color: 'rgba(255,255,255,0.3)' },
  wastePile: { width: CARD_WIDTH, height: CARD_HEIGHT },
  foundationSpot: { width: CARD_WIDTH, height: CARD_HEIGHT },
  suitHint: { fontSize: 20, color: 'rgba(255,255,255,0.1)', fontWeight: '900' },
  tableauContainer: { flexDirection: 'row', flex: 1, gap: COLUMN_GAP },
  tableauColumn: { flex: 1, minHeight: 400 },
  tableauCardWrapper: { position: 'absolute', width: '100%' },
  cardPlaceholder: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: radius.xs,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  cardPlaceholderInner: { width: '100%', height: '100%', borderRadius: radius.xs },
  emptyCard: { borderStyle: 'dashed' },
  cardWrapper: { width: CARD_WIDTH, height: CARD_HEIGHT, borderRadius: radius.xs, ...shadows.sm },
  selectedCardGlow: { shadowColor: '#fab1a0', shadowOpacity: 1, shadowRadius: 10, elevation: 5, borderWidth: 2, borderColor: '#fab1a0' },
  validTargetGlow: { borderWidth: 2, borderColor: '#55efc4', borderStyle: 'dashed', borderRadius: radius.xs, backgroundColor: 'rgba(85, 239, 196, 0.1)' },
  validTableauGlow: { backgroundColor: 'rgba(85, 239, 196, 0.05)', borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(85, 239, 196, 0.3)', borderStyle: 'dashed' },
  draggingCard: { opacity: 0 },
  bottomControls: {
    padding: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 40 : spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  undoCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  undoInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  undoIcon: { fontSize: 24, color: '#fff', marginBottom: -2 },
  undoText: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: 'bold' },
  undoBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.primary,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  undoBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  newGameBtn: { minWidth: 120 },
  newGameText: { color: '#fff', fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  dragOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 1000 },
  draggedCard: { position: 'absolute', zIndex: 1001, ...shadows.lg },
  bgIcon: {
    position: 'absolute',
    bottom: '10%',
    right: '5%',
    fontSize: 200,
    opacity: 0.05,
    transform: [{ rotate: '15deg' }],
  },
});