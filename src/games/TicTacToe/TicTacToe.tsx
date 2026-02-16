import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View, Animated } from 'react-native';
import Header from '../../components/Header';
import TutorialScreen from '../../components/TutorialScreen';
import GameOverOverlay from '../../components/GameOverOverlay';
import GameBoardContainer from '../../components/GameBoardContainer';
import { useTheme } from '../../contexts/ThemeContext';
import { useSound } from '../../contexts/SoundContext';
import { getHighScore, setHighScore } from '../../utils/storage';
import { recordGameResult } from '../../utils/stats';
import { spacing, radius, shadows, typography } from '../../utils/designTokens';
import { Difficulty } from '../../types';
import PremiumButton from '../../components/PremiumButton';
import { Board, Cell, checkWinner, createEmptyBoard, getAIMove, getWinningLine, isDraw } from './logic';
import { ThemeColors } from '../../utils/themes';
import { GAME_TUTORIALS } from '../../utils/tutorials';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SCREEN_WIDTH = Dimensions.get('window').width;
const BOARD_SIZE = SCREEN_WIDTH - 32;
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
      <Header
        score={score}
        highScore={highScore}
      />

      <View style={styles.boardContainer}>
        <GameBoardContainer>
          <View style={styles.board}>
            {/* Grid Lines */}
            <View style={styles.gridLineV1} />
            <View style={styles.gridLineV2} />
            <View style={styles.gridLineH1} />
            <View style={styles.gridLineH2} />

            {[0, 1, 2].map((row) => (
              <View key={row} style={styles.row}>
                {[0, 1, 2].map((col) => renderCell(row * 3 + col))}
              </View>
            ))}
          </View>
        </GameBoardContainer>
      </View>

      <View style={styles.footer}>
        {!winner && !draw ? (
          <View style={styles.turnIndicator}>
            <View style={[styles.turnDot, { backgroundColor: isPlayerTurn ? colors.primary : colors.success }]} />
            <Text style={styles.turnText}>
              {isPlayerTurn ? 'YOUR TURN (X)' : 'AI THINKING...'}
            </Text>
          </View>
        ) : (
          <PremiumButton
            variant="primary"
            height={56}
            onPress={resetGame}
            style={styles.newGameBtn}
          >
            <Text style={styles.newGameText}>PLAY AGAIN</Text>
          </PremiumButton>
        )}
      </View>

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
    padding: spacing.md,
    backgroundColor: colors.background,
  },
  boardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  board: {
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    position: 'relative',
    backgroundColor: '#1e1e3a',
    borderRadius: radius.lg,
    padding: 0,
    borderWidth: 4,
    borderColor: '#2b2b45',
    overflow: 'hidden',
  },
  gridLineV1: {
    position: 'absolute',
    left: '33.33%',
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#2b2b45',
  },
  gridLineV2: {
    position: 'absolute',
    left: '66.66%',
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#2b2b45',
  },
  gridLineH1: {
    position: 'absolute',
    top: '33.33%',
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#2b2b45',
  },
  gridLineH2: {
    position: 'absolute',
    top: '66.66%',
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#2b2b45',
  },
  row: {
    flexDirection: 'row',
    height: '33.33%',
  },
  cell: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  winCell: {
    backgroundColor: colors.primary + '20',
    borderRadius: radius.sm,
  },
  cellText: {
    fontSize: 64,
    fontWeight: '900',
  },
  xText: {
    color: '#ff7675',
  },
  oText: {
    color: '#55efc4',
  },
  footer: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  turnIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  turnDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  turnText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  newGameBtn: {
    width: '100%',
  },
  newGameText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 16,
  },
});
