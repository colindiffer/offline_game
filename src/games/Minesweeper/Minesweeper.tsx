import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Header from '../../components/Header';
import TutorialScreen from '../../components/TutorialScreen';
import { useTheme } from '../../contexts/ThemeContext';
import { useSound } from '../../contexts/SoundContext';
import { getHighScore, setHighScore } from '../../utils/storage';
import { recordGameResult } from '../../utils/stats';
import { Difficulty } from '../../types';
import { Board, Cell, createBoard, revealCell, toggleFlag, checkWin, checkLoss, GameConfig } from './logic';
import { ThemeColors } from '../../utils/themes';
import { GAME_TUTORIALS } from '../../utils/tutorials';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SCREEN_WIDTH = Dimensions.get('window').width;

const getCellSize = (cols: number) => {
  const boardPadding = 20;
  const boardSize = Math.min(SCREEN_WIDTH - boardPadding * 2, 400);
  return boardSize / cols;
};

const GAME_CONFIGS: Record<Difficulty, GameConfig> = {
  easy: { rows: 8, cols: 8, mines: 10 },
  medium: { rows: 12, cols: 12, mines: 25 },
  hard: { rows: 16, cols: 16, mines: 50 },
};

interface Props {
  difficulty: Difficulty;
}

export default function Minesweeper({ difficulty }: Props) {
  const { colors } = useTheme();
  const { playSound } = useSound();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const gameConfig = GAME_CONFIGS[difficulty];
  const CELL_SIZE = getCellSize(gameConfig.cols);

  const [board, setBoard] = useState<Board | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [minesRemaining, setMinesRemaining] = useState(gameConfig.mines);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    // Start a new game when difficulty changes or component mounts
    resetGame();
    AsyncStorage.getItem('@tutorial_minesweeper').then((shown) => {
      if (!shown) setShowTutorial(true);
    });
  }, [difficulty]);

  useEffect(() => {
    if (startTime && !gameOver && !gameWon) {
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [startTime, gameOver, gameWon]);

  const handleCellPress = useCallback(
    (row: number, col: number, isLongPress: boolean = false) => {
      if (gameOver || gameWon) return;

      if (!board) {
        const initialBoard = createBoard(difficulty, row, col);
        setBoard(initialBoard);
        setStartTime(Date.now());
        // After setting board, the effect will trigger and we can reveal the cell
        setTimeout(() => {
          if (!isLongPress) {
            // Reveal the first clicked cell after board is created
            setBoard(prevBoard => {
              if (!prevBoard) return prevBoard;
              const newBoard = prevBoard.map((r) => r.map((c) => ({ ...c })));
              revealCell(newBoard, row, col);
              playSound('tap');
              return newBoard;
            });
          }
        }, 0);
        return;
      }

      const newBoard = board.map((r) => r.map((c) => ({ ...c })));
      const cell = newBoard[row][col];

      if (isLongPress) {
        if (cell.state === 'revealed') return;
        toggleFlag(newBoard, row, col);
        setMinesRemaining(
          gameConfig.mines -
            newBoard.flat().filter((c) => c.state === 'flagged').length
        );
        playSound('flag');
      } else {
        if (cell.state === 'flagged' || cell.state === 'revealed') return;

        revealCell(newBoard, row, col);
        playSound('tap');

        if (checkLoss(newBoard)) {
          setGameOver(true);
          playSound('lose');
          // Reveal all mines on loss
          newBoard.forEach(r => r.forEach(c => {
            if (c.isMine) c.state = 'revealed';
          }));
        } else if (checkWin(newBoard)) {
          setGameWon(true);
          playSound('win');
          recordGameResult('minesweeper', 'win', elapsedTime); // Assuming win, will add this game later
        }
      }
      setBoard(newBoard);
    },
    [board, gameOver, gameWon, difficulty, gameConfig.mines, elapsedTime, playSound]
  );

  const resetGame = useCallback(() => {
    setBoard(null); // Board will be created on first click
    setGameOver(false);
    setGameWon(false);
    setMinesRemaining(gameConfig.mines);
    setStartTime(null);
    setElapsedTime(0);
  }, [gameConfig.mines]);

  const renderCell = useCallback(
    (cell: Cell) => {
      const isRevealed = cell.state === 'revealed';
      const isFlagged = cell.state === 'flagged';
      const isMine = cell.isMine;
      const isBlownMine = isRevealed && isMine;

      let content = '';
      let textColor = colors.text;

      if (isFlagged) {
        content = '🚩';
      } else if (isRevealed) {
        if (isMine) {
          content = '💣';
          textColor = colors.error;
        } else if (cell.minesAround > 0) {
          content = String(cell.minesAround);
          switch (cell.minesAround) {
            case 1: textColor = '#0000FF'; break; // Blue
            case 2: textColor = '#008000'; break; // Green
            case 3: textColor = '#FF0000'; break; // Red
            case 4: textColor = '#800080'; break; // Purple
            case 5: textColor = '#800000'; break; // Maroon
            case 6: textColor = '#40E0D0'; break; // Turquoise
            case 7: textColor = '#000000'; break; // Black
            case 8: textColor = '#808080'; break; // Gray
          }
        }
      }

      return (
        <TouchableOpacity
          key={`${cell.row}-${cell.col}`}
          style={[
            styles.cell,
            {
              width: CELL_SIZE,
              height: CELL_SIZE,
              backgroundColor: isRevealed ? colors.surface : colors.card,
            },
            isBlownMine && { backgroundColor: colors.error },
          ]}
          onPress={() => handleCellPress(cell.row, cell.col)}
          onLongPress={() => handleCellPress(cell.row, cell.col, true)}
          disabled={gameOver || gameWon || isRevealed}
        >
          <Text style={[styles.cellText, { color: textColor }]}>{content}</Text>
        </TouchableOpacity>
      );
    },
    [CELL_SIZE, gameOver, gameWon, handleCellPress, styles.cell, styles.cellText, colors]
  );

  return (
    <View style={styles.container}>
      <Header
        title="Minesweeper"
        score={minesRemaining}
        scoreLabel="Mines"
        highScore={elapsedTime}
        highScoreLabel="Time"
      />

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
        {board ? (
          board.map((row, r) => (
            <View key={r} style={styles.row}>
              {row.map((cell) => renderCell(cell))}
            </View>
          ))
        ) : (
          <TouchableOpacity
            style={[
              styles.boardPlaceholder,
              {
                width: CELL_SIZE * gameConfig.cols,
                height: CELL_SIZE * gameConfig.rows,
                backgroundColor: colors.card,
              },
            ]}
            activeOpacity={0.8}
            onPress={() =>
              handleCellPress(
                Math.floor(gameConfig.rows / 2),
                Math.floor(gameConfig.cols / 2)
              )
            }
          >
            <Text style={styles.placeholderText}>Tap to Start</Text>
          </TouchableOpacity>
        )}
      </View>

      {(gameOver || gameWon) && (
        <View style={styles.overlay}>
          <Text style={styles.resultText}>
            {gameWon ? 'You Won!' : 'Game Over!'}
          </Text>
          <TouchableOpacity style={styles.playAgain} onPress={resetGame} activeOpacity={0.7}>
            <Text style={styles.playAgainText}>Play Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {showTutorial && (
        <TutorialScreen
          gameName="Minesweeper"
          steps={GAME_TUTORIALS['minesweeper']}
          onClose={() => {
            setShowTutorial(false);
            AsyncStorage.setItem('@tutorial_minesweeper', 'true');
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
    marginTop: 20,
    alignSelf: 'center',
    borderWidth: 2,
    borderColor: colors.textSecondary,
  },
  boardPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
  },
  placeholderText: {
    color: colors.textSecondary,
    fontSize: 24,
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    borderWidth: 1,
    borderColor: colors.textSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultText: {
    color: colors.text,
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  playAgain: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  playAgainText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
});
