import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Animated } from 'react-native';
import Header from '../../components/Header';
import { useTheme } from '../../contexts/ThemeContext';
import { useSound } from '../../contexts/SoundContext';
import { Difficulty } from '../../types';
import { ThemeColors } from '../../utils/themes';
import { initializeGame, makeMove, getValidMoves, isGameOver, getWinner, countPieces, getOpponent } from './logic';
import { getBestMove, getAIDifficulty } from './ai';
import { GameState, Move, Position } from './types';

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
        title="Reversi"
        score={gameState.blackScore}
        scoreLabel="You"
        highScore={gameState.whiteScore}
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
      </View>

      <View style={styles.board}>
        {gameState.board.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((cell, colIndex) => {
              const valid = isValidMove(rowIndex, colIndex);
              const flipCount = getFlipCount(rowIndex, colIndex);
              const isLast = gameState.lastMove?.row === rowIndex && gameState.lastMove?.col === colIndex;
              
              return (
                <TouchableOpacity
                  key={colIndex}
                  style={[
                    styles.cell,
                    isLast && styles.lastMoveCell,
                    valid && styles.validCell,
                  ]}
                  onPress={() => handleCellPress(rowIndex, colIndex)}
                  activeOpacity={0.7}
                  disabled={gameState.gameOver || gameState.currentPlayer === 'white' || isAIThinking}
                >
                  {cell && (
                    <Animated.View
                      style={[
                        styles.piece,
                        cell === 'black' ? styles.blackPiece : styles.whitePiece,
                        {
                          transform: [{ scaleX: flipAnimations[rowIndex][colIndex] }],
                        },
                      ]}
                    />
                  )}
                  {valid && !cell && (
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
          <Text style={styles.scoreText}>
            You: {gameState.blackScore} vs AI: {gameState.whiteScore}
          </Text>
          <Text style={styles.resultText}>
            {gameState.winner === 'black' 
              ? 'You Win!' 
              : gameState.winner === 'white' 
              ? 'AI Wins!' 
              : "It's a Draw!"}
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
    },
    turnText: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '600',
      textAlign: 'center',
    },
    board: {
      backgroundColor: '#2e7d32',
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
      borderWidth: 1,
      borderColor: '#1b5e20',
      justifyContent: 'center',
      alignItems: 'center',
    },
    lastMoveCell: {
      backgroundColor: 'rgba(255, 255, 0, 0.2)',
    },
    validCell: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    piece: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 2,
    },
    blackPiece: {
      backgroundColor: '#000',
      borderColor: '#333',
    },
    whitePiece: {
      backgroundColor: '#fff',
      borderColor: '#ddd',
    },
    validIndicator: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: 'rgba(255, 255, 255, 0.4)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    flipCountText: {
      color: '#000',
      fontSize: 10,
      fontWeight: 'bold',
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
    scoreText: {
      color: colors.text,
      fontSize: 20,
      marginBottom: 8,
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
