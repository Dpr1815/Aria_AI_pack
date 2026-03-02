import { useEffect, useRef, useCallback } from "react";
import { RoomWebSocket } from "../api";
import { useRoomStore } from "../stores/room.store";
import { actionRegistry } from "../actions";
import { useAudioPlayback } from "./use-audio-playback";
import { useMediaRecorder } from "./use-media-recorder";
import type { WsInboundMessage } from "../types";
import { TOAST_DURATION_MS } from "../constants";

/* ─────────────────────────────────────────────
 * useRoomWebSocket
 * ─────────────────────────────────────────────
 * Orchestrates the WebSocket lifecycle:
 *  - Connects + sends init (accessToken) on mount
 *  - Routes inbound messages to the store
 *  - Delegates server actions to the action registry
 *  - Exposes mic start/stop (press-to-talk)
 *  - Handles data submission (assessment, etc.)
 * ───────────────────────────────────────────── */

interface UseRoomWebSocketParams {
  accessToken: string;
}

export function useRoomWebSocket(params: UseRoomWebSocketParams | null) {
  const wsRef = useRef<RoomWebSocket | null>(null);
  const lockRef = useRef(false);
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    setIsProcessing,
    setIsTranscriptLoading,
    setCurrentStep,
    setCurrentSlide,
    setStepProgress,
    addChatMessage,
    showError,
    hideError,
    showWarning,
    hideWarning,
    setIsRecording,
    setActiveStage,
    setConversationComplete,
    isAiPlaying,
    isProcessing,
    isRecording,
    lastAiAudioEndTime,
    agent,
  } = useRoomStore();

  const { scheduleChunk, handleLipSyncData, isPlayingRef } = useAudioPlayback();

  /** Send a message through the active WS connection (used by action handlers). */
  const wsSend = useCallback(
    (message: Parameters<RoomWebSocket["send"]>[0]) => {
      wsRef.current?.send(message);
    },
    [],
  );

  /* ── Handle inbound WS messages ── */
  const handleMessage = useCallback(
    (msg: WsInboundMessage) => {
      switch (msg.type) {
        case "sessionReady":
          setIsProcessing(false);
          setCurrentStep(msg.currentStep);
          break;

        case "transcript":
          setIsTranscriptLoading(false);
          setIsProcessing(true);
          if (msg.transcript) {
            addChatMessage({
              sender: "user",
              message: msg.transcript,
            });
          }
          break;

        case "lipSync":
          handleLipSyncData({
            cues: msg.cues,
            duration: msg.duration,
            text: msg.text,
            isFirstChunk: msg.isFirst,
            isLastChunk: msg.isLast,
            chunkIndex: msg.chunkIndex,
          });
          break;

        case "audio":
          if (msg.data || msg.isLastChunk) {
            scheduleChunk(msg.data, msg.isLastChunk, msg.sampleRate === 24_000, msg.isFirstChunk);
          }
          break;

        case "response": {
          const step = msg.currentStep;
          if (msg.content) {
            addChatMessage({
              sender: "assistant",
              message: msg.content,
              stepKey: step,
            });
          }
          setCurrentStep(step);

          // Update slide if the agent has this step mapped
          const slides = agent?.render.presentation?.slides;
          if (slides && slides[step] !== undefined) {
            setCurrentSlide(slides[step]);
          }

          // Delegate server action to the registry
          if (msg.action) {
            actionRegistry.dispatch(msg.action, {
              store: useRoomStore,
              send: wsSend,
            });
          }
          break;
        }

        case "stepChanged":
          setCurrentStep(msg.to);
          setStepProgress(msg.progress);
          break;

        case "conversationComplete":
          setConversationComplete();
          break;

        case "processingStart":
          setActiveStage(msg.stage);
          break;

        case "processingEnd":
          setActiveStage(null);
          if (msg.stage === "tts") {
            setIsProcessing(false);
          }
          break;

        case "error":
          showError();
          setIsTranscriptLoading(false);
          setIsProcessing(false);
          errorTimeoutRef.current = setTimeout(hideError, TOAST_DURATION_MS);
          break;
      }
    },
    [
      scheduleChunk,
      handleLipSyncData,
      setIsProcessing,
      setIsTranscriptLoading,
      setCurrentStep,
      setCurrentSlide,
      setStepProgress,
      addChatMessage,
      setActiveStage,
      setConversationComplete,
      showError,
      hideError,
      wsSend,
      agent,
    ],
  );

  /* ── Connect on mount, disconnect on unmount ── */
  useEffect(() => {
    if (!params) return;

    const ws = new RoomWebSocket(handleMessage, (status) => {
      if (status === "connected") {
        setIsProcessing(true);
        ws.sendInit(params.accessToken);
      }
      if (status === "reconnecting") {
        setIsProcessing(true);
      }
    });

    ws.connect();
    wsRef.current = ws;

    return () => {
      ws.disconnect();
      wsRef.current = null;
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    };
  }, [params, handleMessage, setIsProcessing]);

  /* ── Mic recording wiring ── */
  const {
    start: startMic,
    stop: stopMic,
    cleanup: cleanupMic,
  } = useMediaRecorder({
    onAudioChunk: (base64) => {
      wsRef.current?.sendAudioChunk(base64);
    },
    onStart: () => {
      setIsRecording(true);
      wsRef.current?.sendStartRecording();
    },
    onStop: () => {
      setIsRecording(false);
      setIsTranscriptLoading(true);
      const latency = lastAiAudioEndTime
        ? (Date.now() - lastAiAudioEndTime) / 1000
        : 0;
      wsRef.current?.sendStopRecording(latency);
    },
    onError: () => {
      showError();
      errorTimeoutRef.current = setTimeout(hideError, TOAST_DURATION_MS);
    },
  });

  /* ── Press-to-talk handlers ── */
  const handlePressStart = useCallback(() => {
    if (
      isAiPlaying ||
      isProcessing ||
      isRecording ||
      lockRef.current ||
      isPlayingRef.current
    ) {
      showWarning();
      setTimeout(hideWarning, TOAST_DURATION_MS);
      return;
    }
    lockRef.current = true;
    void startMic().finally(() => {
      lockRef.current = false;
    });
  }, [
    isAiPlaying,
    isProcessing,
    isRecording,
    startMic,
    showWarning,
    hideWarning,
    isPlayingRef,
  ]);

  const handlePressEnd = useCallback(() => {
    if (!lockRef.current) {
      stopMic();
    }
  }, [stopMic]);

  /* ── Data submission (assessment, forms, etc.) ── */
  const submitData = useCallback(
    (dataType: string, payload: unknown) => {
      if (!wsRef.current?.isOpen) return;
      const latency = lastAiAudioEndTime
        ? (Date.now() - lastAiAudioEndTime) / 1000
        : 0;
      wsRef.current.sendSubmitData(dataType, payload, latency);
    },
    [lastAiAudioEndTime],
  );

  /* ── Cleanup mic on unmount ── */
  useEffect(() => cleanupMic, [cleanupMic]);

  return {
    handlePressStart,
    handlePressEnd,
    submitData,
  };
}
