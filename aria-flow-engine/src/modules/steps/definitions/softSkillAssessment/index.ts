/**
 * Soft Skill Assessment Steps
 */

import { ZodSchema } from 'zod';
import { StepDefinition } from '../../types';
import { ssaIntroStep, ssaIntroInputSchema } from './intro.step';
import { ssaRolePlayStep, ssaIntroRolePlayStep, ssaRolePlayInputSchema } from './role-play.step';
import {
  ssaScenarioQuestionsStep,
  ssaScenarioQuestionsInputSchema,
} from './scenario-questions.step';
import { ssaOpenQuestionsStep, ssaOpenQuestionsInputSchema } from './open-questions.step';
import { ssaConclusionStep, ssaConclusionInputSchema } from './conclusion.step';

/**
 * All SSA step definitions
 */
export const softSkillAssessmentSteps: Record<string, StepDefinition> = {
  ssaIntro: ssaIntroStep,
  ssaIntroRolePlay: ssaIntroRolePlayStep,
  ssaRolePlay: ssaRolePlayStep,
  ssaScenarioQuestions: ssaScenarioQuestionsStep,
  ssaOpenQuestions: ssaOpenQuestionsStep,
  ssaConclusion: ssaConclusionStep,
};

/**
 * All SSA step input schemas
 */
export const softSkillAssessmentStepSchemas: Record<string, ZodSchema> = {
  ssaIntro: ssaIntroInputSchema,
  ssaRolePlay: ssaRolePlayInputSchema,
  ssaScenarioQuestions: ssaScenarioQuestionsInputSchema,
  ssaOpenQuestions: ssaOpenQuestionsInputSchema,
  ssaConclusion: ssaConclusionInputSchema,
};

// Re-export everything from each step file
export * from './intro.step';
export * from './role-play.step';
export * from './scenario-questions.step';
export * from './open-questions.step';
export * from './conclusion.step';
