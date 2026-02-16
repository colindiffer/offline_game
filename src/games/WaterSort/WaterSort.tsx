import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Animated, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Header from '../../components/Header';
import GameOverOverlay from '../../components/GameOverOverlay';
import PremiumButton from '../../components/PremiumButton';
import { useTheme } from '../../contexts/ThemeContext';
import { useSound } from '../../contexts/SoundContext';
import { getHighScore, setHighScore } from '../../utils/storage';
import { recordGameResult } from '../../utils/stats';
import { Difficulty } from '../../types';
import { ThemeColors } from '../../utils/themes';
import { spacing, radius, shadows, typography } from '../../utils/designTokens';
import { initializeWaterSort, canPour, pour, isWin, TUBE_CAPACITY, Tube } from './logic';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function WaterSort({ difficulty }: Props) {
  const { colors } = useTheme();
  const { playSound } = useSound();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [tubes, setTubes] = useState<Tube[]>(() => initializeWaterSort(difficulty));
  const [selectedTube, setSelectedTube] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [highScore, setHighScoreState] = useState(0);
  const [undoHistory, setUndoHistory] = useState<Tube[][]>([]);

  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const tubeAnims = useRef<Animated.Value[]>([]).current;

  // Initialize animations for tubes
  if (tubeAnims.length === 0) {
    const tubeCount = tubes.length;
    for (let i = 0; i < 15; i++) { // Max possible tubes
      tubeAnims.push(new Animated.Value(0));
    }
  }

  useEffect(() => {
    getHighScore('water-sort').then(setHighScoreState);
    startTimeRef.current = Date.now();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    if (!gameWon && startTimeRef.current) {
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTimeRef.current!) / 1000));
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [gameWon]);

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
            setHighScore('water-sort', moves + 1);
          }
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
  }, [tubes, selectedTube, gameWon, moves, highScore, playSound, tubeAnims]);

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

  const resetGame = useCallback(() => {
    const initialTubes = initializeWaterSort(difficulty);
    setTubes(initialTubes);
    setUndoHistory([]);
    setMoves(0);
    setSelectedTube(null);
    setGameWon(false);
    setElapsedTime(0);
    startTimeRef.current = Date.now();
    tubeAnims.forEach(anim => anim.setValue(0));
  }, [difficulty, tubeAnims]);

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
          <View style={[styles.tube, isSelected && styles.selectedTube]}>
            <View style={styles.liquidContainer}>
              {[...tube].reverse().map((color, i) => (
                <View 
                  key={i} 
                  style={[
                    styles.liquidLayer, 
                    { backgroundColor: color, height: (styles.tube.height - 10) / TUBE_CAPACITY }
                  ]} 
                />
              ))}
            </View>
          </View>
          <View style={styles.tubeStand} />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1a1a2e', '#16213e']} style={StyleSheet.absoluteFill} />
      <Header score={moves} scoreLabel="MOVES" highScore={highScore} highScoreLabel="BEST" />
      
      <View style={styles.gameArea}>
        <View style={styles.tubesGrid}>
          {tubes.map((tube, index) => renderTube(tube, index))}
        </View>
      </View>

      <View style={styles.bottomControls}>
        <TouchableOpacity style={styles.undoBtn} onPress={handleUndo} disabled={undoHistory.length === 0}>
          <View style={[styles.undoInner, undoHistory.length === 0 && { opacity: 0.5 }]}>
            <Text style={styles.undoIcon}>↶</Text>
            <Text style={styles.undoText}>Undo</Text>
          </View>
        </TouchableOpacity>
        
        <PremiumButton variant="secondary" height={44} style={styles.newGameBtn} onPress={resetGame}>
          <Text style={styles.newGameText}>RESTART</Text>
        </PremiumButton>
      </View>

      {gameWon && (
        <GameOverOverlay 
          result="win" 
          title="SORTED!" 
          subtitle={`Completed in ${moves} moves and ${elapsedTime}s.`} 
          onPlayAgain={resetGame} 
        />
      )}
    </View>
  );
}

interface Props {
  difficulty: Difficulty;
}

const TUBE_WIDTH = Math.floor(SCREEN_WIDTH / 5);
const getStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1 },
  gameArea: { flex: 1, padding: spacing.md, justifyContent: 'center', alignItems: 'center' },
  tubesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
    paddingTop: 40,
  },
  tubeTouch: {
    width: TUBE_WIDTH,
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  tubeContainer: {
    alignItems: 'center',
  },
  tube: {
    width: TUBE_WIDTH * 0.7,
    height: 140,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.2)',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
    padding: 2,
  },
  selectedTube: {
    borderColor: '#fab1a0',
    borderWidth: 4,
    ...shadows.md,
  },
  liquidContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  liquidLayer: {
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  tubeStand: {
    width: TUBE_WIDTH * 0.8,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    marginTop: 4,
  },
  bottomControls: {
    padding: spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 40 : spacing.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  undoBtn: { alignItems: 'center' },
  undoInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  undoIcon: { fontSize: 24, color: '#fff' },
  undoText: { fontSize: 10, color: '#fff', fontWeight: 'bold' },
  newGameBtn: { minWidth: 140 },
  newGameText: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
});
