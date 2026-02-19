import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Header from '../../components/Header';
import GameOverOverlay from '../../components/GameOverOverlay';
import PlayingCard from '../../components/PlayingCard';
import PremiumButton from '../../components/PremiumButton';
import { useTheme } from '../../contexts/ThemeContext';
import { useSound } from '../../contexts/SoundContext';
import { recordGameResult } from '../../utils/stats';
import { Difficulty } from '../../types';
import { ThemeColors } from '../../utils/themes';
import { spacing, radius, shadows } from '../../utils/designTokens';
import { initializeSpider, canMoveCards, canPlaceOn, getRankValue, Pile } from './logic';
import { Card } from '../../types/cards';

interface Props {
  difficulty: Difficulty;
}

export default function SpiderSolitaire({ difficulty }: Props) {
  const { colors } = useTheme();
  const { playSound } = useSound();
  const { width: SCREEN_WIDTH } = useWindowDimensions();

  const { CARD_WIDTH, CARD_HEIGHT, VERTICAL_SPREAD, SCREEN_PADDING, COLUMN_GAP } = useMemo(() => {
    const padding = 0;
    const gap = 0.5;
    const cw = Math.floor((SCREEN_WIDTH - (padding * 2) - (gap * 9)) / 10);
    const ch = Math.floor(cw * 1.4);
    const vs = 0.4;
    return { CARD_WIDTH: cw, CARD_HEIGHT: ch, VERTICAL_SPREAD: vs, SCREEN_PADDING: padding, COLUMN_GAP: gap };
  }, [SCREEN_WIDTH]);

  const styles = useMemo(
    () => getStyles(colors, CARD_WIDTH, CARD_HEIGHT, SCREEN_PADDING),
    [colors, CARD_WIDTH, CARD_HEIGHT, SCREEN_PADDING],
  );

  const [gameState, setGameState] = useState(() => initializeSpider(difficulty));
  const [undoHistory, setUndoHistory] = useState<any[]>([]);
  const [gameWon, setGameWon] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [completedSuits, setCompletedSuits] = useState(0);
  const [paused, setPaused] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [selected, setSelected] = useState<{ col: number; cardIndex: number } | null>(null);

  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;
  const pausedRef = useRef(false);
  pausedRef.current = paused;

  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsReady(true);
    startTimeRef.current = Date.now();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    if (!gameWon && !paused && isReady && startTimeRef.current) {
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTimeRef.current!) / 1000));
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [gameWon, isReady, paused]);

  const saveToUndo = useCallback(() => {
    setUndoHistory(prev => [...prev.slice(-19), JSON.parse(JSON.stringify(gameStateRef.current))]);
  }, []);

  const handleUndo = useCallback(() => {
    if (undoHistory.length === 0 || paused) return;
    const previous = undoHistory[undoHistory.length - 1];
    setGameState(previous);
    setUndoHistory(prev => prev.slice(0, -1));
    setSelected(null);
    playSound('tap');
  }, [undoHistory, paused, playSound]);

  const checkCompletedSequence = useCallback((tableau: Pile[]) => {
    let newCompleted = completedSuits;
    const nextTableau = tableau.map(p => [...p]);

    nextTableau.forEach((pile, i) => {
      if (pile.length < 13) return;
      const last13 = pile.slice(-13);
      if (last13[0].rank === 'K' && canMoveCards(last13)) {
        nextTableau[i] = pile.slice(0, -13);
        if (nextTableau[i].length > 0) nextTableau[i][nextTableau[i].length - 1].faceUp = true;
        newCompleted++;
        playSound('win');
      }
    });

    if (newCompleted > completedSuits) {
      setCompletedSuits(newCompleted);
      if (newCompleted === 8) {
        setGameWon(true);
        recordGameResult('spider-solitaire', 'win', elapsedTime);
      }
    }
    return nextTableau;
  }, [completedSuits, elapsedTime, playSound]);

  const handleDeal = useCallback(() => {
    if (gameState.stock.length === 0 || gameWon || paused) return;
    saveToUndo();
    setSelected(null);

    setGameState(prev => {
      const nextTableau = prev.tableau.map((pile, i) => {
        const card = prev.stock[prev.stock.length - 1 - i];
        return [...pile, { ...card, faceUp: true }];
      });
      const nextStock = prev.stock.slice(0, -10);
      return { ...prev, tableau: checkCompletedSequence(nextTableau), stock: nextStock };
    });
    playSound('drop');
  }, [gameState, gameWon, paused, saveToUndo, checkCompletedSequence, playSound]);

  const performMove = useCallback((srcCol: number, cardIdx: number, targetCol: number) => {
    if (paused) return;
    const srcPile = gameStateRef.current.tableau[srcCol];
    const targetPile = gameStateRef.current.tableau[targetCol];
    const movingCards = srcPile.slice(cardIdx);

    if (canPlaceOn(movingCards[0], targetPile)) {
      saveToUndo();
      const nextTableau = gameStateRef.current.tableau.map((p, i) => {
        if (i === srcCol) {
          const nextP = p.slice(0, cardIdx);
          if (nextP.length > 0) nextP[nextP.length - 1].faceUp = true;
          return nextP;
        }
        if (i === targetCol) return [...p, ...movingCards];
        return p;
      });

      setGameState(prev => ({ ...prev, tableau: checkCompletedSequence(nextTableau) }));
      playSound('drop');
    }
  }, [paused, saveToUndo, checkCompletedSequence, playSound]);

  const handleTap = useCallback((col: number, cardIndex: number) => {
    if (gameWon || pausedRef.current) return;
    setSelected(prev => {
      const pile = gameStateRef.current.tableau[col];
      if (prev) {
        if (prev.col === col) return null; // deselect
        performMove(prev.col, prev.cardIndex, col);
        return null;
      }
      const cards = pile.slice(cardIndex);
      if (!canMoveCards(cards)) return null;
      playSound('tap');
      return { col, cardIndex };
    });
  }, [gameWon, performMove, playSound]);

  // Valid target columns when something is selected
  const validCols = useMemo(() => {
    const cols = new Set<number>();
    if (!selected) return cols;
    const movingCard = gameStateRef.current.tableau[selected.col][selected.cardIndex];
    if (!movingCard) return cols;

    for (let i = 0; i < 10; i++) {
      if (i !== selected.col && canPlaceOn(movingCard, gameStateRef.current.tableau[i])) {
        cols.add(i);
      }
    }
    return cols;
  }, [selected, gameState]);

  const resetGame = useCallback(() => {
    setGameState(initializeSpider(difficulty));
    setUndoHistory([]);
    setCompletedSuits(0);
    setGameWon(false);
    setElapsedTime(0);
    setPaused(false);
    setSelected(null);
    startTimeRef.current = Date.now();
  }, [difficulty]);

  if (!isReady) return null;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1b4332', '#081c15']} style={StyleSheet.absoluteFill} />
      <Header
        title="Spider"
        score={completedSuits}
        scoreLabel="SUITS"
        highScore={elapsedTime}
        highScoreLabel="TIME"
        light
        onPause={() => { setSelected(null); setPaused(!paused); }}
        isPaused={paused}
      />

      <View style={styles.gameArea}>
        <View style={styles.tableauContainer}>
          {gameState.tableau.map((pile, i) => {
            const isValidTarget = validCols.has(i);
            const isSourceCol = selected?.col === i;
            return (
              <View
                key={i}
                style={[
                  styles.column,
                  isValidTarget && styles.validColumnGlow,
                  isSourceCol && styles.sourceColHighlight,
                ]}
              >
                {pile.length === 0 ? (
                  <TouchableOpacity
                    style={styles.emptySlot}
                    onPress={() => handleTap(i, 0)}
                    disabled={paused || gameWon}
                  />
                ) : null}

                {pile.map((card, j) => {
                  const isInSelection = isSourceCol && j >= (selected?.cardIndex ?? Infinity);
                  return (
                    <TouchableOpacity
                      key={card.id}
                      style={[
                        styles.cardWrapper,
                        { top: j * (CARD_HEIGHT * VERTICAL_SPREAD) },
                        isInSelection && styles.selectedCard,
                      ]}
                      onPress={() => handleTap(i, j)}
                      disabled={paused || gameWon}
                      activeOpacity={0.8}
                    >
                      <PlayingCard
                        card={card}
                        faceDown={!card.faceUp}
                        width={CARD_WIDTH}
                        height={CARD_HEIGHT}
                        pointerEvents="none"
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })}
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.stockWrapper}>
            <TouchableOpacity
              style={styles.stock}
              onPress={handleDeal}
              disabled={gameState.stock.length === 0 || paused}
            >
              {gameState.stock.length === 0 ? (
                <View style={[styles.emptySlot, { width: CARD_WIDTH * 2, height: CARD_HEIGHT, opacity: 0.3 }]} />
              ) : (
                Array.from({ length: Math.ceil(gameState.stock.length / 10) }).map((_, idx) => (
                  <View key={idx} style={[styles.stockCard, { left: idx * 4 }]}>
                    <PlayingCard card={{ id: 'stock-back', rank: 'A', suit: 'spades' }} faceDown width={CARD_WIDTH} height={CARD_HEIGHT} pointerEvents="none" />
                  </View>
                ))
              )}
            </TouchableOpacity>
            <Text style={[styles.stockLabel, { opacity: gameState.stock.length === 0 ? 0.3 : 1 }]}>
              DEAL ({Math.ceil(gameState.stock.length / 10)} left)
            </Text>
          </View>

          <View style={styles.controls}>
            <TouchableOpacity
              style={styles.undoBtn}
              onPress={handleUndo}
              disabled={undoHistory.length === 0 || paused}
            >
              <View style={[styles.undoInner, (undoHistory.length === 0 || paused) && { opacity: 0.5 }]}>
                <Text style={styles.undoIcon}>↶</Text>
              </View>
            </TouchableOpacity>
            <PremiumButton variant="warning" height={40} onPress={resetGame} style={styles.resetBtn} disabled={paused}>
              <Text style={styles.resetText}>RESET</Text>
            </PremiumButton>
          </View>
        </View>
      </View>

      {gameWon && (
        <GameOverOverlay
          result="win"
          title="KING OF SPIDERS!"
          subtitle={`You beat it in ${elapsedTime}s!`}
          onPlayAgain={resetGame}
        />
      )}

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

const getStyles = (colors: ThemeColors, CARD_WIDTH: number, CARD_HEIGHT: number, SCREEN_PADDING: number) =>
  StyleSheet.create({
    container: { flex: 1 },
    gameArea: { flex: 1, paddingHorizontal: 0, paddingTop: spacing.xs },
    tableauContainer: { flexDirection: 'row', flex: 1, justifyContent: 'center' },
    column: { width: CARD_WIDTH, height: '100%', position: 'relative', marginHorizontal: 0.25 },
    cardWrapper: { position: 'absolute', width: '100%' },
    emptySlot: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: CARD_HEIGHT,
      borderRadius: 4,
      backgroundColor: 'rgba(0,0,0,0.1)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
    },
    selectedCard: {
      borderWidth: 2,
      borderColor: '#fab1a0',
      borderRadius: radius.xs,
      shadowColor: '#fab1a0',
      shadowOpacity: 0.8,
      shadowRadius: 6,
      elevation: 4,
    },
    validColumnGlow: {
      backgroundColor: 'rgba(85, 239, 196, 0.07)',
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: 'rgba(85, 239, 196, 0.4)',
      borderStyle: 'dashed',
    },
    sourceColHighlight: {
      backgroundColor: 'rgba(250, 177, 160, 0.05)',
    },
    bottomRow: {
      height: 80,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      marginBottom: Platform.OS === 'ios' ? 20 : 10,
    },
    stockWrapper: { alignItems: 'center', gap: 4 },
    stock: { width: CARD_WIDTH * 2, height: CARD_HEIGHT, position: 'relative' },
    stockCard: { position: 'absolute' },
    stockLabel: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    controls: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    undoBtn: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: 'rgba(255,255,255,0.1)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    undoInner: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
    undoIcon: { fontSize: 24, color: '#fff' },
    resetBtn: { minWidth: 100 },
    resetText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  });
