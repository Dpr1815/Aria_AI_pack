/**
 * Work Scenario Step Definition
 *
 * Role-play work scenario evaluation.
 *
 * Variables (flat - no nested scenario object):
 * - introWork: job_title, company_name, candidate_role, scenario_context, scenario_objective, interviewer_role
 * - work: interviewer_role, initial_interaction, positive_outcome, negative_outcome
 * - conclusionWork: job_title, company_name, job_description
 * - Report: All scenario variables + required_skills, key_behaviors
 * - Runtime: next_step_label, last_prompt_step, participant_name
 */

import { z } from 'zod';
import { StepDefinition } from '../../types';

export const workInputSchema = z
  .object({
    job_title: z.string().min(1, 'The specific position being interviewed for'),
    company_name: z.string().min(1, 'Name of the hiring company'),
    job_description: z
      .string()
      .min(1, 'Brief description of the position and its responsibilities'),
    candidate_role: z.string().min(1, 'The role the candidate will play in the simulation'),
    scenario_context: z
      .string()
      .min(1, 'Background situation and business context for the scenario'),
    scenario_objective: z.string().min(1, 'What the candidate needs to achieve in this simulation'),
    interviewer_role: z
      .string()
      .min(1, 'AI character info: name, job title, personality, and background'),
    initial_interaction: z
      .string()
      .min(1, "The AI character's opening line that starts the conversation"),
    positive_outcome: z
      .string()
      .min(1, "Complete 'You...' describing the AI character's positive state"),
    negative_outcome: z
      .string()
      .min(1, "Complete 'You...' describing the AI character's negative state"),
    required_skills: z.array(z.string()).min(1, 'Array of specific skills being evaluated'),
    key_behaviors: z
      .array(z.string())
      .min(1, 'Array of desired behaviors the candidate should demonstrate'),
  })
  .strict();

export const workStep: StepDefinition = {
  id: 'work',
  labels: {
    'en-US': 'Work Scenario',
    'it-IT': 'Scenario Lavorativo',
  },
  prompts: {
    conversation: 'work',
  },
  selectable: true,
  position: 'flexible',
  expandsTo: ['introWork', 'work', 'conclusionWork'],
  generation: {
    template: 'generate_work_scenario',
  },
  inputSchema: workInputSchema,
};

export const introWorkStep: StepDefinition = {
  id: 'introWork',
  labels: {
    'en-US': 'Scenario Introduction',
    'it-IT': 'Introduzione Scenario',
  },
  prompts: {
    conversation: 'intro_work',
  },
  selectable: false,
  position: 'flexible',
  parentStep: 'work',
  inputSchema: workInputSchema,
};

export const conclusionWorkStep: StepDefinition = {
  id: 'conclusionWork',
  labels: {
    'en-US': 'Scenario Conclusion',
    'it-IT': 'Conclusione Scenario',
  },
  prompts: {
    conversation: 'conclusion_work',
  },
  selectable: false,
  position: 'flexible',
  parentStep: 'work',
  inputSchema: workInputSchema,
};
