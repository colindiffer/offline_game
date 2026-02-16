import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Header from '../../components/Header';
import GameOverOverlay from '../../components/GameOverOverlay';
import PremiumButton from '../../components/PremiumButton';
import { useTheme } from '../../contexts/ThemeContext';
import { useSound } from '../../contexts/SoundContext';
import { getHighScore, setHighScore, getLevel, setLevel } from '../../utils/storage';
import { recordGameResult } from '../../utils/stats';
import { Difficulty } from '../../types';
import { ThemeColors } from '../../utils/themes';
import { spacing, radius, shadows, typography } from '../../utils/designTokens';
import { initializeMahjong, isTileFree, Tile } from './logic';

const SCREEN_WIDTH = Dimensions.get('window').width;
const BOARD_SIZE = SCREEN_WIDTH - 32;
const TILE_WIDTH = Math.floor(BOARD_SIZE / 8);
const TILE_HEIGHT = Math.floor(TILE_WIDTH * 1.3);

export default function Mahjong({ difficulty }: Props) {
  const { colors } = useTheme();
  const { playSound } = useSound();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [level, setLevelState] = useState(1);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [gameWon, setGameWon] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      const savedLevel = await getLevel('mahjong', difficulty);
      setLevelState(savedLevel);
      setTiles(initializeMahjong(difficulty, savedLevel));
      setIsReady(true);
    };
    init();
  }, [difficulty]);

  const handleTilePress = useCallback((tile: Tile) => {
    if (gameWon || !tile.visible || !isTileFree(tile, tiles)) {
      playSound('tap'); // Sound for blocked tile
      return;
    }

    if (selectedId === null) {
      setSelectedId(tile.id);
      playSound('tap');
    } else if (selectedId === tile.id) {
      setSelectedId(null);
      playSound('tap');
    } else {
      const otherTile = tiles.find(t => t.id === selectedId);
      if (otherTile && otherTile.type === tile.type) {
        // Match!
        const newTiles = tiles.map(t => 
          (t.id === tile.id || t.id === selectedId) ? { ...t, visible: false } : t
        );
        setTiles(newTiles);
        setSelectedId(null);
        playSound('drop');

        if (newTiles.every(t => !t.visible)) {
          setGameWon(true);
          playSound('win');
          const nextLvl = level + 1;
          setLevel('mahjong', difficulty, nextLvl);
          recordGameResult('mahjong', 'win', 0);
        }
      } else {
        // No match
        setSelectedId(tile.id);
        playSound('tap');
      }
    }
  }, [tiles, selectedId, gameWon, level, difficulty, playSound]);

  const resetLevel = useCallback(() => {
    setTiles(initializeMahjong(difficulty, level));
    setSelectedId(null);
    setGameWon(false);
  }, [difficulty, level]);

  const nextLevel = useCallback(async () => {
    const savedLevel = await getLevel('mahjong', difficulty);
    setLevelState(savedLevel);
    setTiles(initializeMahjong(difficulty, savedLevel));
    setSelectedId(null);
    setGameWon(false);
  }, [difficulty]);

  if (!isReady) return <View style={styles.container} />;

  // Sort visible tiles for proper stacking order (bottom to top)
  const sortedTiles = [...tiles].sort((a, b) => {
    if (a.layer !== b.layer) return a.layer - b.layer;
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });

  return (
    <View style={styles.container}>
      <Header score={tiles.filter(t => !t.visible).length / 2} scoreLabel="PAIRS" highScore={level} highScoreLabel="LEVEL" />
      
      <View style={styles.levelHeader}>
        <Text style={styles.levelText}>Level {level}</Text>
      </View>

      <View style={styles.gameArea}>
        <View style={styles.board}>
          {sortedTiles.map(tile => tile.visible && (
            <TouchableOpacity
              key={tile.id}
              activeOpacity={0.9}
              onPress={() => handleTilePress(tile)}
              style={[
                styles.tileWrapper,
                {
                  left: tile.col * TILE_WIDTH + (tile.layer * 4),
                  top: tile.row * TILE_HEIGHT * 0.8 - (tile.layer * 4),
                  zIndex: tile.layer * 100 + tile.row,
                }
              ]}
            >
              <View style={[
                styles.tile,
                selectedId === tile.id && styles.selectedTile,
                !isTileFree(tile, tiles) && styles.blockedTile
              ]}>
                <View style={styles.tileSide} />
                <View style={styles.tileFace}>
                  <Text style={styles.tileIcon}>{tile.type}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <PremiumButton variant="secondary" height={50} onPress={resetLevel}>
          <Text style={styles.footerText}>RESET BOARD</Text>
        </PremiumButton>
      </View>

      {gameWon && (
        <GameOverOverlay 
          result="win" 
          title="BOARD CLEARED!" 
          subtitle="You matched all tiles." 
          onPlayAgain={nextLevel}
          onPlayAgainLabel="NEXT LEVEL"
        />
      )}
    </View>
  );
}

interface Props {
  difficulty: Difficulty;
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  levelHeader: { alignItems: 'center', marginTop: spacing.md },
  levelText: { color: '#fff', fontSize: 24, fontWeight: '900' },
  gameArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  board: {
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    position: 'relative',
  },
  tileWrapper: {
    position: 'absolute',
    width: TILE_WIDTH,
    height: TILE_HEIGHT,
  },
  tile: {
    flex: 1,
    backgroundColor: '#f5f6fa',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#dcdde1',
    ...shadows.sm,
  },
  tileSide: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: '100%',
    height: '100%',
    backgroundColor: '#bdc3c7',
    borderRadius: 4,
    zIndex: -1,
  },
  tileFace: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 3,
    margin: 2,
  },
  tileIcon: {
    fontSize: TILE_WIDTH * 0.6,
    color: '#2d3436',
  },
  selectedTile: {
    borderColor: '#fab1a0',
    borderWidth: 2,
    transform: [{ translateY: -4 }],
  },
  blockedTile: {
    opacity: 0.8,
    backgroundColor: '#dcdde1',
  },
  footer: { padding: spacing.xl, paddingBottom: Platform.OS === 'ios' ? 40 : spacing.xl },
  footerText: { color: colors.text, fontWeight: 'bold' },
});
