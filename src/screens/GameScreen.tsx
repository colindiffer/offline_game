import React, { useState, useMemo, useEffect, Suspense, lazy, useRef } from 'react';
import { StyleSheet, Text, View, Dimensions, Platform, ActivityIndicator, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Lazy load games to keep bundle size small and memory usage low
const TicTacToe = lazy(() => import('../games/TicTacToe/TicTacToe'));
const Snake = lazy(() => import('../games/Snake/Snake'));
const Game2048 = lazy(() => import('../games/Game2048/Game2048'));
const Minesweeper = lazy(() => import('../games/Minesweeper/Minesweeper'));
const ConnectFour = lazy(() => import('../games/ConnectFour/ConnectFour'));
const Tetris = lazy(() => import('../games/Tetris/Tetris'));
const Maze = lazy(() => import('../games/Maze/Maze'));
const Solitaire = lazy(() => import('../games/Solitaire/Solitaire'));
const Sudoku = lazy(() => import('../games/Sudoku/Sudoku'));
const Reversi = lazy(() => import('../games/Reversi/Reversi'));
const Checkers = lazy(() => import('../games/Checkers/Checkers'));
const Chess = lazy(() => import('../games/Chess/Chess'));
const Blackjack = lazy(() => import('../games/Blackjack/Blackjack'));
const Poker = lazy(() => import('../games/Poker/Poker'));
const Hearts = lazy(() => import('../games/Hearts/Hearts'));
const WaterSort = lazy(() => import('../games/WaterSort/WaterSort'));
const WordSearch = lazy(() => import('../games/WordSearch/WordSearch'));
const BrickBreaker = lazy(() => import('../games/BrickBreaker/BrickBreaker'));
const Mahjong = lazy(() => import('../games/Mahjong/Mahjong'));
const Hangman = lazy(() => import('../games/Hangman/Hangman'));
const SimonSays = lazy(() => import('../games/SimonSays/SimonSays'));
const MemoryMatch = lazy(() => import('../games/MemoryMatch/MemoryMatch'));
const WordGuess = lazy(() => import('../games/WordGuess/WordGuess'));
const SpiderSolitaire = lazy(() => import('../games/SpiderSolitaire/SpiderSolitaire'));
const Battleship = lazy(() => import('../games/Battleship/Battleship'));
const Spades = lazy(() => import('../games/Spades/Spades'));
const CodeBreaker = lazy(() => import('../games/CodeBreaker/CodeBreaker'));
const FreeCell = lazy(() => import('../games/FreeCell/FreeCell'));
const Dominoes = lazy(() => import('../games/Dominoes/Dominoes'));
const Backgammon = lazy(() => import('../games/Backgammon/Backgammon'));

import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Difficulty, GameId, RootStackParamList } from '../types';
import { GAMES } from '../utils/constants';
import DifficultyPicker from '../components/DifficultyPicker';
import ResumeGamePicker from '../components/ResumeGamePicker';
import TutorialScreen from '../components/TutorialScreen';
import HighScoresScreen from '../components/HighScoresScreen';
import { GAME_TUTORIALS } from '../utils/tutorials';
import { getActiveGame, setActiveGame, clearActiveGame } from '../utils/storage';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeColors } from '../utils/themes';
import { spacing, radius } from '../utils/designTokens';
import { logGameStarted } from '../lib/analytics';
import { useInterstitialAd } from '../lib/useInterstitialAd';
import AdBanner from '../components/AdBanner';

type Props = NativeStackScreenProps<RootStackParamList, 'Game'>;
const { width } = Dimensions.get('window');

function LoadingBar() {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progress, { toValue: 0.9, duration: 1500, useNativeDriver: false }).start();
  }, []);
  return (
    <View style={loadingStyles.container}>
      <Text style={loadingStyles.text}>Loading Game...</Text>
      <View style={loadingStyles.track}>
        <Animated.View style={[loadingStyles.bar, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
      </View>
    </View>
  );
}

const loadingStyles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  text: { color: '#aaa', fontSize: 13, fontWeight: 'bold', letterSpacing: 1 },
  track: { width: 200, height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' },
  bar: { height: '100%', backgroundColor: '#e94560', borderRadius: 3 },
});

