/**
 * PCM Fade Utilities
 *
 * Applies short fade-in / fade-out ramps to raw LINEAR16 PCM buffers
 * to eliminate clicks caused by waveform discontinuities at chunk boundaries.
 *
 * When TTS chunks are synthesized independently the last sample of chunk N
 * and the first sample of chunk N+1 are almost never at zero — the abrupt
 * jump produces an audible click. A ~5 ms cosine ramp smooths this out
 * without any perceptible change to the speech.
 */

const DEFAULT_FADE_SAMPLES = 120; // ~5 ms @ 24 kHz
const BYTES_PER_SAMPLE = 2; // LINEAR16

/**
 * Apply a fade-in and/or fade-out to a signed-16-bit-LE PCM buffer (in-place).
 *
 * @param pcm        Raw LINEAR16 PCM buffer (modified in-place)
 * @param sampleRate Audio sample rate (used to cap fade length)
 * @param options    Which edges to fade. Defaults to both.
 * @returns          The same buffer (for chaining)
 */
export function applyPcmFades(
  pcm: Buffer,
  sampleRate: number,
  options: { fadeIn?: boolean; fadeOut?: boolean; fadeSamples?: number } = {}
): Buffer {
  const { fadeIn = true, fadeOut = true, fadeSamples = DEFAULT_FADE_SAMPLES } = options;

  const totalSamples = Math.floor(pcm.length / BYTES_PER_SAMPLE);
  // Never fade more than half the buffer
  const rampLen = Math.min(fadeSamples, Math.floor(totalSamples / 2));
  if (rampLen <= 0) return pcm;

  if (fadeIn) {
    for (let i = 0; i < rampLen; i++) {
      const gain = 0.5 * (1 - Math.cos((Math.PI * i) / rampLen)); // cosine ramp 0→1
      const offset = i * BYTES_PER_SAMPLE;
      const sample = pcm.readInt16LE(offset);
      pcm.writeInt16LE(Math.round(sample * gain), offset);
    }
  }

  if (fadeOut) {
    for (let i = 0; i < rampLen; i++) {
      const gain = 0.5 * (1 - Math.cos((Math.PI * i) / rampLen)); // cosine ramp 0→1
      const offset = (totalSamples - 1 - i) * BYTES_PER_SAMPLE;
      const sample = pcm.readInt16LE(offset);
      pcm.writeInt16LE(Math.round(sample * gain), offset);
    }
  }

  return pcm;
}
