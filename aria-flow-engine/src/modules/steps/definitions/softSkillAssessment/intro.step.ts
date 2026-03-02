/**
 * SSA Intro Step Definition
 *
 * Welcome participant, explain assessment purpose, describe the soft skills
 * being evaluated, and outline the session structure.
 *
 * Variables:
 * - Conversation: skills_to_assess, assessment_context, session_structure
 * - Runtime: participant_name
 */

import { z } from 'zod';
import { StepDefinition } from '../../types';

export const ssaIntroInputSchema = z
  .object({
    skills_to_assess: z
      .array(z.string())
      .min(1, 'At least one soft skill to assess is required')
      .describe('List of soft skills that will be evaluated during the session'),
    assessment_context: z
      .string()
      .min(1, 'Context for the assessment (e.g., role, department, purpose)'),
    session_structure: z.string().min(1, 'Brief summary of the session structure'),
  })
  .strict();

export const ssaIntroStep: StepDefinition = {
  id: 'ssaIntro',
  labels: {
    'en-US': 'Introduction & Context',
    'it-IT': 'Introduzione & Contesto',
  },
  prompts: {
    conversation: 'ssa_intro',
  },
  selectable: true,
  position: 'first',
  generation: {
    template: 'generate_ssa_intro',
    includeSteps: true,
  },
  inputSchema: ssaIntroInputSchema,
};
