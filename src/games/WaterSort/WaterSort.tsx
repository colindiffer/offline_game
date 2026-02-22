import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Animated, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Header from '../../components/Header';
import GameOverOverlay from '../../components/GameOverOverlay';
import PremiumButton from '../../components/PremiumButton';
import { useTheme } from '../../contexts/ThemeContext';
import { useSound } from '../../contexts/SoundContext';
import { getHighScore, setHighScore, getLevel, setLevel } from '../../utils/storage';
import { recordGameResult } from '../../utils/stats';
import { Difficulty } from '../../types';
import { ThemeColors } from '../../utils/themes';
import { spacing, radius, shadows, typography } from '../../utils/designTokens';
import { initializeWaterSort, canPour, pour, isWin, TUBE_CAPACITY, Tube } from './logic';

import { useInterstitialAd } from '../../lib/useInterstitialAd';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface Props {
  difficulty: Difficulty;
}

export default function WaterSort({ difficulty }: Props) {
  const { colors } = useTheme();
  const { playSound } = useSound();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { showAd } = useInterstitialAd();

  const [level, setLevelState] = useState(1);
  const [tubes, setTubes] = useState<Tube[]>([]);
  const [selectedTube, setSelectedTube] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [highScore, setHighScoreState] = useState(0);
  const [undoHistory, setUndoHistory] = useState<Tube[][]>([]);
  const [isReady, setIsReady] = useState(false);
  const isFirstGameRef = useRef(true);

  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const tubeAnims = useRef<Animated.Value[]>(Array.from({ length: 15 }, () => new Animated.Value(0))).current;

  useEffect(() => {
    const init = async () => {
      const savedLevel = await getLevel('water-sort', difficulty);
      const best = await getHighScore('water-sort', difficulty);
      setLevelState(savedLevel);
      setHighScoreState(best);
      setTubes(initializeWaterSort(difficulty, savedLevel));
      setIsReady(true);
      startTimeRef.current = Date.now();
    };
    init();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [difficulty]);

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

  const handleTubePress = useCallback((index: number) => {
    if (gameWon) return;

    if (selectedTube === null) {
      if (tubes[index].length > 0) {
        setSelectedTube(index);
        playSound('tap');
        Animated.spring(tubeAnims[index], {
          toValue: -30,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }).start();
      }
    } else {
      if (selectedTube === index) {
        // Deselect
        setSelectedTube(null);
        Animated.spring(tubeAnims[index], {
          toValue: 0,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }).start();
      } else if (canPour(tubes, selectedTube, index)) {
        // Record for undo
        setUndoHistory(prev => [...prev.slice(-19), tubes.map(t => [...t])]);
        
        const newTubes = pour(tubes, selectedTube, index);
        setTubes(newTubes);
        setMoves(m => m + 1);
        playSound('drop');

        // Animate both back to 0
        Animated.parallel([
          Animated.spring(tubeAnims[selectedTube], { toValue: 0, useNativeDriver: true }),
          Animated.spring(tubeAnims[index], { toValue: 0, useNativeDriver: true }),
        ]).start();

        setSelectedTube(null);

        if (isWin(newTubes)) {
          setGameWon(true);
          playSound('win');
          const finalTime = Math.floor((Date.now() - startTimeRef.current!) / 1000);
          recordGameResult('water-sort', 'win', finalTime);
          
          if (moves + 1 < highScore || highScore === 0) {
            setHighScoreState(moves + 1);
            setHighScore('water-sort', moves + 1, difficulty);
          }
          
          // Next level logic
          const nextLevel = level + 1;
          setLevel('water-sort', difficulty, nextLevel);
        }
      } else {
        // Can't pour, switch selection if not empty
        const prevSelected = selectedTube;
        Animated.spring(tubeAnims[prevSelected], { toValue: 0, useNativeDriver: true }).start();
        
        if (tubes[index].length > 0) {
          setSelectedTube(index);
          playSound('tap');
          Animated.spring(tubeAnims[index], { toValue: -30, useNativeDriver: true }).start();
        } else {
          setSelectedTube(null);
        }
      }
    }
  }, [tubes, selectedTube, gameWon, moves, highScore, playSound, tubeAnims, level, difficulty]);

  const handleUndo = useCallback(() => {
    if (undoHistory.length === 0 || gameWon) return;
    const previousState = undoHistory[undoHistory.length - 1];
    setTubes(previousState);
    setUndoHistory(prev => prev.slice(0, -1));
    setMoves(m => m - 1);
    setSelectedTube(null);
    tubeAnims.forEach(anim => anim.setValue(0));
    playSound('tap');
  }, [undoHistory, gameWon, playSound, tubeAnims]);

  const nextLevel = useCallback(async () => {
    const savedLevel = await getLevel('water-sort', difficulty);
    setLevelState(savedLevel);
    setTubes(initializeWaterSort(difficulty, savedLevel));
    setUndoHistory([]);
    setMoves(0);
    setSelectedTube(null);
    setGameWon(false);
    setElapsedTime(0);
    startTimeRef.current = Date.now();
    tubeAnims.forEach(anim => anim.setValue(0));
  }, [difficulty, tubeAnims]);

  const resetGame = useCallback(() => {
    setTubes(initializeWaterSort(difficulty, level));
    setUndoHistory([]);
    setMoves(0);
    setSelectedTube(null);
    setGameWon(false);
    setElapsedTime(0);
    startTimeRef.current = Date.now();
    tubeAnims.forEach(anim => anim.setValue(0));
  }, [difficulty, level, tubeAnims]);

  const handleNewGame = useCallback(() => {
    setLevelState(1);
    setTubes(initializeWaterSort(difficulty, 1));
    setUndoHistory([]);
    setMoves(0);
    setSelectedTube(null);
    setGameWon(false);
    setElapsedTime(0);
    startTimeRef.current = Date.now();
    tubeAnims.forEach(anim => anim.setValue(0));
  }, [difficulty, tubeAnims]);

  const handleRestart = useCallback(() => {
    resetGame();
  }, [resetGame]);

  if (!isReady) return <View style={styles.container} />;

  const renderTube = (tube: Tube, index: number) => {
    const isSelected = selectedTube === index;
    return (
      <TouchableOpacity
        key={index}
        activeOpacity={0.9}
        onPress={() => handleTubePress(index)}
        style={styles.tubeTouch}
      >
        <Animated.View style={[
          styles.tubeContainer,
          { transform: [{ translateY: tubeAnims[index] }] }
        ]}>
          {/* Tube Rim */}
          <View style={[styles.tubeRim, isSelected && styles.selectedRim]} />
          
          <View style={[styles.tube, isSelected && styles.selectedTube]}>
            <View style={styles.liquidContainer}>
              {tube.map((color, i) => (
                <View 
                  key={i} 
                  style={[
                    styles.liquidLayer, 
                    { backgroundColor: color, height: 130 / TUBE_CAPACITY }
                  ]} 
                >
                  <View style={styles.liquidGlow} />
                </View>
              ))}
            </View>
            {/* Glass Shine */}
            <View style={styles.glassShine} />
          </View>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.bgIcon}>🧪</Text>
      <LinearGradient colors={[colors.background, colors.surface]} style={StyleSheet.absoluteFill} />
      <Header title="Water Sort" score={elapsedTime} scoreLabel="TIME" highScore={level} highScoreLabel="LEVEL" />
      
      <View style={styles.gameArea}>
        <View style={styles.tubesGrid}>
          {tubes.map((tube, index) => renderTube(tube, index))}
        </View>
      </View>

      <View style={styles.bottomControls}>
        <TouchableOpacity style={styles.controlBtn} onPress={handleUndo} disabled={undoHistory.length === 0}>
          <View style={[styles.controlInner, undoHistory.length === 0 && { opacity: 0.5 }]}>
            <Text style={styles.controlIcon}>↶</Text>
            <Text style={styles.controlText}>Undo</Text>
          </View>
        </TouchableOpacity>

        <PremiumButton variant="secondary" height={50} onPress={handleRestart} style={styles.newGameBtn}>
          <Text style={styles.newGameText}>RESTART</Text>
        </PremiumButton>
        <PremiumButton variant="secondary" height={50} onPress={handleNewGame} style={styles.newGameBtn}>
          <Text style={styles.newGameText}>NEW GAME</Text>
        </PremiumButton>
      </View>

      {gameWon && (
        <GameOverOverlay
          result="win"
          title="LEVEL COMPLETE!"
          subtitle={`Sorted in ${moves} moves!`}
          onPlayAgain={nextLevel}
          onPlayAgainLabel="NEXT LEVEL"
          onNewGame={handleNewGame}
          onRestart={handleRestart}
        />
      )}
    </View>
  );
}

const TUBE_WIDTH = Math.floor(SCREEN_WIDTH / 5.5);
const getStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1 },
  levelHeader: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  difficultyBadge: {
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderRadius: radius.sm,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  difficultyText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  levelText: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
  },
  gameArea: { flex: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, alignItems: 'center' },
  tubesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  tubeTouch: {
    width: TUBE_WIDTH,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  tubeContainer: {
    alignItems: 'center',
  },
  tubeRim: {
    width: TUBE_WIDTH * 0.8,
    height: 6,
    backgroundColor: colors.textSecondary,
    opacity: 0.3,
    borderRadius: 3,
    marginBottom: -2,
    zIndex: 2,
  },
  selectedRim: {
    backgroundColor: colors.accent,
    opacity: 1,
  },
  tube: {
    width: TUBE_WIDTH * 0.7,
    height: 130,
    borderWidth: 2,
    borderColor: colors.border,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    backgroundColor: colors.card,
    overflow: 'hidden',
    position: 'relative',
    ...shadows.lg,
  },
  selectedTube: {
    borderColor: colors.accent,
    borderWidth: 3,
    ...shadows.xl,
  },
  glassShine: {
    position: 'absolute',
    left: '10%',
    top: '5%',
    width: '20%',
    height: '80%',
    backgroundColor: '#fff',
    opacity: 0.1,
    borderRadius: 10,
  },
  liquidContainer: {
    flex: 1,
    flexDirection: 'column-reverse',
    justifyContent: 'flex-start',
  },
  liquidLayer: {
    width: '100%',
    position: 'relative',
  },
  liquidGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#fff',
    opacity: 0.2,
  },
  bottomControls: {
    padding: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 30 : spacing.md,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    alignItems: 'center',
  },
  controlBtn: { alignItems: 'center' },
  controlInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  controlIcon: { fontSize: 24, color: colors.text },
  controlText: { fontSize: 10, color: colors.textSecondary, fontWeight: 'bold', marginTop: 2 },
  newGameBtn: { flex: 1 },
  newGameText: { color: colors.text, fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  bgIcon: {
    position: 'absolute',
    top: '40%',
    right: '-10%',
    fontSize: 250,
    opacity: 0.03,
    transform: [{ rotate: '15deg' }],
  },
});
