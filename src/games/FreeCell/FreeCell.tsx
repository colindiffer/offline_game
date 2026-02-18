import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, useWindowDimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Header from '../../components/Header';
import GameOverOverlay from '../../components/GameOverOverlay';
import PlayingCard from '../../components/PlayingCard';
import { useTheme } from '../../contexts/ThemeContext';
import { useSound } from '../../contexts/SoundContext';
import { recordGameResult } from '../../utils/stats';
import { Difficulty } from '../../types';
import { ThemeColors } from '../../utils/themes';
import { spacing, radius, shadows } from '../../utils/designTokens';
import { initializeFreeCell, canMoveToFoundation, canMoveToTableau, isGameWon } from './logic';
import { FreeCellGameState } from './types';
import { Card } from '../../types/cards';

interface Props {
  difficulty: Difficulty;
}

export default function FreeCell({ difficulty }: Props) {
  const { colors } = useTheme();
  const { playSound } = useSound();
  const { width: SCREEN_WIDTH } = useWindowDimensions();

  const { CARD_WIDTH, CARD_HEIGHT, COLUMN_GAP, SCREEN_PADDING } = useMemo(() => {
    const gap = 2;
    const padding = 4;
    const cw = Math.floor((SCREEN_WIDTH - (padding * 2) - (gap * 7)) / 8);
    const ch = Math.floor(cw * 1.45);
    return { CARD_WIDTH: cw, CARD_HEIGHT: ch, COLUMN_GAP: gap, SCREEN_PADDING: padding };
  }, [SCREEN_WIDTH]);

  const styles = useMemo(
    () => getStyles(colors, CARD_WIDTH, CARD_HEIGHT, COLUMN_GAP, SCREEN_PADDING),
    [colors, CARD_WIDTH, CARD_HEIGHT, COLUMN_GAP, SCREEN_PADDING],
  );

  const [gameState, setGameState] = useState<FreeCellGameState>(() => initializeFreeCell());
  const [gameWon, setGameWon] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [paused, setPaused] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [selected, setSelected] = useState<{ source: string; cardIndex: number } | null>(null);

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

  const autoMoveToFoundation = useCallback((state: FreeCellGameState) => {
    if (pausedRef.current) return null;
    let changed = false;
    const newState = JSON.parse(JSON.stringify(state));

    let search = true;
    while (search) {
      search = false;
      for (let i = 0; i < 4; i++) {
        const card = newState.freeCells[i];
        if (card) {
          for (let j = 0; j < 4; j++) {
            if (canMoveToFoundation(card, newState.foundations[j])) {
              newState.foundations[j].push(card);
              newState.freeCells[i] = null;
              changed = true;
              search = true;
              break;
            }
          }
        }
      }
      for (let i = 0; i < 8; i++) {
        const pile = newState.tableau[i];
        if (pile.length > 0) {
          const card = pile[pile.length - 1];
          for (let j = 0; j < 4; j++) {
            if (canMoveToFoundation(card, newState.foundations[j])) {
              newState.foundations[j].push(card);
              newState.tableau[i].pop();
              changed = true;
              search = true;
              break;
            }
          }
        }
      }
    }

    return changed ? newState : null;
  }, []);

  const performMove = useCallback((src: string, cardIdx: number, target: string) => {
    if (pausedRef.current) return;
    const state = gameStateRef.current;
    let movingCards: Card[] = [];

    if (src.startsWith('tableau')) {
      const colIdx = parseInt(src.split('-')[1]);
      movingCards = state.tableau[colIdx].slice(cardIdx);
    } else if (src.startsWith('free')) {
      const cellIdx = parseInt(src.split('-')[1]);
      const card = state.freeCells[cellIdx];
      if (card) movingCards = [card];
    }

    if (movingCards.length === 0) return;

    let valid = false;
    let newState = JSON.parse(JSON.stringify(state));

    if (target.startsWith('foundation')) {
      if (movingCards.length === 1) {
        const fIdx = parseInt(target.split('-')[1]);
        if (canMoveToFoundation(movingCards[0], state.foundations[fIdx])) {
          newState.foundations[fIdx].push(movingCards[0]);
          valid = true;
        }
      }
    } else if (target.startsWith('free')) {
      if (movingCards.length === 1) {
        const cellIdx = parseInt(target.split('-')[1]);
        if (newState.freeCells[cellIdx] === null) {
          newState.freeCells[cellIdx] = movingCards[0];
          valid = true;
        }
      }
    } else if (target.startsWith('tableau')) {
      const colIdx = parseInt(target.split('-')[1]);
      if (canMoveToTableau(movingCards[0], state.tableau[colIdx])) {
        newState.tableau[colIdx].push(...movingCards);
        valid = true;
      }
    }

    if (valid) {
      if (src.startsWith('tableau')) {
        const colIdx = parseInt(src.split('-')[1]);
        newState.tableau[colIdx] = newState.tableau[colIdx].slice(0, cardIdx);
      } else if (src.startsWith('free')) {
        const cellIdx = parseInt(src.split('-')[1]);
        newState.freeCells[cellIdx] = null;
      }

      const autoState = autoMoveToFoundation(newState);
      const finalState = autoState || newState;

      setGameState(finalState);
      playSound('drop');

      if (isGameWon(finalState.foundations)) {
        setGameWon(true);
        playSound('win');
        recordGameResult('freecell', 'win', elapsedTime);
      }
    }
  }, [elapsedTime, playSound, autoMoveToFoundation]);

  const handleTap = useCallback((source: string) => {
    if (gameWon || pausedRef.current) return;
    setSelected(prev => {
      const state = gameStateRef.current;
      if (prev) {
        if (prev.source === source) return null; // deselect
        performMove(prev.source, prev.cardIndex, source);
        return null;
      }
      // Nothing selected — determine what to select
      if (source.startsWith('tableau')) {
        const pile = state.tableau[parseInt(source.split('-')[1])];
        if (pile.length === 0) return null;
        playSound('tap');
        return { source, cardIndex: pile.length - 1 };
      }
      if (source.startsWith('free')) {
        const cell = state.freeCells[parseInt(source.split('-')[1])];
        if (!cell) return null;
        playSound('tap');
        return { source, cardIndex: 0 };
      }
      return null; // foundations not selectable as source
    });
  }, [gameWon, performMove, playSound]);

  // Compute valid drop targets whenever selection changes
  const validTargets = useMemo(() => {
    const targets = new Set<string>();
    if (!selected) return targets;

    let movingCards: Card[] = [];
    if (selected.source.startsWith('tableau')) {
      const colIdx = parseInt(selected.source.split('-')[1]);
      movingCards = gameState.tableau[colIdx].slice(selected.cardIndex);
    } else if (selected.source.startsWith('free')) {
      const cellIdx = parseInt(selected.source.split('-')[1]);
      const card = gameState.freeCells[cellIdx];
      if (card) movingCards = [card];
    }

    if (movingCards.length === 0) return targets;
    const card = movingCards[0];

    if (movingCards.length === 1) {
      for (let i = 0; i < 4; i++) {
        if (canMoveToFoundation(card, gameState.foundations[i])) targets.add(`foundation-${i}`);
      }
      for (let i = 0; i < 4; i++) {
        if (gameState.freeCells[i] === null) targets.add(`free-${i}`);
      }
    }

    for (let i = 0; i < 8; i++) {
      if (`tableau-${i}` !== selected.source && canMoveToTableau(card, gameState.tableau[i])) {
        targets.add(`tableau-${i}`);
      }
    }

    return targets;
  }, [selected, gameState]);

  const resetGame = () => {
    setGameState(initializeFreeCell());
    setPaused(false);
    setElapsedTime(0);
    setSelected(null);
    startTimeRef.current = Date.now();
  };

  if (!isReady) return null;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1b4332', '#081c15']} style={StyleSheet.absoluteFill} />
      <Header
        title="FreeCell"
        score={elapsedTime}
        scoreLabel="TIME"
        highScore={0}
        highScoreLabel="BEST"
        light
        onPause={() => { setSelected(null); setPaused(!paused); }}
        isPaused={paused}
      />

      <View style={styles.gameArea}>
        {/* Top row: free cells + foundations */}
        <View style={styles.topRow}>
          <View style={styles.freeCells}>
            {gameState.freeCells.map((card, i) => {
              const src = `free-${i}`;
              const isValidTarget = validTargets.has(src);
              const isSelected = selected?.source === src;
              return (
                <TouchableOpacity
                  key={src}
                  style={[
                    styles.cellSlot,
                    isValidTarget && styles.validTargetGlow,
                    isSelected && styles.selectedGlow,
                  ]}
                  onPress={() => handleTap(src)}
                  disabled={paused || gameWon}
                  activeOpacity={0.8}
                >
                  {card && (
                    <PlayingCard card={card} width={CARD_WIDTH} height={CARD_HEIGHT} pointerEvents="none" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.foundations}>
            {gameState.foundations.map((pile, i) => {
              const src = `foundation-${i}`;
              const isValidTarget = validTargets.has(src);
              return (
                <TouchableOpacity
                  key={src}
                  style={[styles.cellSlot, isValidTarget && styles.validTargetGlow]}
                  onPress={() => handleTap(src)}
                  disabled={paused || gameWon}
                  activeOpacity={0.8}
                >
                  {pile.length > 0 ? (
                    <PlayingCard card={pile[pile.length - 1]} width={CARD_WIDTH} height={CARD_HEIGHT} pointerEvents="none" />
                  ) : (
                    <View style={styles.emptyFoundation}>
                      <Text style={styles.suitHint}>{['♣', '♦', '♥', '♠'][i]}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Tableau */}
        <View style={styles.tableau}>
          {gameState.tableau.map((pile, i) => {
            const colKey = `tableau-${i}`;
            const isValidTarget = validTargets.has(colKey);
            return (
              <View
                key={colKey}
                style={[styles.column, isValidTarget && styles.validColumnGlow]}
              >
                {pile.length === 0 && (
                  <TouchableOpacity
                    style={[styles.emptySlot, { width: CARD_WIDTH, height: CARD_HEIGHT }]}
                    onPress={() => handleTap(colKey)}
                    disabled={paused || gameWon}
                  />
                )}
                {pile.map((card, j) => {
                  const isTop = j === pile.length - 1;
                  const isCardSelected = selected?.source === colKey && selected?.cardIndex === j;
                  return (
                    <TouchableOpacity
                      key={card.id}
                      style={[
                        styles.cardWrapper,
                        { top: j * (CARD_HEIGHT * 0.25) },
                        isCardSelected && styles.selectedGlow,
                      ]}
                      onPress={() => handleTap(colKey)}
                      disabled={paused || gameWon || (!selected && !isTop)}
                      activeOpacity={0.8}
                    >
                      <PlayingCard card={card} width={CARD_WIDTH} height={CARD_HEIGHT} pointerEvents="none" />
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })}
        </View>
      </View>

      {gameWon && (
        <GameOverOverlay result="win" title="BOARD CLEARED!" subtitle={`Solved in ${elapsedTime}s!`} onPlayAgain={resetGame} />
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

const getStyles = (colors: ThemeColors, CARD_WIDTH: number, CARD_HEIGHT: number, COLUMN_GAP: number, SCREEN_PADDING: number) =>
  StyleSheet.create({
    container: { flex: 1 },
    gameArea: { flex: 1, paddingHorizontal: SCREEN_PADDING, paddingTop: spacing.md },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xl },
    freeCells: { flexDirection: 'row', gap: COLUMN_GAP },
    foundations: { flexDirection: 'row', gap: COLUMN_GAP },
    cellSlot: {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      borderRadius: 4,
      backgroundColor: 'rgba(0,0,0,0.15)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
    },
    emptyFoundation: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    suitHint: { color: 'rgba(255,255,255,0.1)', fontSize: 24, fontWeight: 'bold' },
    tableau: { flexDirection: 'row', flex: 1, justifyContent: 'space-between' },
    column: { width: CARD_WIDTH, height: '100%', position: 'relative' },
    cardWrapper: { position: 'absolute', width: '100%' },
    emptySlot: {
      position: 'absolute',
      top: 0,
      left: 0,
      borderRadius: 4,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: 'rgba(255,255,255,0.08)',
    },
    selectedGlow: {
      shadowColor: '#fab1a0',
      shadowOpacity: 1,
      shadowRadius: 10,
      elevation: 5,
      borderWidth: 2,
      borderColor: '#fab1a0',
      borderRadius: radius.xs,
    },
    validTargetGlow: {
      borderWidth: 2,
      borderColor: '#55efc4',
      borderStyle: 'dashed',
      borderRadius: radius.xs,
      backgroundColor: 'rgba(85, 239, 196, 0.15)',
    },
    validColumnGlow: {
      backgroundColor: 'rgba(85, 239, 196, 0.05)',
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: 'rgba(85, 239, 196, 0.35)',
      borderStyle: 'dashed',
    },
  });
