/**
 * SSA Open Questions Step Definition
 *
 * General open-ended questions about feedback culture, communication skills,
 * and self-awareness. Evaluates depth of understanding and personal reflection.
 *
 * Variables:
 * - Conversation: questions_focus_areas, skills_to_evaluate, depth_level
 * - Runtime: next_step_label, last_prompt_step
 */

import { z } from 'zod';
import { StepDefinition } from '../../types';

export const ssaOpenQuestionsInputSchema = z
  .object({
    questions_focus_areas: z
      .array(z.string())
      .min(1, 'At least one focus area is required')
      .describe('Focus areas for the open-ended questions'),
    skills_to_evaluate: z
      .array(z.string())
      .min(1, 'At least one skill to evaluate is required')
      .describe('Soft skills to evaluate through open-ended responses'),
    depth_level: z
      .enum(['surface', 'moderate', 'deep'])
      .describe('Depth level for the open-ended questions'),
  })
  .strict();

export const ssaOpenQuestionsStep: StepDefinition = {
  id: 'ssaOpenQuestions',
  labels: {
    'en-US': 'Open-Ended Questions',
    'it-IT': 'Domande Aperte',
  },
  prompts: {
    conversation: 'ssa_open_questions',
  },
  selectable: true,
  position: 'flexible',
  generation: {
    template: 'generate_ssa_open_questions',
  },
  inputSchema: ssaOpenQuestionsInputSchema,
};
