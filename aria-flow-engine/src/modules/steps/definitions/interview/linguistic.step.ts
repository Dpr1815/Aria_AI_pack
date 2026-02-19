/**
 * Linguistic Test Step Definition
 *
 * Foreign language proficiency evaluation.
 *
 * Variables:
 * - introLinguistic: target_language, proficiency_level
 * - linguisticTest: target_language, proficiency_level, topic
 * - Report: target_language, proficiency_level, assessment_criteria
 * - Additional Data (from request): target_language
 * - Runtime: last_prompt_step
 */

import { z } from 'zod';
import { StepDefinition } from '../../types';

export const linguisticTestInputSchema = z
  .object({
    target_language: z
      .string()
      .min(2, 'Target language must be at least 2 characters')
      .max(50, 'Target language cannot exceed 50 characters')
      .describe('The language being tested'),
    proficiency_level: z
      .string()
      .min(1, 'Proficiency level is required')
      .describe("Expected proficiency level (e.g., 'B1', 'B2', 'C1')"),
    topic: z
      .string()
      .min(1, 'Topic is required')
      .describe('Main topic or theme of the passage to be read during the test'),
    assessment_criteria: z
      .string()
      .min(1, 'Assessment criteria is required')
      .describe('String defining expectations for candidate comprehension'),
  })
  .strict();
export const introLinguisticTestInputSchema = z
  .object({
    target_language: z
      .string()
      .min(2, 'Target language must be at least 2 characters')
      .max(50, 'Target language cannot exceed 50 characters')
      .describe('The language being tested'),
    proficiency_level: z
      .string()
      .min(1, 'Proficiency level is required')
      .describe("Expected proficiency level (e.g., 'B1', 'B2', 'C1')"),
    topic: z
      .string()
      .min(1, 'Topic is required')
      .describe('Main topic or theme of the passage to be read during the test'),
    assessment_criteria: z
      .string()
      .min(1, 'Assessment criteria is required')
      .describe('String defining expectations for candidate comprehension'),
  })
  .strict();

export const linguisticTestStep: StepDefinition = {
  id: 'linguisticTest',
  labels: {
    'en-US': 'Language Test',
    'it-IT': 'Test di Lingua',
  },
  prompts: {
    conversation: 'linguistic_test',
  },
  selectable: true,
  position: 'flexible',
  expandsTo: ['introLinguistic', 'linguisticTest'],
  generation: {
    template: 'generate_linguistic_test',
  },
  additionalData: {
    required: ['target_language'],
  },
  inputSchema: linguisticTestInputSchema,
};

export const introLinguisticStep: StepDefinition = {
  id: 'introLinguistic',
  labels: {
    'en-US': 'Language Test Intro',
    'it-IT': 'Introduzione Test Lingua',
  },
  prompts: {
    conversation: 'intro_linguistic',
  },
  selectable: false,
  position: 'flexible',
  parentStep: 'linguisticTest',
  inputSchema: introLinguisticTestInputSchema,
};
