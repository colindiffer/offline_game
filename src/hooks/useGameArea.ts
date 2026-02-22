import { useState, useCallback } from 'react';
import { LayoutChangeEvent, useWindowDimensions } from 'react-native';

/**
 * Measures the actual rendered game area dimensions.
 * Add `onLayout={onLayout}` to the flex:1 gameArea View in each game.
 * Falls back to a reasonable estimate (55% screen height) before layout fires.
 */
export function useGameArea() {
  const { width, height } = useWindowDimensions();
  const [areaWidth, setAreaWidth] = useState(width - 32);
  const [areaHeight, setAreaHeight] = useState(height * 0.55);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    if (w > 0) setAreaWidth(w);
    if (h > 0) setAreaHeight(h);
  }, []);

  return { areaWidth, areaHeight, onLayout };
}
