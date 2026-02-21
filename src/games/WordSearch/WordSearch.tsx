import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { StyleSheet, Text, View, Dimensions, Platform, ScrollView } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import Header from '../../components/Header';
import GameOverOverlay from '../../components/GameOverOverlay';
import GameBoardContainer from '../../components/GameBoardContainer';
import PremiumButton from '../../components/PremiumButton';
import { useTheme } from '../../contexts/ThemeContext';
import { useSound } from '../../contexts/SoundContext';
import { getHighScore, setHighScore, getLevel, setLevel } from '../../utils/storage';
import { recordGameResult } from '../../utils/stats';
import { Difficulty } from '../../types';
import { ThemeColors } from '../../utils/themes';
import { spacing, radius, shadows, typography } from '../../utils/designTokens';
import { generateWordSearch, getSelectedWord, WordSearchGrid, Position } from './logic';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_SIZE = SCREEN_WIDTH - 32;

export default function WordSearch({ difficulty }: Props) {
  const { colors } = useTheme();
  const { playSound } = useSound();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [level, setLevelState] = useState(1);
  const [gameState, setGameState] = useState<WordSearchGrid | null>(null);
  const [selection, setSelection] = useState<{ start: Position; end: Position } | null>(null);
  const [gameWon, setGameWon] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [highScore, setHighScoreState] = useState(0);
  const [foundPaths, setFoundPaths] = useState<Position[][]>([]);
  const [isReady, setIsReady] = useState(false);

  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const containerPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const init = async () => {
      const savedLevel = await getLevel('word-search', difficulty);
      const best = await getHighScore('word-search', difficulty);
      setLevelState(savedLevel);
      setHighScoreState(best);
      setGameState(generateWordSearch(difficulty, savedLevel));
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

  const onLayout = (e: any) => {
    e.target.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
      containerPos.current = { x: pageX, y: pageY };
    });
  };

  const getCellFromPos = (x: number, y: number): Position | null => {
    if (!gameState) return null;
    const cellSize = GRID_SIZE / gameState.letters.length;
    const col = Math.floor((x - containerPos.current.x) / cellSize);
    const row = Math.floor((y - containerPos.current.y) / cellSize);
    if (row >= 0 && row < gameState.letters.length && col >= 0 && col < gameState.letters[0].length) {
      return { row, col };
    }
    return null;
  };

  const panGesture = Gesture.Pan()
    .onStart((e) => {
      if (gameWon) return;
      const pos = getCellFromPos(e.absoluteX, e.absoluteY);
      if (pos) {
        setSelection({ start: pos, end: pos });
      }
    })
    .onUpdate((e) => {
      if (!selection || gameWon) return;
      const pos = getCellFromPos(e.absoluteX, e.absoluteY);
      if (pos) {
        setSelection(prev => prev ? { ...prev, end: pos } : null);
      }
    })
    .onEnd(() => {
      if (!selection || gameWon || !gameState) return;
      
      const result = getSelectedWord(gameState.letters, selection.start, selection.end);
      if (result) {
        const foundWord = gameState.words.find(w => 
          (w === result.word || w === result.word.split('').reverse().join('')) && 
          !gameState.foundWords.includes(w)
        );

        if (foundWord) {
          playSound('win');
          setFoundPaths(prev => [...prev, result.cells]);
          setGameState(prev => {
            if (!prev) return prev;
            const newState = { ...prev, foundWords: [...prev.foundWords, foundWord] };
            if (newState.foundWords.length === prev.words.length) {
              setGameWon(true);
              const finalTime = Math.floor((Date.now() - startTimeRef.current!) / 1000);
              recordGameResult('word-search', 'win', finalTime);
              
              if (finalTime < highScore || highScore === 0) {
                setHighScoreState(finalTime);
                setHighScore('word-search', finalTime, difficulty);
              }

              const nextLvl = level + 1;
              setLevel('word-search', difficulty, nextLvl);
            }
            return newState;
          });
        } else {
          playSound('tap');
        }
      }
      setSelection(null);
    });

  const nextLevel = useCallback(async () => {
    const savedLevel = await getLevel('word-search', difficulty);
    setLevelState(savedLevel);
    setGameState(generateWordSearch(difficulty, savedLevel));
    setFoundPaths([]);
    setSelection(null);
    setGameWon(false);
    setElapsedTime(0);
    startTimeRef.current = Date.now();
  }, [difficulty]);

  const resetLevel = useCallback(() => {
    setGameState(generateWordSearch(difficulty, level));
    setFoundPaths([]);
    setSelection(null);
    setGameWon(false);
    setElapsedTime(0);
    startTimeRef.current = Date.now();
  }, [difficulty, level]);

  const handleNewGame = useCallback(() => {
    setLevelState(1);
    setGameState(generateWordSearch(difficulty, 1));
    setFoundPaths([]);
    setSelection(null);
    setGameWon(false);
    setElapsedTime(0);
    startTimeRef.current = Date.now();
  }, [difficulty]);

  const handleRestart = useCallback(() => {
    resetLevel();
  }, [resetLevel]);

  const isCellSelected = (r: number, c: number) => {
    if (!selection || !gameState) return false;
    const res = getSelectedWord(gameState.letters, selection.start, selection.end);
    return res?.cells.some(p => p.row === r && p.col === c) ?? false;
  };

  const isCellFound = (r: number, c: number) => {
    return foundPaths.some(path => path.some(p => p.row === r && p.col === c));
  };

  const renderSelectionLine = () => {
    if (!selection || !gameState) return null;
    const cellSize = GRID_SIZE / gameState.letters.length;
    
    const startX = containerPos.current.x + selection.start.col * cellSize + cellSize / 2;
    const startY = containerPos.current.y + selection.start.row * cellSize + cellSize / 2;
    const endX = containerPos.current.x + selection.end.col * cellSize + cellSize / 2;
    const endY = containerPos.current.y + selection.end.row * cellSize + cellSize / 2;

    const dx = endX - startX;
    const dy = endY - startY;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    return (
      <View
        pointerEvents="none"
        style={[
          styles.selectionLine,
          {
            left: selection.start.col * cellSize + cellSize / 2,
            top: selection.start.row * cellSize + cellSize / 2,
            width: length,
            transform: [
              { rotate: `${angle}rad` },
              { translateX: 0 },
              { translateY: -10 },
            ],
          },
        ]}
      />
    );
  };

  if (!isReady || !gameState) return <View style={styles.container} />;
  const cellSize = GRID_SIZE / gameState.letters.length;

  return (
    <View style={styles.container}>
      <Text style={styles.bgIcon}>🔍</Text>
      <Header title="Word Search" score={elapsedTime} scoreLabel="TIME" highScore={level} highScoreLabel="LEVEL" />
      
      <View style={styles.levelHeader}>
        <View style={styles.difficultyBadge}>
          <Text style={styles.difficultyText}>{difficulty.toUpperCase()}</Text>
        </View>
        <Text style={styles.levelText}>Level {level}</Text>
      </View>

      <View style={styles.gameArea}>
        <GestureDetector gesture={panGesture}>
          <View onLayout={onLayout}>
            <GameBoardContainer style={styles.boardWrapper}>
              <View style={styles.grid}>
                {renderSelectionLine()}
                {gameState.letters.map((row, r) => (
                  <View key={r} style={styles.row}>
                    {row.map((letter, c) => (
                      <View 
                        key={c} 
                        style={[
                          styles.cell, 
                          { width: cellSize, height: cellSize },
                          isCellSelected(r, c) && styles.selectedCell,
                          isCellFound(r, c) && styles.foundCell,
                        ]}
                      >
                        <Text style={[
                          styles.letter, 
                          { fontSize: cellSize * 0.6 },
                          (isCellSelected(r, c) || isCellFound(r, c)) && { color: colors.textOnPrimary }
                        ]}>
                          {letter}
                        </Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            </GameBoardContainer>
          </View>
        </GestureDetector>

        <View style={styles.wordListContainer}>
          <ScrollView contentContainerStyle={styles.wordList} showsVerticalScrollIndicator={false}>
            {gameState.words.map((word, i) => (
              <View key={i} style={[styles.wordItem, gameState.foundWords.includes(word) && styles.foundWordItem]}>
                <Text style={[styles.wordText, gameState.foundWords.includes(word) && styles.foundWordText]}>
                  {word}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>

      <View style={styles.footer}>
        <PremiumButton variant="secondary" height={44} style={styles.flexBtn} onPress={handleRestart}>
          <Text style={styles.footerBtnText}>RESTART</Text>
        </PremiumButton>
        <PremiumButton variant="secondary" height={44} style={styles.flexBtn} onPress={handleNewGame}>
          <Text style={styles.footerBtnText}>NEW GAME</Text>
        </PremiumButton>
      </View>

      {gameWon && (
        <GameOverOverlay
          result="win"
          title="LEVEL COMPLETE!"
          subtitle={`Found all words in ${elapsedTime}s.`}
          onPlayAgain={nextLevel}
          onPlayAgainLabel="NEXT LEVEL"
          onNewGame={handleNewGame}
          onRestart={handleRestart}
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
  difficultyBadge: { backgroundColor: colors.card, paddingHorizontal: 12, paddingVertical: 2, borderRadius: radius.sm, marginBottom: 4, borderWidth: 1, borderColor: colors.border },
  difficultyText: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  levelText: { color: colors.text, fontSize: 24, fontWeight: '900' },
  gameArea: { flex: 1, padding: spacing.md, alignItems: 'center' },
  boardWrapper: { padding: 4, backgroundColor: colors.border, borderRadius: radius.md },
  grid: { backgroundColor: colors.card, position: 'relative' },
  selectionLine: {
    position: 'absolute',
    height: 20,
    backgroundColor: colors.primary + '40',
    borderRadius: 10,
    zIndex: 5,
  },
  row: { flexDirection: 'row' },
  cell: { justifyContent: 'center', alignItems: 'center' },
  selectedCell: { backgroundColor: colors.primary, borderRadius: radius.xs },
  foundCell: { backgroundColor: colors.success + '80', borderRadius: radius.xs },
  letter: { color: colors.text, fontWeight: 'bold' },
  footer: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.md, paddingBottom: Platform.OS === 'ios' ? 30 : spacing.md, paddingTop: spacing.sm },
  flexBtn: { flex: 1 },
  footerBtnText: { color: colors.text, fontWeight: 'bold', fontSize: 12 },
  wordListContainer: { flex: 1, width: '100%', marginTop: spacing.lg },
  wordList: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm, paddingBottom: 20 },
  wordItem: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  foundWordItem: { backgroundColor: colors.success + '20', borderColor: colors.success },
  wordText: { color: colors.textSecondary, fontSize: 12, fontWeight: '900' },
  foundWordText: { color: colors.success, textDecorationLine: 'line-through' },
  bgIcon: {
    position: 'absolute',
    bottom: '10%',
    right: '-10%',
    fontSize: 250,
    opacity: 0.03,
    transform: [{ rotate: '15deg' }],
  },
});