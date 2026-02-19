/**
 * Learning & Development Steps
 */

import { ZodSchema } from 'zod';
import { StepDefinition } from '../../types';
import { ldIntroStep, ldIntroInputSchema } from './intro.step';
import { ldConclusionStep, ldConclusionInputSchema } from './conclusion.step';
import {
  knowledgeTransferStep,
  knowledgeTransferInputSchema,
} from './knowledge-transfer.step';
import {
  practicalApplicationStep,
  practicalApplicationInputSchema,
} from './practical-application.step';

/**
 * All L&D step definitions
 */
export const learningDevelopmentSteps: Record<string, StepDefinition> = {
  ldIntro: ldIntroStep,
  knowledgeTransfer: knowledgeTransferStep,
  practicalApplication: practicalApplicationStep,
  ldConclusion: ldConclusionStep,
};

/**
 * All L&D step input schemas
 */
export const learningDevelopmentStepSchemas: Record<string, ZodSchema> = {
  ldIntro: ldIntroInputSchema,
  knowledgeTransfer: knowledgeTransferInputSchema,
  practicalApplication: practicalApplicationInputSchema,
  ldConclusion: ldConclusionInputSchema,
};

// Re-export everything from each step file
export * from './intro.step';
export * from './conclusion.step';
export * from './knowledge-transfer.step';
export * from './practical-application.step';
