import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Header from '../../components/Header';
import GameOverOverlay from '../../components/GameOverOverlay';
import GameBoardContainer from '../../components/GameBoardContainer';
import PremiumButton from '../../components/PremiumButton';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { useSound } from '../../contexts/SoundContext';
import { Difficulty } from '../../types';
import { ThemeColors } from '../../utils/themes';
import { spacing, radius, shadows, typography } from '../../utils/designTokens';
import {
  initializeGame,
  makeMove,
  getAllValidMoves,
  isGameOver,
  getWinner,
  getOpponent,
  getValidMovesForPiece
} from './logic';
import { getBestMove, getAIDifficulty } from './ai';
import { GameState, Move, Position } from './types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CELL_SIZE = Math.floor((SCREEN_WIDTH - 44) / 8);

interface Props {
  difficulty: Difficulty;
}

export default function Checkers({ difficulty }: Props) {
  const { colors } = useTheme();
  const { playSound } = useSound();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [gameState, setGameState] = useState<GameState>(() => initializeGame());
  const [isAIThinking, setIsAIThinking] = useState(false);

  useEffect(() => {
    // Reset game when difficulty changes
    resetGame();
  }, [difficulty]);

  useEffect(() => {
    // AI turn
    if (gameState.currentPlayer === 'red' && !gameState.gameOver && !isAIThinking) {
      setIsAIThinking(true);

      setTimeout(() => {
        const depth = getAIDifficulty(difficulty);
        const aiMove = getBestMove(gameState.board, 'red', depth);

        if (aiMove) {
          handleMove(aiMove);
        }

        setIsAIThinking(false);
      }, 500);
    }
  }, [gameState.currentPlayer, gameState.gameOver, isAIThinking, difficulty]);

  const handleMove = useCallback((move: Move) => {
    const newBoard = makeMove(gameState.board, move);

    if (move.captures.length > 0) {
      playSound('drop');
    } else {
      playSound('tap');
    }

    const nextPlayer = getOpponent(gameState.currentPlayer);
    const validMoves = getAllValidMoves(newBoard, nextPlayer);
    const mustCapture = validMoves.some(m => m.captures.length > 0);

    // Check if game is over
    if (isGameOver(newBoard, nextPlayer)) {
      const winner = getWinner(newBoard, nextPlayer);
      let blackCount = 0;
      let redCount = 0;

      // Count pieces
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const piece = newBoard[row][col];
          if (piece?.color === 'black') blackCount++;
          if (piece?.color === 'red') redCount++;
        }
      }

      setGameState({
        board: newBoard,
        currentPlayer: nextPlayer,
        selectedPiece: null,
        validMoves: [],
        blackPieces: blackCount,
        redPieces: redCount,
        gameOver: true,
        winner,
        mustCapture: false,
      });

      if (winner === 'black') {
        playSound('win');
      }
    } else {
      let blackPieces = 0;
      let redPieces = 0;
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const piece = newBoard[row][col];
          if (piece?.color === 'black') blackPieces++;
          if (piece?.color === 'red') redPieces++;
        }
      }

      setGameState({
        board: newBoard,
        currentPlayer: nextPlayer,
        selectedPiece: null,
        validMoves,
        blackPieces,
        redPieces,
        gameOver: false,
        winner: null,
        mustCapture,
      });
    }
  }, [gameState, playSound]);

  const handleCellPress = useCallback((row: number, col: number) => {
    if (gameState.gameOver || gameState.currentPlayer === 'red' || isAIThinking) {
      return;
    }

    const piece = gameState.board[row][col];

    // If clicking on own piece, select it
    if (piece && piece.color === 'black') {
      const moves = getValidMovesForPiece(gameState.board, { row, col });
      if (moves.length > 0) {
        setGameState({
          ...gameState,
          selectedPiece: { row, col },
        });
        playSound('tap');
      }
      return;
    }

    // If a piece is selected, try to move it
    if (gameState.selectedPiece) {
      const move = gameState.validMoves.find(m =>
        m.from.row === gameState.selectedPiece!.row &&
        m.from.col === gameState.selectedPiece!.col &&
        m.to.row === row &&
        m.to.col === col
      );

      if (move) {
        handleMove(move);
      } else {
        setGameState({
          ...gameState,
          selectedPiece: null,
        });
        playSound('tap');
      }
    }
  }, [gameState, isAIThinking, handleMove, playSound]);

  const resetGame = useCallback(() => {
    setGameState(initializeGame());
    setIsAIThinking(false);
  }, []);

  const isValidMoveTarget = (row: number, col: number): boolean => {
    if (!gameState.selectedPiece) return false;
    return gameState.validMoves.some(m =>
      m.from.row === gameState.selectedPiece!.row &&
      m.from.col === gameState.selectedPiece!.col &&
      m.to.row === row &&
      m.to.col === col
    );
  };

  return (
    <View style={styles.container}>
      <Header
        score={gameState.blackPieces}
        scoreLabel="YOU"
        highScore={gameState.redPieces}
        highScoreLabel="AI"
      />

      <View style={styles.infoRow}>
        <View style={styles.turnIndicator}>
          {!gameState.gameOver ? (
            <>
              <View style={[styles.turnDot, { backgroundColor: gameState.currentPlayer === 'black' ? '#2d3436' : '#d63031' }]} />
              <Text style={styles.turnText}>
                {isAIThinking ? 'AI IS THINKING...' : gameState.currentPlayer === 'black' ? 'YOUR TURN' : "AI'S TURN"}
              </Text>
            </>
          ) : (
            <Text style={styles.turnText}>GAME COMPLETE</Text>
          )}
        </View>
        {gameState.mustCapture && !gameState.gameOver && (
          <View style={styles.captureAlert}>
            <Text style={styles.captureText}>MUST CAPTURE!</Text>
          </View>
        )}
      </View>

      <View style={styles.boardWrapper}>
        <GameBoardContainer style={styles.boardContainer}>
          <View style={styles.board}>
            {gameState.board.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.row}>
                {row.map((cell, colIndex) => {
                  const isDark = (rowIndex + colIndex) % 2 === 1;
                  const isSelected =
                    gameState.selectedPiece?.row === rowIndex &&
                    gameState.selectedPiece?.col === colIndex;
                  const isValidTarget = isValidMoveTarget(rowIndex, colIndex);

                  return (
                    <TouchableOpacity
                      key={colIndex}
                      style={[
                        styles.cell,
                        isDark ? styles.darkCell : styles.lightCell,
                        isSelected && styles.selectedCell,
                        isValidTarget && styles.validTargetCell,
                      ]}
                      onPress={() => handleCellPress(rowIndex, colIndex)}
                      activeOpacity={0.8}
                      disabled={gameState.gameOver || gameState.currentPlayer === 'red' || isAIThinking}
                    >
                      {cell && (
                        <View style={[
                          styles.piece,
                          cell.color === 'black' ? styles.blackPiece : styles.redPiece,
                        ]}>
                          <LinearGradient
                            colors={cell.color === 'black' ? ['#2d3436', '#000000'] : ['#ff7675', '#d63031']}
                            style={styles.pieceGradient}
                          />
                          <View style={styles.pieceRings} />
                          {cell.type === 'king' && (
                            <Text style={styles.kingIcon}>👑</Text>
                          )}
                        </View>
                      )}
                      {isValidTarget && !cell && (
                        <View style={styles.validIndicator} />
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
        <PremiumButton variant="secondary" height={56} onPress={resetGame} style={styles.newGameBtn}>
          <Text style={styles.newGameText}>RESET BOARD</Text>
        </PremiumButton>
      </View>

      {gameState.gameOver && (
        <GameOverOverlay
          result={gameState.winner === 'black' ? 'win' : gameState.winner === 'red' ? 'lose' : 'draw'}
          title={gameState.winner === 'black' ? 'VICTORY!' : 'DEFEAT'}
          subtitle={gameState.winner === 'black' ? 'You cleared the board.' : 'The AI was too strong.'}
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
    infoRow: {
      marginVertical: spacing.md,
      alignItems: 'center',
      gap: spacing.xs,
    },
    turnIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      paddingHorizontal: 20,
      backgroundColor: colors.surface,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: colors.border,
    },
    turnDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 10,
    },
    turnText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '900',
      letterSpacing: 1,
    },
    captureAlert: {
      backgroundColor: 'rgba(231, 76, 60, 0.1)',
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: 'rgba(231, 76, 60, 0.3)',
    },
    captureText: {
      color: '#e74c3c',
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1,
    },
    boardWrapper: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    boardContainer: {
      padding: 4,
      backgroundColor: '#5d4037', // Dark wood frame
      borderRadius: radius.sm,
      borderWidth: 4,
      borderColor: '#3e2723',
    },
    board: {
      borderWidth: 1,
      borderColor: '#3e2723',
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
    lightCell: {
      backgroundColor: '#d7ccc8', // Light wood
    },
    darkCell: {
      backgroundColor: '#8d6e63', // Dark wood
    },
    selectedCell: {
      backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
    validTargetCell: {
      backgroundColor: 'rgba(46, 204, 113, 0.2)',
    },
    piece: {
      width: '85%',
      height: '85%',
      borderRadius: 100,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
      ...shadows.sm,
    },
    pieceGradient: {
      ...StyleSheet.absoluteFillObject,
    },
    pieceRings: {
      position: 'absolute',
      width: '70%',
      height: '70%',
      borderRadius: 100,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
    },
    blackPiece: {
      backgroundColor: '#2d3436',
    },
    redPiece: {
      backgroundColor: '#d63031',
    },
    kingIcon: {
      fontSize: CELL_SIZE * 0.4,
    },
    validIndicator: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: 'rgba(46, 204, 113, 0.4)',
    },
    footer: {
      width: '100%',
      paddingHorizontal: spacing.md,
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
