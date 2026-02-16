import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import HomeScreen from './src/screens/HomeScreen';
import GameScreen from './src/screens/GameScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { GameId, RootStackParamList } from './src/types';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { SoundProvider } from './src/contexts/SoundContext';

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppContent() {
  const { colors, themeId } = useTheme();

  return (
    <NavigationContainer>
      <StatusBar style={themeId === 'dark' ? 'light' : 'dark'} />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: 'bold' },
          contentStyle: { backgroundColor: colors.background },
          headerShadowVisible: true,
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Game"
          component={GameScreen}
          options={({ route }) => {
            const titles: Record<GameId, string> = {
              'tic-tac-toe': 'Tic Tac Toe',
              snake: 'Snake',
              '2048': '2048',
              'minesweeper': 'Minesweeper',
              'connect-four': 'Connect Four',
              'tetris': 'Tetris',
              'maze': 'Maze',
              'solitaire': 'Solitaire',
              'sudoku': 'Sudoku',
              'reversi': 'Reversi',
              'checkers': 'Checkers',
              'chess': 'Chess',
              'blackjack': 'Blackjack',
              'poker': 'Poker',
              'hearts': 'Hearts',
              'water-sort': 'Water Sort',
              'word-search': 'Word Search',
              'brick-breaker': 'Brick Breaker',
              'mahjong': 'Mahjong',
              'hangman': 'Hangman',
              'simon-says': 'Simon Says',
              'memory-match': 'Memory Match',
              'word-guess': 'Word Guess',
              'spider-solitaire': 'Spider Solitaire',
            };
            return {
              title: titles[route.params.gameId],
              animation: 'slide_from_right',
            };
          }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            animation: 'slide_from_bottom',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SoundProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </SoundProvider>
    </GestureHandlerRootView>
  );
}
