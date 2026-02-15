import { Audio } from 'expo-av';

export type SoundId = 'tap' | 'win' | 'lose' | 'eat' | 'merge' | 'drop' | 'clear' | 'flag';

const SOUND_FILES: Record<SoundId, any> = {
  tap: require('../../assets/sounds/tap.wav'),
  win: require('../../assets/sounds/win.wav'),
  lose: require('../../assets/sounds/lose.wav'),
  eat: require('../../assets/sounds/eat.wav'),
  merge: require('../../assets/sounds/merge.wav'),
  drop: require('../../assets/sounds/drop.wav'),
  clear: require('../../assets/sounds/clear.wav'),
  flag: require('../../assets/sounds/flag.wav'),
};

const soundCache: Partial<Record<SoundId, Audio.Sound>> = {};

export async function preloadSounds() {
  for (const key in SOUND_FILES) {
    const soundId = key as SoundId;
    try {
      const { sound } = await Audio.Sound.createAsync(SOUND_FILES[soundId]);
      soundCache[soundId] = sound;
    } catch (error) {
      console.error(`Failed to load sound: ${soundId}`, error);
    }
  }
}

export async function playSound(soundId: SoundId) {
  try {
    const soundObject = soundCache[soundId];
    if (soundObject) {
      await soundObject.replayAsync();
    }
  } catch (error) {
    console.error(`Failed to play sound: ${soundId}`, error);
  }
}
