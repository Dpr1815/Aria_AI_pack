import type { ActionHandler } from "../action-registry";
import type { AssessmentConfig } from "../../types";

/* ─────────────────────────────────────────────
 * Action: openAssessment
 * ─────────────────────────────────────────────
 * Hydrates the assessment config from the server
 * payload and opens the test modal.
 *
 * Expected payload shape:
 * {
 *   assessment: {
 *     testContent: string;
 *     language: string;
 *     durationSeconds: number;
 *   }
 * }
 * ───────────────────────────────────────────── */

export const openAssessment: ActionHandler = ({ store, payload }) => {
  const assessment = payload?.assessment as AssessmentConfig | undefined;

  if (assessment) {
    store.getState().setAssessment(assessment);
  }

  store.getState().openTestModal();
};
