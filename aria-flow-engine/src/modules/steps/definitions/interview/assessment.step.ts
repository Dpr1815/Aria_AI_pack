/**
 * Assessment Step Definition
 *
 * Technical assessment with coding or written test.
 * Multi-stage pipeline with artifact creation.
 *
 * Variables:
 * - Conversation: job_title, company_name, test_specs, further_specifications, time_minutes
 * - Report: assessment_goals, focus_areas
 * - Additional Data (from request): assessment_type, time_minutes, language_coding (conditional)
 * - Artifact: Creates AgentAssessment document
 * - Runtime: next_step_label, last_prompt_step
 */

import { z } from 'zod';
import { StepDefinition } from '../../types';

export const assessmentInputSchema = z
  .object({
    // Generated variables (from pipeline)
    job_title: z.string().min(1, 'The specific position being interviewed for'),
    company_name: z.string().min(1, 'Name of the hiring organization'),
    test_specs: z.string().min(1, 'What this test evaluates'),
    further_specifications: z.string().min(1, 'Key skills being tested'),
    assessment_goals: z.string().min(1, 'Specific objectives of this assessment phase'),
    focus_areas: z.array(z.string()).min(1, 'Array of skills assessed during the test'),

    // Additional data from request
    assessment_type: z.enum(['coding', 'written']),
    time_minutes: z.number().int().min(5).max(120),
    language_coding: z.string().optional(),
  })
  .strict()
  .refine((data) => data.assessment_type !== 'coding' || !!data.language_coding, {
    message: 'Programming language is required for coding assessments',
    path: ['language_coding'],
  });

export const assessmentStep: StepDefinition = {
  id: 'assessment',
  labels: {
    'en-US': 'Assessment',
    'it-IT': 'Valutazione Tecnica',
  },
  prompts: {
    conversation: 'assessment',
  },
  selectable: true,
  position: 'flexible',

  /**
   * Multi-stage generation pipeline:
   * Stage 1: Generate test content (coding or written based on assessment_type)
   * Stage 2: Generate assessment metadata using test output
   */
  generation: {
    stages: [
      {
        id: 'test',
        template: {
          default: 'generate_hard_skill_test',
          written: 'generate_hard_skill_test',
          coding: 'generate_coding_challenge',
        },
        templateSelector: 'assessment_type',
        requiredVariables: ['time_minutes'],
        conditionalVariables: {
          coding: ['language_coding'],
        },
      },
      {
        id: 'metadata',
        template: 'generate_assessment_section',
        variableMapping: {
          language: { from: 'input', path: 'language' },
          test_text: { from: 'stage:test', path: 'test_text' },
        },
      },
    ],
  },

  /**
   * Additional data requirements from API request
   */
  additionalData: {
    required: ['assessment_type', 'time_minutes'],
    optional: ['language_coding'],
  },

  /**
   * Artifact configuration - creates AgentAssessment document
   */
  artifacts: {
    assessment: {
      testContentField: 'test_text',
      durationField: 'time_minutes',
      languageField: 'language_coding',
      languageFallback: 'en',
    },
  },

  inputSchema: assessmentInputSchema,
};
