import { useRef, useCallback } from "react";
import { useRoomStore } from "../stores/room.store";

/* ─────────────────────────────────────────────
 * useAudioPlayback
 * ─────────────────────────────────────────────
 * Manages AI audio playback via the Web Audio API.
 * Handles PCM chunk scheduling, lip-sync events,
 * and playback state tracking.
 * ───────────────────────────────────────────── */

/** Ensures a global AudioContext + mixer exist (shared with video recorder) */
function ensureAudioContext(sampleRate: number): AudioContext {
  if (!window.appAudioContext) {
    window.appAudioContext = new AudioContext({
      sampleRate,
      latencyHint: "interactive",
    });
  }

  const ctx = window.appAudioContext;

  if (ctx.state === "suspended") {
    void ctx.resume();
  }

  if (!window.audioMixer) {
    window.audioMixer = ctx.createGain();
    window.audioMixer.gain.value = 1.0;
    window.audioMixer.connect(ctx.destination);
  }

  return ctx;
}

export function useAudioPlayback() {
  const { setIsAiPlaying, setIsProcessing, setLastAiAudioEndTime } =
    useRoomStore();

  const isPlayingRef = useRef(false);
  const nextPlayTimeRef = useRef(0);
  const lastChunkReceivedRef = useRef(false);
  const activeSourcesRef = useRef(new Set<AudioBufferSourceNode>());
  const lipSyncCuesRef = useRef<unknown[]>([]);
  const lipSyncTimeOffsetRef = useRef(0);
  const hasDispatchedStartRef = useRef(false);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Reset all playback state */
  const resetPlayback = useCallback(() => {
    isPlayingRef.current = false;
    hasDispatchedStartRef.current = false;
    nextPlayTimeRef.current = 0;
    lastChunkReceivedRef.current = false;
    activeSourcesRef.current.clear();
    lipSyncCuesRef.current = [];
    lipSyncTimeOffsetRef.current = 0;

    setIsAiPlaying(false);
    setIsProcessing(false);
    setLastAiAudioEndTime(Date.now());

    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
    }
    resetTimeoutRef.current = setTimeout(() => {
      resetTimeoutRef.current = null;
      window.dispatchEvent(
        new CustomEvent("audioPlaybackChange", { detail: false }),
      );
    }, 100);
  }, [setIsAiPlaying, setIsProcessing, setLastAiAudioEndTime]);

  /** Stop all currently playing audio and reset */
  const stopAll = useCallback(() => {
    for (const source of activeSourcesRef.current) {
      try {
        source.stop();
      } catch {
        /* already stopped */
      }
    }
    resetPlayback();
  }, [resetPlayback]);

  /** Schedule a single PCM audio chunk for playback */
  const scheduleChunk = useCallback(
    (
      base64Data: string | null,
      isLastChunk: boolean,
      isStreaming: boolean,
      isFirstChunk: boolean,
    ) => {
      const sampleRate = isStreaming ? 24_000 : 48_000;
      const ctx = ensureAudioContext(sampleRate);

      // ── Consecutive message: cancel pending reset, re-anchor lipsync ──
      if (isFirstChunk) {
        if (resetTimeoutRef.current) {
          clearTimeout(resetTimeoutRef.current);
          resetTimeoutRef.current = null;
        }
        lastChunkReceivedRef.current = false;
        hasDispatchedStartRef.current = false;
      }

      if (isLastChunk) {
        lastChunkReceivedRef.current = true;
        if (!base64Data) return;
      }

      if (!base64Data) return;

      // Decode base64 → PCM Int16 → Float32
      const raw = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
      const pcm = new Int16Array(raw.buffer);
      const float32 = new Float32Array(pcm.length);

      for (let i = 0; i < pcm.length; i++) {
        let sample = (pcm[i] ?? 0) / 32_768;
        // Fade in/out to prevent clicks
        if (i < 100) sample *= i / 100;
        else if (i > pcm.length - 100)
          sample *= (pcm.length - i) / 100;
        float32[i] = sample;
      }

      const audioBuffer = ctx.createBuffer(1, float32.length, sampleRate);
      audioBuffer.getChannelData(0).set(float32);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

      const output = window.audioMixer ?? ctx.destination;
      source.connect(output);

      const startTime = Math.max(ctx.currentTime, nextPlayTimeRef.current);
      nextPlayTimeRef.current = startTime + audioBuffer.duration;

      activeSourcesRef.current.add(source);

      // Dispatch playback started
      if (!isPlayingRef.current) {
        isPlayingRef.current = true;
        hasDispatchedStartRef.current = false;
        setIsAiPlaying(true);
        window.dispatchEvent(
          new CustomEvent("audioPlaybackChange", { detail: true }),
        );
      }

      // Dispatch audio start for lip sync (once per message)
      if (!hasDispatchedStartRef.current) {
        hasDispatchedStartRef.current = true;
        // Convert Web Audio scheduled time to wall-clock for morph sync
        const wallClockStart =
          performance.now() / 1000 + (startTime - ctx.currentTime);
        window.dispatchEvent(
          new CustomEvent("avatarAudioStart", {
            detail: { startTime: wallClockStart },
          }),
        );
      }

      source.start(startTime);

      source.onended = () => {
        activeSourcesRef.current.delete(source);
        if (
          lastChunkReceivedRef.current &&
          activeSourcesRef.current.size === 0
        ) {
          resetPlayback();
        }
      };
    },
    [setIsAiPlaying, resetPlayback],
  );

  /** Accumulate lip-sync cues and dispatch to avatar */
  const handleLipSyncData = useCallback(
    (data: {
      cues: unknown[];
      duration: number;
      text: string;
      isFirstChunk: boolean;
      isLastChunk: boolean;
      chunkIndex: number;
    }) => {
      if (data.isFirstChunk || lipSyncCuesRef.current.length === 0) {
        lipSyncCuesRef.current = data.cues;
        lipSyncTimeOffsetRef.current = data.duration;
      } else {
        // Offset cue times by cumulative duration of previous chunks
        const offset = lipSyncTimeOffsetRef.current;
        const offsetCues = (data.cues as { start: number; end: number }[]).map(
          (cue) => ({ ...cue, start: cue.start + offset, end: cue.end + offset }),
        );
        lipSyncCuesRef.current = [
          ...lipSyncCuesRef.current,
          ...offsetCues,
        ];
        lipSyncTimeOffsetRef.current += data.duration;
      }

      window.dispatchEvent(
        new CustomEvent("avatarLipSyncData", {
          detail: {
            cues: lipSyncCuesRef.current,
            duration: data.duration,
            text: data.text,
            isFirstChunk: data.isFirstChunk,
            isLastChunk: data.isLastChunk,
            chunkIndex: data.chunkIndex,
          },
        }),
      );
    },
    [],
  );

  return {
    scheduleChunk,
    handleLipSyncData,
    stopAll,
    isPlayingRef,
  };
}

/* ── Augment Window for global audio context ── */
declare global {
  interface Window {
    appAudioContext?: AudioContext;
    audioMixer?: GainNode;
  }
}
