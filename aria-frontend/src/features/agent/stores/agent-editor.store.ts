/* ─────────────────────────────────────────────────────────
 * Agent Editor Store — ephemeral UI state
 *
 * Tracks which panel is active (settings / step / assessment)
 * and any in-progress form state. Resets on navigation.
 * ───────────────────────────────────────────────────────── */

import { create } from "zustand";
import type { PanelView } from "../types";

interface AgentEditorState {
  /** Currently displayed right panel. */
  panel: PanelView;

  /** Set panel to agent settings (default view). */
  showSettings: () => void;

  /** Set panel to a specific step editor. */
  showStep: (stepKey: string) => void;

  /** Set panel to the assessment editor. */
  showAssessment: () => void;

  /** Reset to default state. */
  reset: () => void;
}

const DEFAULT_PANEL: PanelView = { kind: "settings" };

export const useAgentEditorStore = create<AgentEditorState>((set) => ({
  panel: DEFAULT_PANEL,

  showSettings: () => set({ panel: { kind: "settings" } }),
  showStep: (stepKey) => set({ panel: { kind: "step", stepKey } }),
  showAssessment: () => set({ panel: { kind: "assessment" } }),
  reset: () => set({ panel: DEFAULT_PANEL }),
}));
