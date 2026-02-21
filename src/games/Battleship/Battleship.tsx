import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Animated, ScrollView, useWindowDimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Header from '../../components/Header';
import GameOverOverlay from '../../components/GameOverOverlay';
import PremiumButton from '../../components/PremiumButton';
import { useTheme } from '../../contexts/ThemeContext';
import { useSound } from '../../contexts/SoundContext';
import { getHighScore, setHighScore } from '../../utils/storage';
import { recordGameResult } from '../../utils/stats';
import { Difficulty } from '../../types';
import { ThemeColors } from '../../utils/themes';
import { spacing, radius, shadows, typography } from '../../utils/designTokens';
import { initializeGame, placeShipsRandomly, handleStrike, getEnemyStrike } from './logic';
import { BattleshipGameState, ShipType, Board, GridCell, Ship, SHIP_CONFIG } from './types';

export default function Battleship({ difficulty }: Props) {
  const { colors } = useTheme();
  const { playSound } = useSound();
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  
  const { CELL_SIZE, GRID_SIZE, SCREEN_PADDING } = useMemo(() => {
    const grid = 10;
    const padding = 12;
    const overhead = 320; // Increased buffer for header, labels, and padding
    
    // Calculate size based on width
    let size = Math.floor((SCREEN_WIDTH - (padding * 2) - 4) / grid);
    
    // Ensure two grids fit in height
    if ((size * grid * 2) + overhead > SCREEN_HEIGHT) {
        size = Math.floor((SCREEN_HEIGHT - overhead) / (grid * 2));
    }
    
    return { CELL_SIZE: size, GRID_SIZE: grid, SCREEN_PADDING: padding };
  }, [SCREEN_WIDTH, SCREEN_HEIGHT]);

  const styles = useMemo(() => getStyles(colors, CELL_SIZE, SCREEN_PADDING), [colors, CELL_SIZE, SCREEN_PADDING]);

  const [gameState, setGameState] = useState<BattleshipGameState>(() => initializeGame());
  const [enemyShipsSunk, setEnemyShipsSunk] = useState(0);
  const [playerShipsSunk, setPlayerShipsSunk] = useState(0);
  const [paused, setPaused] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const strikeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setIsReady(true);
  }, []);

  const startCombat = useCallback(() => {
    if (paused) return;
    setGameState(prev => {
      const enemyBoard = prev.enemyBoard.map(row => row.map(cell => ({ ...cell })));
      const enemyShips = placeShipsRandomly(enemyBoard);
      const playerShips = placeShipsRandomly(prev.playerBoard.map(row => row.map(cell => ({ ...cell })))); // Auto place for now
      
      return {
        ...prev,
        enemyBoard,
        enemyShips,
        playerShips,
        playerBoard: prev.playerBoard.map((row, r) => row.map((cell, c) => {
            const ship = playerShips.find(s => s.positions.some(p => p.row === r && p.col === c));
            return ship ? { ...cell, state: 'ship', shipType: ship.type } : cell;
        })),
        gamePhase: 'playing',
      };
    });
    playSound('drop');
  }, [playSound, paused]);

  const handlePlayerStrike = useCallback((row: number, col: number) => {
    if (gameState.gamePhase !== 'playing' || gameState.currentPlayer !== 'player' || paused || gameState.enemyBoard[row][col].state === 'hit' || gameState.enemyBoard[row][col].state === 'miss') return;

    setGameState(prev => {
      const newBoard = prev.enemyBoard.map(r => r.map(c => ({ ...c })));
      const { state, sunkShip } = handleStrike(newBoard, prev.enemyShips, row, col);
      
      let newSunkCount = enemyShipsSunk;
      if (sunkShip) {
        newSunkCount++;
        playSound('win');
      } else if (state === 'hit') {
        playSound('drop');
      } else {
        playSound('tap');
      }

      setEnemyShipsSunk(newSunkCount);

      const isWin = newSunkCount === 5;

      return {
        ...prev,
        enemyBoard: newBoard,
        currentPlayer: isWin ? 'player' : 'enemy',
        gamePhase: isWin ? 'finished' : 'playing',
        winner: isWin ? 'player' : null,
        lastStrike: { row, col, result: state, player: 'player' },
      };
    });
  }, [gameState, enemyShipsSunk, playSound, paused]);

  useEffect(() => {
    if (gameState.gamePhase === 'playing' && gameState.currentPlayer === 'enemy' && !gameState.winner && !paused) {
      const timer = setTimeout(() => {
        const { row, col } = getEnemyStrike(gameState.playerBoard, difficulty, gameState.lastStrike);
        
        setGameState(prev => {
          const newBoard = prev.playerBoard.map(r => r.map(c => ({ ...c })));
          const { state, sunkShip } = handleStrike(newBoard, prev.playerShips, row, col);
          
          let newSunkCount = playerShipsSunk;
          if (sunkShip) {
            newSunkCount++;
            playSound('lose');
          } else if (state === 'hit') {
            playSound('drop');
          } else {
            playSound('tap');
          }

          setPlayerShipsSunk(newSunkCount);

          const isWin = newSunkCount === 5;

          return {
            ...prev,
            playerBoard: newBoard,
            currentPlayer: 'player',
            gamePhase: isWin ? 'finished' : 'playing',
            winner: isWin ? 'enemy' : null,
            lastStrike: { row, col, result: state, player: 'enemy' },
          };
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [gameState.currentPlayer, gameState.gamePhase, gameState.winner, playerShipsSunk, difficulty, playSound, paused]);

  const resetGame = useCallback(() => {
    setGameState(initializeGame());
    setEnemyShipsSunk(0);
    setPlayerShipsSunk(0);
    setPaused(false);
  }, []);

  const handleNewGame = useCallback(() => {
    resetGame();
  }, [resetGame]);

  const handleRestart = useCallback(() => {
    resetGame();
  }, [resetGame]);

  if (!isReady) return null;

  const renderGrid = (board: Board, isEnemy: boolean) => (
    <View style={styles.grid}>
      {board.map((row, r) => (
        <View key={r} style={styles.row}>
          {row.map((cell, c) => {
            const isHit = cell.state === 'hit';
            const isMiss = cell.state === 'miss';
            const isShip = (cell.state === 'ship' || (isHit && cell.shipType)) && !isEnemy;
            
            const shipSize = cell.shipType ? SHIP_CONFIG[cell.shipType].size : 0;
            const isStart = cell.shipPart === 0;
            const isEnd = cell.shipPart === shipSize - 1;
            const isHorizontal = cell.shipHorizontal;

            return (
              <TouchableOpacity
                key={c}
                disabled={!isEnemy || gameState.gamePhase !== 'playing' || gameState.currentPlayer !== 'player' || paused}
                onPress={() => handlePlayerStrike(r, c)}
                style={[
                  styles.cell,
                  isHit && styles.hitCell,
                  isMiss && styles.missCell,
                  isShip && styles.shipCell,
                  isShip && isHorizontal && isStart && { borderTopLeftRadius: CELL_SIZE / 2, borderBottomLeftRadius: CELL_SIZE / 2 },
                  isShip && isHorizontal && isEnd && { borderTopRightRadius: CELL_SIZE / 2, borderBottomRightRadius: CELL_SIZE / 2 },
                  isShip && !isHorizontal && isStart && { borderTopLeftRadius: CELL_SIZE / 2, borderTopRightRadius: CELL_SIZE / 2 },
                  isShip && !isHorizontal && isEnd && { borderBottomLeftRadius: CELL_SIZE / 2, borderBottomRightRadius: CELL_SIZE / 2 },
                ]}
              >
                {isShip && !isHit && (
                    <View style={[
                        styles.shipDetail,
                        isHorizontal ? { height: 4, width: '80%' } : { width: 4, height: '80%' }
                    ]} />
                )}
                {isShip && !isHit && !isStart && !isEnd && (
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.2)', position: 'absolute' }} />
                )}
                {isHit && <Text style={styles.cellIcon}>💥</Text>}
                {isMiss && <View style={styles.missDot} />}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.background, colors.surface]} style={StyleSheet.absoluteFill} />
      <Header
        title="Sea Battle"
        score={enemyShipsSunk}
        scoreLabel="SUNK"
        highScore={5}
        highScoreLabel="FLEET"
        onPause={() => setPaused(!paused)}
        isPaused={paused}
      />

      {gameState.gamePhase === 'placement' ? (
        <View style={styles.setupContainer}>
          <Text style={styles.setupTitle}>READY YOUR FLEET</Text>
          <Text style={styles.setupDesc}>Position your ships strategically across the 10x10 radar grid.</Text>
          
          <View style={styles.setupVisual}>
             {/* Simple preview of ships */}
             <View style={styles.shipRow}>
                {Object.keys(SHIP_CONFIG).map((type) => (
                    <View key={type} style={[styles.miniShip, { width: SHIP_CONFIG[type as ShipType].size * 20 }]} />
                ))}
             </View>
          </View>

          <PremiumButton variant="primary" height={60} onPress={startCombat} disabled={paused}>
            <Text style={styles.startBtnText}>START BATTLE</Text>
          </PremiumButton>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.gameArea} showsVerticalScrollIndicator={false}>
          <View style={styles.boardLabelContainer}>
            <Text style={styles.boardLabel}>ENEMY RADAR</Text>
            <View style={styles.statsBadge}>
                <Text style={styles.statsText}>{enemyShipsSunk}/5 SUNK</Text>
            </View>
          </View>
          {renderGrid(gameState.enemyBoard, true)}

          <View style={[styles.boardLabelContainer, { marginTop: spacing.lg }]}>
            <Text style={styles.boardLabel}>YOUR FLEET</Text>
            <View style={styles.statsBadge}>
                <Text style={styles.statsText}>{playerShipsSunk}/5 LOST</Text>
            </View>
          </View>
          {renderGrid(gameState.playerBoard, false)}
          
          {gameState.currentPlayer === 'enemy' && !gameState.winner && !paused && (
            <View style={styles.enemyThinking}>
                <Text style={styles.enemyThinkingText}>ENEMY STRIKE INCOMING...</Text>
            </View>
          )}
        </ScrollView>
      )}

      {gameState.gamePhase !== 'placement' && (
        <View style={styles.footer}>
          <PremiumButton variant="secondary" height={44} style={styles.flexBtn} onPress={handleRestart} disabled={paused}>
            <Text style={styles.footerBtnText}>RESTART</Text>
          </PremiumButton>
          <PremiumButton variant="secondary" height={44} style={styles.flexBtn} onPress={handleNewGame} disabled={paused}>
            <Text style={styles.footerBtnText}>NEW GAME</Text>
          </PremiumButton>
        </View>
      )}

      {gameState.winner && (
        <GameOverOverlay
          result={gameState.winner === 'player' ? 'win' : 'lose'}
          title={gameState.winner === 'player' ? 'VICTORY!' : 'FLEET DESTROYED'}
          subtitle={gameState.winner === 'player' ? 'You ruled the high seas.' : 'The enemy found your carrier.'}
          onPlayAgain={resetGame}
          onNewGame={handleNewGame}
          onRestart={handleRestart}
        />
      )}

      {paused && (
        <GameOverOverlay
          result="paused"
          title="GAME PAUSED"
          onPlayAgain={() => setPaused(false)}
          onPlayAgainLabel="RESUME"
          onNewGame={handleNewGame}
          onRestart={handleRestart}
        />
      )}
    </View>
  );
}

interface Props {
  difficulty: Difficulty;
}

const getStyles = (colors: ThemeColors, CELL_SIZE: number, SCREEN_PADDING: number) => StyleSheet.create({
  container: { flex: 1 },
  footer: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.md, paddingBottom: Platform.OS === 'ios' ? 30 : spacing.sm, paddingTop: spacing.sm },
  flexBtn: { flex: 1 },
  footerBtnText: { color: colors.text, fontWeight: 'bold', fontSize: 12 },
  setupContainer: { flex: 1, padding: spacing.xl, justifyContent: 'center', alignItems: 'center' },
  setupTitle: { ...typography.heading, color: colors.text, marginBottom: spacing.sm },
  setupDesc: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xxl },
  setupVisual: { marginBottom: spacing.xxxl, alignItems: 'center' },
  shipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  miniShip: { height: 12, backgroundColor: colors.textSecondary, borderRadius: 6, opacity: 0.6 },
  startBtnText: { color: colors.textOnPrimary, fontWeight: '900', fontSize: 18, letterSpacing: 1 },
  gameArea: { flexGrow: 1, paddingHorizontal: SCREEN_PADDING, alignItems: 'center', justifyContent: 'center', paddingBottom: 60, paddingTop: spacing.md },
  boardLabelContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: spacing.xs },
  boardLabel: { fontSize: 12, fontWeight: '900', color: colors.textSecondary, letterSpacing: 1.5 },
  statsBadge: { backgroundColor: colors.card, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  statsText: { fontSize: 10, fontWeight: 'bold', color: colors.primary },
  grid: { 
    width: CELL_SIZE * 10 + 4, 
    height: CELL_SIZE * 10 + 4, 
    backgroundColor: colors.card, 
    borderWidth: 2, 
    borderColor: colors.border,
    padding: 1,
  },
  row: { flexDirection: 'row' },
  cell: { 
    width: CELL_SIZE, 
    height: CELL_SIZE, 
    borderWidth: 0.5, 
    borderColor: colors.border, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  shipCell: { backgroundColor: '#7f8c8d' }, // Brighter metallic grey
  shipDetail: { backgroundColor: 'rgba(0,0,0,0.2)', position: 'absolute', borderRadius: 2 },
  hitCell: { backgroundColor: 'rgba(235, 59, 90, 0.3)' },
  missCell: { backgroundColor: 'rgba(255, 255, 255, 0.05)' },
  missDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  cellIcon: { fontSize: CELL_SIZE * 0.7 },
  enemyThinking: { marginTop: spacing.lg, backgroundColor: colors.error, paddingHorizontal: 20, paddingVertical: 10, borderRadius: radius.full, ...shadows.lg },
  enemyThinkingText: { color: colors.textOnPrimary, fontWeight: 'bold', fontSize: 12 },
});
