import { Animated } from 'react-native';
import { duration } from './designTokens';

/**
 * Creates a fade + slide-from-bottom entrance animation.
 * Returns { opacity, translateY, start() }
 */
export function fadeSlideIn(config?: { delay?: number }) {
  const opacity = new Animated.Value(0);
  const translateY = new Animated.Value(30);

  const start = () => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: duration.overlay,
        delay: config?.delay ?? 0,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        friction: 8,
        tension: 65,
        delay: config?.delay ?? 0,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return { opacity, translateY, start };
}

/**
 * Creates a fade + slide-down exit animation.
 * Returns { opacity, translateY, start(callback) }
 */
export function fadeSlideOut(
  opacityVal: Animated.Value,
  translateYVal: Animated.Value,
) {
  const start = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(opacityVal, {
        toValue: 0,
        duration: duration.normal,
        useNativeDriver: true,
      }),
      Animated.timing(translateYVal, {
        toValue: 30,
        duration: duration.normal,
        useNativeDriver: true,
      }),
    ]).start(callback ? () => callback() : undefined);
  };

  return { start };
}

/**
 * Creates a scale-pop animation for celebration moments.
 * Returns { scale, start() }
 */
export function celebrationPop() {
  const scale = new Animated.Value(0);

  const start = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 4,
      tension: 80,
      useNativeDriver: true,
    }).start();
  };

  return { scale, start };
}

/**
 * Creates staggered entrance animations for a list of items.
 * Returns an array of { opacity, translateY } and a start() function.
 */
export function staggeredEntrance(count: number, staggerDelay = 30) {
  const items = Array.from({ length: count }, () => ({
    opacity: new Animated.Value(0),
    translateY: new Animated.Value(20),
  }));

  const start = () => {
    const animations = items.map((item, index) =>
      Animated.parallel([
        Animated.timing(item.opacity, {
          toValue: 1,
          duration: duration.overlay,
          delay: index * staggerDelay,
          useNativeDriver: true,
        }),
        Animated.spring(item.translateY, {
          toValue: 0,
          friction: 8,
          tension: 65,
          delay: index * staggerDelay,
          useNativeDriver: true,
        }),
      ]),
    );
    Animated.parallel(animations).start();
  };

  return { items, start };
}
