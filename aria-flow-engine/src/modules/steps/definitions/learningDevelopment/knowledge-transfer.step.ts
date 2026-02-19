/**
 * Knowledge Transfer Step Definition
 *
 * Teach core concepts, check comprehension, explain theory with examples.
 *
 * Variables:
 * - Conversation: topic, key_concepts, learning_outcomes, difficulty_level
 * - Runtime: next_step_label, last_prompt_step
 */

import { z } from 'zod';
import { StepDefinition } from '../../types';

export const knowledgeTransferInputSchema = z
  .object({
    topic: z.string().min(1, 'The main subject being taught'),
    key_concepts: z
      .array(z.string())
      .min(1, 'At least one key concept is required')
      .describe('Core concepts and theories to cover during the session'),
    learning_outcomes: z
      .string()
      .min(1, 'Expected learning outcomes after this phase'),
    difficulty_level: z
      .enum(['beginner', 'intermediate', 'advanced'])
      .describe('Difficulty level of the content'),
  })
  .strict();

export const knowledgeTransferStep: StepDefinition = {
  id: 'knowledgeTransfer',
  labels: {
    'en-US': 'Knowledge Transfer',
    'it-IT': 'Trasferimento Conoscenze',
  },
  prompts: {
    conversation: 'ld_knowledge_transfer',
  },
  selectable: true,
  position: 'flexible',
  generation: {
    template: 'generate_ld_knowledge_transfer',
  },
  inputSchema: knowledgeTransferInputSchema,
};
