import { create } from "zustand";
import type {
  Agent,
  SessionAuth,
  ChatMessage,
  AssessmentConfig,
} from "../types";

/* ─────────────────────────────────────────────
 * Room Store
 * ─────────────────────────────────────────────
 * Single source of truth for all room state.
 * Naming aligned to backend: agent, session,
 * participant, conversation.
 * ───────────────────────────────────────────── */

interface RoomState {
  /* ── Agent ── */
  agent: Agent | null;
  isAgentLoading: boolean;

  /* ── Session auth ── */
  sessionAuth: SessionAuth | null;

  /* ── Conversation progression ── */
  currentStep: string;
  currentSlide: number;
  stepProgress: number;

  /* ── Tutorial ── */
  showTutorial: boolean;
  tutorialCompleted: boolean;

  /* ── Assessment ──
   * `assessment` is the active config — may come from:
   *   a) The agent fetch (agent.assessment)
   *   b) A server action payload at runtime
   * This decouples the modal rendering from the
   * initial agent shape.
   */
  assessment: AssessmentConfig | null;
  showTestModal: boolean;
  timeLeft: number;

  /* ── Chat ── */
  chatHistory: ChatMessage[];

  /* ── Audio / recording state ── */
  isRecording: boolean;
  isProcessing: boolean;
  isTranscriptLoading: boolean;
  isAiPlaying: boolean;
  lastAiAudioEndTime: number | null;

  /* ── Processing stages ── */
  activeStage: "stt" | "llm" | "tts" | "lipsync" | null;

  /* ── Conversation complete ── */
  isConversationComplete: boolean;

  /* ── Toasts ── */
  showErrorToast: boolean;
  showWarningToast: boolean;
}

interface RoomActions {
  /* ── Agent ── */
  setAgent: (agent: Agent) => void;
  setAgentLoading: (loading: boolean) => void;

  /* ── Session ── */
  setSessionAuth: (auth: SessionAuth) => void;

  /* ── Conversation progression ── */
  setCurrentStep: (step: string) => void;
  setCurrentSlide: (slide: number) => void;
  setStepProgress: (progress: number) => void;

  /* ── Tutorial ── */
  setShowTutorial: (show: boolean) => void;
  completeTutorial: () => void;

  /* ── Assessment ── */
  setAssessment: (config: AssessmentConfig) => void;
  openTestModal: () => void;
  closeTestModal: () => void;
  setTimeLeft: (time: number) => void;

  /* ── Chat ── */
  addChatMessage: (message: ChatMessage) => void;
  clearChat: () => void;

  /* ── Audio / recording ── */
  setIsRecording: (value: boolean) => void;
  setIsProcessing: (value: boolean) => void;
  setIsTranscriptLoading: (value: boolean) => void;
  setIsAiPlaying: (value: boolean) => void;
  setLastAiAudioEndTime: (time: number | null) => void;

  /* ── Processing stages ── */
  setActiveStage: (stage: RoomState["activeStage"]) => void;

  /* ── Conversation complete ── */
  setConversationComplete: () => void;

  /* ── Toasts ── */
  showError: () => void;
  hideError: () => void;
  showWarning: () => void;
  hideWarning: () => void;

  /* ── Reset ── */
  reset: () => void;
}

const initialState: RoomState = {
  agent: null,
  isAgentLoading: true,
  sessionAuth: null,
  currentStep: "",
  currentSlide: 1,
  stepProgress: 0,
  showTutorial: false,
  tutorialCompleted: false,
  assessment: null,
  showTestModal: false,
  timeLeft: 0,
  chatHistory: [],
  isRecording: false,
  isProcessing: false,
  isTranscriptLoading: false,
  isAiPlaying: false,
  lastAiAudioEndTime: null,
  activeStage: null,
  isConversationComplete: false,
  showErrorToast: false,
  showWarningToast: false,
};

export const useRoomStore = create<RoomState & RoomActions>((set) => ({
  ...initialState,

  /* ── Agent ── */
  setAgent: (agent) =>
    set({
      agent,
      isAgentLoading: false,
      assessment: agent.assessment ?? null,
      timeLeft: agent.assessment?.durationSeconds ?? 0,
    }),
  setAgentLoading: (loading) => set({ isAgentLoading: loading }),

  /* ── Session ── */
  setSessionAuth: (auth) =>
    set({
      sessionAuth: auth,
      currentStep: auth.session.currentStep,
      showTutorial: !auth.isResumed,
      tutorialCompleted: auth.isResumed,
    }),

  /* ── Conversation progression ── */
  setCurrentStep: (step) => set({ currentStep: step }),
  setCurrentSlide: (slide) => set({ currentSlide: slide }),
  setStepProgress: (progress) => set({ stepProgress: progress }),

  /* ── Tutorial ── */
  setShowTutorial: (show) => set({ showTutorial: show }),
  completeTutorial: () => set({ showTutorial: false, tutorialCompleted: true }),

  /* ── Assessment ── */
  setAssessment: (config) =>
    set({ assessment: config, timeLeft: config.durationSeconds }),
  openTestModal: () => set({ showTestModal: true }),
  closeTestModal: () => set({ showTestModal: false }),
  setTimeLeft: (time) => set({ timeLeft: time }),

  /* ── Chat ── */
  addChatMessage: (message) =>
    set((s) => ({ chatHistory: [...s.chatHistory, message] })),
  clearChat: () => set({ chatHistory: [] }),

  /* ── Audio / recording ── */
  setIsRecording: (value) => set({ isRecording: value }),
  setIsProcessing: (value) => set({ isProcessing: value }),
  setIsTranscriptLoading: (value) => set({ isTranscriptLoading: value }),
  setIsAiPlaying: (value) => set({ isAiPlaying: value }),
  setLastAiAudioEndTime: (time) => set({ lastAiAudioEndTime: time }),

  /* ── Processing stages ── */
  setActiveStage: (stage) => set({ activeStage: stage }),

  /* ── Conversation complete ── */
  setConversationComplete: () => set({ isConversationComplete: true }),

  /* ── Toasts ── */
  showError: () => set({ showErrorToast: true }),
  hideError: () => set({ showErrorToast: false }),
  showWarning: () => set({ showWarningToast: true }),
  hideWarning: () => set({ showWarningToast: false }),

  /* ── Reset ── */
  reset: () => set(initialState),
}));
