import { useMutation, useQueryClient } from "@tanstack/react-query";
import { agentApi } from "../api";
import { agentKeys } from "./use-agent";
import { useAgentEditorStore } from "../stores/agent-editor.store";
import type {
  AddStepPayload,
  UpdateAgentPayload,
  UpdateStepPayload,
  UpdatePromptPayload,
  UpdateAssessmentPayload,
} from "../types";

export function useAgentMutations(agentId: string) {
  const qc = useQueryClient();
  const configKey = agentKeys.config(agentId);

  const invalidate = () => qc.invalidateQueries({ queryKey: configKey });

  /* ── Agent settings ─────────────────────────────────────── */

  const updateAgent = useMutation({
    mutationFn: (payload: UpdateAgentPayload) =>
      agentApi.update(agentId, payload),
    onSuccess: invalidate,
  });

  const activateAgent = useMutation({
    mutationFn: () => agentApi.activate(agentId),
    onSuccess: invalidate,
  });

  const deactivateAgent = useMutation({
    mutationFn: () => agentApi.deactivate(agentId),
    onSuccess: invalidate,
  });

  /* ── Steps ──────────────────────────────────────────────── */

  const updateStep = useMutation({
    mutationFn: ({
      key,
      payload,
    }: {
      key: string;
      payload: UpdateStepPayload;
    }) => agentApi.updateStep(agentId, key, payload),
    onSuccess: invalidate,
  });

  const addStep = useMutation({
    mutationFn: (payload: AddStepPayload) => agentApi.addStep(agentId, payload),
    onSuccess: invalidate,
  });

  const removeStep = useMutation({
    mutationFn: (key: string) => agentApi.removeStep(agentId, key),
    onSuccess: (_data, key) => {
      invalidate();
      const panel = useAgentEditorStore.getState().panel;
      if (panel.kind === "step" && panel.stepKey === key) {
        useAgentEditorStore.getState().showSettings();
      }
    },
  });

  /* ── Step reordering ────────────────────────────────────── */

  const reorderSteps = useMutation({
    mutationFn: (stepOrder: string[]) =>
      agentApi.update(agentId, { stepOrder }),
    onSuccess: invalidate,
  });

  /* ── Prompts ────────────────────────────────────────────── */

  const updatePrompt = useMutation({
    mutationFn: ({
      key,
      payload,
    }: {
      key: string;
      payload: UpdatePromptPayload;
    }) => agentApi.updatePrompt(agentId, key, payload),
    onSuccess: invalidate,
  });

  /* ── Assessment ─────────────────────────────────────────── */

  const updateAssessment = useMutation({
    mutationFn: (payload: UpdateAssessmentPayload) =>
      agentApi.updateAssessment(agentId, payload),
    onSuccess: invalidate,
  });

  return {
    updateAgent,
    activateAgent,
    deactivateAgent,
    updateStep,
    addStep,
    removeStep,
    reorderSteps,
    updatePrompt,
    updateAssessment,
  } as const;
}
