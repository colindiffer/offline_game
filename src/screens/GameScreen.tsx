import React, { useState, useMemo, useEffect } from 'react';
import { StyleSheet, Text, View, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Difficulty, GameId, RootStackParamList } from '../types';
import { GAMES } from '../utils/constants';
import DifficultyPicker from '../components/DifficultyPicker';
import ResumeGamePicker from '../components/ResumeGamePicker';
import TutorialScreen from '../components/TutorialScreen';
import HighScoresScreen from '../components/HighScoresScreen';
import { GAME_TUTORIALS } from '../utils/tutorials';
import { getActiveGame, setActiveGame, clearActiveGame } from '../utils/storage';
import TicTacToe from '../games/TicTacToe/TicTacToe';
import Snake from '../games/Snake/Snake';
import Game2048 from '../games/Game2048/Game2048';
import Minesweeper from '../games/Minesweeper/Minesweeper';
import ConnectFour from '../games/ConnectFour/ConnectFour';
import Tetris from '../games/Tetris/Tetris';
import Maze from '../games/Maze/Maze';
import Solitaire from '../games/Solitaire/Solitaire';
import Sudoku from '../games/Sudoku/Sudoku';
import Reversi from '../games/Reversi/Reversi';
import Checkers from '../games/Checkers/Checkers';
import Chess from '../games/Chess/Chess';
import Blackjack from '../games/Blackjack/Blackjack';
import Poker from '../games/Poker/Poker';
import Hearts from '../games/Hearts/Hearts';
import WaterSort from '../games/WaterSort/WaterSort';
import WordSearch from '../games/WordSearch/WordSearch';
import BrickBreaker from '../games/BrickBreaker/BrickBreaker';
import Mahjong from '../games/Mahjong/Mahjong';
import Hangman from '../games/Hangman/Hangman';
import SimonSays from '../games/SimonSays/SimonSays';
import MemoryMatch from '../games/MemoryMatch/MemoryMatch';
import WordGuess from '../games/WordGuess/WordGuess';
import SpiderSolitaire from '../games/SpiderSolitaire/SpiderSolitaire';
import Battleship from '../games/Battleship/Battleship';
import Spades from '../games/Spades/Spades';
import CodeBreaker from '../games/CodeBreaker/CodeBreaker';
import FreeCell from '../games/FreeCell/FreeCell';
import Dominoes from '../games/Dominoes/Dominoes';
import Backgammon from '../games/Backgammon/Backgammon';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeColors } from '../utils/themes';
import { logGameStarted } from '../lib/analytics';
import { useInterstitialAd } from '../lib/useInterstitialAd';

type Props = NativeStackScreenProps<RootStackParamList, 'Game'>;
const { width } = Dimensions.get('window');

export default function GameScreen({ route }: Props) {
  const { colors } = useTheme();
  const { gameId } = route.params;
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [activeGameDifficulty, setActiveGameDifficulty] = useState<Difficulty | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showHighScores, setShowHighScores] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const gameMeta = GAMES.find((g) => g.id === gameId);
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { showAd } = useInterstitialAd();

  useEffect(() => {
    getActiveGame(gameId).then((savedDifficulty) => {
      setActiveGameDifficulty(savedDifficulty);
      setIsLoading(false);
    });
  }, [gameId]);

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
    return <View style={styles.container} />;
  }

  const renderContent = () => {
    if (!difficulty) {
      if (activeGameDifficulty) {
        return (
          <>
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
          </>
        );
      }

      return (
        <>
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
        </>
      );
    }

    switch (gameId) {
      case 'tic-tac-toe': return <TicTacToe difficulty={difficulty} />;
      case 'snake': return <Snake difficulty={difficulty} />;
      case '2048': return <Game2048 difficulty={difficulty} />;
      case 'minesweeper': return <Minesweeper difficulty={difficulty} />;
      case 'connect-four': return <ConnectFour difficulty={difficulty} />;
      case 'tetris': return <Tetris difficulty={difficulty} />;
      case 'maze': return <Maze difficulty={difficulty} />;
      case 'solitaire': return <Solitaire difficulty={difficulty} />;
      case 'sudoku': return <Sudoku difficulty={difficulty} />;
      case 'reversi': return <Reversi difficulty={difficulty} />;
      case 'checkers': return <Checkers difficulty={difficulty} />;
      case 'chess': return <Chess difficulty={difficulty} />;
      case 'blackjack': return <Blackjack difficulty={difficulty} />;
      case 'poker': return <Poker difficulty={difficulty} />;
      case 'hearts': return <Hearts difficulty={difficulty} />;
      case 'water-sort': return <WaterSort difficulty={difficulty} />;
      case 'word-search': return <WordSearch difficulty={difficulty} />;
      case 'brick-breaker': return <BrickBreaker difficulty={difficulty} />;
      case 'mahjong': return <Mahjong difficulty={difficulty} />;
      case 'hangman': return <Hangman difficulty={difficulty} />;
      case 'simon-says':
        return <SimonSays difficulty={difficulty} />;
      case 'memory-match':
        return <MemoryMatch difficulty={difficulty} />;
      case 'word-guess':
        return <WordGuess difficulty={difficulty} />;
      case 'spider-solitaire':
        return <SpiderSolitaire difficulty={difficulty} />;
      case 'battleship':
        return <Battleship difficulty={difficulty} />;
      case 'spades':
        return <Spades difficulty={difficulty} />;
      case 'code-breaker':
        return <CodeBreaker difficulty={difficulty} />;
      case 'freecell':
        return <FreeCell difficulty={difficulty} />;
      case 'dominoes':
        return <Dominoes difficulty={difficulty} />;
      case 'backgammon':
        return <Backgammon difficulty={difficulty} />;
      default: return <Text style={styles.error}>Unknown game</Text>;
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.background, colors.surface]} style={StyleSheet.absoluteFill} />
      {/* Mesh decorative elements */}
      <View style={[styles.blob, styles.blob1, { backgroundColor: (gameMeta?.color || colors.primary) + '10' }]} />
      {renderContent()}
    </View>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
