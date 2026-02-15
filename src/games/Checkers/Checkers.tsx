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
  getAllValidMoves, 
  isGameOver, 
  getWinner, 
  getOpponent,
  getValidMovesForPiece 
} from './logic';
import { getBestMove, getAIDifficulty } from './ai';
import { GameState, Move, Position } from './types';

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
        title="Checkers"
        score={gameState.blackPieces}
        scoreLabel="You"
        highScore={gameState.redPieces}
        highScoreLabel="AI"
      />

      <View style={styles.infoRow}>
        <Text style={styles.turnText}>
          {gameState.gameOver 
            ? 'Game Over!' 
            : isAIThinking 
            ? 'AI Thinking...' 
            : gameState.currentPlayer === 'black' 
            ? 'Your Turn' 
            : "AI's Turn"}
        </Text>
        {gameState.mustCapture && !gameState.gameOver && (
          <Text style={styles.captureText}>⚠️ Must Capture!</Text>
        )}
      </View>

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
                  activeOpacity={0.7}
                  disabled={gameState.gameOver || gameState.currentPlayer === 'red' || isAIThinking}
                >
                  {cell && (
                    <View style={[
                      styles.piece,
                      cell.color === 'black' ? styles.blackPiece : styles.redPiece,
                    ]}>
                      {cell.type === 'king' && (
                        <Text style={styles.kingText}>👑</Text>
                      )}
                    </View>
                  )}
                  {isValidTarget && (
                    <View style={styles.validIndicator} />
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

      {gameState.gameOver && (
        <View style={styles.overlay}>
          <Text style={styles.gameOverText}>Game Over!</Text>
          <Text style={styles.resultText}>
            {gameState.winner === 'black' 
              ? 'You Win!' 
              : gameState.winner === 'red' 
              ? 'AI Wins!' 
              : "It's a Draw!"}
          </Text>
          <Text style={styles.scoreText}>
            You: {gameState.blackPieces} vs AI: {gameState.redPieces}
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
    captureText: {
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
    piece: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 2,
      justifyContent: 'center',
      alignItems: 'center',
    },
    blackPiece: {
      backgroundColor: '#000',
      borderColor: '#333',
    },
    redPiece: {
      backgroundColor: '#dc143c',
      borderColor: '#8b0000',
    },
    kingText: {
      fontSize: 16,
    },
    validIndicator: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: 'rgba(0, 255, 0, 0.6)',
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
      marginBottom: 16,
    },
    scoreText: {
      color: colors.text,
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
