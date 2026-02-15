import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import Header from '../../components/Header';
import TutorialScreen from '../../components/TutorialScreen';
import HintButton from '../../components/HintButton';
import { useTheme } from '../../contexts/ThemeContext';
import { useSound } from '../../contexts/SoundContext';
import { getHighScore, setHighScore } from '../../utils/storage';
import { recordGameResult } from '../../utils/stats';
import { Difficulty } from '../../types';
import { ThemeColors } from '../../utils/themes';
import { generateSudoku, isSolved, getConflicts, SudokuBoard } from './logic';
import { GAME_TUTORIALS } from '../../utils/tutorials';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CELL_SIZE = Math.floor((Math.min(SCREEN_WIDTH - 60, 360)) / 9);

interface Props {
  difficulty: Difficulty;
}

export default function Sudoku({ difficulty }: Props) {
  const { colors } = useTheme();
  const { playSound } = useSound();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [board, setBoard] = useState<SudokuBoard>(() => generateSudoku(difficulty));
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [gameWon, setGameWon] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [highScore, setHighScoreState] = useState<number | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [hintCell, setHintCell] = useState<{ row: number; col: number } | null>(null);
  const [remainingHints, setRemainingHints] = useState(3);
  const [hintCooldown, setHintCooldown] = useState(0);

  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check if tutorial has been shown
    AsyncStorage.getItem('@tutorial_sudoku').then((shown) => {
      if (!shown) {
        setShowTutorial(true);
      }
    });
  }, []);

  useEffect(() => {
    getHighScore('sudoku').then((score) => {
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

  const handleCellPress = useCallback(
    (row: number, col: number) => {
      if (gameWon || board[row][col].isFixed) return;
      
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
      }

      setSelectedCell({ row, col });
    },
    [board, gameWon]
  );

  const handleNumberPress = useCallback(
    (num: number) => {
      if (!selectedCell || gameWon) return;

      const newBoard = board.map((r) => r.map((c) => ({ ...c })));
      newBoard[selectedCell.row][selectedCell.col].value = num;
      setBoard(newBoard);
      playSound('tap');

      if (isSolved(newBoard)) {
        setGameWon(true);
        playSound('win');
        const finalTime = Math.floor((Date.now() - startTimeRef.current!) / 1000);
        recordGameResult('sudoku', 'win', finalTime);

        if (highScore === null || finalTime < highScore) {
          setHighScoreState(finalTime);
          setHighScore('sudoku', finalTime);
        }
      }
    },
    [selectedCell, board, gameWon, highScore, playSound]
  );

  const handleClear = useCallback(() => {
    if (!selectedCell || gameWon) return;
    handleNumberPress(0);
  }, [selectedCell, gameWon, handleNumberPress]);

  const handleHint = useCallback(() => {
    if (remainingHints <= 0 || hintCooldown > 0 || gameWon) return;

    // Find first empty cell with only one possibility
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (board[row][col].value === 0 && !board[row][col].isFixed) {
          // Find valid numbers for this cell
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
            if (!usedInRow.has(num) && !usedInCol.has(num) && !usedInBox.has(num)) {
              candidates.push(num);
            }
          }

          // If only one candidate, show hint
          if (candidates.length === 1) {
            setHintCell({ row, col });
            setRemainingHints(prev => prev - 1);
            setHintCooldown(10);
            playSound('tap');
            
            // Clear hint after 3 seconds
            setTimeout(() => setHintCell(null), 3000);
            return;
          }
        }
      }
    }

    // If no single candidate found, just highlight first empty cell
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

  // Hint cooldown timer
  useEffect(() => {
    if (hintCooldown > 0) {
      const timer = setTimeout(() => {
        setHintCooldown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [hintCooldown]);

  // Keyboard support for web
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

  const resetGame = useCallback(() => {
    setBoard(generateSudoku(difficulty));
    setSelectedCell(null);
    setGameWon(false);
    setElapsedTime(0);
    startTimeRef.current = null;
  }, [difficulty]);

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
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <Header
          title="Sudoku"
          score={elapsedTime}
          scoreLabel="Time"
          highScore={highScore || 0}
          highScoreLabel="Best"
        />

        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.tutorialButton}
            onPress={() => setShowTutorial(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.tutorialIcon}>❓</Text>
          </TouchableOpacity>
          
          <HintButton
            onPress={handleHint}
            disabled={remainingHints <= 0 || hintCooldown > 0 || gameWon}
            cooldown={hintCooldown}
            remainingHints={remainingHints}
          />
        </View>

        <View style={styles.gameContainer}>
          {renderBoard()}

          <View style={styles.numberPad}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <TouchableOpacity
                key={num}
                style={styles.numberButton}
                onPress={() => handleNumberPress(num)}
                disabled={!selectedCell || gameWon}
              >
                <Text style={styles.numberText}>{num}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.numberButton, styles.clearButton]}
              onPress={handleClear}
              disabled={!selectedCell || gameWon}
            >
              <Text style={styles.numberText}>✕</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.newGameBtn} onPress={resetGame} activeOpacity={0.7}>
            <Text style={styles.newGameText}>New Game</Text>
          </TouchableOpacity>
        </View>

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

        {showTutorial && (
          <TutorialScreen
            gameName="Sudoku"
            steps={GAME_TUTORIALS.sudoku}
            onClose={handleCloseTutorial}
          />
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
      padding: 20,
    },
    controls: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 15,
      marginTop: 10,
    },
    tutorialButton: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: colors.card,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    tutorialIcon: {
      fontSize: 24,
    },
    gameContainer: {
      alignItems: 'center',
      marginTop: 20,
    },
    board: {
      backgroundColor: colors.background,
    },
    row: {
      flexDirection: 'row',
    },
    cell: {
      justifyContent: 'center',
      alignItems: 'center',
      borderColor: colors.textSecondary,
    },
    cellText: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
    },
    fixedText: {
      color: colors.textSecondary,
    },
    conflictText: {
      color: '#ff0000',
    },
    numberPad: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      marginTop: 20,
      gap: 10,
    },
    numberButton: {
      width: 50,
      height: 50,
      backgroundColor: colors.card,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    clearButton: {
      backgroundColor: colors.error,
    },
    numberText: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
    },
    newGameBtn: {
      backgroundColor: colors.card,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 24,
      marginTop: 20,
    },
    newGameText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
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
