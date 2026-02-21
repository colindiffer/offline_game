import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Dimensions } from 'react-native';
import Header from '../../components/Header';
import GameOverOverlay from '../../components/GameOverOverlay';
import GameBoardContainer from '../../components/GameBoardContainer';
import PremiumButton from '../../components/PremiumButton';
import { useTheme } from '../../contexts/ThemeContext';
import { useSound } from '../../contexts/SoundContext';
import { getHighScore, setHighScore } from '../../utils/storage';
import { Difficulty } from '../../types';
import { ThemeColors } from '../../utils/themes';
import { spacing, radius, shadows, typography } from '../../utils/designTokens';
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

const SCREEN_WIDTH = Dimensions.get('window').width;
const CELL_SIZE = Math.floor((SCREEN_WIDTH - 44) / 8);

interface Props {
  difficulty: Difficulty;
}

export default function Chess({ difficulty }: Props) {
  const { colors } = useTheme();
  const { playSound } = useSound();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [gameState, setGameState] = useState<GameState>(() => initializeGame());
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [highScore, setHighScoreState] = useState(0);

  useEffect(() => {
    getHighScore('chess', difficulty).then(setHighScoreState);
  }, [difficulty]);

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
      const newScore = highScore + 1;
      setHighScoreState(newScore);
      setHighScore('chess', newScore, difficulty);
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

  const handleNewGame = useCallback(() => {
    resetGame();
  }, [resetGame]);

  const handleRestart = useCallback(() => {
    resetGame();
  }, [resetGame]);

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
      <Text style={styles.bgIcon}>♟️</Text>
      <Header
        title="Chess"
        score={16 - gameState.capturedWhite.length}
        scoreLabel="PIECES"
        highScore={16 - gameState.capturedBlack.length}
        highScoreLabel="AI PIECES"
      />

      <View style={styles.infoRow}>
        <View style={styles.turnIndicator}>
          {!gameState.isCheckmate && !gameState.isStalemate ? (
            <>
              <View style={[styles.turnDot, { backgroundColor: gameState.currentPlayer === 'white' ? colors.text : '#000' }]} />
              <Text style={styles.turnText}>
                {isAIThinking ? 'AI IS THINKING...' : gameState.currentPlayer === 'white' ? 'YOUR TURN' : "AI'S TURN"}
              </Text>
            </>
          ) : (
            <Text style={styles.turnText}>STRATEGY COMPLETE</Text>
          )}
        </View>
        {gameState.isCheck && !gameState.isCheckmate && (
          <View style={styles.checkAlert}>
            <Text style={styles.checkText}>CHECK!</Text>
          </View>
        )}
      </View>

      {/* Captured Pieces Bar */}
      <View style={styles.capturedBar}>
        <View style={styles.capturedSet}>
          {gameState.capturedBlack.map((p, i) => (
            <Text key={`cb-${i}`} style={styles.capturedPieceSmall}>{getPieceSymbol(p)}</Text>
          ))}
        </View>
        <View style={styles.capturedSet}>
          {gameState.capturedWhite.map((p, i) => (
            <Text key={`cw-${i}`} style={styles.capturedPieceSmall}>{getPieceSymbol(p)}</Text>
          ))}
        </View>
      </View>

      <View style={styles.boardWrapper}>
        <GameBoardContainer style={styles.boardContainer}>
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
                        isLastMoveSquare && styles.lastMoveCell,
                      ]}
                      onPress={() => handleCellPress(rowIndex, colIndex)}
                      activeOpacity={0.8}
                      disabled={gameState.isCheckmate || gameState.isStalemate || gameState.currentPlayer === 'black' || isAIThinking}
                    >
                      {cell && (
                        <Text style={[styles.pieceText, cell.color === 'black' ? styles.blackPiece : styles.whitePiece]}>
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
        </GameBoardContainer>
      </View>

      <View style={styles.footer}>
        <PremiumButton variant="secondary" height={56} onPress={handleRestart} style={styles.flexBtn}>
          <Text style={styles.newGameText}>RESTART</Text>
        </PremiumButton>
        <PremiumButton variant="secondary" height={56} onPress={handleNewGame} style={styles.flexBtn}>
          <Text style={styles.newGameText}>NEW GAME</Text>
        </PremiumButton>
      </View>

      {(gameState.isCheckmate || gameState.isStalemate) && (
        <GameOverOverlay
          result={gameState.isCheckmate && gameState.currentPlayer === 'black' ? 'win' : gameState.isCheckmate ? 'lose' : 'draw'}
          title={gameState.isCheckmate ? 'CHECKMATE!' : 'STALEMATE'}
          subtitle={gameState.isCheckmate ? (gameState.currentPlayer === 'black' ? 'A masterful victory.' : 'The AI outplayed you.') : 'A deadlock was reached.'}
          onPlayAgain={resetGame}
          onNewGame={handleNewGame}
          onRestart={handleRestart}
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
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.1)',
    },
    turnText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '900',
      letterSpacing: 1,
    },
    checkAlert: {
      backgroundColor: 'rgba(231, 76, 60, 0.1)',
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: 'rgba(231, 76, 60, 0.3)',
    },
    checkText: {
      color: '#e74c3c',
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1,
    },
    capturedBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.md,
      height: 40,
      backgroundColor: colors.card,
      borderRadius: radius.md,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    capturedSet: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      maxWidth: '45%',
    },
    capturedPieceSmall: {
      fontSize: 20,
      color: colors.textSecondary,
      opacity: 0.8,
      marginRight: 4,
    },
    boardWrapper: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    boardContainer: {
      padding: 4,
      backgroundColor: colors.border, 
      borderRadius: radius.sm,
      borderWidth: 4,
      borderColor: colors.card,
    },
    board: {
      borderWidth: 1,
      borderColor: colors.card,
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
      backgroundColor: '#d7ccc8', // Light wood - keep for aesthetic
    },
    darkCell: {
      backgroundColor: '#8d6e63', // Dark wood - keep for aesthetic
    },
    selectedCell: {
      backgroundColor: colors.primary + '60',
    },
    lastMoveCell: {
      backgroundColor: 'rgba(255, 214, 0, 0.35)',
    },
    pieceText: {
      fontSize: CELL_SIZE * 0.7,
      ...shadows.sm,
    },
    whitePiece: {
      color: '#ffffff',
      textShadowColor: 'rgba(0,0,0,0.85)',
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 4,
    },
    blackPiece: {
      color: '#2d3436',
      textShadowColor: 'rgba(255,255,255,0.2)',
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 1,
    },
    validIndicator: {
      position: 'absolute',
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: 'rgba(46, 204, 113, 0.4)',
    },
    captureIndicator: {
      width: CELL_SIZE - 4,
      height: CELL_SIZE - 4,
      borderRadius: (CELL_SIZE - 4) / 2,
      borderWidth: 2,
      borderColor: 'rgba(46, 204, 113, 0.4)',
      backgroundColor: 'transparent',
    },
    footer: {
      width: '100%',
      paddingHorizontal: spacing.md,
      flexDirection: 'row',
      gap: spacing.md,
    },
    flexBtn: { flex: 1 },
    newGameText: {
      color: colors.text,
      fontWeight: '900',
      fontSize: 16,
      letterSpacing: 1,
    },
    bgIcon: {
      position: 'absolute',
      bottom: '10%',
      left: '-10%',
      fontSize: 250,
      opacity: 0.05,
      transform: [{ rotate: '-15deg' }],
      color: colors.primary,
    },
  });
