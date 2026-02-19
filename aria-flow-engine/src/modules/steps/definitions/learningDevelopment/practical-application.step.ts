/**
 * Practical Application Step Definition
 *
 * Scenario-based exercises, role-play, and hands-on problem solving.
 *
 * Variables:
 * - Conversation: scenario_context, scenario_objective, expected_behaviors, evaluation_criteria
 * - Runtime: next_step_label, last_prompt_step
 */

import { z } from 'zod';
import { StepDefinition } from '../../types';

export const practicalApplicationInputSchema = z
  .object({
    scenario_context: z
      .string()
      .min(1, 'Background situation and context for the practice scenario'),
    scenario_objective: z
      .string()
      .min(1, 'What the learner needs to achieve in this exercise'),
    expected_behaviors: z
      .array(z.string())
      .min(1, 'At least one expected behavior is required')
      .describe('Desired behaviors the learner should demonstrate'),
    evaluation_criteria: z
      .string()
      .min(1, 'Criteria used to evaluate the learner performance'),
  })
  .strict();

export const practicalApplicationStep: StepDefinition = {
  id: 'practicalApplication',
  labels: {
    'en-US': 'Practical Application',
    'it-IT': 'Applicazione Pratica',
  },
  prompts: {
    conversation: 'ld_practical_application',
  },
  selectable: true,
  position: 'flexible',
  generation: {
    template: 'generate_ld_practical_application',
  },
  inputSchema: practicalApplicationInputSchema,
};
