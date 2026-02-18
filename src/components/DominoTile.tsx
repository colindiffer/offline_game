import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { radius, shadows } from '../utils/designTokens';

interface Props {
  sideA: number;
  sideB: number;
  horizontal?: boolean;
  style?: ViewStyle;
  pointerEvents?: 'auto' | 'none' | 'box-none' | 'box-only';
}

export default function DominoTile({ sideA, sideB, horizontal = false, style, pointerEvents }: Props) {
  const renderPips = (count: number) => {
    const pipPositions = [
        [], // 0
        [4], // 1
        [0, 8], // 2
        [0, 4, 8], // 3
        [0, 2, 6, 8], // 4
        [0, 2, 4, 6, 8], // 5
        [0, 2, 3, 5, 6, 8], // 6
    ];

    return (
        <View style={styles.pipGrid}>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <View key={i} style={styles.pipSlot}>
                    {pipPositions[count].includes(i) && (
                        <View style={styles.pip}>
                            <View style={styles.pipShine} />
                        </View>
                    )}
                </View>
            ))}
        </View>
    );
  };

  return (
    <View style={[styles.tile, horizontal ? styles.tileHorizontal : styles.tileVertical, style]} pointerEvents={pointerEvents}>
      {/* 3D Depth Side */}
      <View style={styles.depth} />
      
      <View style={[styles.surface, horizontal && { flexDirection: 'row' }]}>
        <View style={styles.side}>{renderPips(sideA)}</View>
        
        <View style={horizontal ? styles.dividerH : styles.dividerV}>
            <View style={styles.pin} />
        </View>
        
        <View style={styles.side}>{renderPips(sideB)}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: '#e0e0e0', // Slightly darker for the edge
    borderRadius: 6,
    ...shadows.md,
  },
  tileVertical: { width: 44, height: 88 },
  tileHorizontal: { width: 88, height: 44 },
  depth: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#bdc3c7',
    borderRadius: 6,
    transform: [{ translateX: 2 }, { translateY: 2 }],
  },
  surface: {
    flex: 1,
    backgroundColor: '#f5f6fa', // Bone white
    borderRadius: 5,
    padding: 4,
    borderWidth: 1,
    borderColor: '#fff',
  },
  side: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 2 },
  dividerV: { height: 2, backgroundColor: 'rgba(0,0,0,0.15)', marginHorizontal: 6, justifyContent: 'center', alignItems: 'center' },
  dividerH: { width: 2, backgroundColor: 'rgba(0,0,0,0.15)', marginVertical: 6, justifyContent: 'center', alignItems: 'center' },
  pin: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d4af37', // Gold/Brass pin
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.2)',
  },
  pipGrid: { width: '100%', height: '100%', flexDirection: 'row', flexWrap: 'wrap' },
  pipSlot: { width: '33.33%', height: '33.33%', justifyContent: 'center', alignItems: 'center' },
  pip: { 
    width: 8, 
    height: 8, 
    borderRadius: 4, 
    backgroundColor: '#2d3436',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pipShine: {
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    top: -1,
    left: -1,
  },
});
