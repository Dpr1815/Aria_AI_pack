/**
 * Conclusion Step Definition
 *
 * Thank candidate and explain next steps in selection process.
 *
 * Variables:
 * - Conversation: job_title, company_name, next_steps
 * - Runtime: last_prompt_step, participant_name
 */

import { z } from 'zod';
import { StepDefinition } from '../../types';

export const conclusionInputSchema = z
  .object({
    job_title: z.string().min(1, 'The specific position the candidate interviewed for'),
    company_name: z.string().min(1, 'Name of the hiring organization'),
    next_steps: z
      .string()
      .min(1, 'Structured description of the upcoming selection process phases'),
  })
  .strict();

export const conclusionStep: StepDefinition = {
  id: 'conclusion',
  labels: {
    'en-US': 'Conclusion',
    'it-IT': 'Conclusione',
  },
  prompts: {
    conversation: 'conclusion',
  },
  selectable: true,
  position: 'last',
  generation: {
    template: 'generate_conclusion',
  },
  inputSchema: conclusionInputSchema,
};
