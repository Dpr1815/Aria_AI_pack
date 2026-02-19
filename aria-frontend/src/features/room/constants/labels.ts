/* ─────────────────────────────────────────────
 * Configuration
 * ───────────────────────────────────────────── */

/** Delay (ms) after releasing the mic button before stopping the recording */
export const RECORDING_STOP_DELAY_MS = 500;

/** How long warning/error toasts stay visible (ms) */
export const TOAST_DURATION_MS = 4000;

/** Video recorder settings */
export const VIDEO_CONFIG = {
  video: {
    width: { ideal: 320 },
    height: { ideal: 240 },
    frameRate: { ideal: 15 },
    aspectRatio: 1.333333333 as const,
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 48000,
    channelCount: 1,
  },
} as const;

/** MediaRecorder options for video recording */
export const MEDIA_RECORDER_OPTIONS: MediaRecorderOptions = {
  mimeType: "video/webm;codecs=vp8,opus",
  videoBitsPerSecond: 250_000,
  audioBitsPerSecond: 128_000,
};


