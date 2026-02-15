import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View, Animated } from 'react-native';
import Header from '../../components/Header';
import { useTheme } from '../../contexts/ThemeContext';
import { useSound } from '../../contexts/SoundContext';
import { getHighScore, setHighScore } from '../../utils/storage';
import { recordGameResult } from '../../utils/stats';
import { Difficulty } from '../../types';
import { Board, Player, checkWinner, createEmptyBoard, dropPiece, getAIMove, isBoardFull } from './logic';
import { ThemeColors } from '../../utils/themes';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GAME_WIDTH = Math.min(SCREEN_WIDTH - 40, 420);
const BOARD_COLS = 7;
const BOARD_ROWS = 6;
const BOARD_PADDING = 8;
const CELL_GAP = 6;
const CELL_SIZE = Math.floor(
  (GAME_WIDTH - BOARD_PADDING * 2 - CELL_GAP * BOARD_COLS) / BOARD_COLS
);
const BOARD_WIDTH = CELL_SIZE * BOARD_COLS + CELL_GAP * (BOARD_COLS - 1) + BOARD_PADDING * 2;
const BOARD_HEIGHT = CELL_SIZE * BOARD_ROWS + CELL_GAP * (BOARD_ROWS - 1) + BOARD_PADDING * 2;

interface Props {
  difficulty: Difficulty;
}

