/**
 * L&D Intro Step Definition
 *
 * Welcome learner, explain session structure, and set learning objectives.
 *
 * Variables:
 * - Conversation: topic, learning_objectives, session_structure
 * - Runtime: participant_name
 */

import { z } from 'zod';
import { StepDefinition } from '../../types';

export const ldIntroInputSchema = z
  .object({
    topic: z.string().min(1, 'The main topic or subject of the training session'),
    learning_objectives: z
      .string()
      .min(1, 'Clear learning objectives for the session'),
    session_structure: z.string().min(1, 'Brief summary of the session structure'),
  })
  .strict();

export const ldIntroStep: StepDefinition = {
  id: 'ldIntro',
  labels: {
    'en-US': 'Introduction & Objectives',
    'it-IT': 'Introduzione & Obiettivi',
  },
  prompts: {
    conversation: 'ld_intro',
  },
  selectable: true,
  position: 'first',
  generation: {
    template: 'generate_ld_intro',
    includeSteps: true,
  },
  inputSchema: ldIntroInputSchema,
};
