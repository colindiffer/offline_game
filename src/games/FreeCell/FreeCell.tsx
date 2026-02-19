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
import { initializeFreeCell, canMoveToFoundation, canMoveToTableau, isGameWon, tryMoveCard, findCardInState, getEmptyFreeCellsCount } from './logic';
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
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

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
    let newState = JSON.parse(JSON.stringify(state)) as FreeCellGameState;

    let search = true;
    while (search) {
      search = false;
      for (let i = 0; i < 4; i++) { // Check free cells
        const card = newState.freeCells[i];
        if (card) {
          for (let j = 0; j < 4; j++) { // Try all foundations
            if (canMoveToFoundation(card, newState.foundations[j])) {
              const moveResult = tryMoveCard(
                newState,
                { type: 'freeCell', index: i },
                { type: 'foundation', pileIndex: j }
              );
              if (moveResult) {
                newState = moveResult;
                changed = true;
                search = true; // Keep searching for more auto moves
                playSound('drop');
                break;
              }
            }
          }
        }
      }
      for (let i = 0; i < 8; i++) { // Check tableau piles
        const pile = newState.tableau[i];
        if (pile.length > 0) {
          const card = pile[pile.length - 1]; // Top card only
          for (let j = 0; j < 4; j++) { // Try all foundations
            if (canMoveToFoundation(card, newState.foundations[j])) {
              const moveResult = tryMoveCard(
                newState,
                { type: 'tableau', pileIndex: i, cardIndex: pile.length - 1 },
                { type: 'foundation', pileIndex: j }
              );
              if (moveResult) {
                newState = moveResult;
                changed = true;
                search = true; // Keep searching for more auto moves
                playSound('drop');
                break;
              }
            }
          }
        }
      }
    }
    return changed ? newState : null;
  }, [playSound]);

  const handleCardPress = useCallback((card: Card, source: { type: 'tableau'; pileIndex: number; cardIndex: number } | { type: 'freeCell'; index: number }) => {
    if (gameWon || pausedRef.current) return;

    if (selectedCard) {
      // A card is already selected, try to move it to the new source's location
      const fromLocation = findCardInState(gameStateRef.current, selectedCard);
      if (!fromLocation) {
        setSelectedCard(null);
        return;
      }

      let toLocation: { type: 'tableau'; pileIndex: number } | { type: 'freeCell'; index: number } | { type: 'foundation'; suit: string } | null = null;
      
      if (source.type === 'tableau') {
        toLocation = { type: 'tableau', pileIndex: source.pileIndex };
      } else if (source.type === 'freeCell') {
        toLocation = { type: 'freeCell', index: source.index };
      }

      // Try moving to foundation directly from the card press if it's the right suit
      if (!toLocation && selectedCard && canMoveToFoundation(selectedCard, gameStateRef.current.foundations.find(f => f.length > 0 ? f[0].suit === selectedCard.suit : true) || [])) {
         // Find the index of the foundation pile for the selected card's suit
         const foundationIndex = gameStateRef.current.foundations.findIndex(
            f => (f.length > 0 && f[0].suit === selectedCard.suit) || f.length === 0
         );
         if (foundationIndex !== -1) {
            toLocation = { type: 'foundation', pileIndex: foundationIndex };
         }
      }

      if (toLocation) {
        const newState = tryMoveCard(gameStateRef.current, fromLocation, toLocation);
        if (newState) {
          const autoState = autoMoveToFoundation(newState);
          setGameState(autoState || newState);
          playSound('drop');
          setSelectedCard(null);
          if (isGameWon((autoState || newState).foundations)) {
            setGameWon(true);
            playSound('win');
            recordGameResult('freecell', 'win', elapsedTime);
          }
        } else {
          // Invalid move, deselect current card and select the new one
          playSound('error');
          setSelectedCard(card);
        }
      } else {
        // Source was not a valid target for the selected card
        playSound('error');
        setSelectedCard(card);
      }
    } else {
      // No card selected, select this one
      setSelectedCard(card);
      playSound('tap');
    }
  }, [gameWon, elapsedTime, playSound, selectedCard, autoMoveToFoundation]);
  
  const handleFoundationTap = useCallback((foundationIndex: number) => {
    if (gameWon || pausedRef.current) return;

    if (selectedCard) {
      const fromLocation = findCardInState(gameStateRef.current, selectedCard);
      if (!fromLocation) { setSelectedCard(null); return; }

      // Try tapped pile first, then all others — this lets the user tap any foundation
      // and the card lands on the correct suit pile automatically
      const order = [foundationIndex, ...([0,1,2,3].filter(i => i !== foundationIndex))];
      let newState: FreeCellGameState | null = null;
      for (const idx of order) {
        newState = tryMoveCard(gameStateRef.current, fromLocation, { type: 'foundation', pileIndex: idx });
        if (newState) break;
      }

      if (newState) {
        const autoState = autoMoveToFoundation(newState);
        setGameState(autoState || newState);
        playSound('drop');
        setSelectedCard(null);
        if (isGameWon((autoState || newState).foundations)) {
          setGameWon(true);
          playSound('win');
          recordGameResult('freecell', 'win', elapsedTime);
        }
      } else {
        playSound('error');
        setSelectedCard(null);
      }
    }
  }, [gameWon, elapsedTime, playSound, selectedCard, autoMoveToFoundation]);

  const handleEmptyFreeCellTap = useCallback((index: number) => {
    if (gameWon || pausedRef.current || !selectedCard) return;
    const fromLocation = findCardInState(gameStateRef.current, selectedCard);
    if (!fromLocation) { setSelectedCard(null); return; }
    const newState = tryMoveCard(gameStateRef.current, fromLocation, { type: 'freeCell', index });
    if (newState) {
      const autoState = autoMoveToFoundation(newState);
      setGameState(autoState || newState);
      playSound('drop');
      setSelectedCard(null);
      if (isGameWon((autoState || newState).foundations)) {
        setGameWon(true);
        playSound('win');
        recordGameResult('freecell', 'win', elapsedTime);
      }
    } else {
      playSound('error');
      setSelectedCard(null);
    }
  }, [gameWon, elapsedTime, playSound, selectedCard, autoMoveToFoundation]);

  const handleEmptyTableauTap = useCallback((pileIndex: number) => {
    if (gameWon || pausedRef.current) return;

    if (selectedCard) {
      const fromLocation = findCardInState(gameStateRef.current, selectedCard);
      if (!fromLocation) {
        setSelectedCard(null);
        return;
      }

      const newState = tryMoveCard(
        gameStateRef.current,
        fromLocation,
        { type: 'tableau', pileIndex: pileIndex }
      );

      if (newState) {
        const autoState = autoMoveToFoundation(newState);
        setGameState(autoState || newState);
        playSound('drop');
        setSelectedCard(null);
        if (isGameWon((autoState || newState).foundations)) {
          setGameWon(true);
          playSound('win');
          recordGameResult('freecell', 'win', elapsedTime);
        }
      } else {
        playSound('error');
      }
    }
  }, [gameWon, elapsedTime, playSound, selectedCard, autoMoveToFoundation]);


  const resetGame = () => {
    setGameState(initializeFreeCell());
    setPaused(false);
    setElapsedTime(0);
    setSelectedCard(null);
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
        onPause={() => { setSelectedCard(null); setPaused(!paused); }}
        isPaused={paused}
      />

      <View style={styles.gameArea}>
        {/* Top row: free cells + foundations */}
        <View style={styles.topRow}>
          <View style={styles.freeCells}>
            {gameState.freeCells.map((card, i) => {
              const source = { type: 'freeCell', index: i } as const;
              const isSelected = selectedCard && selectedCard.suit === card?.suit && selectedCard.rank === card?.rank;
              return (
                <TouchableOpacity
                  key={`free-${i}`}
                  style={[
                    styles.cellSlot,
                    isSelected && styles.selectedGlow,
                  ]}
                  onPress={() => card ? handleCardPress(card, source) : handleEmptyFreeCellTap(i)}
                  disabled={paused || gameWon || (!card && !selectedCard)}
                  activeOpacity={0.8}
                >
                  {card && (
                    <PlayingCard card={card} width={CARD_WIDTH} height={CARD_HEIGHT} pointerEvents="none" />
                  )}
                  {!card && selectedCard && (
                     <View style={[styles.emptySlot, styles.validTargetGlow, {width: CARD_WIDTH, height: CARD_HEIGHT}]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.foundations}>
            {gameState.foundations.map((pile, i) => {
              const topCard = pile.length > 0 ? pile[pile.length - 1] : null;
              const isValidTarget = selectedCard && canMoveToFoundation(selectedCard, pile);
              return (
                <TouchableOpacity
                  key={`foundation-${i}`}
                  style={[styles.cellSlot, isValidTarget && styles.validTargetGlow]}
                  onPress={() => handleFoundationTap(i)}
                  disabled={paused || gameWon || (!selectedCard)}
                  activeOpacity={0.8}
                >
                  {topCard ? (
                    <PlayingCard card={topCard} width={CARD_WIDTH} height={CARD_HEIGHT} pointerEvents="none" />
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
            const topCard = pile.length > 0 ? pile[pile.length - 1] : null;
            const isEmptyTarget = pile.length === 0 && selectedCard && getEmptyFreeCellsCount(gameState.freeCells) > 0;
            const isValidTarget = selectedCard && topCard && canMoveToTableau(selectedCard, pile);

            return (
              <View
                key={colKey}
                style={[styles.column, (isValidTarget || isEmptyTarget) && styles.validColumnGlow]}
              >
                {pile.length === 0 && (
                  <TouchableOpacity
                    style={[styles.emptySlot, { width: CARD_WIDTH, height: CARD_HEIGHT }]}
                    onPress={() => handleEmptyTableauTap(i)}
                    disabled={paused || gameWon || (selectedCard && !isEmptyTarget)}
                  />
                )}
                {pile.map((card, j) => {
                  const source = { type: 'tableau', pileIndex: i, cardIndex: j } as const;
                  const isCardSelected = selectedCard && selectedCard.suit === card.suit && selectedCard.rank === card.rank;
                  const isBottomCard = j === pile.length - 1;

                  // Check if this card is the start of a movable stack
                  const numCardsInStack = pile.length - j;
                  const emptyFreeCells = getEmptyFreeCellsCount(gameState.freeCells);
                  const emptyTableauPiles = gameState.tableau.filter(p => p.length === 0).length;
                  const maxMovable = (1 + emptyFreeCells) * Math.pow(2, emptyTableauPiles);
                  const isMovableStack = numCardsInStack <= maxMovable;

                  return (
                    <TouchableOpacity
                      key={card.id}
                      style={[
                        styles.cardWrapper,
                        { top: j * (CARD_HEIGHT * 0.25) },
                        isCardSelected && styles.selectedGlow,
                      ]}
                      onPress={() => isMovableStack && handleCardPress(card, source)}
                      disabled={paused || gameWon || !isMovableStack}
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
      // This is now used as a potential drop target visual, not just a placeholder
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