/**
 * Behavioral Step Definition
 *
 * Evaluate candidate's soft skills, cultural fit, and company values alignment.
 *
 * Variables:
 * - Conversation: job_title, company_name, key_competencies, company_values
 * - Report: company_values (shared), work_environment, desired_attributes
 * - Runtime: next_step_label, last_prompt_step
 */

import { z } from 'zod';
import { StepDefinition } from '../../types';

export const behavioralInputSchema = z
  .object({
    job_title: z.string().min(1, 'The specific position being interviewed for'),
    company_name: z.string().min(1, 'The organization conducting the interview'),
    key_competencies: z
      .array(z.string())
      .min(1, 'Array of critical behavioral competencies to assess'),
    company_values: z.array(z.string()).min(1, "Array of organization's core values"),
    work_environment: z.string().min(1, 'Description of workplace culture and environment'),
    desired_attributes: z
      .array(z.string())
      .min(1, 'Specific behavioral traits sought in candidates'),
  })
  .strict();

export const behavioralStep: StepDefinition = {
  id: 'behavioral',
  labels: {
    'en-US': 'Behavioral',
    'it-IT': 'Valutazione Comportamentale',
  },
  prompts: {
    conversation: 'behavioral',
  },
  selectable: true,
  position: 'flexible',
  generation: {
    template: 'generate_behavioral',
  },
  inputSchema: behavioralInputSchema,
};
