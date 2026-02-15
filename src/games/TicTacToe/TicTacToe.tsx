import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View, Animated } from 'react-native';
import Header from '../../components/Header';
import TutorialScreen from '../../components/TutorialScreen';
import { useTheme } from '../../contexts/ThemeContext';
import { useSound } from '../../contexts/SoundContext';
import { getHighScore, setHighScore } from '../../utils/storage';
import { recordGameResult } from '../../utils/stats';
import { Difficulty } from '../../types';
import { Board, Cell, checkWinner, createEmptyBoard, getAIMove, getWinningLine, isDraw } from './logic';
import { ThemeColors } from '../../utils/themes';
import { GAME_TUTORIALS } from '../../utils/tutorials';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SCREEN_WIDTH = Dimensions.get('window').width;
const BOARD_SIZE = Math.min(SCREEN_WIDTH - 40, 360);
const CELL_SIZE = BOARD_SIZE / 3;

interface Props {
  difficulty: Difficulty;
}

export default function TicTacToe({ difficulty }: Props) {
  const { colors } = useTheme();
  const { playSound } = useSound();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const [board, setBoard] = useState<Board>(createEmptyBoard());
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [winner, setWinner] = useState<Cell>(null);
  const [draw, setDraw] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHigh] = useState(0);
  const [winLine, setWinLine] = useState<number[] | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);

  const startTimeRef = useRef<number | null>(null);
  const cellAnimations = useRef<Animated.Value[]>([]).current;
  if (cellAnimations.length === 0) {
    for (let i = 0; i < 9; i++) {
      cellAnimations.push(new Animated.Value(0));
    }
  }

  useEffect(() => {
    getHighScore('tic-tac-toe').then(setHigh);
    AsyncStorage.getItem('@tutorial_tic-tac-toe').then((shown) => {
      if (!shown) setShowTutorial(true);
    });
  }, []);

  useEffect(() => {
    startTimeRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (winner || draw) {
      const gameDuration = Math.floor((Date.now() - startTimeRef.current!) / 1000);
      let result: 'win' | 'loss';
      if (winner === 'X') {
        result = 'win';
      } else {
        result = 'loss'; // AI wins or draw
      }
      recordGameResult('tic-tac-toe', result, gameDuration);
    }
  }, [winner, draw]);

  // AI move
  useEffect(() => {
    if (!isPlayerTurn && !winner && !draw) {
      const timer = setTimeout(() => {
        const newBoard = [...board];
        const move = getAIMove(newBoard, difficulty);
        if (move >= 0) {
          newBoard[move] = 'O';
          setBoard(newBoard);
          Animated.spring(cellAnimations[move], {
            toValue: 1,
            friction: 5,
            tension: 80,
            useNativeDriver: true,
          }).start();
          const w = checkWinner(newBoard);
          if (w) {
            setWinner(w);
            setWinLine(getWinningLine(newBoard));
            playSound('lose');
          } else if (isDraw(newBoard)) {
            setDraw(true);
            playSound('lose'); // Or a draw sound
          }
          setIsPlayerTurn(true);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isPlayerTurn, board, winner, draw, difficulty, playSound, cellAnimations]);

  const handleCellPress = useCallback(
    (index: number) => {
      if (!isPlayerTurn || board[index] || winner || draw) return;
      playSound('tap');
      const newBoard = [...board];
      newBoard[index] = 'X';
      setBoard(newBoard);
      Animated.spring(cellAnimations[index], {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }).start();

      const w = checkWinner(newBoard);
      if (w) {
        setWinner(w);
        setWinLine(getWinningLine(newBoard));
        if (w === 'X') {
          playSound('win');
          const newScore = score + 1;
          setScore(newScore);
          if (newScore > highScore) {
            setHigh(newScore);
            setHighScore('tic-tac-toe', newScore);
          }
        }
      } else if (isDraw(newBoard)) {
        setDraw(true);
        playSound('lose'); // Or a draw sound
      } else {
        setIsPlayerTurn(false);
      }
    },
    [board, isPlayerTurn, winner, draw, score, highScore, playSound, cellAnimations]
  );

  const resetGame = () => {
    setBoard(createEmptyBoard());
    setIsPlayerTurn(true);
    setWinner(null);
    setDraw(false);
    setWinLine(null);
    startTimeRef.current = Date.now(); // Reset start time
    cellAnimations.forEach(anim => anim.setValue(0));
  };

  const renderCell = (index: number) => {
    const value = board[index];
    const isWinCell = winLine?.includes(index);
    return (
      <TouchableOpacity
        key={index}
        style={[
          styles.cell,
          index % 3 !== 2 && styles.cellBorderRight,
          index < 6 && styles.cellBorderBottom,
          isWinCell && styles.winCell,
        ]}
        onPress={() => handleCellPress(index)}
        activeOpacity={0.7}
      >
        <Animated.Text
          style={[
            styles.cellText,
            value === 'X' && styles.xText,
            value === 'O' && styles.oText,
            { transform: [{ scale: cellAnimations[index] }] }
          ]}
        >
          {value || ''}
        </Animated.Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Header title="Tic Tac Toe" score={score} highScore={highScore} />

      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.tutorialButton}
          onPress={() => setShowTutorial(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.tutorialIcon}>❓</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.boardContainer}>
        <View style={styles.board}>
          {[0, 1, 2].map((row) => (
            <View key={row} style={styles.row}>
              {[0, 1, 2].map((col) => renderCell(row * 3 + col))}
            </View>
          ))}
        </View>
      </View>

      {!winner && !draw && (
        <Text style={styles.turnText}>
          {isPlayerTurn ? 'Your turn (X)' : 'AI thinking...'}
        </Text>
      )}

      {(winner || draw) && (
        <View style={styles.overlay}>
          <Text style={styles.resultText}>
            {winner === 'X' ? 'You Win!' : winner === 'O' ? 'AI Wins!' : "It's a Draw!"}
          </Text>
          <TouchableOpacity style={styles.playAgain} onPress={resetGame} activeOpacity={0.7}>
            <Text style={styles.playAgainText}>Play Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {showTutorial && (
        <TutorialScreen
          gameName="Tic Tac Toe"
          steps={GAME_TUTORIALS['tic-tac-toe']}
          onClose={() => {
            setShowTutorial(false);
            AsyncStorage.setItem('@tutorial_tic-tac-toe', 'true');
          }}
        />
      )}
    </View>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
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
  boardContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  board: {
    width: BOARD_SIZE,
    height: BOARD_SIZE,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellBorderRight: {
    borderRightWidth: 3,
    borderRightColor: colors.textSecondary,
  },
  cellBorderBottom: {
    borderBottomWidth: 3,
    borderBottomColor: colors.textSecondary,
  },
  winCell: {
    backgroundColor: 'rgba(78, 204, 163, 0.2)',
  },
  cellText: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  xText: {
    color: colors.primary,
  },
  oText: {
    color: colors.success,
  },
  turnText: {
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 24,
  },
  overlay: {
    alignItems: 'center',
    marginTop: 24,
  },
  resultText: {
    color: colors.text,
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  playAgain: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  playAgainText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
