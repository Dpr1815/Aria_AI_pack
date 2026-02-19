/**
 * PCM to WAV Unit Tests
 */

import {
  pcmToWav,
  calculatePcmDuration,
  getPcmInfo,
  isValidPcmBuffer,
  PCM_DEFAULTS,
} from '@utils/audio/pcmToWav';

describe('pcmToWav', () => {
  it('creates a valid WAV file with correct header', () => {
    const pcmData = Buffer.alloc(48000); // 1 second at 24kHz 16-bit mono
    const wav = pcmToWav(pcmData);

    // WAV header is 44 bytes
    expect(wav.length).toBe(pcmData.length + 44);

    // Check RIFF header
    expect(wav.toString('ascii', 0, 4)).toBe('RIFF');
    expect(wav.toString('ascii', 8, 12)).toBe('WAVE');

    // Check fmt chunk
    expect(wav.toString('ascii', 12, 16)).toBe('fmt ');
    expect(wav.readUInt16LE(20)).toBe(1); // PCM format
    expect(wav.readUInt16LE(22)).toBe(1); // mono

    // Check data chunk
    expect(wav.toString('ascii', 36, 40)).toBe('data');
    expect(wav.readUInt32LE(40)).toBe(pcmData.length);
  });

  it('respects custom sample rate', () => {
    const pcmData = Buffer.alloc(100);
    const wav = pcmToWav(pcmData, { sampleRate: 44100 });
    expect(wav.readUInt32LE(24)).toBe(44100);
  });

  it('respects custom channel count', () => {
    const pcmData = Buffer.alloc(100);
    const wav = pcmToWav(pcmData, { numChannels: 2 });
    expect(wav.readUInt16LE(22)).toBe(2);
  });

  it('respects custom bits per sample', () => {
    const pcmData = Buffer.alloc(100);
    const wav = pcmToWav(pcmData, { bitsPerSample: 24 });
    expect(wav.readUInt16LE(34)).toBe(24);
  });

  it('calculates byte rate correctly', () => {
    const pcmData = Buffer.alloc(100);
    const wav = pcmToWav(pcmData, {
      sampleRate: 24000,
      numChannels: 1,
      bitsPerSample: 16,
    });
    // byteRate = 24000 * 1 * (16/8) = 48000
    expect(wav.readUInt32LE(28)).toBe(48000);
  });

  it('handles empty PCM buffer', () => {
    const wav = pcmToWav(Buffer.alloc(0));
    expect(wav.length).toBe(44); // header only
  });
});

describe('calculatePcmDuration', () => {
  it('calculates correct duration for default settings', () => {
    // 48000 bytes at 24kHz, 16-bit, mono = 1 second
    const pcm = Buffer.alloc(48000);
    expect(calculatePcmDuration(pcm)).toBeCloseTo(1.0, 2);
  });

  it('calculates duration for stereo audio', () => {
    // 96000 bytes at 24kHz, 16-bit, stereo = 1 second
    const pcm = Buffer.alloc(96000);
    expect(calculatePcmDuration(pcm, { numChannels: 2 })).toBeCloseTo(1.0, 2);
  });
});

describe('getPcmInfo', () => {
  it('returns comprehensive audio info', () => {
    const pcm = Buffer.alloc(48000);
    const info = getPcmInfo(pcm);

    expect(info.sampleRate).toBe(PCM_DEFAULTS.sampleRate);
    expect(info.numChannels).toBe(PCM_DEFAULTS.numChannels);
    expect(info.bitsPerSample).toBe(PCM_DEFAULTS.bitsPerSample);
    expect(info.duration).toBeCloseTo(1.0, 2);
    expect(info.sizeBytes).toBe(48000);
    expect(info.sizeWithHeader).toBe(48000 + 44);
  });
});

describe('isValidPcmBuffer', () => {
  it('returns true for valid PCM buffer', () => {
    const pcm = Buffer.alloc(48000);
    expect(isValidPcmBuffer(pcm)).toBe(true);
  });

  it('returns false for empty buffer', () => {
    expect(isValidPcmBuffer(Buffer.alloc(0))).toBe(false);
  });

  it('returns false for buffer with wrong alignment', () => {
    const pcm = Buffer.alloc(3);
    expect(isValidPcmBuffer(pcm)).toBe(false);
  });

  it('validates block alignment for stereo', () => {
    expect(isValidPcmBuffer(Buffer.alloc(8), { numChannels: 2 })).toBe(true);
    expect(isValidPcmBuffer(Buffer.alloc(5), { numChannels: 2 })).toBe(false);
  });
});