export default function ConnectFour({ difficulty }: Props) {
  const { colors } = useTheme();
  const { playSound } = useSound();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [board, setBoard] = useState<Board>(createEmptyBoard(difficulty));
  const [currentPlayer, setCurrentPlayer] = useState<Player>('R');
  const [winner, setWinner] = useState<Player>(null);
  const [isDraw, setIsDraw] = useState(false);
  const [score, setScore] = useState(0); // Player wins
  const [highScore, setHighScoreState] = useState(0);

  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    getHighScore('connect-four').then(setHighScoreState);
  }, []);

  useEffect(() => {
    startTimeRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (winner || isDraw) {
      const gameDuration = Math.floor((Date.now() - startTimeRef.current!) / 1000);
      let result: 'win' | 'loss';
      if (winner === 'R') {
        result = 'win';
      } else {
        result = 'loss'; // AI wins or draw
      }
      recordGameResult('connect-four', result, gameDuration);
    }
  }, [winner, isDraw]);


  const columnAnimations = useRef(
    Array(BOARD_COLS)
      .fill(0)
      .map(() => new Animated.Value(-CELL_SIZE - CELL_GAP))
  ).current;

  const resetAnimations = useCallback(() => {
    columnAnimations.forEach((anim) => anim.setValue(-CELL_SIZE - CELL_GAP));
  }, [columnAnimations]);


  const makeMove = useCallback(
    (col: number) => {
      if (winner || isDraw) return;
      const newBoard = dropPiece(board, col, currentPlayer);

      if (newBoard) {
        setBoard(newBoard);
        playSound('drop');

        let dropRow = -1;
        for (let r = newBoard.length - 1; r >= 0; r--) {
          if (newBoard[r][col] !== null) {
            dropRow = r;
            break;
          }
        }
        Animated.timing(columnAnimations[col], {
            toValue: BOARD_PADDING + dropRow * (CELL_SIZE + CELL_GAP),
            duration: 200,
            useNativeDriver: true,
        }).start(() => {
            columnAnimations[col].setValue(-CELL_SIZE - CELL_GAP); // Reset for next drop
        });


        const winPlayer = checkWinner(newBoard);
        if (winPlayer) {
          setWinner(winPlayer);
          if (winPlayer === 'R') {
            setScore((prev) => {
              const newScore = prev + 1;
              if (newScore > highScore) {
                setHighScoreState(newScore);
                setHighScore('connect-four', newScore);
              }
              return newScore;
            });
            playSound('win');
          } else {
            playSound('lose');
          }
        } else if (isBoardFull(newBoard)) {
          setIsDraw(true);
          playSound('lose'); // Draw sound
        } else {
          setCurrentPlayer(currentPlayer === 'R' ? 'Y' : 'R');
        }
      }
    },
    [board, currentPlayer, winner, isDraw, playSound, score, highScore, columnAnimations]
  );

  useEffect(() => {
    if (currentPlayer === 'Y' && !winner && !isDraw) {
      const timer = setTimeout(() => {
        const aiMove = getAIMove(board, difficulty);
        if (aiMove !== -1) {
          makeMove(aiMove);
        }
      }, 500); // AI thinks for 0.5 seconds
      return () => clearTimeout(timer);
    }
  }, [currentPlayer, board, winner, isDraw, difficulty, makeMove]);

  // Keyboard support for web
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = (e: KeyboardEvent) => {
      const col = parseInt(e.key, 10) - 1;
      if (col >= 0 && col < 7 && board[0][col] === null) {
        e.preventDefault();
        makeMove(col);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [board, makeMove]);

  const resetGame = useCallback(() => {
    setBoard(createEmptyBoard(difficulty));
    setCurrentPlayer('R');
    setWinner(null);
    setIsDraw(false);
    startTimeRef.current = Date.now();
    resetAnimations();
  }, [difficulty, resetAnimations]);

  return (
    <View style={styles.container}>
      <Header
        title="Connect Four"
        score={score}
        highScore={highScore}
      />

      <View style={styles.boardContainer}>
        <View style={[styles.board, { width: BOARD_WIDTH, height: BOARD_HEIGHT }]}>
          {board.map((row, r) => (
            <View key={r} style={styles.row}>
              {row.map((player, c) => (
                <View
                  key={`${r}-${c}`}
                  style={[
                    styles.cell,
                    { width: CELL_SIZE, height: CELL_SIZE, borderRadius: CELL_SIZE / 2 },
                    player === 'R' && styles.redPiece,
                    player === 'Y' && styles.yellowPiece,
                  ]}
                />
              ))}
            </View>
          ))}
          {/* Animated pieces for visual drop */}
          {board[0].map((_, col) => (
              <Animated.View
                  key={`anim-${col}`}
                  style={[
                      styles.animatedPiece,
                      {
                          width: CELL_SIZE,
                          height: CELL_SIZE,
                          borderRadius: CELL_SIZE / 2,
                          left: BOARD_PADDING + col * (CELL_SIZE + CELL_GAP),
                          transform: [{ translateY: columnAnimations[col] }],
                      },
                      currentPlayer === 'R' && styles.redPiece,
                      currentPlayer === 'Y' && styles.yellowPiece,
                      (winner || isDraw) && { opacity: 0 } // Hide dropping piece when game ends
                  ]}
              />
          ))}
        </View>
        <View style={styles.touchableColumns}>
          {Array.from({ length: 7 }).map((_, col) => (
            <TouchableOpacity
              key={col}
              style={[styles.columnTouch, { width: CELL_SIZE + CELL_GAP }]}
              onPress={() => makeMove(col)}
              disabled={winner !== null || isDraw || board[0][col] !== null}
            />
          ))}
        </View>
      </View>

      <Text style={styles.statusText}>
        {winner
          ? winner === 'R'
            ? 'You Win!'
            : 'AI Wins!'
          : isDraw
          ? "It's a Draw!"
          : currentPlayer === 'R'
          ? 'Your Turn (Red)'
          : 'AI Turn (Yellow)'}
      </Text>

      {(winner || isDraw) && (
        <TouchableOpacity style={styles.playAgainButton} onPress={resetGame} activeOpacity={0.7}>
          <Text style={styles.playAgainText}>Play Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boardContainer: {
    marginTop: 20,
    position: 'relative',
  },
  board: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    flexDirection: 'column',
    overflow: 'hidden',
    padding: BOARD_PADDING,
    borderWidth: 5,
    borderColor: colors.primary,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    backgroundColor: colors.background, // Empty slot color
    marginRight: CELL_GAP,
    marginBottom: CELL_GAP,
  },
  redPiece: {
    backgroundColor: '#FF4136', // Red
  },
  yellowPiece: {
    backgroundColor: '#FFDC00', // Yellow
  },
  animatedPiece: {
      position: 'absolute',
      backgroundColor: 'transparent', // Will be set by currentPlayer
      top: 0,
  },
  touchableColumns: {
    flexDirection: 'row',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  columnTouch: {
    flex: 1,
  },
  statusText: {
    color: colors.text,
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    textAlign: 'center',
  },
  playAgainButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 20,
  },
  playAgainText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
});
