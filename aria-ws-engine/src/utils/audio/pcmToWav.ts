/**
 * PCM to WAV Converter
 *
 * Converts raw PCM audio buffer to WAV format by adding the appropriate header.
 * Used for Rhubarb lip sync which requires WAV input.
 */

// ============================================
// Types
// ============================================

export interface WavOptions {
  sampleRate?: number;
  numChannels?: number;
  bitsPerSample?: number;
}

// ============================================
// Constants
// ============================================

const DEFAULT_SAMPLE_RATE = 24000;
const DEFAULT_NUM_CHANNELS = 1;
const DEFAULT_BITS_PER_SAMPLE = 16;
const WAV_HEADER_SIZE = 44;

// ============================================
// Main Function
// ============================================

/**
 * Convert PCM buffer to WAV format.
 *
 * @param pcmBuffer - Raw PCM audio data (LINEAR16)
 * @param options - WAV configuration options
 * @returns Complete WAV file as Buffer
 *
 * @example
 * ```typescript
 * const wavBuffer = pcmToWav(pcmData, { sampleRate: 24000 });
 * fs.writeFileSync('output.wav', wavBuffer);
 * ```
 */
export function pcmToWav(pcmBuffer: Buffer, options: WavOptions = {}): Buffer {
  const {
    sampleRate = DEFAULT_SAMPLE_RATE,
    numChannels = DEFAULT_NUM_CHANNELS,
    bitsPerSample = DEFAULT_BITS_PER_SAMPLE,
  } = options;

  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmBuffer.length;
  const fileSize = WAV_HEADER_SIZE + dataSize - 8;

  const header = Buffer.alloc(WAV_HEADER_SIZE);
  let offset = 0;

  // RIFF chunk descriptor
  header.write('RIFF', offset);
  offset += 4;
  header.writeUInt32LE(fileSize, offset);
  offset += 4;
  header.write('WAVE', offset);
  offset += 4;

  // fmt sub-chunk
  header.write('fmt ', offset);
  offset += 4;
  header.writeUInt32LE(16, offset); // Subchunk1Size (16 for PCM)
  offset += 4;
  header.writeUInt16LE(1, offset); // AudioFormat (1 for PCM)
  offset += 2;
  header.writeUInt16LE(numChannels, offset);
  offset += 2;
  header.writeUInt32LE(sampleRate, offset);
  offset += 4;
  header.writeUInt32LE(byteRate, offset);
  offset += 4;
  header.writeUInt16LE(blockAlign, offset);
  offset += 2;
  header.writeUInt16LE(bitsPerSample, offset);
  offset += 2;

  // data sub-chunk
  header.write('data', offset);
  offset += 4;
  header.writeUInt32LE(dataSize, offset);

  return Buffer.concat([header, pcmBuffer]);
}

// ============================================
// WAV Header Detection & Stripping
// ============================================

/**
 * Check if a buffer starts with a RIFF/WAV header.
 * Google Cloud TTS LINEAR16 responses include a 44-byte WAV header.
 */
export function hasWavHeader(buffer: Buffer): boolean {
  if (buffer.length < WAV_HEADER_SIZE) return false;
  return buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WAVE';
}

/**
 * Strip the WAV header from a buffer if present, returning raw PCM.
 * Safe to call on buffers that are already raw PCM — returns them unchanged.
 */
export function stripWavHeader(buffer: Buffer): Buffer {
  if (!hasWavHeader(buffer)) return buffer;
  return buffer.subarray(WAV_HEADER_SIZE);
}

// ============================================
// Helper Functions
// ============================================

/**
 * Calculate duration of PCM audio in seconds.
 *
 * @param pcmBuffer - Raw PCM audio data
 * @param options - Audio configuration
 * @returns Duration in seconds
 */
export function calculatePcmDuration(pcmBuffer: Buffer, options: WavOptions = {}): number {
  const {
    sampleRate = DEFAULT_SAMPLE_RATE,
    numChannels = DEFAULT_NUM_CHANNELS,
    bitsPerSample = DEFAULT_BITS_PER_SAMPLE,
  } = options;

  const bytesPerSample = bitsPerSample / 8;
  const totalSamples = pcmBuffer.length / (bytesPerSample * numChannels);
  return totalSamples / sampleRate;
}

/**
 * Get audio info from PCM buffer.
 */
export function getPcmInfo(pcmBuffer: Buffer, options: WavOptions = {}) {
  const {
    sampleRate = DEFAULT_SAMPLE_RATE,
    numChannels = DEFAULT_NUM_CHANNELS,
    bitsPerSample = DEFAULT_BITS_PER_SAMPLE,
  } = options;

  const duration = calculatePcmDuration(pcmBuffer, options);
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);

  return {
    sampleRate,
    numChannels,
    bitsPerSample,
    byteRate,
    duration,
    sizeBytes: pcmBuffer.length,
    sizeWithHeader: pcmBuffer.length + WAV_HEADER_SIZE,
  };
}

/**
 * Validate PCM buffer.
 * Checks if buffer size is valid for the given audio format.
 */
export function isValidPcmBuffer(pcmBuffer: Buffer, options: WavOptions = {}): boolean {
  const { numChannels = DEFAULT_NUM_CHANNELS, bitsPerSample = DEFAULT_BITS_PER_SAMPLE } = options;

  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;

  // Buffer size should be a multiple of block align
  return pcmBuffer.length > 0 && pcmBuffer.length % blockAlign === 0;
}

// ============================================
// Defaults Export
// ============================================

export const PCM_DEFAULTS = {
  sampleRate: DEFAULT_SAMPLE_RATE,
  numChannels: DEFAULT_NUM_CHANNELS,
  bitsPerSample: DEFAULT_BITS_PER_SAMPLE,
  headerSize: WAV_HEADER_SIZE,
} as const;
