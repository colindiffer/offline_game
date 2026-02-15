const fs = require('fs');
const path = require('path');

// Function to generate a simple WAV file
function generateWav(filePath, duration, frequency, volume) {
  const sampleRate = 44100;
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = Buffer.alloc(44 + numSamples * 2);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);

  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Chunk size
  buffer.writeUInt16LE(1, 20); // Audio format (1 = PCM)
  buffer.writeUInt16LE(1, 22); // Num channels
  buffer.writeUInt32LE(sampleRate, 24); // Sample rate
  buffer.writeUInt32LE(sampleRate * 2, 28); // Byte rate
  buffer.writeUInt16LE(2, 32); // Block align
  buffer.writeUInt16LE(16, 34); // Bits per sample

  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  // Generate sine wave
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const value = Math.sin(2 * Math.PI * frequency * t) * volume * 32767;
    buffer.writeInt16LE(value, 44 + i * 2);
  }

  fs.writeFileSync(filePath, buffer);
}

const soundsDir = path.join(__dirname, 'assets', 'sounds');

const soundFiles = {
  'tap.wav': { duration: 0.05, frequency: 440, volume: 0.5 },
  'win.wav': { duration: 0.5, frequency: 880, volume: 0.5 },
  'lose.wav': { duration: 0.5, frequency: 220, volume: 0.5 },
  'eat.wav': { duration: 0.1, frequency: 660, volume: 0.5 },
  'merge.wav': { duration: 0.1, frequency: 550, volume: 0.5 },
  'drop.wav': { duration: 0.1, frequency: 330, volume: 0.5 },
  'clear.wav': { duration: 0.2, frequency: 770, volume: 0.5 },
  'flag.wav': { duration: 0.1, frequency: 990, volume: 0.5 },
};

for (const [fileName, options] of Object.entries(soundFiles)) {
  const filePath = path.join(soundsDir, fileName);
  generateWav(filePath, options.duration, options.frequency, options.volume);
  console.log(`Generated ${fileName}`);
}
