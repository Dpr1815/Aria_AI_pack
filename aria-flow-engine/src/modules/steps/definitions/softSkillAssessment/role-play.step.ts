/**
 * SSA Role Play Step Definition
 *
 * Core interaction: avatar plays a counterpart character (e.g., team member
 * receiving feedback). The candidate conducts the conversation while the
 * avatar reacts credibly and inserts turning points to test specific skills.
 *
 * Expands to: ssaIntroRolePlay → ssaRolePlay
 * - ssaIntroRolePlay: Aria presents the scenario, character, and expectations
 * - ssaRolePlay: Aria goes into character and the role-play begins
 *
 * Variables:
 * - Conversation: role_play_scenario, character_description, skills_to_observe, turning_points
 * - Runtime: next_step_label, last_prompt_step
 */

import { z } from 'zod';
import { StepDefinition } from '../../types';

export const ssaRolePlayInputSchema = z
  .object({
    role_play_scenario: z
      .string()
      .min(1, 'Description of the role-play scenario and context'),
    character_description: z
      .string()
      .min(1, 'Description of the character the avatar will play'),
    skills_to_observe: z
      .array(z.string())
      .min(1, 'At least one skill to observe is required')
      .describe('Soft skills to observe during the role-play interaction'),
    turning_points: z
      .array(z.string())
      .min(1, 'At least one turning point is required')
      .describe('Turning points the avatar will introduce to test specific skills'),
  })
  .strict();

export const ssaRolePlayStep: StepDefinition = {
  id: 'ssaRolePlay',
  labels: {
    'en-US': 'Role Play Exercise',
    'it-IT': 'Esercizio di Role Play',
  },
  prompts: {
    conversation: 'ssa_role_play',
  },
  selectable: true,
  position: 'flexible',
  expandsTo: ['ssaIntroRolePlay', 'ssaRolePlay'],
  generation: {
    template: 'generate_ssa_role_play',
  },
  inputSchema: ssaRolePlayInputSchema,
};

export const ssaIntroRolePlayStep: StepDefinition = {
  id: 'ssaIntroRolePlay',
  labels: {
    'en-US': 'Role Play Introduction',
    'it-IT': 'Introduzione Role Play',
  },
  prompts: {
    conversation: 'ssa_intro_role_play',
  },
  selectable: false,
  position: 'flexible',
  parentStep: 'ssaRolePlay',
  inputSchema: ssaRolePlayInputSchema,
};
