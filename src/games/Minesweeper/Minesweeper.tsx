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

  const [level, setLevelState] = useState(1);
  const [board, setBoard] = useState<Board | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [minesRemaining, setMinesRemaining] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);

  const gameConfig = getGameConfig(difficulty, level);
  const CELL_SIZE = getCellSize(gameConfig.cols);

  useEffect(() => {
    const init = async () => {
      const savedLevel = await getLevel('minesweeper', difficulty);
      setLevelState(savedLevel);
      const config = getGameConfig(difficulty, savedLevel);
      setMinesRemaining(config.mines);
      setIsReady(true);
    };
    init();
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
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startTime, gameOver, gameWon]);

  const handleCellPress = useCallback(
    (row: number, col: number, isLongPress: boolean = false) => {
      if (gameOver || gameWon || !isReady) return;

      if (!board) {
        const initialBoard = createBoard(difficulty, row, col, level);
        setBoard(initialBoard);
        setStartTime(Date.now());
        setTimeout(() => {
          if (!isLongPress) {
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
          newBoard.forEach(r => r.forEach(c => {
            if (c.isMine) c.state = 'revealed';
          }));
        } else if (checkWin(newBoard)) {
          setGameWon(true);
          playSound('win');
          const finalTime = Math.floor((Date.now() - (startTime || Date.now())) / 1000);
          recordGameResult('minesweeper', 'win', finalTime);
          
          const nextLvl = level + 1;
          setLevel('minesweeper', difficulty, nextLvl);
        }
      }
      setBoard(newBoard);
    },
    [board, gameOver, gameWon, difficulty, gameConfig.mines, level, isReady, startTime, playSound]
  );

  const nextLevel = useCallback(async () => {
    const savedLevel = await getLevel('minesweeper', difficulty);
    setLevelState(savedLevel);
    setBoard(null);
    setGameOver(false);
    setGameWon(false);
    const config = getGameConfig(difficulty, savedLevel);
    setMinesRemaining(config.mines);
    setStartTime(null);
    setElapsedTime(0);
  }, [difficulty]);

  const resetLevel = useCallback(() => {
    setBoard(null);
    setGameOver(false);
    setGameWon(false);
    setMinesRemaining(gameConfig.mines);
    setStartTime(null);
    setElapsedTime(0);
  }, [gameConfig.mines]);

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
              ? (isAlt ? '#2d2d4d' : '#252545')
              : (isAlt ? '#3d3d5c' : '#353555'),
          },
          isBlownMine && { backgroundColor: '#ff7675' },
        ]}
        onPress={() => handleCellPress(cell.row, cell.col)}
        onLongPress={() => handleCellPress(cell.row, cell.col, true)}
        disabled={gameOver || gameWon || isRevealed}
      >
        <Text style={[styles.cellText, { color: textColor, fontSize: CELL_SIZE * 0.6 }]}>
          {content}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Header score={minesRemaining} scoreLabel="MINES" highScore={level} highScoreLabel="LEVEL" />
      
      <View style={styles.levelHeader}>
        <View style={styles.difficultyBadge}>
          <Text style={styles.difficultyText}>{difficulty.toUpperCase()}</Text>
        </View>
        <Text style={styles.levelText}>Level {level}</Text>
      </View>

      <GameBoardContainer style={styles.boardContainer}>
        <View style={styles.boardFrame}>
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
                  backgroundColor: '#3d3d5c',
                },
              ]}
              activeOpacity={0.8}
              onPress={() => handleCellPress(Math.floor(gameConfig.rows / 2), Math.floor(gameConfig.cols / 2))}
            >
              <Text style={styles.placeholderText}>TAP TO START</Text>
            </TouchableOpacity>
          )}
        </View>
      </GameBoardContainer>

      <View style={styles.footer}>
        <PremiumButton variant="secondary" height={50} onPress={resetLevel} style={styles.resetBtn}>
          <Text style={styles.resetText}>RESET LEVEL</Text>
        </PremiumButton>
      </View>

      {(gameOver || gameWon) && (
        <GameOverOverlay
          result={gameWon ? 'win' : 'lose'}
          title={gameWon ? 'MISSION CLEAR!' : 'KA-BOOM!'}
          subtitle={gameWon ? `Level ${level} complete!` : 'Try again!'}
          onPlayAgain={gameWon ? nextLevel : resetLevel}
          onPlayAgainLabel={gameWon ? "NEXT LEVEL" : "TRY AGAIN"}
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
  difficultyBadge: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 2, borderRadius: radius.sm, marginBottom: 4 },
  difficultyText: { color: '#fab1a0', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  levelText: { color: '#fff', fontSize: 24, fontWeight: '900' },
  boardContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  boardFrame: { borderWidth: 4, borderColor: '#2b2b45', borderRadius: radius.md, overflow: 'hidden', backgroundColor: '#1e1e3a' },
  boardPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  placeholderText: { color: '#fff', fontSize: 18, fontWeight: '900', opacity: 0.5 },
  row: { flexDirection: 'row' },
  cell: { justifyContent: 'center', alignItems: 'center' },
  cellText: { fontWeight: '900' },
  footer: { paddingVertical: spacing.xl, paddingBottom: Platform.OS === 'ios' ? 40 : spacing.xl },
  resetBtn: { width: '100%' },
  resetText: { fontWeight: '900', fontSize: 14, color: colors.text, letterSpacing: 1 },
});