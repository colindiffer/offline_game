import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View, Animated } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Header from '../../components/Header';
import GameOverOverlay from '../../components/GameOverOverlay';
import GameBoardContainer from '../../components/GameBoardContainer';
import PremiumButton from '../../components/PremiumButton';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { useSound } from '../../contexts/SoundContext';
import { getHighScore, setHighScore, getLevel, setLevel } from '../../utils/storage';
import { recordGameResult } from '../../utils/stats';
import { Difficulty } from '../../types';
import { ThemeColors } from '../../utils/themes';
import { generateMaze, canMove, hasWon, getMazeConfig, MazeGrid } from './logic';
import { spacing, radius, shadows, typography } from '../../utils/designTokens';

const SCREEN_WIDTH = Dimensions.get('window').width;
const MAX_MAZE_SIZE = SCREEN_WIDTH - 32;

interface Props {
  difficulty: Difficulty;
}

export default function Maze({ difficulty }: Props) {
  const { colors } = useTheme();
  const { playSound } = useSound();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [level, setLevelState] = useState(1);
  const [maze, setMaze] = useState<MazeGrid>([]);
  const [playerPos, setPlayerPos] = useState({ row: 0, col: 0 });
  const [gameWon, setGameWon] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [highScore, setHighScoreState] = useState<number | null>(null);
  const [isReady, setIsReady] = useState(false);

  const config = getMazeConfig(difficulty, level);
  const CELL_SIZE = Math.floor(MAX_MAZE_SIZE / Math.max(config.rows, config.cols));

  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const init = async () => {
      const savedLevel = await getLevel('maze', difficulty);
      const best = await getHighScore('maze', difficulty);
      setLevelState(savedLevel);
      setHighScoreState(best);
      setMaze(generateMaze(difficulty, savedLevel));
      setPlayerPos({ row: 0, col: 0 });
      setIsReady(true);
    };
    init();
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
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameWon, isReady]);

  const movePlayer = useCallback(
    (direction: 'up' | 'down' | 'left' | 'right') => {
      if (gameWon || !isReady) return;

      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
      }

      let currentRow = playerPos.row;
      let currentCol = playerPos.col;
      let moved = false;

      while (canMove(maze, currentRow, currentCol, direction)) {
        switch (direction) {
          case 'up': currentRow--; break;
          case 'down': currentRow++; break;
          case 'left': currentCol--; break;
          case 'right': currentCol++; break;
        }
        moved = true;
        if (hasWon(currentRow, currentCol, config.rows, config.cols)) break;
      }

      if (moved) {
        setPlayerPos({ row: currentRow, col: currentCol });
        playSound('tap');

        if (hasWon(currentRow, currentCol, config.rows, config.cols)) {
          setGameWon(true);
          playSound('win');
          const finalTime = Math.floor((Date.now() - startTimeRef.current!) / 1000);
          recordGameResult('maze', 'win', finalTime);

          if (highScore === null || finalTime < highScore) {
            setHighScoreState(finalTime);
            setHighScore('maze', finalTime, difficulty);
          }
          
          const nextLvl = level + 1;
          setLevel('maze', difficulty, nextLvl);
        }
      }
    },
    [maze, playerPos, gameWon, isReady, config, highScore, playSound, level, difficulty]
  );

  const panGesture = Gesture.Pan()
    .minDistance(20)
    .onEnd((e) => {
      const { translationX, translationY } = e;
      const absX = Math.abs(translationX);
      const absY = Math.abs(translationY);
      if (absX > absY) {
        movePlayer(translationX > 0 ? 'right' : 'left');
      } else {
        movePlayer(translationY > 0 ? 'down' : 'up');
      }
    });

  const nextLevel = useCallback(async () => {
    const savedLevel = await getLevel('maze', difficulty);
    setLevelState(savedLevel);
    setMaze(generateMaze(difficulty, savedLevel));
    setPlayerPos({ row: 0, col: 0 });
    setGameWon(false);
    setElapsedTime(0);
    startTimeRef.current = null;
  }, [difficulty]);

  const resetLevel = useCallback(() => {
    setMaze(generateMaze(difficulty, level));
    setPlayerPos({ row: 0, col: 0 });
    setGameWon(false);
    setElapsedTime(0);
    startTimeRef.current = null;
  }, [difficulty, level]);

  if (!isReady) return <View style={styles.container} />;

  const renderMaze = () => {
    return maze.map((row, r) => (
      <View key={`row-${r}`} style={styles.mazeRow}>
        {row.map((cell, c) => {
          const isPlayer = playerPos.row === r && playerPos.col === c;
          const isExit = r === config.rows - 1 && c === config.cols - 1;

          return (
            <View key={`cell-${r}-${c}`} style={[styles.cell, { width: CELL_SIZE, height: CELL_SIZE }]}>
              {cell.walls.top && <View style={[styles.wall, styles.wallTop]} />}
              {cell.walls.right && <View style={[styles.wall, styles.wallRight]} />}
              {cell.walls.bottom && <View style={[styles.wall, styles.wallBottom]} />}
              {cell.walls.left && <View style={[styles.wall, styles.wallLeft]} />}
              {isExit && (
                <View style={styles.exitPortal}>
                  <LinearGradient colors={['#fdcb6e', '#e17055']} style={styles.exitGradient} />
                </View>
              )}
              {isPlayer && (
                <View style={styles.playerWrapper}>
                  <View style={styles.player}>
                    <LinearGradient colors={['#74b9ff', '#0984e3']} style={styles.playerGradient} />
                    <View style={styles.playerGlow} />
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </View>
    ));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.bgIcon}>🔀</Text>
      <Header score={elapsedTime} scoreLabel="TIME" highScore={level} highScoreLabel="LEVEL" />
      
      <View style={styles.levelHeader}>
        <View style={styles.difficultyBadge}>
          <Text style={styles.difficultyText}>{difficulty.toUpperCase()}</Text>
        </View>
        <Text style={styles.levelText}>Level {level}</Text>
      </View>

      <GestureDetector gesture={panGesture}>
        <View style={styles.boardContainer}>
          <GameBoardContainer style={styles.boardWrapper}>
            <View style={[styles.maze, { width: CELL_SIZE * config.cols, height: CELL_SIZE * config.rows }]}>
              {renderMaze()}
            </View>
          </GameBoardContainer>
        </View>
      </GestureDetector>

      <View style={styles.footer}>
        <PremiumButton variant="secondary" height={50} onPress={resetLevel} style={styles.newGameBtn}>
          <Text style={styles.newGameText}>RESET LEVEL</Text>
        </PremiumButton>
      </View>

      {gameWon && (
        <GameOverOverlay
          result="win"
          title="LEVEL ESCAPED!"
          subtitle={`Solved in ${elapsedTime} seconds.`}
          onPlayAgain={nextLevel}
          onPlayAgainLabel="NEXT LEVEL"
        />
      )}
    </View>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  levelHeader: { alignItems: 'center', marginTop: spacing.md },
  difficultyBadge: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 2, borderRadius: radius.sm, marginBottom: 4 },
  difficultyText: { color: '#fab1a0', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  levelText: { color: '#fff', fontSize: 24, fontWeight: '900' },
  boardContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  boardWrapper: { padding: 4, backgroundColor: '#2d3436', borderRadius: radius.sm },
  maze: { backgroundColor: '#1e272e', position: 'relative' },
  mazeRow: { flexDirection: 'row' },
  cell: { position: 'relative', justifyContent: 'center', alignItems: 'center' },
  wall: { position: 'absolute', backgroundColor: '#dfe6e9', borderRadius: 2 },
  wallTop: { top: 0, left: 0, right: 0, height: 2 },
  wallRight: { top: 0, right: 0, bottom: 0, width: 2 },
  wallBottom: { bottom: 0, left: 0, right: 0, height: 2 },
  wallLeft: { top: 0, left: 0, bottom: 0, width: 2 },
  playerWrapper: { width: '70%', height: '70%', zIndex: 10 },
  player: { flex: 1, borderRadius: 100, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  playerGradient: { flex: 1 },
  playerGlow: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(116, 185, 255, 0.2)' },
  exitPortal: { width: '60%', height: '60%', borderRadius: 4, overflow: 'hidden', borderWidth: 2, borderColor: '#fdcb6e', transform: [{ rotate: '45deg' }] },
  exitGradient: { flex: 1 },
  footer: { padding: spacing.xl, paddingBottom: Platform.OS === 'ios' ? 40 : spacing.xl },
  newGameBtn: { width: '100%' },
  newGameText: { color: colors.text, fontWeight: '900', fontSize: 14, letterSpacing: 1 },
  bgIcon: {
    position: 'absolute',
    top: '40%',
    left: '-10%',
    fontSize: 250,
    opacity: 0.03,
    transform: [{ rotate: '-15deg' }],
  },
});