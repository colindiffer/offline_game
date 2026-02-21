import React, { useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { logScreenView } from './src/lib/analytics';
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
  const navRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const routeNameRef = useRef<string | undefined>(undefined);

  return (
    <NavigationContainer
      ref={navRef}
      onReady={() => {
        routeNameRef.current = navRef.current?.getCurrentRoute()?.name;
      }}
      onStateChange={async () => {
        const currentRoute = navRef.current?.getCurrentRoute();
        const currentRouteName = currentRoute?.name;
        if (currentRouteName && currentRouteName !== routeNameRef.current) {
          await logScreenView(currentRouteName);
          routeNameRef.current = currentRouteName;
        }
      }}
    >
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
              'connect-four': '4 in a Row',
              'tetris': 'Block Drop',
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
              'battleship': 'Sea Battle',
              'spades': 'Spades',
              'code-breaker': 'Code Breaker',
              'freecell': 'FreeCell',
              'dominoes': 'Dominoes',
              'backgammon': 'Backgammon',
            };
            return {
              title: titles[route.params.gameId],
              animation: 'slide_from_right',
              headerShown: false,
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
