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
const BOARD_SIZE = SCREEN_WIDTH - 16; // Reduced margins from 32 to 16

export default function Mahjong({ difficulty }: Props) {
  const { colors } = useTheme();
  const { playSound } = useSound();

  const [level, setLevelState] = useState(1);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [gameWon, setGameWon] = useState(false);
  const [highScore, setHighScoreState] = useState(0);
  const [isReady, setIsReady] = useState(false);

  const startTimeRef = useRef<number | null>(null);

  const metrics = useMemo(() => {
    if (tiles.length === 0) return { tileWidth: 50, tileHeight: 65, width: 0, height: 0 };
    
    let maxCol = 0;
    let maxRow = 0;
    tiles.forEach(t => {
      if (t.col > maxCol) maxCol = t.col;
      if (t.row > maxRow) maxRow = t.row;
    });
    
    // Use 0.9 overlap to allow tiles to be bigger
    const tileWidth = Math.floor(BOARD_SIZE / (maxCol * 0.9 + 1));
    const tileHeight = Math.floor(tileWidth * 1.3);
    
    return {
      tileWidth,
      tileHeight,
      width: (maxCol * 0.9 + 1) * tileWidth,
      height: (maxRow * 0.8 + 1) * tileHeight
    };
  }, [tiles]);

  const styles = useMemo(() => getStyles(colors, metrics.tileWidth, metrics.tileHeight), [colors, metrics]);

  useEffect(() => {
    const init = async () => {
      const savedLevel = await getLevel('mahjong', difficulty);
      const best = await getHighScore('mahjong', difficulty);
      setLevelState(savedLevel);
      setHighScoreState(best);
      setTiles(initializeMahjong(difficulty, savedLevel));
      setIsReady(true);
      startTimeRef.current = Date.now();
    };
    init();
  }, [difficulty]);

  const handleTilePress = useCallback((tile: Tile) => {
    if (gameWon || !tile.visible || !isTileFree(tile, tiles)) {
      playSound('tap'); 
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
          const finalTime = Math.floor((Date.now() - (startTimeRef.current || Date.now())) / 1000);
          if (finalTime < highScore || highScore === 0) {
            setHighScoreState(finalTime);
            setHighScore('mahjong', finalTime, difficulty);
          }
          recordGameResult('mahjong', 'win', finalTime);
        }
      } else {
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

  const sortedTiles = [...tiles].sort((a, b) => {
    if (a.layer !== b.layer) return a.layer - b.layer;
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });

  const getTileColor = (type: string) => {
    const green = ['🀅', '🀐', '🀑', '🀒', '🀓', '🀔', '🀕', '🀖', '🀗'];
    const red = ['🀄', '🀇', '🀈', '🀉', '🀊', '🀋', '🀌', '🀍', '🀎'];
    const blue = ['🀀', '🀁', '🀂', '🀃', '🀙', '🀚', '🀛', '🀜', '🀝'];
    if (green.includes(type)) return '#27ae60';
    if (red.includes(type)) return '#e74c3c';
    if (blue.includes(type)) return '#2980b9';
    return '#2d3436';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.bgIcon}>🀄</Text>
      <LinearGradient colors={['#2c3e50', '#000000']} style={StyleSheet.absoluteFill} />
      <Header title="Mahjong" score={tiles.filter(t => !t.visible).length / 2} scoreLabel="PAIRS" highScore={level} highScoreLabel="LEVEL" />
      
      <View style={styles.levelHeader}>
        <Text style={styles.levelText}>Level {level}</Text>
      </View>

      <View style={styles.gameArea}>
        <View style={[styles.board, { width: metrics.width, height: metrics.height }]}>
          {sortedTiles.map(tile => tile.visible && (
            <TouchableOpacity
              key={tile.id}
              activeOpacity={0.9}
              onPress={() => handleTilePress(tile)}
              style={[
                styles.tileWrapper,
                {
                  left: tile.col * metrics.tileWidth * 0.9 + (tile.layer * 4),
                  top: tile.row * metrics.tileHeight * 0.8 - (tile.layer * 4),
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
                <View style={styles.tileBottom} />
                <LinearGradient colors={['#ffffff', '#f1f2f6']} style={styles.tileFace}>
                  <Text style={[
                    styles.tileIcon, 
                    { 
                      color: getTileColor(tile.type), 
                      fontSize: metrics.tileWidth * 0.95,
                    }
                  ]}>
                    {tile.type}
                  </Text>
                </LinearGradient>
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

const getStyles = (colors: ThemeColors, tileWidth: number, tileHeight: number) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  levelHeader: { alignItems: 'center', marginTop: spacing.md },
  levelText: { color: '#fff', fontSize: 24, fontWeight: '900' },
  gameArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  board: {
    position: 'relative',
  },
  tileWrapper: {
    position: 'absolute',
    width: tileWidth,
    height: tileHeight,
  },
  tile: {
    flex: 1,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    ...shadows.md,
  },
  tileSide: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 6,
    backgroundColor: '#27ae60', // Classic green Mahjong base
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(0,0,0,0.2)',
  },
  tileBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: '#219150',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.2)',
  },
  tileFace: {
    flex: 1,
    marginRight: 2,
    marginBottom: 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 2,
  },
  tileIcon: {
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  selectedTile: {
    borderColor: '#fab1a0',
    borderWidth: 2,
    transform: [{ scale: 1.1 }, { translateY: -4 }],
    zIndex: 1000,
  },
  blockedTile: {
    backgroundColor: '#dcdde1',
    opacity: 0.6,
  },
  footer: { padding: spacing.xl, paddingBottom: Platform.OS === 'ios' ? 40 : spacing.xl },
  footerText: { color: colors.text, fontWeight: 'bold' },
  bgIcon: {
    position: 'absolute',
    bottom: '5%',
    left: '-10%',
    fontSize: 250,
    opacity: 0.03,
    transform: [{ rotate: '-15deg' }],
  },
});
