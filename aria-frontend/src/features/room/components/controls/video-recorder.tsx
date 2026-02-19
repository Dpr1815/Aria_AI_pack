import { useEffect, useRef, useState, useCallback } from "react";
import { uploadVideo } from "../../api";
import { useRoomStore } from "../../stores/room.store";
import { MEDIA_RECORDER_OPTIONS, VIDEO_CONFIG } from "../../constants";

/* ─────────────────────────────────────────────
 * VideoRecorder
 * ─────────────────────────────────────────────
 * Invisible component that auto-records video+audio
 * for each conversation step. On step change it stops,
 * uploads the segment, then starts a new recording.
 *
 * Mixes the user's mic with AI audio playback so
 * the recording captures both sides.
 * ───────────────────────────────────────────── */

const MAX_START_RETRIES = 3;

export function VideoRecorder() {
  const { sessionAuth, agent, currentStep } = useRoomStore();

  if (!sessionAuth || !agent) return null;

  return (
    <VideoRecorderInner
      accessToken={sessionAuth.accessToken}
      sessionId={sessionAuth.session._id}
      currentStep={currentStep}
    />
  );
}

/* ── Inner component — owns all recorder logic ── */

interface VideoRecorderInnerProps {
  accessToken: string;
  sessionId: string;
  currentStep: string;
}

function VideoRecorderInner({
  accessToken,
  sessionId,
  currentStep,
}: VideoRecorderInnerProps) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const prevStepRef = useRef<string>(currentStep);
  const retriesRef = useRef(0);
  const isMountedRef = useRef(true);
  const [isRecording, setIsRecording] = useState(false);

  /** Create a stream that mixes mic audio + AI playback audio */
  const createMixedStream = useCallback(async (): Promise<MediaStream> => {
    const rawStream = await navigator.mediaDevices.getUserMedia({
      video: VIDEO_CONFIG.video,
      audio: VIDEO_CONFIG.audio,
    });

    if (!window.appAudioContext) {
      window.appAudioContext = new AudioContext({
        sampleRate: 48_000,
        latencyHint: "interactive",
      });
    }

    const ctx = window.appAudioContext;
    const dest = ctx.createMediaStreamDestination();

    const micSource = ctx.createMediaStreamSource(
      new MediaStream(rawStream.getAudioTracks()),
    );
    micSource.connect(dest);

    if (window.audioMixer) {
      window.audioMixer.connect(dest);
    }

    return new MediaStream([
      ...rawStream.getVideoTracks(),
      ...dest.stream.getAudioTracks(),
    ]);
  }, []);

  /** Stop the current recorder and return collected chunks */
  const stopRecorder = useCallback((): Blob[] => {
    const recorder = recorderRef.current;
    const chunks = [...chunksRef.current];

    if (recorder && recorder.state === "recording") {
      try {
        recorder.stop();
      } catch {
        /* already stopped */
      }
    }

    chunksRef.current = [];
    recorderRef.current = null;
    setIsRecording(false);

    return chunks;
  }, []);

  const startRecording = useCallback(async () => {
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());

      const stream = await createMixedStream();
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream, MEDIA_RECORDER_OPTIONS);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start(1000);
      recorderRef.current = recorder;
      retriesRef.current = 0;
      setIsRecording(true);
    } catch (err) {
      console.error("[VideoRecorder] Start error:", err);
      retriesRef.current += 1;

      if (retriesRef.current < MAX_START_RETRIES) {
        setTimeout(() => void startRecording(), 2000);
      } else {
        console.error(
          `[VideoRecorder] Failed after ${MAX_START_RETRIES} retries. Giving up.`,
        );
      }
    }
  }, [createMixedStream]);

  /** Upload collected chunks for a given step */
  const uploadChunks = useCallback(
    async (chunks: Blob[], stepKey: string) => {
      if (chunks.length === 0) return;

      const blob = new Blob(chunks, { type: "video/webm" });
      if (blob.size === 0) return;

      try {
        await uploadVideo(blob, { sessionId, stepKey, accessToken });
      } catch (err) {
        console.error("[VideoRecorder] Upload error:", err);
      }
    },
    [sessionId, accessToken],
  );

  // Handle step changes: stop → upload → restart
  useEffect(() => {
    if (currentStep === prevStepRef.current && isRecording) return;

    let cancelled = false;

    const handleStepTransition = async () => {
      // Step changed while recording → stop and upload previous segment
      if (currentStep !== prevStepRef.current && isRecording) {
        const chunks = stopRecorder();
        const prevStep = prevStepRef.current;
        prevStepRef.current = currentStep;

        // Upload in background — don't block the next recording
        void uploadChunks(chunks, prevStep);
      } else {
        prevStepRef.current = currentStep;
      }

      // Brief pause before starting new recording
      await new Promise<void>((r) => setTimeout(r, 500));

      if (!cancelled && isMountedRef.current) {
        await startRecording();
      }
    };

    void handleStepTransition();

    return () => {
      cancelled = true;
    };
  }, [currentStep, isRecording, stopRecorder, uploadChunks, startRecording]);

  // Unmount-only cleanup: stop stream and upload final segment
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;

      const chunks = [...chunksRef.current];
      const step = prevStepRef.current;

      if (recorderRef.current?.state === "recording") {
        try {
          recorderRef.current.stop();
        } catch {
          /* already stopped */
        }
      }

      streamRef.current?.getTracks().forEach((t) => t.stop());

      // Fire-and-forget upload of final segment
      if (chunks.length > 0) {
        const blob = new Blob(chunks, { type: "video/webm" });
        if (blob.size > 0) {
          void uploadVideo(blob, {
            sessionId,
            stepKey: step,
            accessToken,
          }).catch((err) =>
            console.error("[VideoRecorder] Final upload error:", err),
          );
        }
      }
    };
  }, [sessionId, accessToken]);

  return null;
}
