import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Header from '../../components/Header';
import TutorialScreen from '../../components/TutorialScreen';
import HintButton from '../../components/HintButton';
import GameOverOverlay from '../../components/GameOverOverlay';
import GameBoardContainer from '../../components/GameBoardContainer';
import { useTheme } from '../../contexts/ThemeContext';
import { useSound } from '../../contexts/SoundContext';
import { getHighScore, setHighScore, getLevel, setLevel } from '../../utils/storage';
import { recordGameResult } from '../../utils/stats';
import { Difficulty } from '../../types';
import { ThemeColors } from '../../utils/themes';
import { generateSudoku, isSolved, getConflicts, SudokuBoard } from './logic';
import { GAME_TUTORIALS } from '../../utils/tutorials';
import { spacing, radius, shadows, typography } from '../../utils/designTokens';
import PremiumButton from '../../components/PremiumButton';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CELL_SIZE = Math.floor((SCREEN_WIDTH - 48) / 9);

interface Props {
  difficulty: Difficulty;
}

export default function Sudoku({ difficulty }: Props) {
  const { colors } = useTheme();
  const { playSound } = useSound();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [level, setLevelState] = useState(1);
  const [board, setBoard] = useState<SudokuBoard>([]);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [gameWon, setGameWon] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [highScore, setHighScoreState] = useState<number | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [hintCell, setHintCell] = useState<{ row: number; col: number } | null>(null);
  const [remainingHints, setRemainingHints] = useState(3);
  const [hintCooldown, setHintCooldown] = useState(0);
  const [paused, setPaused] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const init = async () => {
      const savedLevel = await getLevel('sudoku', difficulty);
      const best = await getHighScore('sudoku', difficulty);
      setLevelState(savedLevel);
      setHighScoreState(best);
      setBoard(generateSudoku(difficulty, savedLevel));
      setIsReady(true);
      startTimeRef.current = Date.now();
    };
    init();
    AsyncStorage.getItem('@tutorial_sudoku').then((shown) => {
      if (!shown) setShowTutorial(true);
    });
  }, [difficulty]);

  useEffect(() => {
    if (!gameWon && !paused && isReady && startTimeRef.current) {
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTimeRef.current!) / 1000));
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameWon, paused, isReady]);

  const handleCellPress = useCallback(
    (row: number, col: number) => {
      if (gameWon || paused || board[row][col].isFixed || !isReady) return;
      if (!startTimeRef.current) startTimeRef.current = Date.now();
      setSelectedCell({ row, col });
    },
    [board, gameWon, paused, isReady]
  );

  const handleNumberPress = useCallback(
    (num: number) => {
      if (!selectedCell || gameWon || paused || !isReady) return;

      const newBoard = board.map((r) => r.map((c) => ({ ...c })));
      newBoard[selectedCell.row][selectedCell.col].value = num;
      setBoard(newBoard);
      playSound('tap');

      if (isSolved(newBoard)) {
        setGameWon(true);
        playSound('win');
        const finalTime = Math.floor((Date.now() - startTimeRef.current!) / 1000);
        recordGameResult('sudoku', 'win', finalTime);

        if (highScore === null || finalTime < highScore || highScore === 0) {
          setHighScoreState(finalTime);
          setHighScore('sudoku', finalTime, difficulty);
        }
        
        const nextLvl = level + 1;
        setLevel('sudoku', difficulty, nextLvl);
      }
    },
    [selectedCell, board, gameWon, paused, highScore, difficulty, playSound, level, isReady]
  );

  const handleClear = useCallback(() => {
    if (!selectedCell || gameWon || paused) return;
    handleNumberPress(0);
  }, [selectedCell, gameWon, paused, handleNumberPress]);

  const handleHint = useCallback(() => {
    if (remainingHints <= 0 || hintCooldown > 0 || gameWon || paused) return;

    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (board[row][col].value === 0 && !board[row][col].isFixed) {
          const usedInRow = new Set(board[row].filter(c => c.value > 0).map(c => c.value));
          const usedInCol = new Set(board.map(r => r[col]).filter(c => c.value > 0).map(c => c.value));
          const boxRow = Math.floor(row / 3) * 3;
          const boxCol = Math.floor(col / 3) * 3;
          const usedInBox = new Set<number>();
          for (let r = boxRow; r < boxRow + 3; r++) {
            for (let c = boxCol; c < boxCol + 3; c++) {
              if (board[r][c].value > 0) usedInBox.add(board[r][c].value);
            }
          }
          const candidates: number[] = [];
          for (let num = 1; num <= 9; num++) {
            if (!usedInRow.has(num) && !usedInCol.has(num) && !usedInBox.has(num)) candidates.push(num);
          }
          if (candidates.length === 1) {
            setHintCell({ row, col });
            setRemainingHints(prev => prev - 1);
            setHintCooldown(10);
            playSound('tap');
            setTimeout(() => setHintCell(null), 3000);
            return;
          }
        }
      }
    }
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (board[row][col].value === 0 && !board[row][col].isFixed) {
          setHintCell({ row, col });
          setRemainingHints(prev => prev - 1);
          setHintCooldown(10);
          playSound('tap');
          setTimeout(() => setHintCell(null), 3000);
          return;
        }
      }
    }
  }, [board, remainingHints, hintCooldown, gameWon, playSound]);

  const handleCloseTutorial = useCallback(() => {
    setShowTutorial(false);
    AsyncStorage.setItem('@tutorial_sudoku', 'true');
  }, []);

  useEffect(() => {
    if (hintCooldown > 0) {
      const timer = setTimeout(() => setHintCooldown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [hintCooldown]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = (e: KeyboardEvent) => {
      if (gameWon || !selectedCell) return;
      if (e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        handleNumberPress(parseInt(e.key, 10));
      } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        e.preventDefault();
        handleClear();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleNumberPress, handleClear, gameWon, selectedCell]);

  const nextLevel = useCallback(async () => {
    const savedLevel = await getLevel('sudoku', difficulty);
    setLevelState(savedLevel);
    setBoard(generateSudoku(difficulty, savedLevel));
    setSelectedCell(null);
    setGameWon(false);
    setElapsedTime(0);
    setRemainingHints(3);
    setHintCooldown(0);
    startTimeRef.current = Date.now();
  }, [difficulty]);

  const resetLevel = useCallback(() => {
    setBoard(generateSudoku(difficulty, level));
    setSelectedCell(null);
    setGameWon(false);
    setElapsedTime(0);
    setRemainingHints(3);
    setHintCooldown(0);
    startTimeRef.current = Date.now();
  }, [difficulty, level]);

  if (!isReady) return <View style={styles.container} />;

  const renderBoard = () => {
    return (
      <View style={styles.board}>
        {board.map((row, r) => (
          <View key={r} style={styles.row}>
            {row.map((cell, c) => {
              const isSelected = selectedCell?.row === r && selectedCell?.col === c;
              const hasConflict = cell.value !== 0 && getConflicts(board, r, c);
              const isThickTop = r % 3 === 0;
              const isThickLeft = c % 3 === 0;
              const isHint = hintCell?.row === r && hintCell?.col === c;

              return (
                <TouchableOpacity
                  key={`${r}-${c}`}
                  style={[
                    styles.cell,
                    {
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      backgroundColor: isHint
                        ? colors.success + '60'
                        : isSelected
                          ? colors.primary + '40'
                          : cell.isFixed
                            ? colors.card
                            : colors.surface,
                      borderTopWidth: isThickTop ? 3 : 1,
                      borderLeftWidth: isThickLeft ? 3 : 1,
                      borderRightWidth: c === 8 ? 3 : 1,
                      borderBottomWidth: r === 8 ? 3 : 1,
                      borderTopColor: isThickTop ? colors.textSecondary : colors.textSecondary + '50',
                      borderLeftColor: isThickLeft ? colors.textSecondary : colors.textSecondary + '50',
                      borderRightColor: c === 8 ? colors.textSecondary : colors.textSecondary + '50',
                      borderBottomColor: r === 8 ? colors.textSecondary : colors.textSecondary + '50',
                    },
                  ]}
                  onPress={() => handleCellPress(r, c)}
                  disabled={gameWon}
                >
                  {cell.value !== 0 && (
                    <Text
                      style={[
                        styles.cellText,
                        cell.isFixed && styles.fixedText,
                        hasConflict && styles.conflictText,
                      ]}
                    >
                      {cell.value}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.viewRoot}>
      <View style={styles.container}>
        <Text style={styles.bgIcon}>🔢</Text>
        <Header
          title="Sudoku"
          score={elapsedTime}
          scoreLabel="TIME"
          highScore={level}
          highScoreLabel="LEVEL"
          onPause={() => setPaused(!paused)}
          isPaused={paused}
        />

        <View style={styles.statsRow}>
          <View style={styles.hintsContainer}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Text key={i} style={[styles.heart, i >= remainingHints && styles.heartEmpty]}>
                {i < remainingHints ? '❤️' : '🖤'}
              </Text>
            ))}
          </View>
          <View style={styles.difficultyBadge}>
            <Text style={styles.difficultyText}>LEVEL {level}</Text>
          </View>
        </View>

        <GameBoardContainer style={styles.gameContainer}>
          {renderBoard()}

          <View style={styles.numberPad}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <PremiumButton
                key={num}
                variant="secondary"
                height={44}
                onPress={() => handleNumberPress(num)}
                disabled={!selectedCell || gameWon || paused}
                style={styles.numberButton}
              >
                <Text style={styles.numberText}>{num}</Text>
              </PremiumButton>
            ))}
            <PremiumButton
              variant="danger"
              height={44}
              onPress={handleClear}
              disabled={!selectedCell || gameWon || paused}
              style={styles.numberButton}
            >
              <Text style={[styles.numberText, { color: colors.textOnPrimary }]}>✕</Text>
            </PremiumButton>
          </View>

          <View style={styles.actions}>
            <PremiumButton
              variant="secondary"
              height={44}
              onPress={resetLevel}
              disabled={paused}
              style={styles.actionBtn}
            >
              <Text style={styles.actionText}>RESET LEVEL</Text>
            </PremiumButton>

            <PremiumButton
              variant="secondary"
              height={44}
              onPress={handleHint}
              disabled={remainingHints <= 0 || hintCooldown > 0 || gameWon || paused}
              style={styles.actionBtn}
            >
              <Text style={styles.actionText}>{hintCooldown > 0 ? `WAIT ${hintCooldown}s` : 'HINT'}</Text>
            </PremiumButton>
          </View>
        </GameBoardContainer>

        {gameWon && (
          <GameOverOverlay
            result="win"
            title="LEVEL COMPLETE!"
            subtitle={`Finished in ${elapsedTime} seconds.`}
            onPlayAgain={nextLevel}
            onPlayAgainLabel="NEXT LEVEL"
          />
        )}

        {paused && !gameWon && (
          <GameOverOverlay
            result="paused"
            title="GAME PAUSED"
            onPlayAgain={() => setPaused(false)}
            onPlayAgainLabel="RESUME"
          />
        )}

        {showTutorial && (
          <TutorialScreen
            gameName="Sudoku"
            steps={GAME_TUTORIALS.sudoku}
            onClose={handleCloseTutorial}
          />
        )}
      </View>
    </View>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    viewRoot: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      padding: spacing.sm,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 2,
      paddingHorizontal: spacing.xs,
    },
    hintsContainer: {
      flexDirection: 'row',
      gap: 4,
    },
    heart: {
      fontSize: 20,
    },
    heartEmpty: {
      opacity: 0.3,
    },
    difficultyBadge: {
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    difficultyText: {
      fontSize: 10,
      fontWeight: '900',
      color: colors.textSecondary,
    },
    gameContainer: {
      alignItems: 'center',
      marginTop: spacing.xs,
    },
    board: {
      backgroundColor: colors.textSecondary,
      padding: 2,
      borderRadius: radius.xs,
    },
    row: {
      flexDirection: 'row',
    },
    cell: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    cellText: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.text,
    },
    fixedText: {
      color: colors.primary, // Using primary for fixed numbers
    },
    conflictText: {
      color: colors.error, // Red for conflict
    },
    numberPad: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      marginTop: 8,
      gap: spacing.xs,
    },
    numberButton: {
      width: 52,
    },
    numberText: {
      fontSize: 20,
      fontWeight: '900',
      color: colors.text,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: 8,
      width: '100%',
    },
    actionBtn: {
      flex: 1,
    },
    actionText: {
      fontWeight: '900',
      fontSize: 13,
      color: colors.text,
      letterSpacing: 0.5,
    },
    bgIcon: {
      position: 'absolute',
      top: '40%',
      right: '-10%',
      fontSize: 250,
      opacity: 0.03,
      transform: [{ rotate: '15deg' }],
    },
  });
