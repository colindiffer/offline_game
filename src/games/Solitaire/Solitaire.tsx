import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View, ScrollView, Animated, PanResponder } from 'react-native';
import Header from '../../components/Header';
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
  isRed,
} from './logic';
import { Card, GameState, Pile } from './types';

interface Props {
  difficulty: Difficulty;
}

export default function Solitaire({ difficulty }: Props) {
  const { colors } = useTheme();
  const { playSound } = useSound();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const config = getSolitaireConfig(difficulty);

  const [gameState, setGameState] = useState<GameState>(() => initializeGame());
  const [selected, setSelected] = useState<{ source: string; cardIndex: number } | null>(null);
  const [gameWon, setGameWon] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [highScore, setHighScoreState] = useState<number | null>(null);
  const [passes, setPasses] = useState(0);
  const [animatingCards, setAnimatingCards] = useState<Set<string>>(new Set());
  const [dragging, setDragging] = useState<{ source: string; cardIndex: number; cards: Card[] } | null>(null);

  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const cardAnimations = useRef<Map<string, Animated.Value>>(new Map());
  const dragPosition = useRef(new Animated.ValueXY()).current;
  const pilePositions = useRef<Map<string, { x: number; y: number; width: number; height: number }>>(new Map());

  useEffect(() => {
    getHighScore('solitaire').then((score) => {
      setHighScoreState(score);
    });
  }, []);

  useEffect(() => {
    // Reset game when difficulty changes
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

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [gameWon]);

  const getCardAnimation = (cardKey: string) => {
    if (!cardAnimations.current.has(cardKey)) {
      cardAnimations.current.set(cardKey, new Animated.Value(1));
    }
    return cardAnimations.current.get(cardKey)!;
  };

  const animateCardMove = (cardKey: string, onComplete?: () => void) => {
    const anim = getCardAnimation(cardKey);
    setAnimatingCards((prev) => new Set(prev).add(cardKey));
    
    Animated.sequence([
      Animated.timing(anim, {
        toValue: 1.1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(anim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setAnimatingCards((prev) => {
        const next = new Set(prev);
        next.delete(cardKey);
        return next;
      });
      if (onComplete) onComplete();
    });
  };

  const animateCardFlip = (cardKey: string) => {
    const anim = getCardAnimation(cardKey);
    setAnimatingCards((prev) => new Set(prev).add(cardKey));
    
    Animated.sequence([
      Animated.timing(anim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(anim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setAnimatingCards((prev) => {
        const next = new Set(prev);
        next.delete(cardKey);
        return next;
      });
    });
  };

  const createPanResponder = useCallback((source: string, cardIndex: number) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => !gameWon,
      onMoveShouldSetPanResponder: () => !gameWon,
      onPanResponderGrant: (evt, gestureState) => {
        if (!startTimeRef.current) {
          startTimeRef.current = Date.now();
        }

        let srcPile: Pile = [];
        if (source === 'waste') {
          srcPile = gameState.waste;
        } else if (source.startsWith('tableau')) {
          const tableauIndex = parseInt(source.split('-')[1], 10);
          srcPile = gameState.tableau[tableauIndex];
        }

        if (srcPile.length === 0 || cardIndex >= srcPile.length || !srcPile[cardIndex].faceUp) {
          return;
        }

        const cards = srcPile.slice(cardIndex);
        setDragging({ source, cardIndex, cards });
        dragPosition.setValue({ x: evt.nativeEvent.pageX, y: evt.nativeEvent.pageY });
        playSound('tap');
      },
      onPanResponderMove: (evt, gestureState) => {
        dragPosition.setValue({ x: evt.nativeEvent.pageX, y: evt.nativeEvent.pageY });
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (!dragging) {
          setDragging(null);
          return;
        }

        const dropX = evt.nativeEvent.pageX;
        const dropY = evt.nativeEvent.pageY;
        let targetPile: string | null = null;
        let minDistance = Infinity;

        // Find closest pile
        pilePositions.current.forEach((pos, key) => {
          const centerX = pos.x + pos.width / 2;
          const centerY = pos.y + pos.height / 2;
          const distance = Math.sqrt(Math.pow(dropX - centerX, 2) + Math.pow(dropY - centerY, 2));
          
          if (distance < 150 && distance < minDistance) {
            minDistance = distance;
            targetPile = key;
          }
        });

        let moved = false;

        if (targetPile !== null && dragging.cards.length > 0) {
          const card = dragging.cards[0];
          const target: string = targetPile;
          
          // Try foundation
          if (target.startsWith('foundation') && dragging.cards.length === 1) {
            const foundationIndex = parseInt(target.split('-')[1], 10);
            if (canMoveToFoundation(card, gameState.foundations[foundationIndex])) {
              performMove(dragging.source, dragging.cardIndex, target);
              moved = true;
            }
          }

          // Try tableau
          if (!moved && target.startsWith('tableau')) {
            const tableauIndex = parseInt(target.split('-')[1], 10);
            if (canMoveToTableau(card, gameState.tableau[tableauIndex])) {
              performMove(dragging.source, dragging.cardIndex, target);
              moved = true;
            }
          }
        }

        setDragging(null);
        dragPosition.setValue({ x: 0, y: 0 });
        
        if (!moved) {
          playSound('tap');
        }
      },
    });
  }, [gameWon, gameState, dragging, playSound]);

  const performMove = (srcSource: string, srcIndex: number, targetSource: string) => {
    let srcPile: Pile = [];

    if (srcSource === 'waste') {
      srcPile = gameState.waste;
    } else if (srcSource.startsWith('tableau')) {
      const tableauIndex = parseInt(srcSource.split('-')[1], 10);
      srcPile = gameState.tableau[tableauIndex];
    }

    if (srcPile.length === 0 || srcIndex >= srcPile.length) {
      return;
    }

    const cards = srcPile.slice(srcIndex);
    const card = cards[0];
    let moved = false;

    // Move to foundation
    if (targetSource.startsWith('foundation') && cards.length === 1) {
      const foundationIndex = parseInt(targetSource.split('-')[1], 10);
      if (canMoveToFoundation(card, gameState.foundations[foundationIndex])) {
        const newState = { ...gameState };
        const newFoundations = [...gameState.foundations] as [Pile, Pile, Pile, Pile];
        newFoundations[foundationIndex] = [...newFoundations[foundationIndex], card];

        if (srcSource === 'waste') {
          newState.waste = gameState.waste.slice(0, -1);
        } else if (srcSource.startsWith('tableau')) {
          const tableauIndex = parseInt(srcSource.split('-')[1], 10);
          const newTableau = [...gameState.tableau] as [Pile, Pile, Pile, Pile, Pile, Pile, Pile];
          newTableau[tableauIndex] = srcPile.slice(0, srcIndex);
          if (newTableau[tableauIndex].length > 0) {
            newTableau[tableauIndex][newTableau[tableauIndex].length - 1].faceUp = true;
          }
          newState.tableau = newTableau;
        }

        newState.foundations = newFoundations;
        setGameState(newState);
        playSound('drop');
        moved = true;
        animateCardMove(`foundation-${foundationIndex}`);

        if (isGameWon(newFoundations)) {
          setGameWon(true);
          playSound('win');
          const finalTime = Math.floor((Date.now() - startTimeRef.current!) / 1000);
          recordGameResult('solitaire', 'win', finalTime);

          if (highScore === null || finalTime < highScore) {
            setHighScoreState(finalTime);
            setHighScore('solitaire', finalTime);
          }
        }
      }
    }

    // Move to tableau
    if (!moved && targetSource.startsWith('tableau')) {
      const tableauIndex = parseInt(targetSource.split('-')[1], 10);
      if (canMoveToTableau(card, gameState.tableau[tableauIndex])) {
        const newState = { ...gameState };
        const newTableau = [...gameState.tableau] as [Pile, Pile, Pile, Pile, Pile, Pile, Pile];
        newTableau[tableauIndex] = [...newTableau[tableauIndex], ...cards];

        if (srcSource === 'waste') {
          newState.waste = gameState.waste.slice(0, -1);
        } else if (srcSource.startsWith('tableau')) {
          const srcTableauIndex = parseInt(srcSource.split('-')[1], 10);
          newTableau[srcTableauIndex] = srcPile.slice(0, srcIndex);
          if (newTableau[srcTableauIndex].length > 0) {
            newTableau[srcTableauIndex][newTableau[srcTableauIndex].length - 1].faceUp = true;
          }
        }

        newState.tableau = newTableau;
        setGameState(newState);
        playSound('drop');
        moved = true;
        animateCardMove(`tableau-${tableauIndex}-${newTableau[tableauIndex].length - 1}`);
      }
    }
  };

  const handleDraw = useCallback(() => {
    if (!startTimeRef.current) {
      startTimeRef.current = Date.now();
    }

    if (gameState.stock.length === 0) {
      if (config.passesAllowed !== null && passes >= config.passesAllowed) {
        return; // Max passes reached
      }
      const { newStock, newWaste } = resetStock(gameState.waste);
      setGameState({ ...gameState, stock: newStock, waste: newWaste });
      setPasses(passes + 1);
      playSound('tap');
      animateCardFlip('stock-reset');
    } else {
      const { newStock, newWaste } = drawFromStock(gameState.stock, gameState.waste, config.drawCount);
      setGameState({ ...gameState, stock: newStock, waste: newWaste });
      playSound('tap');
      if (newWaste.length > 0) {
        animateCardFlip(`waste-${newWaste.length - 1}`);
      }
    }
  }, [gameState, config, passes, playSound]);

  const handleCardClick = useCallback(
    (source: string, cardIndex: number) => {
      if (gameWon) return;

      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
      }

      if (selected) {
        // Try to move selected card
        const { source: srcSource, cardIndex: srcIndex } = selected;
        let srcPile: Pile = [];

        if (srcSource === 'waste') {
          srcPile = gameState.waste;
        } else if (srcSource.startsWith('tableau')) {
          const tableauIndex = parseInt(srcSource.split('-')[1], 10);
          srcPile = gameState.tableau[tableauIndex];
        }

        if (srcPile.length === 0 || srcIndex >= srcPile.length) {
          setSelected(null);
          return;
        }

        const cards = srcPile.slice(srcIndex);
        const card = cards[0];

        let moved = false;

        // Try foundation
        if (source.startsWith('foundation') && cards.length === 1) {
          const foundationIndex = parseInt(source.split('-')[1], 10);
          if (canMoveToFoundation(card, gameState.foundations[foundationIndex])) {
            const newState = { ...gameState };
            const newFoundations = [...gameState.foundations] as [Pile, Pile, Pile, Pile];
            newFoundations[foundationIndex] = [...newFoundations[foundationIndex], card];

            if (srcSource === 'waste') {
              newState.waste = gameState.waste.slice(0, -1);
            } else if (srcSource.startsWith('tableau')) {
              const tableauIndex = parseInt(srcSource.split('-')[1], 10);
              const newTableau = [...gameState.tableau] as [Pile, Pile, Pile, Pile, Pile, Pile, Pile];
              newTableau[tableauIndex] = srcPile.slice(0, srcIndex);
              if (newTableau[tableauIndex].length > 0) {
                newTableau[tableauIndex][newTableau[tableauIndex].length - 1].faceUp = true;
              }
              newState.tableau = newTableau;
            }

            newState.foundations = newFoundations;
            setGameState(newState);
            playSound('drop');
            moved = true;
            animateCardMove(`foundation-${foundationIndex}`);

            if (isGameWon(newFoundations)) {
              setGameWon(true);
              playSound('win');
              const finalTime = Math.floor((Date.now() - startTimeRef.current!) / 1000);
              recordGameResult('solitaire', 'win', finalTime);

              if (highScore === null || finalTime < highScore) {
                setHighScoreState(finalTime);
                setHighScore('solitaire', finalTime);
              }
            }
          }
        }

        // Try tableau
        if (!moved && source.startsWith('tableau')) {
          const tableauIndex = parseInt(source.split('-')[1], 10);
          if (canMoveToTableau(card, gameState.tableau[tableauIndex])) {
            const newState = { ...gameState };
            const newTableau = [...gameState.tableau] as [Pile, Pile, Pile, Pile, Pile, Pile, Pile];
            newTableau[tableauIndex] = [...newTableau[tableauIndex], ...cards];

            if (srcSource === 'waste') {
              newState.waste = gameState.waste.slice(0, -1);
            } else if (srcSource.startsWith('tableau')) {
              const srcTableauIndex = parseInt(srcSource.split('-')[1], 10);
              newTableau[srcTableauIndex] = srcPile.slice(0, srcIndex);
              if (newTableau[srcTableauIndex].length > 0) {
                newTableau[srcTableauIndex][newTableau[srcTableauIndex].length - 1].faceUp = true;
              }
            }

            newState.tableau = newTableau;
            setGameState(newState);
            playSound('drop');
            moved = true;
            animateCardMove(`tableau-${tableauIndex}-${newTableau[tableauIndex].length - 1}`);
          }
        }

        setSelected(null);
        if (!moved) {
          playSound('tap');
        }
      } else {
        // Select card
        setSelected({ source, cardIndex });
        playSound('tap');
      }
    },
    [selected, gameState, gameWon, highScore, playSound]
  );

  const resetGame = useCallback(() => {
    setGameState(initializeGame());
    setSelected(null);
    setGameWon(false);
    setElapsedTime(0);
    setPasses(0);
    startTimeRef.current = null;
  }, []);

  const renderCard = (card: Card | null, source: string, cardIndex: number, isSelected: boolean) => {
    if (!card) {
      return (
        <View 
          style={[styles.card, styles.emptyCard]}
          onLayout={(e) => {
            e.currentTarget.measure((x, y, width, height, pageX, pageY) => {
              pilePositions.current.set(source, { x: pageX, y: pageY, width, height });
            });
          }}
        >
          <Text style={styles.emptyCardText}>Empty</Text>
        </View>
      );
    }

    const cardKey = `${source}-${cardIndex}`;
    const animValue = getCardAnimation(cardKey);
    const isDraggingThis = dragging?.source === source && dragging?.cardIndex === cardIndex;

    if (!card.faceUp) {
      return (
        <Animated.View 
          style={[
            styles.card, 
            styles.cardBack,
            {
              transform: [{ scaleX: animValue }],
            }
          ]}
        >
          <Text style={styles.cardBackText}>🂠</Text>
        </Animated.View>
      );
    }

    const panResponder = createPanResponder(source, cardIndex);

    return (
      <Animated.View
        {...panResponder.panHandlers}
        onLayout={(e) => {
          e.currentTarget.measure((x, y, width, height, pageX, pageY) => {
            pilePositions.current.set(`${source}-card-${cardIndex}`, { x: pageX, y: pageY, width, height });
          });
        }}
        style={[
          styles.card, 
          styles.cardFront, 
          isSelected && styles.selectedCard,
          isDraggingThis && styles.draggingCard,
          {
            transform: [
              { scale: animValue },
            ],
          }
        ]}
      >
        <Text style={[styles.cardText, isRed(card.suit) && styles.redCard]}>
          {card.rank}
          {card.suit}
        </Text>
      </Animated.View>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <Header
          title="Solitaire"
          score={elapsedTime}
          scoreLabel="Time"
          highScore={highScore || 0}
          highScoreLabel="Best"
        />

        <View style={styles.topRow}>
          <TouchableOpacity
            style={styles.stockPile}
            onPress={handleDraw}
            disabled={gameWon}
          >
            {gameState.stock.length > 0 ? (
              <Text style={styles.stockText}>🂠 {gameState.stock.length}</Text>
            ) : (
              <Text style={styles.stockText}>↻</Text>
            )}
          </TouchableOpacity>

          <View style={styles.wastePile}>
            {gameState.waste.length > 0 &&
              renderCard(
                gameState.waste[gameState.waste.length - 1],
                'waste',
                gameState.waste.length - 1,
                selected?.source === 'waste'
              )}
          </View>

          <View style={styles.spacer} />

          {gameState.foundations.map((foundation, i) => (
            <View
              key={i}
              style={styles.foundationPile}
              onLayout={(e) => {
                e.currentTarget.measure((x, y, width, height, pageX, pageY) => {
                  pilePositions.current.set(`foundation-${i}`, { x: pageX, y: pageY, width, height });
                });
              }}
            >
              <TouchableOpacity
                onPress={() => handleCardClick(`foundation-${i}`, 0)}
                disabled={gameWon}
              >
                {foundation.length > 0 ? (
                  renderCard(foundation[foundation.length - 1], `foundation-${i}`, 0, false)
                ) : (
                  <View style={[styles.card, styles.emptyCard]} />
                )}
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={styles.tableauRow}>
          {gameState.tableau.map((pile, i) => (
            <View 
              key={i} 
              style={styles.tableauPile}
              onLayout={(e) => {
                e.currentTarget.measure((x, y, width, height, pageX, pageY) => {
                  pilePositions.current.set(`tableau-${i}`, { x: pageX, y: pageY, width, height });
                });
              }}
            >
              {pile.length === 0 && (
                <TouchableOpacity
                  style={[styles.card, styles.emptyCard]}
                  onPress={() => handleCardClick(`tableau-${i}`, 0)}
                  disabled={gameWon}
                />
              )}
              {pile.map((card, j) => (
                <View key={j} style={[styles.tableauCard, { top: j * 20 }]}>
                  {renderCard(
                    card,
                    `tableau-${i}`,
                    j,
                    selected?.source === `tableau-${i}` && selected?.cardIndex === j
                  )}
                </View>
              ))}
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.newGameBtn} onPress={resetGame} activeOpacity={0.7}>
          <Text style={styles.newGameText}>New Game</Text>
        </TouchableOpacity>

        {config.passesAllowed !== null && (
          <Text style={styles.passesText}>
            Passes: {passes}/{config.passesAllowed}
          </Text>
        )}

        {gameWon && (
          <View style={styles.overlay}>
            <Text style={styles.winText}>You Win!</Text>
            <Text style={styles.timeText}>Time: {elapsedTime}s</Text>
            {highScore !== null && elapsedTime < highScore && (
              <Text style={styles.recordText}>New Record!</Text>
            )}
            <TouchableOpacity style={styles.playAgain} onPress={resetGame} activeOpacity={0.7}>
              <Text style={styles.playAgainText}>Play Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {dragging && (
          <View style={styles.dragOverlay} pointerEvents="none">
            {dragging.cards.map((card, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.card,
                  styles.cardFront,
                  styles.dragCard,
                  {
                    left: Animated.subtract(dragPosition.x, 25),
                    top: Animated.add(Animated.subtract(dragPosition.y, 35), i * 20),
                  },
                ]}
              >
                <Text style={[styles.cardText, isRed(card.suit) && styles.redCard]}>
                  {card.rank}
                  {card.suit}
                </Text>
              </Animated.View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    scrollContainer: {
      flexGrow: 1,
    },
    container: {
      flex: 1,
      padding: 10,
    },
    topRow: {
      flexDirection: 'row',
      marginTop: 10,
      gap: 5,
    },
    stockPile: {
      width: 50,
      height: 70,
      backgroundColor: colors.card,
      borderRadius: 5,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.textSecondary,
    },
    stockText: {
      fontSize: 24,
      color: colors.text,
    },
    wastePile: {
      width: 50,
      height: 70,
    },
    spacer: {
      flex: 1,
    },
    foundationPile: {
      width: 50,
      height: 70,
    },
    tableauRow: {
      flexDirection: 'row',
      marginTop: 20,
      gap: 5,
    },
    tableauPile: {
      flex: 1,
      minHeight: 300,
      position: 'relative',
    },
    tableauCard: {
      position: 'absolute',
      width: '100%',
    },
    card: {
      width: 50,
      height: 70,
      borderRadius: 5,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#fff',
      borderWidth: 1,
      borderColor: colors.textSecondary,
    },
    cardFront: {
      backgroundColor: '#fff',
    },
    cardBack: {
      backgroundColor: colors.primary,
    },
    emptyCard: {
      backgroundColor: colors.surface,
      borderStyle: 'dashed',
    },
    emptyCardText: {
      fontSize: 10,
      color: colors.textSecondary,
    },
    cardBackText: {
      fontSize: 32,
      color: '#fff',
    },
    cardText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#000',
    },
    redCard: {
      color: '#ff0000',
    },
    selectedCard: {
      borderColor: colors.warning,
      borderWidth: 3,
    },
    draggingCard: {
      opacity: 0.3,
    },
    dragOverlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 1000,
    },
    dragCard: {
      position: 'absolute',
      zIndex: 1001,
    },
    newGameBtn: {
      backgroundColor: colors.card,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 24,
      marginTop: 20,
      alignSelf: 'center',
    },
    newGameText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    passesText: {
      color: colors.textSecondary,
      fontSize: 14,
      textAlign: 'center',
      marginTop: 10,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    winText: {
      color: colors.warning,
      fontSize: 36,
      fontWeight: 'bold',
      marginBottom: 16,
    },
    timeText: {
      color: colors.text,
      fontSize: 24,
      marginBottom: 8,
    },
    recordText: {
      color: colors.success,
      fontSize: 20,
      marginBottom: 24,
    },
    playAgain: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 24,
    },
    playAgainText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
  });