export default function GameScreen({ route }: Props) {
  const { colors } = useTheme();
  const { gameId } = route.params;
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [activeGameDifficulty, setActiveGameDifficulty] = useState<Difficulty | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showHighScores, setShowHighScores] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Games that don't have meaningful difficulty differences — skip the picker
  const SINGLE_DIFFICULTY_GAMES: GameId[] = ['freecell'];

  const gameMeta = GAMES.find((g) => g.id === gameId);
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { showAd } = useInterstitialAd();

  useEffect(() => {
    getActiveGame(gameId)
      .then((savedDifficulty) => {
        setActiveGameDifficulty(savedDifficulty);
      })
      .catch(() => {
        // Storage failure — just start fresh
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [gameId]);

  // Auto-start games that don't need a difficulty picker
  useEffect(() => {
    if (!isLoading && !difficulty && SINGLE_DIFFICULTY_GAMES.includes(gameId)) {
      handleSelectDifficulty(activeGameDifficulty || 'easy');
    }
  }, [isLoading]);

  const handleSelectDifficulty = async (diff: Difficulty) => {
    setDifficulty(diff);
    await setActiveGame(gameId, diff);
    await logGameStarted(gameId, diff);
  };

  const handleResume = () => {
    if (activeGameDifficulty) {
      setDifficulty(activeGameDifficulty);
    }
  };

  const handleNewGame = () => {
    showAd();
    clearActiveGame(gameId);
    setActiveGameDifficulty(null);
    setDifficulty(null);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const renderContent = () => {
    if (!difficulty) {
      if (activeGameDifficulty) {
        return (
          <View style={{ flex: 1 }}>
            <ResumeGamePicker
              gameName={gameMeta?.name ?? 'Game'}
              difficulty={activeGameDifficulty}
              onResume={handleResume}
              onNewGame={handleNewGame}
              onShowTutorial={() => setShowTutorial(true)}
              onShowHighScores={() => setShowHighScores(true)}
            />
            {showTutorial && (
              <TutorialScreen
                gameName={gameMeta?.name ?? 'Game'}
                steps={GAME_TUTORIALS[gameId] || []}
                onClose={() => setShowTutorial(false)}
              />
            )}
            {showHighScores && (
              <HighScoresScreen
                gameId={gameId}
                gameName={gameMeta?.name ?? 'Game'}
                onClose={() => setShowHighScores(false)}
              />
            )}
          </View>
        );
      }

      return (
        <View style={{ flex: 1 }}>
          <DifficultyPicker
            gameName={gameMeta?.name ?? 'Game'}
            onSelect={handleSelectDifficulty}
            onShowTutorial={() => setShowTutorial(true)}
            onShowHighScores={() => setShowHighScores(true)}
          />
          {showTutorial && (
            <TutorialScreen
              gameName={gameMeta?.name ?? 'Game'}
              steps={GAME_TUTORIALS[gameId] || []}
              onClose={() => setShowTutorial(false)}
            />
          )}
          {showHighScores && (
            <HighScoresScreen
              gameId={gameId}
              gameName={gameMeta?.name ?? 'Game'}
              onClose={() => setShowHighScores(false)}
            />
          )}
        </View>
      );
    }

    let gameComponent;
    switch (gameId) {
      case 'tic-tac-toe': gameComponent = <TicTacToe difficulty={difficulty} />; break;
      case 'snake': gameComponent = <Snake difficulty={difficulty} />; break;
      case '2048': gameComponent = <Game2048 difficulty={difficulty} />; break;
      case 'minesweeper': gameComponent = <Minesweeper difficulty={difficulty} />; break;
      case 'connect-four': gameComponent = <ConnectFour difficulty={difficulty} />; break;
      case 'block-drop': gameComponent = <Tetris difficulty={difficulty} />; break;
      case 'maze': gameComponent = <Maze difficulty={difficulty} />; break;
      case 'solitaire': gameComponent = <Solitaire difficulty={difficulty} />; break;
      case 'sudoku': gameComponent = <Sudoku difficulty={difficulty} />; break;
      case 'reversi': gameComponent = <Reversi difficulty={difficulty} />; break;
      case 'checkers': gameComponent = <Checkers difficulty={difficulty} />; break;
      case 'chess': gameComponent = <Chess difficulty={difficulty} />; break;
      case 'blackjack': gameComponent = <Blackjack difficulty={difficulty} />; break;
      case 'poker': gameComponent = <Poker difficulty={difficulty} />; break;
      case 'hearts': gameComponent = <Hearts difficulty={difficulty} />; break;
      case 'water-sort': gameComponent = <WaterSort difficulty={difficulty} />; break;
      case 'word-search': gameComponent = <WordSearch difficulty={difficulty} />; break;
      case 'brick-breaker': gameComponent = <BrickBreaker difficulty={difficulty} />; break;
      case 'mahjong': gameComponent = <Mahjong difficulty={difficulty} />; break;
      case 'hangman': gameComponent = <Hangman difficulty={difficulty} />; break;
      case 'simon-says': gameComponent = <SimonSays difficulty={difficulty} />; break;
      case 'memory-match': gameComponent = <MemoryMatch difficulty={difficulty} />; break;
      case 'word-guess': gameComponent = <WordGuess difficulty={difficulty} />; break;
      case 'spider-solitaire': gameComponent = <SpiderSolitaire difficulty={difficulty} />; break;
      case 'battleship': gameComponent = <Battleship difficulty={difficulty} />; break;
      case 'spades': gameComponent = <Spades difficulty={difficulty} />; break;
      case 'code-breaker': gameComponent = <CodeBreaker difficulty={difficulty} />; break;
      case 'freecell': gameComponent = <FreeCell difficulty={difficulty} />; break;
      case 'dominoes': gameComponent = <Dominoes difficulty={difficulty} />; break;
      case 'backgammon': gameComponent = <Backgammon difficulty={difficulty} />; break;
      default: gameComponent = <Text style={styles.error}>Unknown game</Text>;
    }
    return (
      <View style={{ flex: 1 }}>
        <Suspense fallback={<LoadingBar />}>
          {gameComponent}
        </Suspense>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.background, colors.surface]} style={StyleSheet.absoluteFill} />
      {/* Mesh decorative elements */}
      <View style={[styles.blob, styles.blob1, { backgroundColor: (gameMeta?.color || colors.primary) + '10' }]} />
      <View style={styles.gameArea}>
        {renderContent()}
      </View>
      <View style={styles.adContainer}>
        <AdBanner />
      </View>
    </View>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  gameArea: {
    flex: 1,
  },
  adContainer: {
    // Anchored at the very bottom — game content above can never overlap this
    width: '100%',
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  blob: { position: 'absolute', borderRadius: 300 },
  blob1: { width: width * 1.5, height: width * 1.5, top: -width * 0.5, left: -width * 0.2 },
  error: {
    color: colors.primary,
    fontSize: 18,
    textAlign: 'center',
    marginTop: 40,
  },
});
