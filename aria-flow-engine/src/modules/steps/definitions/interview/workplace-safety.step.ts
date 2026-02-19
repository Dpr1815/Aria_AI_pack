/**
 * Workplace Safety Step Definition
 *
 * Workplace safety awareness evaluation.
 *
 * Variables:
 * - Conversation: job_title, company_name, industry_sector, specific_risks, required_ppe
 * - Report: expected_knowledge
 * - Runtime: next_step_label, last_prompt_step
 */

import { z } from 'zod';
import { StepDefinition } from '../../types';

export const workplaceSafetyInputSchema = z
  .object({
    job_title: z.string().min(1, 'The specific position being interviewed for'),
    company_name: z.string().min(1, 'Name of the hiring organization'),
    industry_sector: z
      .string()
      .min(1, "The specific industry sector (e.g., 'Construction', 'Manufacturing', 'Healthcare')"),
    specific_risks: z
      .array(z.string())
      .min(1, 'Array of specific workplace hazards and risks associated with the position'),
    required_ppe: z
      .array(z.string())
      .min(1, 'Array of required Personal Protective Equipment for the role'),
    expected_knowledge: z
      .string()
      .min(1, 'Description of expected candidate knowledge regarding workplace safety'),
  })
  .strict();

export const workplaceSafetyStep: StepDefinition = {
  id: 'workplaceSafety',
  labels: {
    'en-US': 'Workplace Safety',
    'it-IT': 'Sicurezza sul Lavoro',
  },
  prompts: {
    conversation: 'workplace_safety',
  },
  selectable: true,
  position: 'flexible',
  generation: {
    template: 'generate_workplace_safety',
  },
  inputSchema: workplaceSafetyInputSchema,
};
