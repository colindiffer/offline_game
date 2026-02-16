import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View, Animated, PanResponder, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Header from '../../components/Header';
import GameOverOverlay from '../../components/GameOverOverlay';
import PlayingCard from '../../components/PlayingCard';
import PremiumButton from '../../components/PremiumButton';
import { useTheme } from '../../contexts/ThemeContext';
import { useSound } from '../../contexts/SoundContext';
import { getHighScore, setHighScore, getLevel, setLevel } from '../../utils/storage';
import { recordGameResult } from '../../utils/stats';
import { Difficulty } from '../../types';
import { ThemeColors } from '../../utils/themes';
import { spacing, radius, shadows } from '../../utils/designTokens';
import { initializeSpider, canMoveCards, canPlaceOn, getRankValue, Pile } from './logic';
import { Card } from '../../types/cards';

const SCREEN_WIDTH = Dimensions.get('window').width;
const COLUMN_GAP = 2;
const SCREEN_PADDING = 4;
const CARD_WIDTH = Math.floor((SCREEN_WIDTH - (SCREEN_PADDING * 2) - (COLUMN_GAP * 9)) / 10);
const CARD_HEIGHT = Math.floor(CARD_WIDTH * 1.4);

export default function SpiderSolitaire({ difficulty }: Props) {
  const { colors } = useTheme();
  const { playSound } = useSound();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [gameState, setGameState] = useState(() => initializeSpider(difficulty));
  const [undoHistory, setUndoHistory] = useState<any[]>([]);
  const [gameWon, setGameWon] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [completedSuits, setCompletedSuits] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [dragging, setDragging] = useState<{ sourceCol: number; cardIndex: number; cards: Card[] } | null>(null);

  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;
  const draggingRef = useRef(dragging);
  draggingRef.current = dragging;

  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const dragPosition = useRef(new Animated.ValueXY()).current;
  const pilePositions = useRef<Map<string, { x: number; y: number; width: number; height: number }>>(new Map());

  useEffect(() => {
    setIsReady(true);
    startTimeRef.current = Date.now();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    if (!gameWon && isReady && startTimeRef.current) {
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTimeRef.current!) / 1000));
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [gameWon, isReady]);

  const saveToUndo = useCallback(() => {
    setUndoHistory(prev => [...prev.slice(-19), JSON.parse(JSON.stringify(gameStateRef.current))]);
  }, []);

  const handleUndo = useCallback(() => {
    if (undoHistory.length === 0) return;
    const previous = undoHistory[undoHistory.length - 1];
    setGameState(previous);
    setUndoHistory(prev => prev.slice(0, -1));
    playSound('tap');
  }, [undoHistory, playSound]);

  const checkCompletedSequence = (tableau: Pile[]) => {
    let newCompleted = completedSuits;
    const nextTableau = tableau.map(p => [...p]);
    
    nextTableau.forEach((pile, i) => {
      if (pile.length < 13) return;
      
      // Look at top 13 cards
      const last13 = pile.slice(-13);
      if (last13[0].rank === 'K' && canMoveCards(last13)) {
        // Complete suit found!
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
  };

  const handleDeal = useCallback(() => {
    if (gameState.stock.length === 0 || gameWon) return;
    saveToUndo();
    
    setGameState(prev => {
      const nextTableau = prev.tableau.map((pile, i) => {
        const card = prev.stock[prev.stock.length - 1 - i];
        return [...pile, { ...card, faceUp: true }];
      });
      
      const nextStock = prev.stock.slice(0, -10);
      return { ...prev, tableau: checkCompletedSequence(nextTableau), stock: nextStock };
    });
    playSound('drop');
  }, [gameState, gameWon, saveToUndo, playSound]);

  const performMove = useCallback((srcCol: number, cardIdx: number, targetCol: number) => {
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
  }, [saveToUndo, playSound]);

  const panResponders = useRef<Map<string, any>>(new Map());

  const getPanResponder = (colIdx: number, cardIdx: number) => {
    const key = `${colIdx}-${cardIdx}`;
    if (!panResponders.current.has(key)) {
      panResponders.current.set(key, PanResponder.create({
        onStartShouldSetPanResponder: () => !gameWon,
        onMoveShouldSetPanResponder: (_, gesture) => !gameWon && (Math.abs(gesture.dx) > 5 || Math.abs(gesture.dy) > 5),
        onPanResponderGrant: (evt) => {
          const cards = gameStateRef.current.tableau[colIdx].slice(cardIdx);
          if (!canMoveCards(cards)) return;

          setDragging({ sourceCol: colIdx, cardIndex: cardIdx, cards });
          dragPosition.setOffset({ x: evt.nativeEvent.pageX - 20, y: evt.nativeEvent.pageY - 30 });
          dragPosition.setValue({ x: 0, y: 0 });
          playSound('tap');
        },
        onPanResponderMove: Animated.event([null, { dx: dragPosition.x, dy: dragPosition.y }], { useNativeDriver: false }),
        onPanResponderRelease: (evt) => {
          if (!draggingRef.current) return;
          
          const dropX = evt.nativeEvent.pageX;
          const dropY = evt.nativeEvent.pageY;
          let targetCol: number | null = null;
          
          for (let i = 0; i < 10; i++) {
            const pos = pilePositions.current.get(`col-${i}`);
            if (pos && dropX >= pos.x && dropX <= pos.x + pos.width) {
              targetCol = i;
              break;
            }
          }

          if (targetCol !== null && targetCol !== draggingRef.current.sourceCol) {
            performMove(draggingRef.current.sourceCol, draggingRef.current.cardIndex, targetCol);
          }

          dragPosition.flattenOffset();
          dragPosition.setValue({ x: 0, y: 0 });
          setDragging(null);
        }
      }));
    }
    return panResponders.current.get(key);
  };

  const resetGame = useCallback(() => {
    setGameState(initializeSpider(difficulty));
    setUndoHistory([]);
    setCompletedSuits(0);
    setGameWon(false);
    setElapsedTime(0);
    startTimeRef.current = Date.now();
  }, [difficulty]);

  if (!isReady) return <View style={styles.container} />;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1b4332', '#081c15']} style={StyleSheet.absoluteFill} />
      <Header title="Spider" score={completedSuits} scoreLabel="SUITS" highScore={elapsedTime} highScoreLabel="TIME" />
      
      <View style={styles.gameArea}>
        <View style={styles.tableauContainer}>
          {gameState.tableau.map((pile, i) => (
            <View 
              key={i} 
              style={styles.column}
              onLayout={(e) => e.currentTarget.measure((x, y, width, height, pageX, pageY) => {
                if (pageX) pilePositions.current.set(`col-${i}`, { x: pageX, y: pageY, width, height });
              })}
            >
              {pile.length === 0 && <View style={styles.emptySlot} />}
              {pile.map((card, j) => {
                const isDraggable = canMoveCards(pile.slice(j));
                const pr = isDraggable ? getPanResponder(i, j) : null;
                const isDraggingThis = dragging?.sourceCol === i && j >= dragging.cardIndex;

                return (
                  <View key={card.id} style={[styles.cardWrapper, { top: j * (CARD_HEIGHT * 0.22) }]} {...(pr?.panHandlers || {})}>
                    <PlayingCard card={card} faceDown={!card.faceUp} width={CARD_WIDTH} height={CARD_HEIGHT} style={isDraggingThis && { opacity: 0 }} />
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        <View style={styles.bottomRow}>
          <TouchableOpacity style={styles.stock} onPress={handleDeal} disabled={gameState.stock.length === 0}>
            {Array.from({ length: Math.ceil(gameState.stock.length / 10) }).map((_, i) => (
              <View key={i} style={[styles.stockCard, { left: i * 4 }]}>
                <PlayingCard card={null} faceDown width={CARD_WIDTH} height={CARD_HEIGHT} />
              </View>
            ))}
          </TouchableOpacity>

          <View style={styles.controls}>
            <TouchableOpacity style={styles.undoBtn} onPress={handleUndo} disabled={undoHistory.length === 0}>
              <View style={[styles.undoInner, undoHistory.length === 0 && { opacity: 0.5 }]}>
                <Text style={styles.undoIcon}>↶</Text>
              </View>
            </TouchableOpacity>
            <PremiumButton variant="secondary" height={40} onPress={resetGame} style={styles.resetBtn}>
              <Text style={styles.resetText}>RESET</Text>
            </PremiumButton>
          </View>
        </View>
      </View>

      {dragging && (
        <View style={styles.dragOverlay} pointerEvents="none">
          {dragging.cards.map((card, i) => (
            <Animated.View key={i} style={[styles.draggedCard, { left: dragPosition.x, top: Animated.add(dragPosition.y, i * (CARD_HEIGHT * 0.22)) }]}>
              <PlayingCard card={card} width={CARD_WIDTH} height={CARD_HEIGHT} />
            </Animated.View>
          ))}
        </View>
      )}

      {gameWon && <GameOverOverlay result="win" title="KING OF SPIDERS!" subtitle={`You beat it in ${elapsedTime}s!`} onPlayAgain={resetGame} />}
    </View>
  );
}

interface Props {
  difficulty: Difficulty;
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1 },
  gameArea: { flex: 1, paddingHorizontal: SCREEN_PADDING, paddingTop: spacing.md },
  tableauContainer: { flexDirection: 'row', flex: 1, justifyContent: 'space-between' },
  column: { width: CARD_WIDTH, height: '100%', position: 'relative' },
  cardWrapper: { position: 'absolute', width: '100%' },
  emptySlot: { width: CARD_WIDTH, height: CARD_HEIGHT, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  bottomRow: { height: 100, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, marginBottom: Platform.OS === 'ios' ? 30 : 10 },
  stock: { width: CARD_WIDTH * 2, height: CARD_HEIGHT, position: 'relative' },
  stockCard: { position: 'absolute' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  undoBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  undoInner: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  undoIcon: { fontSize: 24, color: '#fff' },
  resetBtn: { minWidth: 100 },
  resetText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  dragOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 1000 },
  draggedCard: { position: 'absolute', zIndex: 1001, ...shadows.lg },
});
