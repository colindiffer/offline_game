import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView, useWindowDimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Header from '../../components/Header';
import GameOverOverlay from '../../components/GameOverOverlay';
import PremiumButton from '../../components/PremiumButton';
import { useTheme } from '../../contexts/ThemeContext';
import { useSound } from '../../contexts/SoundContext';
import { Difficulty } from '../../types';
import { ThemeColors } from '../../utils/themes';
import { spacing, radius, shadows, typography } from '../../utils/designTokens';
import { initializeBackgammon, rollDice, isValidMove, performMove, getAIMove } from './logic';
import { BackgammonGameState } from './types';

export default function Backgammon({ difficulty }: { difficulty: Difficulty }) {
  const { colors } = useTheme();
  const { playSound } = useSound();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [gameState, setGameState] = useState<BackgammonGameState>(() => initializeBackgammon());
  const [selectedPoint, setSelectedPoint] = useState<number | 'bar' | null>(null);
  const [paused, setPaused] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const aiThinkingRef = useRef(false);
  const pausedRef = useRef(false);
  pausedRef.current = paused;

  useEffect(() => {
    setIsReady(true);
  }, []);

  // AI Turn
  useEffect(() => {
    if (gameState.currentPlayer === 'red' && !gameState.gameOver && !aiThinkingRef.current && !paused) {
        aiThinkingRef.current = true;
        
        const timer = setTimeout(() => {
            if (gameState.dice.length === 0) {
                handleRoll();
                aiThinkingRef.current = false;
            } else {
                const move = getAIMove(gameState);
                if (move) {
                    setGameState(prev => performMove(prev, move.from, move.to));
                    playSound('drop');
                } else {
                    // Force turn end if no moves
                    setGameState(prev => ({ ...prev, currentPlayer: 'white', dice: [], movesRemaining: [] }));
                }
                aiThinkingRef.current = false;
            }
        }, 1000);
        return () => {
            clearTimeout(timer);
            aiThinkingRef.current = false;
        };
    }
  }, [gameState.currentPlayer, gameState.movesRemaining.length, gameState.gameOver, playSound, paused]);

  const handleRoll = () => {
    if (paused) return;
    const dice = rollDice();
    setGameState(prev => ({ ...prev, dice, movesRemaining: [...dice] }));
    playSound('tap');
  };

  const handlePointPress = (idx: number) => {
    if (gameState.movesRemaining.length === 0 || paused) return;

    const color = gameState.currentPlayer;

    if (selectedPoint === null) {
        // Must move from bar first
        if (gameState.bar[color] > 0) {
            setSelectedPoint('bar');
            playSound('tap');
            return;
        }

        if (gameState.points[idx].length > 0 && gameState.points[idx][0] === color) {
            setSelectedPoint(idx);
            playSound('tap');
        }
    } else {
        if (selectedPoint === idx) {
            setSelectedPoint(null);
        } else if (isValidMove(gameState, selectedPoint, idx)) {
            setGameState(prev => performMove(prev, selectedPoint, idx));
            setSelectedPoint(null);
            playSound('drop');
        } else if (selectedPoint !== 'bar' && gameState.points[idx].length > 0 && gameState.points[idx][0] === color) {
            setSelectedPoint(idx);
            playSound('tap');
        } else {
            setSelectedPoint(null);
        }
    }
  };

  const possibleMoves = useMemo(() => {
    if (difficulty === 'hard' || selectedPoint === null || paused) return [];
    const moves = Array.from({ length: 24 }).map((_, i) => i).filter(idx => isValidMove(gameState, selectedPoint, idx));
    if (isValidMove(gameState, selectedPoint, 'off')) moves.push(99);
    return moves;
  }, [selectedPoint, gameState, difficulty, paused]);

  if (!isReady) return null;

  const renderPoint = (idx: number, isTop: boolean) => {
    const isEven = idx % 2 === 0;
    const isLight = isTop ? !isEven : isEven;
    const isHighlighted = possibleMoves.includes(idx);
    const isSelected = selectedPoint === idx;

    return (
      <TouchableOpacity 
        key={idx} 
        style={styles.pointWrapper} 
        onPress={() => handlePointPress(idx)}
        activeOpacity={0.8}
        disabled={paused}
      >
        <View style={[
            styles.triangle, 
            isTop ? styles.triangleDown : styles.triangleUp,
            { borderBottomColor: isLight ? '#fdf2e9' : '#8d6e63' },
            isHighlighted && { borderBottomColor: '#fab1a0' },
            isSelected && { borderBottomColor: '#ffeaa7' }
        ]} />
        <View style={[styles.pointContent, { justifyContent: isTop ? 'flex-start' : 'flex-end', paddingVertical: 2 }]}>
            {gameState.points[idx].map((color, j) => (
                <View key={j} style={[styles.checker, color === 'white' ? styles.whiteChecker : styles.redChecker, isSelected && j === gameState.points[idx].length - 1 && styles.selectedChecker]} />
            ))}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#f6b189', '#ed9e6d']} style={StyleSheet.absoluteFill} />
      <Header
        title="Backgammon"
        score={gameState.off.white}
        scoreLabel="YOU"
        highScore={gameState.off.red}
        highScoreLabel="BOT"
        onPause={() => setPaused(!paused)}
        isPaused={paused}
      />

      <View style={styles.gameArea}>
        <View style={styles.board}>
            <View style={styles.boardInner}>
                <View style={styles.boardHalf}>
                    <View style={styles.quadrant}>
                        {[12, 13, 14, 15, 16, 17].map(idx => renderPoint(idx, true))}
                    </View>
                    <View style={styles.bar}>
                        {gameState.bar.white > 0 && Array.from({ length: gameState.bar.white }).map((_, i) => (
                            <TouchableOpacity key={`w-${i}`} style={[styles.checker, styles.whiteChecker, selectedPoint === 'bar' && gameState.currentPlayer === 'white' && styles.selectedChecker]} onPress={() => handlePointPress(-1)} disabled={paused} />
                        ))}
                        <View style={{ height: 10 }} />
                        {gameState.bar.red > 0 && Array.from({ length: gameState.bar.red }).map((_, i) => (
                            <TouchableOpacity key={`r-${i}`} style={[styles.checker, styles.redChecker, selectedPoint === 'bar' && gameState.currentPlayer === 'red' && styles.selectedChecker]} onPress={() => handlePointPress(-1)} disabled={paused} />
                        ))}
                    </View>
                    <View style={styles.quadrant}>
                        {[18, 19, 20, 21, 22, 23].map(idx => renderPoint(idx, true))}
                    </View>
                </View>

                <View style={styles.boardHalf}>
                    <View style={styles.quadrant}>
                        {[11, 10, 9, 8, 7, 6].map(idx => renderPoint(idx, false))}
                    </View>
                    <View style={styles.bar} />
                    <View style={styles.quadrant}>
                        {[5, 4, 3, 2, 1, 0].map(idx => renderPoint(idx, false))}
                    </View>
                </View>
            </View>
        </View>

        <TouchableOpacity 
            style={[styles.homeZone, possibleMoves.includes(99) && styles.homeZoneActive]} 
            onPress={() => handlePointPress(99)}
            disabled={paused}
        >
            <View style={styles.bearOffContainer}>
                <View style={styles.bearOffSlot}><Text style={styles.bearOffText}>YOU: {gameState.off.white}</Text></View>
                <View style={styles.bearOffSlot}><Text style={styles.bearOffText}>BOT: {gameState.off.red}</Text></View>
            </View>
        </TouchableOpacity>

        <View style={styles.controls}>
            <View style={styles.diceArea}>
                {gameState.dice.map((d, i) => (
                    <View key={i} style={[styles.die, !gameState.movesRemaining.includes(d) && { opacity: 0.5 }]}><Text style={styles.dieText}>{d}</Text></View>
                ))}
            </View>
            <PremiumButton variant="primary" onPress={handleRoll} disabled={gameState.dice.length > 0 || paused}>
                <Text style={styles.btnText}>{gameState.currentPlayer.toUpperCase()} ROLL</Text>
            </PremiumButton>
        </View>
      </View>

      <View style={styles.footer}>
        <PremiumButton variant="secondary" onPress={() => setGameState(initializeBackgammon())} disabled={paused}>
            <Text style={styles.resetText}>RESET BOARD</Text>
        </PremiumButton>
      </View>

      {paused && !gameState.gameOver && (
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

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1 },
  gameArea: { flex: 1, padding: spacing.sm, justifyContent: 'space-between' },
  board: { 
    flex: 1, 
    backgroundColor: '#5d4037', // Dark wood border
    borderRadius: radius.md, 
    padding: 8, 
    borderWidth: 12, 
    borderColor: '#3e2723', 
    ...shadows.lg 
  },
  boardInner: { 
    flex: 1, 
    flexDirection: 'column',
    backgroundColor: '#d7b899', // Light wood inner board
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
  },
  boardHalf: { flex: 1, flexDirection: 'row' },
  quadrant: { flex: 1, flexDirection: 'row' },
  pointWrapper: { flex: 1, height: '100%', alignItems: 'center' },
  triangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 14,
    borderRightWidth: 14,
    borderBottomWidth: 140,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  triangleUp: { transform: [{ rotate: '0deg' }] },
  triangleDown: { transform: [{ rotate: '180deg' }] },
  pointContent: { position: 'absolute', width: '100%', alignItems: 'center', height: '100%' },
  checker: { 
    width: 24, 
    height: 24, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: 'rgba(0,0,0,0.3)', 
    ...shadows.sm,
    marginVertical: -2, // Overlap for stacking
  },
  whiteChecker: { backgroundColor: '#f5f6fa' },
  redChecker: { backgroundColor: '#2d3436' }, // Black checkers like screenshot
  selectedChecker: { borderWidth: 3, borderColor: '#e17055', transform: [{ scale: 1.1 }] },
  selectedPoint: { opacity: 0.9 },
  bar: { width: 14, backgroundColor: '#3e2723', alignItems: 'center', justifyContent: 'center' },
  homeZone: { backgroundColor: 'rgba(0,0,0,0.1)', padding: spacing.sm, borderRadius: radius.md, marginTop: spacing.md, alignItems: 'center' },
  homeZoneActive: { backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 2, borderColor: '#fff' },
  bearOffContainer: { flexDirection: 'row', gap: 20 },
  bearOffSlot: { backgroundColor: '#3e2723', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  bearOffText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  controls: { paddingVertical: spacing.lg, alignItems: 'center' },
  diceArea: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg, height: 50 },
  die: { width: 48, height: 48, backgroundColor: '#fff', borderRadius: 10, justifyContent: 'center', alignItems: 'center', ...shadows.md, borderWidth: 1, borderColor: '#ddd' },
  dieText: { color: '#331d10', fontSize: 24, fontWeight: '900' },
  btnText: { color: '#fff', fontWeight: '900', fontSize: 18, letterSpacing: 2 },
  footer: { paddingHorizontal: spacing.xl, paddingBottom: Platform.OS === 'ios' ? 40 : spacing.xl },
  resetText: { color: '#331d10', fontWeight: 'bold', fontSize: 14, opacity: 0.7 },
});
