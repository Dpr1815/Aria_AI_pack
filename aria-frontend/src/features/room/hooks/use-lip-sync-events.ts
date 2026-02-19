import { useRef, useEffect } from "react";
import type { LipSyncCue, LipSyncEventDetail, AudioStartEventDetail } from "../types";

/* ─────────────────────────────────────────────
 * useLipSyncEvents
 * ─────────────────────────────────────────────
 * Subscribes to avatar lip-sync CustomEvents
 * dispatched by the audio playback system.
 * Returns reactive refs consumed by the morph
 * target animation loop at 60 fps.
 *
 * All state is ref-based to avoid React
 * re-renders on every frame.
 * ───────────────────────────────────────────── */

export interface LipSyncRefs {
  cuesRef: React.RefObject<LipSyncCue[]>;
  audioStartTimeRef: React.RefObject<number>;
  isSpeakingRef: React.RefObject<boolean>;
  isLastChunkRef: React.RefObject<boolean>;
}

export function useLipSyncEvents(): LipSyncRefs {
  const cuesRef = useRef<LipSyncCue[]>([]);
  const audioStartTimeRef = useRef(0);
  const isSpeakingRef = useRef(false);
  const isLastChunkRef = useRef(false);

  useEffect(() => {
    const handleLipSyncData = (e: Event) => {
      const { cues, isFirstChunk, isLastChunk } =
        (e as CustomEvent<LipSyncEventDetail>).detail;

      if (isFirstChunk) {
        isLastChunkRef.current = false;
      }

      cuesRef.current = cues;

      if (isLastChunk) {
        isLastChunkRef.current = true;
      }
    };

    const handleAudioStart = (e: Event) => {
      const { startTime } = (e as CustomEvent<AudioStartEventDetail>).detail;
      audioStartTimeRef.current = startTime;
    };

    const handlePlaybackChange = (e: Event) => {
      const isPlaying = (e as CustomEvent<boolean>).detail;
      isSpeakingRef.current = isPlaying;

      if (!isPlaying) {
        cuesRef.current = [];
        isLastChunkRef.current = false;
      }
    };

    window.addEventListener("avatarLipSyncData", handleLipSyncData);
    window.addEventListener("avatarAudioStart", handleAudioStart);
    window.addEventListener("audioPlaybackChange", handlePlaybackChange);

    return () => {
      window.removeEventListener("avatarLipSyncData", handleLipSyncData);
      window.removeEventListener("avatarAudioStart", handleAudioStart);
      window.removeEventListener("audioPlaybackChange", handlePlaybackChange);
    };
  }, []);

  return { cuesRef, audioStartTimeRef, isSpeakingRef, isLastChunkRef };
}
