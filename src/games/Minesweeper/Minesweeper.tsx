import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import Header from '../../components/Header';
import TutorialScreen from '../../components/TutorialScreen';
import GameOverOverlay from '../../components/GameOverOverlay';
import GameBoardContainer from '../../components/GameBoardContainer';
import { useTheme } from '../../contexts/ThemeContext';
import { useSound } from '../../contexts/SoundContext';
import { getHighScore, setHighScore, getLevel, setLevel } from '../../utils/storage';
import { recordGameResult } from '../../utils/stats';
import { Difficulty } from '../../types';
import { Board, Cell, createBoard, revealCell, toggleFlag, checkWin, checkLoss, GameConfig, getGameConfig } from './logic';
import { ThemeColors } from '../../utils/themes';
import { GAME_TUTORIALS } from '../../utils/tutorials';
import PremiumButton from '../../components/PremiumButton';
import { spacing, radius, shadows, typography } from '../../utils/designTokens';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useInterstitialAd } from '../../lib/useInterstitialAd';

const SCREEN_WIDTH = Dimensions.get('window').width;

const getCellSize = (cols: number) => {
  const boardSize = SCREEN_WIDTH - 32;
  return boardSize / cols;
};

interface Props {
  difficulty: Difficulty;
}

export default function Minesweeper({ difficulty }: Props) {
  const { colors } = useTheme();
  const { playSound } = useSound();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { showAd } = useInterstitialAd();

  const [board, setBoard] = useState<Board | null>(null);
  const [level, setLevelState] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [paused, setPaused] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [minesRemaining, setMinesRemaining] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [highScore, setHighScoreState] = useState<number | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isFirstGameRef = useRef(true);
  const gameConfig = useMemo(() => getGameConfig(difficulty, level), [difficulty, level]);
  const CELL_SIZE = getCellSize(gameConfig.cols);
  const initializedBoardRef = useRef<Board | null>(null);

  useEffect(() => {
    const init = async () => {
      const savedLevel = await getLevel('minesweeper', difficulty);
      const best = await getHighScore('minesweeper', difficulty);
      setLevelState(savedLevel);
      setHighScoreState(best);
      setIsReady(true);
      // Initialize an empty board when component mounts
      setBoard(createBoard(difficulty, -1, -1, savedLevel, true));
    };
    init();
  }, [difficulty]);

  useEffect(() => {
    if (startTime && !gameOver && !gameWon && !paused) {
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startTime, gameOver, gameWon, paused]);

  const handleCellAction = useCallback(
    (row: number, col: number, isLongPress: boolean) => {
      if (gameOver || gameWon || paused || !isReady) return;

      let currentBoard = board;

      // If it's the very first action, generate the board with mines, ensuring the clicked cell is safe
      if (!initializedBoardRef.current && !startTime) {
        const newBoardWithMines = createBoard(difficulty, row, col, level);
        initializedBoardRef.current = newBoardWithMines;
        currentBoard = newBoardWithMines;
        setStartTime(Date.now());
      } else if (!currentBoard) {
        // This case should ideally not be reached if board is initialized with an empty one
        return;
      }

      const newBoard = currentBoard.map((r) => r.map((c) => ({ ...c })));
      const cell = newBoard[row][col];

      if (isLongPress) { // Long press to reveal
        if (cell.state === 'flagged' || cell.state === 'revealed') return;
        revealCell(newBoard, row, col);
        playSound('tap');

        if (checkLoss(newBoard)) {
          setGameOver(true);
          playSound('lose');
          newBoard.forEach(r => r.forEach(c => {
            if (c.isMine) c.state = 'revealed';
          }));
        } else if (checkWin(newBoard)) {
          setGameWon(true);
          playSound('win');
          const finalTime = Math.floor((Date.now() - (startTime || Date.now())) / 1000);
          recordGameResult('minesweeper', 'win', finalTime);

          if (highScore === null || finalTime < highScore || highScore === 0) {
            setHighScoreState(finalTime);
            setHighScore('minesweeper', finalTime, difficulty);
          }

          const nextLvl = level + 1;
          setLevel('minesweeper', difficulty, nextLvl);
        }
      } else { // Single tap to flag/unflag
        if (cell.state === 'revealed') return;
        toggleFlag(newBoard, row, col);
        setMinesRemaining(
          gameConfig.mines -
          newBoard.flat().filter((c) => c.state === 'flagged').length
        );
        playSound('flag');
      }
      setBoard(newBoard);
      if (!initializedBoardRef.current && startTime) { // Ensure initializedBoardRef is set after first click
          initializedBoardRef.current = newBoard;
      }
    },
    [board, gameOver, gameWon, paused, difficulty, gameConfig.mines, level, isReady, startTime, playSound, highScore]
  );

  const handleNewGame = useCallback(() => {
    showAd(isFirstGameRef.current); // Show ad unless it's the very first game
    isFirstGameRef.current = false;
    const config = getGameConfig(difficulty, level);
    setMinesRemaining(config.mines);
    initializedBoardRef.current = null; // Clear stored initial board
    setBoard(createBoard(difficulty, -1, -1, level, true)); // Create an empty board for new game
    setGameOver(false);
    setGameWon(false);
    setStartTime(null);
    setElapsedTime(0);
    setPaused(false);
  }, [difficulty, level, showAd]);

  const handleRestart = useCallback(() => {
    showAd(isFirstGameRef.current); // Show ad unless it's the very first game
    isFirstGameRef.current = false;
    if (initializedBoardRef.current) { // If a board was played, restart with it (hide all cells)
      const newBoard = initializedBoardRef.current.map((r) => r.map((c) => ({ ...c, state: 'hidden' as const })));
      setBoard(newBoard);
      setMinesRemaining(gameConfig.mines);
    } else { // If game not started, just prepare a new empty board
      setBoard(createBoard(difficulty, -1, -1, level, true));
      setMinesRemaining(gameConfig.mines);
    }
    setGameOver(false);
    setGameWon(false);
    setStartTime(null);
    setElapsedTime(0);
    setPaused(false);
  }, [initializedBoardRef.current, gameConfig.mines, difficulty, level, showAd]);

  const nextLevel = useCallback(async () => {
    showAd(isFirstGameRef.current); // Show ad unless it's the very first game
    isFirstGameRef.current = false;
    const savedLevel = await getLevel('minesweeper', difficulty);
    setLevelState(savedLevel);
    const config = getGameConfig(difficulty, savedLevel);
    setMinesRemaining(config.mines);
    initializedBoardRef.current = null; // Clear stored initial board
    setBoard(createBoard(difficulty, -1, -1, savedLevel, true)); // Create an empty board for new level
    setGameOver(false);
    setGameWon(false);
    setStartTime(null);
    setElapsedTime(0);
    setPaused(false);
  }, [difficulty, showAd]);

  if (!isReady) return <View style={styles.container} />;

  const renderCell = (cell: Cell) => {
    const isRevealed = cell.state === 'revealed';
    const isFlagged = cell.state === 'flagged';
    const isMine = cell.isMine;
    const isBlownMine = isRevealed && isMine;

    let content: React.ReactNode = '';
    let textColor = colors.text;

    if (isFlagged) {
      content = '🚩';
    } else if (isRevealed) {
      if (isMine) {
        content = '💣';
        textColor = '#ff7675';
      } else if (cell.minesAround > 0) {
        content = String(cell.minesAround);
        switch (cell.minesAround) {
          case 1: textColor = '#0984e3'; break;
          case 2: textColor = '#00b894'; break;
          case 3: textColor = '#d63031'; break;
          case 4: textColor = '#6c5ce7'; break;
          case 5: textColor = '#e17055'; break;
          case 6: textColor = '#00cec9'; break;
          case 7: textColor = '#2d3436'; break;
          case 8: textColor = '#636e72'; break;
        }
      }
    }

    const isAlt = (cell.row + cell.col) % 2 === 0;

    return (
      <TouchableOpacity
        key={`${cell.row}-${cell.col}`}
        style={[
          styles.cell,
          {
            width: CELL_SIZE,
            height: CELL_SIZE,
            backgroundColor: isRevealed
              ? (isAlt ? colors.background : colors.surface)
              : (isAlt ? colors.card : colors.border),
          },
          isBlownMine && { backgroundColor: colors.error },
        ]}
        onPress={() => handleCellAction(cell.row, cell.col, false)}
        onLongPress={() => handleCellAction(cell.row, cell.col, true)}
        disabled={gameOver || gameWon || paused || isRevealed}
      >
        <Text style={[styles.cellText, { color: textColor, fontSize: CELL_SIZE * 0.6 }]}>
          {content}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.bgIcon}>💣</Text>
      <Header
        title="Minesweeper"
        score={minesRemaining}
        scoreLabel="MINES"
        highScore={highScore || 0}
        highScoreLabel="BEST"
        onPause={() => setPaused(!paused)}
        isPaused={paused}
      />
      
      <View style={styles.levelHeader}>
        <View style={styles.difficultyBadge}>
          <Text style={styles.difficultyText}>{difficulty.toUpperCase()}</Text>
        </View>
        <Text style={styles.levelText}>Level {level}</Text>
      </View>

      <GameBoardContainer style={styles.boardContainer}>
        <View style={styles.boardFrame}>
          {board && board.map((row, r) => (
              <View key={r} style={styles.row}>
                {row.map((cell) => renderCell(cell))}
              </View>
            ))
          }

        </View>
      </GameBoardContainer>

      <View style={styles.footer}>
        <View style={styles.footerBtns}>
          <PremiumButton variant="secondary" height={50} onPress={handleRestart} disabled={paused} style={styles.flexBtn}>
            <Text style={styles.resetText}>RESTART</Text>
          </PremiumButton>
          <PremiumButton variant="secondary" height={50} onPress={handleNewGame} disabled={paused} style={styles.flexBtn}>
            <Text style={styles.resetText}>NEW GAME</Text>
          </PremiumButton>
        </View>
      </View>

      {(gameOver || gameWon) && (
        <GameOverOverlay
          result={gameWon ? 'win' : 'lose'}
          title={gameWon ? 'MISSION CLEAR!' : 'KA-BOOM!'}
          subtitle={gameWon ? `Level ${level} complete!` : 'Try again!'}
          onPlayAgain={gameWon ? nextLevel : handleRestart}
          onPlayAgainLabel={gameWon ? "NEXT LEVEL" : "TRY AGAIN"}
          onRestart={handleRestart}
          onNewGame={handleNewGame}
        />
      )}

      {paused && !gameOver && !gameWon && (
        <GameOverOverlay
          result="paused"
          title="GAME PAUSED"
          onPlayAgain={() => setPaused(false)}
          onPlayAgainLabel="RESUME"
          onRestart={handleRestart}
          onNewGame={handleNewGame}
        />
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
  container: { flex: 1, padding: spacing.md, backgroundColor: colors.background },
  levelHeader: { alignItems: 'center', marginTop: spacing.md },
  difficultyBadge: { backgroundColor: colors.card, paddingHorizontal: 12, paddingVertical: 2, borderRadius: radius.sm, marginBottom: 4, borderWidth: 1, borderColor: colors.border },
  difficultyText: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  levelText: { color: colors.text, fontSize: 24, fontWeight: '900' },
  boardContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  boardFrame: { borderWidth: 4, borderColor: colors.border, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.card },
  boardPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  placeholderText: { color: colors.textSecondary, fontSize: 18, fontWeight: '900', opacity: 0.5 },
  row: { flexDirection: 'row' },
  cell: { justifyContent: 'center', alignItems: 'center' },
  cellText: { fontWeight: '900' },
  footer: { paddingVertical: spacing.xl, paddingBottom: Platform.OS === 'ios' ? 40 : spacing.xl },
  footerBtns: { flexDirection: 'row', gap: spacing.md },
  flexBtn: { flex: 1 },
  resetText: { fontWeight: '900', fontSize: 14, color: colors.text, letterSpacing: 1 },
  bgIcon: {
    position: 'absolute',
    bottom: '10%',
    left: '-10%',
    fontSize: 250,
    opacity: 0.03,
    transform: [{ rotate: '-15deg' }],
  },
});