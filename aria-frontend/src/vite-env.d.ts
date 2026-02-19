/// <reference types="vite/client" />

/* ─────────────────────────────────────────────
 * Global augmentations
 * ─────────────────────────────────────────────
 * Type-safe declarations for audio globals shared
 * between VideoRecorder and the audio playback system.
 * ───────────────────────────────────────────── */

declare global {
  interface Window {
    /** Shared AudioContext for mixing mic + AI playback audio */
    appAudioContext?: AudioContext;
    /** GainNode that carries the AI audio output for mixing into recordings */
    audioMixer?: GainNode;
  }
}

export {};
