import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View, Animated, PanResponder, Dimensions } from 'react-native';
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

const SCREEN_WIDTH = Dimensions.get('window').width;
const COLUMN_GAP = 4;
const SCREEN_PADDING = 8;
const CARD_WIDTH = Math.floor((SCREEN_WIDTH - (SCREEN_PADDING * 2) - (COLUMN_GAP * 6)) / 7);
const CARD_HEIGHT = Math.floor(CARD_WIDTH * 1.4);

interface Props {
  difficulty: Difficulty;
}

export default function Solitaire({ difficulty }: Props) {
  const { colors } = useTheme();
  const { playSound } = useSound();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const config = getSolitaireConfig(difficulty);

  const [gameState, setGameState] = useState<GameState>(() => initializeGame());
  const [undoHistory, setUndoHistory] = useState<GameState[]>([]);
  const [selected, setSelected] = useState<{ source: string; cardIndex: number } | null>(null);
  const [gameWon, setGameWon] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [highScore, setHighScoreState] = useState<number | null>(null);
  const [passes, setPasses] = useState(0);
  const [dragging, setDragging] = useState<{ source: string; cardIndex: number; cards: Card[] } | null>(null);

  // Refs for logic
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;
  const draggingRef = useRef(dragging);
  draggingRef.current = dragging;
  const gameWonRef = useRef(gameWon);
  gameWonRef.current = gameWon;

  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const cardAnimations = useRef<Map<string, Animated.Value>>(new Map());
  const dragPosition = useRef(new Animated.ValueXY()).current;
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
    if (!gameWon && startTimeRef.current) {
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTimeRef.current!) / 1000));
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameWon]);

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
    if (undoHistory.length === 0) return;
    const previousState = undoHistory[undoHistory.length - 1];
    setGameState(previousState);
    setUndoHistory(prev => prev.slice(0, -1));
    playSound('tap');
  }, [undoHistory, playSound]);

  const performMove = useCallback((srcSource: string, srcIndex: number, targetSource: string) => {
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
          if (highScore === null || finalTime < highScore) {
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
  }, [highScore, playSound, saveToUndo]);

  const handleCardClick = useCallback((source: string, cardIndex: number) => {
    if (gameWonRef.current) return;
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
    startTimeRef.current = null;
  }, []);

  const panResponders = useRef<Map<string, any>>(new Map());

  const getPanResponder = (source: string, cardIndex: number) => {
    const key = `${source}-${cardIndex}`;
    if (!panResponders.current.has(key)) {
      panResponders.current.set(key, PanResponder.create({
        onStartShouldSetPanResponder: () => !gameWonRef.current,
        onMoveShouldSetPanResponder: (_, gesture) => !gameWonRef.current && (Math.abs(gesture.dx) > 5 || Math.abs(gesture.dy) > 5),
        onPanResponderGrant: (evt, gesture) => {
          if (!startTimeRef.current) startTimeRef.current = Date.now();
          let srcPile: Pile = [];
          if (source === 'waste') srcPile = gameStateRef.current.waste;
          else if (source.startsWith('tableau')) {
            const tIdx = parseInt(source.split('-')[1], 10);
            srcPile = gameStateRef.current.tableau[tIdx];
          }
          if (srcPile.length === 0 || cardIndex >= srcPile.length || !srcPile[cardIndex].faceUp) return;

          const cards = srcPile.slice(cardIndex);
          setDragging({ source, cardIndex, cards });

          dragPosition.setOffset({ x: evt.nativeEvent.pageX - 30, y: evt.nativeEvent.pageY - 40 });
          dragPosition.setValue({ x: 0, y: 0 });
          playSound('tap');
        },
        onPanResponderMove: Animated.event([null, { dx: dragPosition.x, dy: dragPosition.y }], { useNativeDriver: false }),
        onPanResponderRelease: (evt, gesture) => {
          const isTap = Math.abs(gesture.dx) < 10 && Math.abs(gesture.dy) < 10;

          if (isTap) {
            dragPosition.flattenOffset();
            dragPosition.setValue({ x: 0, y: 0 });
            setDragging(null);
            handleCardClick(source, cardIndex);
            return;
          }

          if (!draggingRef.current) { setDragging(null); return; }

          const dropX = evt.nativeEvent.pageX;
          const dropY = evt.nativeEvent.pageY;
          let targetPile: string | null = null;
          let minDistance = 200;

          for (const [key, pos] of pilePositions.current.entries()) {
            const isInside = 
              dropX >= pos.x - 20 && 
              dropX <= pos.x + pos.width + 20 &&
              dropY >= pos.y - 20 && 
              dropY <= pos.y + pos.height + 20;

            if (isInside) {
              targetPile = key;
              minDistance = 0;
              break;
            } else {
              const centerX = pos.x + pos.width / 2;
              const centerY = pos.y + pos.height / 2;
              const distance = Math.sqrt(Math.pow(dropX - centerX, 2) + Math.pow(dropY - centerY, 2));
              if (distance < minDistance) {
                minDistance = distance;
                targetPile = key;
              }
            }
          }

          if (targetPile) {
            let finalTarget: string = targetPile;
            if (finalTarget.includes('-card-')) {
              const parts = finalTarget.split('-');
              finalTarget = `${parts[0]}-${parts[1]}`;
            }
            performMove(draggingRef.current.source, draggingRef.current.cardIndex, finalTarget);
          }

          dragPosition.flattenOffset();
          dragPosition.setValue({ x: 0, y: 0 });
          setDragging(null);
        },
      }));
    }
    return panResponders.current.get(key);
  };

  const handleDraw = useCallback(() => {
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
  }, [config, passes, playSound, saveToUndo]);

  const renderCard = (card: Card | null, source: string, cardIndex: number, isSelected: boolean) => {
    if (!card) return (
      <View 
        style={[styles.cardPlaceholder, styles.emptyCard]} 
        onLayout={(e) => e.currentTarget.measure((x, y, width, height, pageX, pageY) => { 
          if (pageX) pilePositions.current.set(source, { x: pageX, y: pageY, width, height }); 
        })}
      >
        <View style={styles.cardPlaceholderInner} />
      </View>
    );
    
    const animValue = getCardAnimation(card.id);
    const isDraggingThis = dragging?.source === source && dragging?.cardIndex === cardIndex;
    const pr = getPanResponder(source, cardIndex);

    return (
      <Animated.View
        {...pr.panHandlers}
        onLayout={(e) => e.currentTarget.measure((x, y, width, height, pageX, pageY) => { 
          if (pageX) pilePositions.current.set(`${source}-card-${cardIndex}`, { x: pageX, y: pageY, width, height }); 
        })}
        style={[
          styles.cardWrapper, 
          isSelected && styles.selectedCardGlow, 
          isDraggingThis && styles.draggingCard, 
          { transform: [{ scale: animValue }] }
        ]}
      >
        <PlayingCard card={card} faceDown={!card.faceUp} width={CARD_WIDTH} height={CARD_HEIGHT} />
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.bgIcon}>🃏</Text>
      <LinearGradient colors={['#27ae60', '#1b4332']} style={StyleSheet.absoluteFill} />
      <Header title="Solitaire" score={elapsedTime} scoreLabel="TIME" highScore={highScore || 0} highScoreLabel="BEST" />
      
      <View style={styles.gameArea}>
        <View style={styles.topRow}>
          <View style={styles.foundationRow}>
            {gameState.foundations.map((f, i) => (
              <View key={i} style={styles.foundationSpot} onLayout={(e) => e.currentTarget.measure((x, y, width, height, pageX, pageY) => { if (pageX) pilePositions.current.set(`foundation-${i}`, { x: pageX, y: pageY, width, height }); })}>
                {f.length > 0 ? renderCard(f[f.length - 1], `foundation-${i}`, f.length - 1, false) : (
                  <TouchableOpacity onPress={() => handleCardClick(`foundation-${i}`, 0)} style={styles.cardPlaceholder}>
                    <Text style={styles.suitHint}>{i === 0 ? '♥' : i === 1 ? '♦' : i === 2 ? '♣' : '♠'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
          
          <View style={styles.stockWasteGroup}>
            <View style={styles.wastePile}>
              {gameState.waste.length > 0 && renderCard(gameState.waste[gameState.waste.length - 1], 'waste', gameState.waste.length - 1, selected?.source === 'waste')}
            </View>
            <TouchableOpacity style={styles.stockZone} onPress={handleDraw} disabled={gameWon}>
              {gameState.stock.length > 0 ? (
                <View style={styles.stackBack}>
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
          {gameState.tableau.map((pile, i) => (
            <View key={i} style={styles.tableauColumn} onLayout={(e) => e.currentTarget.measure((x, y, width, height, pageX, pageY) => { if (pageX) pilePositions.current.set(`tableau-${i}`, { x: pageX, y: pageY, width, height }); })}>
              {pile.length === 0 && (
                <TouchableOpacity 
                  style={[styles.cardPlaceholder, { width: CARD_WIDTH, height: CARD_HEIGHT }]} 
                  onPress={() => handleCardClick(`tableau-${i}`, 0)} 
                  disabled={gameWon} 
                />
              )}
              {pile.map((card, j) => (
                <View key={j} style={[styles.tableauCardWrapper, { top: j * (CARD_HEIGHT * 0.25) }]}>
                  {renderCard(card, `tableau-${i}`, j, selected?.source === `tableau-${i}` && selected?.cardIndex === j)}
                </View>
              ))}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.bottomControls}>
        <TouchableOpacity style={styles.undoCircle} onPress={handleUndo} disabled={undoHistory.length === 0}>
          <View style={[styles.undoInner, undoHistory.length === 0 && { opacity: 0.5 }]}>
            <Text style={styles.undoIcon}>↶</Text>
            <Text style={styles.undoText}>Undo</Text>
            {undoHistory.length > 0 && (
              <View style={styles.undoBadge}><Text style={styles.undoBadgeText}>{undoHistory.length}</Text></View>
            )}
          </View>
        </TouchableOpacity>
        
        <PremiumButton variant="secondary" height={44} style={styles.newGameBtn} onPress={resetGame}>
          <Text style={styles.newGameText}>NEW GAME</Text>
        </PremiumButton>
      </View>

      {gameWon && <GameOverOverlay result="win" title="MATCH COMPLETE" subtitle={`Time: ${elapsedTime}s`} onPlayAgain={resetGame} />}
      
      {dragging && (
        <View style={styles.dragOverlay} pointerEvents="none">
          {dragging.cards.map((card, i) => (
            <Animated.View key={i} style={[styles.draggedCard, { 
              left: dragPosition.x, 
              top: Animated.add(dragPosition.y, i * (CARD_HEIGHT * 0.25)),
              width: CARD_WIDTH,
              height: CARD_HEIGHT,
            }]}>
              <PlayingCard card={card} width={CARD_WIDTH} height={CARD_HEIGHT} />
            </Animated.View>
          ))}
        </View>
      )}
    </View>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1 },
  gameArea: { flex: 1, paddingHorizontal: SCREEN_PADDING, paddingTop: spacing.md },
  topRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: spacing.lg,
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
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  undoIcon: { fontSize: 24, color: '#fff', marginBottom: -2 },
  undoText: { fontSize: 10, color: '#fff', fontWeight: 'bold' },
  undoBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#fff',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  undoBadgeText: { color: '#000', fontSize: 10, fontWeight: 'bold' },
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