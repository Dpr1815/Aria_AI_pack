/**
 * SSA Scenario Questions Step Definition
 *
 * Present workplace scenarios and ask how the candidate would handle them.
 * Evaluates situational awareness and decision-making skills.
 *
 * Variables:
 * - Conversation: scenarios, skills_to_evaluate, evaluation_focus
 * - Runtime: next_step_label, last_prompt_step
 */

import { z } from 'zod';
import { StepDefinition } from '../../types';

export const ssaScenarioQuestionsInputSchema = z
  .object({
    scenarios: z
      .array(z.string())
      .min(1, 'At least one scenario is required')
      .describe('Workplace scenarios to present to the candidate'),
    skills_to_evaluate: z
      .array(z.string())
      .min(1, 'At least one skill to evaluate is required')
      .describe('Soft skills to evaluate through scenario responses'),
    evaluation_focus: z
      .string()
      .min(1, 'The main focus area for evaluating scenario responses'),
  })
  .strict();

export const ssaScenarioQuestionsStep: StepDefinition = {
  id: 'ssaScenarioQuestions',
  labels: {
    'en-US': 'Scenario-Based Questions',
    'it-IT': 'Domande su Scenari',
  },
  prompts: {
    conversation: 'ssa_scenario_questions',
  },
  selectable: true,
  position: 'flexible',
  generation: {
    template: 'generate_ssa_scenario_questions',
  },
  inputSchema: ssaScenarioQuestionsInputSchema,
};
