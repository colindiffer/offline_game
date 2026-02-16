import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Animated, Dimensions } from 'react-native';
import Header from '../../components/Header';
import GameOverOverlay from '../../components/GameOverOverlay';
import GameBoardContainer from '../../components/GameBoardContainer';
import PremiumButton from '../../components/PremiumButton';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { useSound } from '../../contexts/SoundContext';
import { spacing, radius, shadows, typography } from '../../utils/designTokens';
import { Difficulty } from '../../types';
import { ThemeColors } from '../../utils/themes';
import { initializeGame, makeMove, getValidMoves, isGameOver, getWinner, countPieces, getOpponent } from './logic';
import { getBestMove, getAIDifficulty } from './ai';
import { GameState, Move, Position } from './types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CELL_SIZE = Math.floor((SCREEN_WIDTH - 44) / 8);

interface Props {
  difficulty: Difficulty;
}

export default function Reversi({ difficulty }: Props) {
  const { colors } = useTheme();
  const { playSound } = useSound();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [gameState, setGameState] = useState<GameState>(() => initializeGame());
  const [selectedCell, setSelectedCell] = useState<Position | null>(null);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [flipAnimations] = useState(() =>
    Array(8).fill(null).map(() =>
      Array(8).fill(null).map(() => new Animated.Value(1))
    )
  );

  useEffect(() => {
    // Reset game when difficulty changes
    resetGame();
  }, [difficulty]);

  useEffect(() => {
    // AI turn
    if (gameState.currentPlayer === 'white' && !gameState.gameOver && !isAIThinking) {
      setIsAIThinking(true);

      // Delay for better UX
      setTimeout(() => {
        const depth = getAIDifficulty(difficulty);
        const aiMove = getBestMove(gameState.board, 'white', depth);

        if (aiMove) {
          handleMove(aiMove);
        } else {
          // AI has no valid moves, pass turn
          passTurn();
        }

        setIsAIThinking(false);
      }, 500);
    }
  }, [gameState.currentPlayer, gameState.gameOver, isAIThinking, difficulty]);

  const animateFlip = (row: number, col: number) => {
    const anim = flipAnimations[row][col];
    Animated.sequence([
      Animated.timing(anim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(anim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleMove = useCallback((move: Move) => {
    const newBoard = makeMove(gameState.board, move, gameState.currentPlayer);

    // Animate flips
    move.flips.forEach(flip => {
      animateFlip(flip.row, flip.col);
    });
    animateFlip(move.row, move.col);

    playSound('drop');

    const nextPlayer = getOpponent(gameState.currentPlayer);
    const validMoves = getValidMoves(newBoard, nextPlayer);
    const { black, white } = countPieces(newBoard);

    // Check if game is over
    if (isGameOver(newBoard, nextPlayer)) {
      const winner = getWinner(newBoard);
      setGameState({
        board: newBoard,
        currentPlayer: nextPlayer,
        blackScore: black,
        whiteScore: white,
        validMoves: [],
        gameOver: true,
        winner,
        lastMove: { row: move.row, col: move.col },
      });

      if (winner === 'black') {
        playSound('win');
      }
    } else if (validMoves.length === 0) {
      // Next player has no moves, pass turn back
      playSound('tap');
      const backPlayer = getOpponent(nextPlayer);
      const backMoves = getValidMoves(newBoard, backPlayer);

      setGameState({
        board: newBoard,
        currentPlayer: backPlayer,
        blackScore: black,
        whiteScore: white,
        validMoves: backMoves,
        gameOver: false,
        winner: null,
        lastMove: { row: move.row, col: move.col },
      });
    } else {
      setGameState({
        board: newBoard,
        currentPlayer: nextPlayer,
        blackScore: black,
        whiteScore: white,
        validMoves,
        gameOver: false,
        winner: null,
        lastMove: { row: move.row, col: move.col },
      });
    }

    setSelectedCell(null);
  }, [gameState, playSound]);

  const passTurn = useCallback(() => {
    const nextPlayer = getOpponent(gameState.currentPlayer);
    const validMoves = getValidMoves(gameState.board, nextPlayer);

    setGameState({
      ...gameState,
      currentPlayer: nextPlayer,
      validMoves,
    });
  }, [gameState]);

  const handleCellPress = useCallback((row: number, col: number) => {
    if (gameState.gameOver || gameState.currentPlayer === 'white' || isAIThinking) {
      return;
    }

    const move = gameState.validMoves.find(m => m.row === row && m.col === col);

    if (move) {
      handleMove(move);
    } else {
      playSound('tap');
      setSelectedCell({ row, col });
    }
  }, [gameState, isAIThinking, handleMove, playSound]);

  const resetGame = useCallback(() => {
    setGameState(initializeGame());
    setSelectedCell(null);
    setIsAIThinking(false);
  }, []);

  const isValidMove = (row: number, col: number): boolean => {
    return gameState.validMoves.some(m => m.row === row && m.col === col);
  };

  const getFlipCount = (row: number, col: number): number => {
    const move = gameState.validMoves.find(m => m.row === row && m.col === col);
    return move ? move.flips.length : 0;
  };

  return (
    <View style={styles.container}>
      <Header
        score={gameState.blackScore}
        scoreLabel="YOU"
        highScore={gameState.whiteScore}
        highScoreLabel="AI"
      />

      <View style={styles.boardWrapper}>
        <GameBoardContainer style={styles.boardContainer}>
          <View style={styles.board}>
            {gameState.board.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.row}>
                {row.map((cell, colIndex) => {
                  const valid = isValidMove(rowIndex, colIndex);
                  const isLast = gameState.lastMove?.row === rowIndex && gameState.lastMove?.col === colIndex;

                  return (
                    <TouchableOpacity
                      key={colIndex}
                      style={[
                        styles.cell,
                        isLast && styles.lastMoveCell,
                      ]}
                      onPress={() => handleCellPress(rowIndex, colIndex)}
                      activeOpacity={0.8}
                      disabled={gameState.gameOver || gameState.currentPlayer === 'white' || isAIThinking}
                    >
                      {cell ? (
                        <Animated.View
                          style={[
                            styles.pieceWrapper,
                            {
                              transform: [{ scaleX: flipAnimations[rowIndex][colIndex] }],
                            },
                          ]}
                        >
                          <View style={[styles.piece, cell === 'black' ? styles.blackPiece : styles.whitePiece]}>
                            <LinearGradient
                              colors={cell === 'black' ? ['#2d3436', '#000000'] : ['#ffffff', '#dfe6e9']}
                              style={styles.pieceGradient}
                            />
                            <View style={styles.pieceShine} />
                          </View>
                        </Animated.View>
                      ) : (
                        valid && (
                          <View style={styles.validIndicator}>
                            <View style={styles.validDot} />
                          </View>
                        )
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </GameBoardContainer>
      </View>

      <View style={styles.footer}>
        <View style={styles.turnIndicator}>
          {!gameState.gameOver ? (
            <>
              <View style={[styles.turnDot, { backgroundColor: gameState.currentPlayer === 'black' ? '#000' : '#fff' }]} />
              <Text style={styles.turnText}>
                {isAIThinking ? 'AI IS THINKING...' : gameState.currentPlayer === 'black' ? 'YOUR TURN' : "AI'S TURN"}
              </Text>
            </>
          ) : (
            <Text style={styles.turnText}>MISSION COMPLETE</Text>
          )}
        </View>

        <PremiumButton variant="secondary" height={56} onPress={resetGame} style={styles.newGameBtn}>
          <Text style={styles.newGameText}>RESET BOARD</Text>
        </PremiumButton>
      </View>

      {gameState.gameOver && (
        <GameOverOverlay
          result={gameState.winner === 'black' ? 'win' : gameState.winner === 'white' ? 'lose' : 'draw'}
          title={gameState.winner === 'black' ? 'VICTORY!' : 'DEFEAT'}
          subtitle={gameState.winner === 'black' ? 'You outmaneuvered the AI.' : 'Better luck next time.'}
          onPlayAgain={resetGame}
        />
      )}
    </View>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: spacing.md,
      backgroundColor: colors.background,
    },
    boardWrapper: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    boardContainer: {
      padding: 4,
      backgroundColor: '#3d3d5c',
      borderRadius: radius.sm,
      borderWidth: 4,
      borderColor: '#2b2b45',
    },
    board: {
      backgroundColor: '#2e7d32',
      borderRadius: 2,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
    },
    cell: {
      width: CELL_SIZE,
      height: CELL_SIZE,
      borderWidth: 0.5,
      borderColor: '#1b5e20',
      justifyContent: 'center',
      alignItems: 'center',
    },
    lastMoveCell: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    pieceWrapper: {
      width: '85%',
      height: '85%',
    },
    piece: {
      flex: 1,
      borderRadius: 100,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
      ...shadows.sm,
    },
    pieceGradient: {
      flex: 1,
    },
    pieceShine: {
      position: 'absolute',
      top: '10%',
      left: '15%',
      width: '30%',
      height: '30%',
      borderRadius: 100,
      backgroundColor: 'rgba(255,255,255,0.2)',
    },
    blackPiece: {
      backgroundColor: '#2d3436',
    },
    whitePiece: {
      backgroundColor: '#ffffff',
    },
    validIndicator: {
      width: '60%',
      height: '60%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    validDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
    footer: {
      width: '100%',
      paddingHorizontal: spacing.md,
      gap: spacing.md,
    },
    turnIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    turnDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginRight: 10,
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.1)',
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
      color: colors.text,
      fontWeight: '900',
      fontSize: 16,
      letterSpacing: 1,
    },
  });
