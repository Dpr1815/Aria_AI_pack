/**
 * Background Step Definition
 *
 * Explore candidate's professional history and experience.
 *
 * Variables:
 * - Conversation: job_title, company_name, job_description, key_skills_required
 * - Report: job_description, key_skills_required (shared)
 * - Runtime: next_step_label, last_prompt_step
 */

import { z } from 'zod';
import { StepDefinition } from '../../types';

export const backgroundInputSchema = z
  .object({
    job_title: z.string().min(1, 'The specific position being interviewed for'),
    company_name: z.string().min(1, 'Name of the hiring organization'),
    job_description: z.string().min(1, 'In-depth description of the job position in third person'),
    key_skills_required: z
      .array(z.string())
      .min(1, 'At least one technical/hard skill is required')
      .describe(
        'List ONLY technical/hard skills directly related to professional background. DO NOT include soft skills.'
      ),
  })
  .strict();

export const backgroundStep: StepDefinition = {
  id: 'background',
  labels: {
    'en-US': 'Professional Background',
    'it-IT': 'Esperienza Professionale',
  },
  prompts: {
    conversation: 'background',
  },
  selectable: true,
  position: 'flexible',
  generation: {
    template: 'generate_background',
  },
  inputSchema: backgroundInputSchema,
};
