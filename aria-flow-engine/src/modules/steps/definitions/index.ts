/**
 * Step Definitions
 */

import { ZodSchema } from 'zod';
import { StepDefinition, StepRegistry } from '../types';
import { interviewSteps, interviewStepSchemas } from './interview';
import {
  learningDevelopmentSteps,
  learningDevelopmentStepSchemas,
} from './learningDevelopment';
import {
  softSkillAssessmentSteps,
  softSkillAssessmentStepSchemas,
} from './softSkillAssessment';

/**
 * STEP_REGISTRY_BY_CATEGORY - Category-keyed step definitions
 * Single source of truth. Add new categories here.
 */
export const STEP_REGISTRY_BY_CATEGORY: Record<string, Record<string, StepDefinition>> = {
  interview: interviewSteps,
  learningDevelopment: learningDevelopmentSteps,
  softSkillAssessment: softSkillAssessmentSteps,
};

/**
 * STEP_REGISTRY - Flat step definitions (derived)
 */
export const STEP_REGISTRY: StepRegistry = Object.values(STEP_REGISTRY_BY_CATEGORY).reduce(
  (acc, categorySteps) => ({ ...acc, ...categorySteps }),
  {} as StepRegistry
);

/**
 * STEP_INPUT_SCHEMAS - Zod schemas for input validation
 */
export const STEP_INPUT_SCHEMAS: Record<string, ZodSchema> = {
  ...interviewStepSchemas,
  ...learningDevelopmentStepSchemas,
  ...softSkillAssessmentStepSchemas,
};

export { interviewSteps, interviewStepSchemas };
export { learningDevelopmentSteps, learningDevelopmentStepSchemas };
export { softSkillAssessmentSteps, softSkillAssessmentStepSchemas };
