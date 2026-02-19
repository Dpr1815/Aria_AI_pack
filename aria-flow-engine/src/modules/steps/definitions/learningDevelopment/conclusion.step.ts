/**
 * L&D Conclusion Step Definition
 *
 * Summarize key learnings, set action items, and gather feedback.
 *
 * Variables:
 * - Conversation: topic, session_structure
 * - Runtime: last_prompt_step, participant_name
 */

import { z } from 'zod';
import { StepDefinition } from '../../types';

export const ldConclusionInputSchema = z
  .object({
    topic: z.string().min(1, 'The main topic covered in the session'),
    session_structure: z.string().min(1, 'Summary of what was covered in the session'),
  })
  .strict();

export const ldConclusionStep: StepDefinition = {
  id: 'ldConclusion',
  labels: {
    'en-US': 'Summary & Action Plan',
    'it-IT': 'Riepilogo & Piano d\'Azione',
  },
  prompts: {
    conversation: 'ld_conclusion',
  },
  selectable: true,
  position: 'last',
  generation: {
    template: 'generate_ld_conclusion',
  },
  inputSchema: ldConclusionInputSchema,
};
