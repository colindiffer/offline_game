import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Header from '../../components/Header';
import GameBoardContainer from '../../components/GameBoardContainer';
import GameOverOverlay from '../../components/GameOverOverlay';
import PremiumButton from '../../components/PremiumButton';
import { useTheme } from '../../contexts/ThemeContext';
import { useSound } from '../../contexts/SoundContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getHighScore, setHighScore } from '../../utils/storage';
import { recordGameResult } from '../../utils/stats';
import { spacing, radius, shadows, typography } from '../../utils/designTokens';
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

const getSaveKey = (diff: string) => `@connect-four-state-${diff}`;

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
  const [droppingInfo, setDroppingInfo] = useState<{ col: number; row: number; player: Player } | null>(null);

  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    getHighScore('connect-four', difficulty).then(setHighScoreState);
  }, [difficulty]);

  // Restore saved game state on mount
  useEffect(() => {
    AsyncStorage.getItem(getSaveKey(difficulty)).then(saved => {
      if (saved) {
        try {
          const { board: savedBoard, currentPlayer: savedPlayer, score: savedScore } = JSON.parse(saved);
          setBoard(savedBoard);
          setCurrentPlayer(savedPlayer);
          setScore(savedScore || 0);
        } catch (_) { /* ignore corrupt data */ }
      }
      startTimeRef.current = Date.now();
    });
  }, []);

  useEffect(() => {
    if (winner || isDraw) {
      const gameDuration = Math.floor((Date.now() - startTimeRef.current!) / 1000);
      const result: 'win' | 'loss' = winner === 'R' ? 'win' : 'loss';
      recordGameResult('connect-four', result, gameDuration);
      // Game over — clear saved state
      AsyncStorage.removeItem(getSaveKey(difficulty));
    }
  }, [winner, isDraw]);

  // Persist board state after every move (only during an active game)
  useEffect(() => {
    if (!winner && !isDraw && startTimeRef.current) {
      AsyncStorage.setItem(getSaveKey(difficulty), JSON.stringify({ board, currentPlayer, score }));
    }
  }, [board, currentPlayer]);

  const columnAnimations = useRef(
    Array(BOARD_COLS)
      .fill(0)
      .map(() => new Animated.Value(-CELL_SIZE - 20))
  ).current;

  const resetAnimations = useCallback(() => {
    columnAnimations.forEach((anim) => anim.setValue(-CELL_SIZE - 20));
  }, [columnAnimations]);

  const makeMove = useCallback(
    (col: number) => {
      if (winner || isDraw || droppingInfo) return;
      
      // Calculate where it will land
      let dropRow = -1;
      for (let r = board.length - 1; r >= 0; r--) {
        if (board[r][col] === null) {
          dropRow = r;
          break;
        }
      }

      if (dropRow !== -1) {
        const player = currentPlayer;
        setDroppingInfo({ col, row: dropRow, player });
        playSound('drop');

        // Trigger falling animation
        Animated.timing(columnAnimations[col], {
          toValue: BOARD_PADDING + dropRow * (CELL_SIZE + CELL_GAP),
          duration: 400,
          useNativeDriver: true,
        }).start(() => {
          const newBoard = dropPiece(board, col, player);
          if (newBoard) {
            setBoard(newBoard);
            setDroppingInfo(null);
            columnAnimations[col].setValue(-CELL_SIZE - 20);

            const winPlayer = checkWinner(newBoard);
            if (winPlayer) {
              setWinner(winPlayer);
              if (winPlayer === 'R') {
                setScore((prev) => {
                  const newScore = prev + 1;
                                if (newScore > highScore) {
                                  setHighScoreState(newScore);
                                  setHighScore('connect-four', newScore, difficulty);
                                }                  return newScore;
                });
                playSound('win');
              } else {
                playSound('lose');
              }
            } else if (isBoardFull(newBoard)) {
              setIsDraw(true);
              playSound('lose');
            } else {
              setCurrentPlayer(player === 'R' ? 'Y' : 'R');
            }
          }
        });
      }
    },
    [board, currentPlayer, winner, isDraw, playSound, score, highScore, columnAnimations, droppingInfo]
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
    AsyncStorage.removeItem(getSaveKey(difficulty));
    setBoard(createEmptyBoard(difficulty));
    setCurrentPlayer('R');
    setWinner(null);
    setIsDraw(false);
    setDroppingInfo(null);
    startTimeRef.current = Date.now();
    resetAnimations();
  }, [difficulty, resetAnimations]);

  const handleNewGame = useCallback(() => {
    resetGame();
  }, [resetGame]);

  const handleRestart = useCallback(() => {
    resetGame();
  }, [resetGame]);

  return (
    <View style={styles.container}>
      <Header
        score={score}
        highScore={highScore}
      />

      <View style={styles.boardContainer}>
        <GameBoardContainer style={styles.gameBoard}>
          <View style={styles.board}>
            {/* Board Background (Holes) */}
            {board.map((row, r) => (
              <View key={r} style={styles.row}>
                {row.map((_, c) => (
                  <View key={`hole-${r}-${c}`} style={styles.cellHole} />
                ))}
              </View>
            ))}

            {/* Placed Pieces Layer */}
            <View style={[StyleSheet.absoluteFill, { padding: BOARD_PADDING }]}>
              {board.map((row, r) => (
                <View key={`pieces-row-${r}`} style={styles.row}>
                  {row.map((player, c) => {
                    // Hide the piece if it is currently dropping into this spot
                    const isDroppingHere = droppingInfo?.col === c && droppingInfo?.row === r;
                    
                    return (
                      <View key={`piece-${r}-${c}`} style={styles.cell}>
                        {player && !isDroppingHere && (
                          <View style={[styles.piece, player === 'R' ? styles.redPiece : styles.yellowPiece]}>
                            <LinearGradient
                              colors={player === 'R' ? ['#ff7675', '#d63031'] : ['#ffeaa7', '#fdcb6e']}
                              style={styles.pieceGradient}
                            />
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>

            {/* Dropping Piece Animation */}
            {droppingInfo && (
              <Animated.View
                key={`anim-${droppingInfo.col}`}
                style={[
                  styles.animatedPiece,
                  {
                    left: BOARD_PADDING + droppingInfo.col * (CELL_SIZE + CELL_GAP),
                    transform: [{ translateY: columnAnimations[droppingInfo.col] }],
                  },
                ]}
              >
                <View style={[styles.piece, droppingInfo.player === 'R' ? styles.redPiece : styles.yellowPiece]}>
                  <LinearGradient
                    colors={droppingInfo.player === 'R' ? ['#ff7675', '#d63031'] : ['#ffeaa7', '#fdcb6e']}
                    style={styles.pieceGradient}
                  />
                </View>
              </Animated.View>
            )}
          </View>
        </GameBoardContainer>

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

      <View style={styles.footer}>
        {!winner && !isDraw ? (
          <View style={styles.turnIndicator}>
            <View style={[styles.turnDot, { backgroundColor: currentPlayer === 'R' ? '#ff7675' : '#ffeaa7' }]} />
            <Text style={styles.statusText}>
              {currentPlayer === 'R' ? 'YOUR TURN' : 'AI THINKING...'}
            </Text>
          </View>
        ) : (
          <PremiumButton variant="primary" height={56} onPress={resetGame} style={styles.playAgainBtn}>
            <Text style={styles.playAgainText}>PLAY AGAIN</Text>
          </PremiumButton>
        )}
      </View>

      {(winner || isDraw) && (
        <GameOverOverlay
          result={winner === 'R' ? 'win' : winner === 'Y' ? 'lose' : 'draw'}
          title={winner === 'R' ? 'VICTORY!' : winner === 'Y' ? 'DEFEAT' : "STALEMATE"}
          onPlayAgain={resetGame}
          onNewGame={handleNewGame}
          onRestart={handleRestart}
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
    alignItems: 'center',
    marginVertical: spacing.xl,
    position: 'relative',
  },
  gameBoard: {
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: colors.border,
  },
  board: {
    backgroundColor: colors.card,
    padding: BOARD_PADDING,
    position: 'relative',
  },
  row: {
    flexDirection: 'row',
  },
  cellHole: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: CELL_SIZE / 2,
    backgroundColor: colors.surface,
    margin: CELL_GAP / 2,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    margin: CELL_GAP / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  piece: {
    width: CELL_SIZE - 4,
    height: CELL_SIZE - 4,
    borderRadius: (CELL_SIZE - 4) / 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  pieceGradient: {
    flex: 1,
  },
  redPiece: {
    backgroundColor: '#ff7675',
  },
  yellowPiece: {
    backgroundColor: '#ffeaa7',
  },
  animatedPiece: {
    position: 'absolute',
    top: 0,
    width: CELL_SIZE,
    height: CELL_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  touchableColumns: {
    flexDirection: 'row',
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
  },
  columnTouch: {
    height: '100%',
  },
  footer: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    width: '100%',
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
  statusText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  playAgainBtn: {
    width: '100%',
  },
  playAgainText: {
    color: colors.textOnPrimary,
    fontWeight: '900',
    fontSize: 16,
  },
});
