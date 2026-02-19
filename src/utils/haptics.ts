import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HAPTIC_ENABLED_KEY = '@haptics_enabled';

export async function isHapticEnabled(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(HAPTIC_ENABLED_KEY);
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
}

export async function setHapticEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(HAPTIC_ENABLED_KEY, enabled.toString());
}

export async function triggerHaptic(type: 'success' | 'warning' | 'error' | 'light' | 'medium' | 'heavy' = 'light') {
  if (typeof window !== 'undefined') return; // Check if running in a web browser environment
  
  const enabled = await isHapticEnabled();
  if (!enabled) return;

  switch (type) {
    case 'success':
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      break;
    case 'warning':
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      break;
    case 'error':
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      break;
    case 'heavy':
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      break;
    case 'medium':
      await Haptics.impactFeedbackAsync(Haptics.ImpactFeedbackStyle.Medium);
      break;
    case 'light':
    default:
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      break;
  }
}
