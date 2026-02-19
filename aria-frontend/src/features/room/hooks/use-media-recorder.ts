import { useRef, useCallback } from "react";
import { RECORDING_STOP_DELAY_MS } from "../constants";

/* ─────────────────────────────────────────────
 * useMediaRecorder
 * ─────────────────────────────────────────────
 * Handles microphone access and recording.
 * Sends audio chunks as base64 via a callback.
 * ───────────────────────────────────────────── */

interface UseMediaRecorderOptions {
  /** Called with base64-encoded audio chunks during recording */
  onAudioChunk: (base64Data: string) => void;
  /** Called when recording starts successfully */
  onStart?: () => void;
  /** Called when recording stops */
  onStop?: () => void;
  /** Called on error */
  onError?: (error: Error) => void;
}

export function useMediaRecorder({
  onAudioChunk,
  onStart,
  onStop,
  onError,
}: UseMediaRecorderOptions) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const stopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRecordingRef = useRef(false);

  const start = useCallback(async () => {
    if (isRecordingRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(",")[1];
            if (base64) onAudioChunk(base64);
          };
          reader.readAsDataURL(event.data);
        }
      };

      recorder.start(250); // send chunks every 250ms
      recorderRef.current = recorder;
      isRecordingRef.current = true;
      onStart?.();
    } catch (err) {
      onError?.(
        err instanceof Error ? err : new Error("Failed to start recording"),
      );
    }
  }, [onAudioChunk, onStart, onError]);

  const stop = useCallback(() => {
    if (!isRecordingRef.current || !recorderRef.current) return;

    isRecordingRef.current = false;

    // Small delay to capture trailing audio
    stopTimeoutRef.current = setTimeout(() => {
      const recorder = recorderRef.current;
      if (!recorder) return;

      recorder.stop();

      // Stop all tracks to release the mic
      const stream = recorder.stream;
      stream.getTracks().forEach((track) => track.stop());

      recorderRef.current = null;
      onStop?.();
    }, RECORDING_STOP_DELAY_MS);
  }, [onStop]);

  const cleanup = useCallback(() => {
    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
    }
    if (recorderRef.current) {
      try {
        recorderRef.current.stop();
        recorderRef.current.stream
          .getTracks()
          .forEach((track) => track.stop());
      } catch {
        /* already stopped */
      }
      recorderRef.current = null;
    }
    isRecordingRef.current = false;
  }, []);

  return { start, stop, cleanup, isRecordingRef };
}
