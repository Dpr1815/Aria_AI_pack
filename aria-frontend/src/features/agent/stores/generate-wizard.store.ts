/* ─────────────────────────────────────────────────────────
 * Generate Wizard Store — multi-step form state
 *
 * Holds all wizard data across 4 steps. Resets on unmount.
 * ───────────────────────────────────────────────────────── */

import { create } from "zustand";
import type {
  VoiceConfig,
  RenderConfig,
  AgentFeatures,
  GenerateAgentPayload,
} from "../types";

/* ── Defaults ──────────────────────────────────────────── */

const DEFAULT_VOICE: VoiceConfig = {
  languageCode: "it-IT",
  name: "it-IT-Chirp-HD-F",
  gender: "FEMALE",
};

const DEFAULT_RENDER: RenderConfig = { mode: "avatar" };

const DEFAULT_FEATURES: AgentFeatures = {
  lipSync: false,
  sessionPersistence: true,
  autoSummary: true,
  videoRecording: false,
};

/* ── State shape ───────────────────────────────────────── */

export interface WizardState {
  step: number;

  /* Step 1: Agent Info */
  label: string;
  summary: string;

  /* Step 2: Agent Config */
  voice: VoiceConfig;
  render: RenderConfig;
  features: AgentFeatures;
  conversationTypeId: string;
  summaryTypeId: string;
  statisticsTypeId: string;

  /* Step 3: Pipeline Steps */
  selectedSteps: string[];
  additionalData: Record<string, unknown>;

  /* Actions */
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setField: <K extends keyof WizardFields>(
    key: K,
    value: WizardFields[K],
  ) => void;
  toggleStep: (stepId: string) => void;
  setAdditionalDataField: (key: string, value: unknown) => void;
  reset: () => void;

  /* Derived */
  buildPayload: () => GenerateAgentPayload;
}

/** Fields that can be set via setField */
type WizardFields = Omit<
  WizardState,
  | "step"
  | "setStep"
  | "nextStep"
  | "prevStep"
  | "setField"
  | "toggleStep"
  | "setAdditionalDataField"
  | "reset"
  | "buildPayload"
>;

const TOTAL_STEPS = 4;

const initialState = {
  step: 0,
  label: "",
  summary: "",
  voice: DEFAULT_VOICE,
  render: DEFAULT_RENDER,
  features: DEFAULT_FEATURES,
  conversationTypeId: "",
  summaryTypeId: "",
  statisticsTypeId: "",
  selectedSteps: [] as string[],
  additionalData: {} as Record<string, unknown>,
};

export const useGenerateWizardStore = create<WizardState>((set, get) => ({
  ...initialState,

  setStep: (step) =>
    set({ step: Math.max(0, Math.min(TOTAL_STEPS - 1, step)) }),
  nextStep: () => set((s) => ({ step: Math.min(TOTAL_STEPS - 1, s.step + 1) })),
  prevStep: () => set((s) => ({ step: Math.max(0, s.step - 1) })),

  setField: (key, value) => set({ [key]: value } as Partial<WizardState>),

  toggleStep: (stepId) =>
    set((s) => {
      const has = s.selectedSteps.includes(stepId);
      return {
        selectedSteps: has
          ? s.selectedSteps.filter((id) => id !== stepId)
          : [...s.selectedSteps, stepId],
      };
    }),

  setAdditionalDataField: (key, value) =>
    set((s) => ({
      additionalData: { ...s.additionalData, [key]: value },
    })),

  reset: () => set(initialState),

  buildPayload: () => {
    const s = get();
    const payload: GenerateAgentPayload = {
      label: s.label,
      summary: s.summary,
      steps: s.selectedSteps,
      voice: s.voice,
      render: s.render,
      features: s.features,
      summaryTypeId: s.summaryTypeId,
      statisticsTypeId: s.statisticsTypeId,
    };
    if (s.conversationTypeId) payload.conversationTypeId = s.conversationTypeId;

    /* Only include additionalData if there are values */
    const ad = s.additionalData;
    const nonEmpty = Object.fromEntries(
      Object.entries(ad).filter(([, v]) => v !== undefined && v !== ""),
    );
    if (Object.keys(nonEmpty).length > 0) {
      payload.additionalData =
        nonEmpty as GenerateAgentPayload["additionalData"];
    }

    return payload;
  },
}));
