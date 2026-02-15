import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { playSound, preloadSounds, SoundId } from '../utils/sounds';

interface SoundContextType {
  isMuted: boolean;
  toggleMute: () => void;
  playSound: (soundId: SoundId) => void;
}

const STORAGE_KEY = '@sound_is_muted';

export const SoundContext = createContext<SoundContextType | undefined>(
  undefined
);

export const SoundProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const loadState = async () => {
      try {
        const storedValue = await AsyncStorage.getItem(STORAGE_KEY);
        if (storedValue !== null) {
          setIsMuted(JSON.parse(storedValue));
        }
      } catch (error) {
        console.error('Failed to load sound mute state', error);
      }
    };
    loadState();
    preloadSounds();
  }, []);

  const toggleMute = useCallback(async () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newMutedState));
    } catch (error) {
      console.error('Failed to save sound mute state', error);
    }
  }, [isMuted]);

  const playSoundCallback = useCallback(
    (soundId: SoundId) => {
      if (!isMuted) {
        playSound(soundId);
      }
    },
    [isMuted]
  );

  return (
    <SoundContext.Provider
      value={{ isMuted, toggleMute, playSound: playSoundCallback }}
    >
      {children}
    </SoundContext.Provider>
  );
};

export const useSound = (): SoundContextType => {
  const context = useContext(SoundContext);
  if (!context) {
    throw new Error('useSound must be used within a SoundProvider');
  }
  return context;
};
