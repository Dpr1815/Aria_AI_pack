/**
 * Intro Step Definition
 *
 * Welcome candidate and explain interview structure.
 *
 * Variables:
 * - Conversation: job_title, company_name, interview_struct
 * - Runtime: participant_name
 */

import { z } from 'zod';
import { StepDefinition } from '../../types';

export const introInputSchema = z
  .object({
    job_title: z.string().min(1, 'The specific position being interviewed for'),
    company_name: z.string().min(1, 'Name of the hiring organization'),
    interview_struct: z.string().min(1, 'Brief summary of the interview structure'),
  })
  .strict();

export const introStep: StepDefinition = {
  id: 'intro',
  labels: {
    'en-US': 'Interview Introduction',
    'it-IT': 'Introduzione',
  },
  prompts: {
    conversation: 'intro',
  },
  selectable: true,
  position: 'first',
  generation: {
    template: 'generate_intro',
    includeSteps: true,
  },
  inputSchema: introInputSchema,
};
