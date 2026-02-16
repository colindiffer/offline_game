import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Animated, Dimensions, Platform } from 'react-native';
import Header from '../../components/Header';
import GameOverOverlay from '../../components/GameOverOverlay';
import { useTheme } from '../../contexts/ThemeContext';
import { useSound } from '../../contexts/SoundContext';
import { getHighScore, setHighScore, getLevel, setLevel } from '../../utils/storage';
import { recordGameResult } from '../../utils/stats';
import { Difficulty } from '../../types';
import { ThemeColors } from '../../utils/themes';
import { spacing, radius, shadows, typography } from '../../utils/designTokens';
import { addToSequence, SimonColor } from './logic';

const SCREEN_WIDTH = Dimensions.get('window').width;
const PAD_SIZE = (SCREEN_WIDTH - 80) / 2;

const PAD_COLORS = [
  { base: '#ff7675', light: '#ffb8b8' }, // Red
  { base: '#74b9ff', light: '#aadeff' }, // Blue
  { base: '#55efc4', light: '#99ffed' }, // Green
  { base: '#fdcb6e', light: '#ffeaa7' }, // Yellow
];

export default function SimonSays({ difficulty }: Props) {
  const { colors } = useTheme();
  const { playSound } = useSound();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [level, setLevelState] = useState(1);
  const [sequence, setSequence] = useState<SimonColor[]>([]);
  const [playerIndex, setPlayerIndex] = useState(0);
  const [activePad, setActivePad] = useState<SimonColor | null>(null);
  const [isPlayingSequence, setIsPlayingSequence] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [highScore, setHighScoreState] = useState(0);

  const startTimeRef = useRef<number | null>(null);
  const padAnims = useRef([
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
  ]).current;

  useEffect(() => {
    const init = async () => {
      const savedLevel = await getLevel('simon-says', difficulty);
      const best = await getHighScore('simon-says', difficulty);
      setLevelState(savedLevel);
      setHighScoreState(best);
      setIsReady(true);
      startLevel(savedLevel);
    };
    init();
  }, [difficulty]);

  const flashPad = useCallback((index: SimonColor, duration: number) => {
    setActivePad(index);
    playSound('tap');
    Animated.sequence([
      Animated.timing(padAnims[index], { toValue: 1.2, duration: duration / 2, useNativeDriver: true }),
      Animated.timing(padAnims[index], { toValue: 1, duration: duration / 2, useNativeDriver: true }),
    ]).start(() => {
      setActivePad(null);
    });
  }, [playSound, padAnims]);

  const playSequence = useCallback(async (seq: SimonColor[]) => {
    setIsPlayingSequence(true);
    const speed = Math.max(200, 600 - (level * 20));
    
    for (let i = 0; i < seq.length; i++) {
      await new Promise(resolve => setTimeout(resolve, speed));
      flashPad(seq[i], speed * 0.8);
      await new Promise(resolve => setTimeout(resolve, speed * 0.2));
    }
    
    setIsPlayingSequence(false);
    setPlayerIndex(0);
  }, [level, flashPad]);

  const startLevel = useCallback((lvl: number) => {
    const newSeq: SimonColor[] = [];
    // Sequence length equals level + 2
    for (let i = 0; i < lvl + 2; i++) {
      newSeq.push(Math.floor(Math.random() * 4) as SimonColor);
    }
    setSequence(newSeq);
    setGameWon(false);
    setGameOver(false);
    setTimeout(() => playSequence(newSeq), 1000);
  }, [playSequence]);

  const handlePadPress = useCallback((index: SimonColor) => {
    if (isPlayingSequence || gameOver || gameWon) return;

    flashPad(index, 200);

    if (index === sequence[playerIndex]) {
      const nextIndex = playerIndex + 1;
      if (nextIndex === sequence.length) {
        // Level Complete
        setGameWon(true);
        playSound('win');
        const nextLvl = level + 1;
        setLevel('simon-says', difficulty, nextLvl);
        if (nextLvl > highScore) {
          setHighScoreState(nextLvl);
          setHighScore('simon-says', nextLvl, difficulty);
        }
        recordGameResult('simon-says', 'win', 0);
      } else {
        setPlayerIndex(nextIndex);
      }
    } else {
      // Game Over
      setGameOver(true);
      playSound('lose');
      recordGameResult('simon-says', 'loss', 0);
    }
  }, [sequence, playerIndex, isPlayingSequence, gameOver, gameWon, flashPad, playSound, level, difficulty]);

  const nextLevel = useCallback(async () => {
    const savedLevel = await getLevel('simon-says', difficulty);
    setLevelState(savedLevel);
    startLevel(savedLevel);
  }, [difficulty, startLevel]);

  const resetLevel = useCallback(() => {
    startLevel(level);
  }, [level, startLevel]);

  if (!isReady) return <View style={styles.container} />;

  return (
    <View style={styles.container}>
      <Text style={styles.bgIcon}>🔴</Text>
      <Header title="Simon Says" score={level} scoreLabel="LEVEL" highScore={0} highScoreLabel="RECORD" />
      
      <View style={styles.levelHeader}>
        <Text style={styles.levelText}>Level {level}</Text>
        <Text style={styles.statusText}>
          {isPlayingSequence ? 'WATCH...' : 'YOUR TURN!'}
        </Text>
      </View>

      <View style={styles.gameArea}>
        <View style={styles.padsContainer}>
          {PAD_COLORS.map((color, i) => (
            <TouchableOpacity
              key={i}
              activeOpacity={0.8}
              onPress={() => handlePadPress(i as SimonColor)}
              disabled={isPlayingSequence || gameOver || gameWon}
            >
              <Animated.View style={[
                styles.pad,
                { backgroundColor: activePad === i ? color.light : color.base },
                { transform: [{ scale: padAnims[i] }] }
              ]}>
                <View style={styles.padShine} />
              </Animated.View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {gameWon && (
        <GameOverOverlay 
          result="win" 
          title="MEMORY MASTER!" 
          subtitle={`Level ${level} complete.`} 
          onPlayAgain={nextLevel}
          onPlayAgainLabel="NEXT LEVEL"
        />
      )}

      {gameOver && (
        <GameOverOverlay 
          result="lose" 
          title="WRONG ORDER!" 
          subtitle={`You reached Level ${level}.`} 
          onPlayAgain={resetLevel}
          onPlayAgainLabel="TRY AGAIN"
        />
      )}
    </View>
  );
}

interface Props {
  difficulty: Difficulty;
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  levelHeader: { alignItems: 'center', marginTop: spacing.md },
  levelText: { color: '#fff', fontSize: 24, fontWeight: '900' },
  statusText: { color: '#fab1a0', fontSize: 14, fontWeight: '900', letterSpacing: 2, marginTop: 4 },
  gameArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  padsContainer: {
    width: PAD_SIZE * 2 + 20,
    height: PAD_SIZE * 2 + 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pad: {
    width: PAD_SIZE,
    height: PAD_SIZE,
    borderRadius: 20,
    borderWidth: 4,
    borderColor: 'rgba(0,0,0,0.2)',
    ...shadows.lg,
    overflow: 'hidden',
  },
  padShine: {
    position: 'absolute',
    top: '10%',
    left: '10%',
    width: '30%',
    height: '30%',
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  bgIcon: {
    position: 'absolute',
    bottom: '5%',
    right: '-10%',
    fontSize: 250,
    opacity: 0.03,
    transform: [{ rotate: '15deg' }],
  },
});
