import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Header from '../../components/Header';
import { useTheme } from '../../contexts/ThemeContext';
import { useSound } from '../../contexts/SoundContext';
import { Difficulty } from '../../types';
import { ThemeColors } from '../../utils/themes';
import {
  initializeGame,
  makeMove,
  getAllLegalMoves,
  getLegalMoves,
  getOpponent,
  isKingInCheck,
  getPieceSymbol,
} from './logic';
import { getBestMove, getAIDifficulty } from './ai';
import { GameState, Move, Position } from './types';

interface Props {
  difficulty: Difficulty;
}

export default function Chess({ difficulty }: Props) {
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
    if (gameState.currentPlayer === 'black' && !gameState.isCheckmate && !gameState.isStalemate && !isAIThinking) {
      setIsAIThinking(true);

      setTimeout(() => {
        const depth = getAIDifficulty(difficulty);
        const aiMove = getBestMove(gameState.board, 'black', depth, gameState.enPassantTarget);

        if (aiMove) {
          handleMove(aiMove);
        }

        setIsAIThinking(false);
      }, 700);
    }
  }, [gameState.currentPlayer, gameState.isCheckmate, gameState.isStalemate, isAIThinking, difficulty]);

  const handleMove = useCallback((move: Move) => {
    const newBoard = makeMove(gameState.board, move);

    if (move.capturedPiece) {
      playSound('drop');
    } else {
      playSound('tap');
    }

    const nextPlayer = getOpponent(gameState.currentPlayer);

    // Calculate en passant target
    let enPassantTarget = null;
    const piece = gameState.board[move.from.row][move.from.col];
    if (piece?.type === 'pawn' && Math.abs(move.to.row - move.from.row) === 2) {
      enPassantTarget = {
        row: (move.from.row + move.to.row) / 2,
        col: move.to.col,
      };
    }

    const validMoves = getAllLegalMoves(newBoard, nextPlayer, enPassantTarget);
    const isCheck = isKingInCheck(newBoard, nextPlayer);
    const isCheckmate = isCheck && validMoves.length === 0;
    const isStalemate = !isCheck && validMoves.length === 0;

    // Track captured pieces
    let capturedWhite = [...gameState.capturedWhite];
    let capturedBlack = [...gameState.capturedBlack];

    if (move.capturedPiece) {
      if (move.capturedPiece.color === 'white') {
        capturedWhite.push(move.capturedPiece);
      } else {
        capturedBlack.push(move.capturedPiece);
      }
    }

    setGameState({
      board: newBoard,
      currentPlayer: nextPlayer,
      selectedPiece: null,
      validMoves,
      isCheck,
      isCheckmate,
      isStalemate,
      capturedWhite,
      capturedBlack,
      lastMove: move,
      enPassantTarget,
    });

    if (isCheckmate && nextPlayer === 'black') {
      playSound('win');
    }
  }, [gameState, playSound]);

  const handleCellPress = useCallback((row: number, col: number) => {
    if (gameState.isCheckmate || gameState.isStalemate || gameState.currentPlayer === 'black' || isAIThinking) {
      return;
    }

    const piece = gameState.board[row][col];

    // If clicking on own piece, select it
    if (piece && piece.color === 'white') {
      const moves = getLegalMoves(gameState.board, { row, col }, gameState.enPassantTarget);
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
        title="Chess"
        score={12 - gameState.capturedWhite.length}
        scoreLabel="Your Pieces"
        highScore={12 - gameState.capturedBlack.length}
        highScoreLabel="AI Pieces"
      />

      <View style={styles.infoRow}>
        <Text style={styles.turnText}>
          {gameState.isCheckmate
            ? gameState.currentPlayer === 'black'
              ? 'You Win!'
              : 'AI Wins!'
            : gameState.isStalemate
            ? 'Stalemate!'
            : isAIThinking
            ? 'AI Thinking...'
            : gameState.currentPlayer === 'white'
            ? 'Your Turn'
            : "AI's Turn"}
        </Text>
        {gameState.isCheck && !gameState.isCheckmate && (
          <Text style={styles.checkText}>⚠️ Check!</Text>
        )}
      </View>

      <View style={styles.board}>
        {gameState.board.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((cell, colIndex) => {
              const isLight = (rowIndex + colIndex) % 2 === 0;
              const isSelected =
                gameState.selectedPiece?.row === rowIndex &&
                gameState.selectedPiece?.col === colIndex;
              const isValidTarget = isValidMoveTarget(rowIndex, colIndex);
              const isLastMoveSquare =
                gameState.lastMove &&
                ((gameState.lastMove.from.row === rowIndex && gameState.lastMove.from.col === colIndex) ||
                 (gameState.lastMove.to.row === rowIndex && gameState.lastMove.to.col === colIndex));

              return (
                <TouchableOpacity
                  key={colIndex}
                  style={[
                    styles.cell,
                    isLight ? styles.lightCell : styles.darkCell,
                    isSelected && styles.selectedCell,
                    isValidTarget && styles.validTargetCell,
                    isLastMoveSquare && styles.lastMoveCell,
                  ]}
                  onPress={() => handleCellPress(rowIndex, colIndex)}
                  activeOpacity={0.7}
                  disabled={gameState.isCheckmate || gameState.isStalemate || gameState.currentPlayer === 'black' || isAIThinking}
                >
                  {cell && (
                    <Text style={styles.pieceText}>
                      {getPieceSymbol(cell)}
                    </Text>
                  )}
                  {isValidTarget && (
                    <View style={[styles.validIndicator, cell && styles.captureIndicator]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.newGameBtn} onPress={resetGame} activeOpacity={0.7}>
        <Text style={styles.newGameText}>New Game</Text>
      </TouchableOpacity>

      {(gameState.isCheckmate || gameState.isStalemate) && (
        <View style={styles.overlay}>
          <Text style={styles.gameOverText}>Game Over!</Text>
          <Text style={styles.resultText}>
            {gameState.isCheckmate
              ? gameState.currentPlayer === 'black'
                ? 'You Win!'
                : 'AI Wins!'
              : 'Stalemate!'}
          </Text>
          <TouchableOpacity style={styles.playAgain} onPress={resetGame} activeOpacity={0.7}>
            <Text style={styles.playAgainText}>Play Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 10,
      alignItems: 'center',
    },
    infoRow: {
      marginVertical: 10,
      alignItems: 'center',
    },
    turnText: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '600',
      textAlign: 'center',
    },
    checkText: {
      color: colors.warning,
      fontSize: 14,
      fontWeight: 'bold',
      marginTop: 4,
    },
    board: {
      borderWidth: 2,
      borderColor: colors.textSecondary,
      borderRadius: 8,
    },
    row: {
      flexDirection: 'row',
    },
    cell: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    lightCell: {
      backgroundColor: '#f0d9b5',
    },
    darkCell: {
      backgroundColor: '#b58863',
    },
    selectedCell: {
      backgroundColor: '#baca44',
    },
    validTargetCell: {
      backgroundColor: 'rgba(186, 202, 68, 0.6)',
    },
    lastMoveCell: {
      backgroundColor: 'rgba(255, 255, 0, 0.3)',
    },
    pieceText: {
      fontSize: 28,
    },
    validIndicator: {
      position: 'absolute',
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    captureIndicator: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 3,
      borderColor: 'rgba(0, 0, 0, 0.3)',
      backgroundColor: 'transparent',
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
      backgroundColor: 'rgba(0,0,0,0.8)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    gameOverText: {
      color: colors.text,
      fontSize: 32,
      fontWeight: 'bold',
      marginBottom: 16,
    },
    resultText: {
      color: colors.warning,
      fontSize: 24,
      fontWeight: 'bold',
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
