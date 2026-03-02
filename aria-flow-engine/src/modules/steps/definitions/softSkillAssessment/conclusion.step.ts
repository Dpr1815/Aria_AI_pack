/**
 * SSA Conclusion Step Definition
 *
 * Wrap up the assessment session, invite self-reflection, and thank the participant.
 *
 * Variables:
 * - Conversation: skills_assessed, session_structure
 * - Runtime: last_prompt_step, participant_name
 */

import { z } from 'zod';
import { StepDefinition } from '../../types';

export const ssaConclusionInputSchema = z
  .object({
    skills_assessed: z
      .array(z.string())
      .min(1, 'At least one assessed skill is required')
      .describe('Skills that were assessed during the session'),
    session_structure: z.string().min(1, 'Summary of the session structure'),
  })
  .strict();

export const ssaConclusionStep: StepDefinition = {
  id: 'ssaConclusion',
  labels: {
    'en-US': 'Session Wrap-Up',
    'it-IT': 'Conclusione Sessione',
  },
  prompts: {
    conversation: 'ssa_conclusion',
  },
  selectable: true,
  position: 'last',
  generation: {
    template: 'generate_ssa_conclusion',
  },
  inputSchema: ssaConclusionInputSchema,
};
