/**
 * Interview Steps
 */

import { ZodSchema } from 'zod';
import { StepDefinition } from '../../types';
import { introStep, introInputSchema } from './intro.step';
import { conclusionStep, conclusionInputSchema } from './conclusion.step';
import { backgroundStep, backgroundInputSchema } from './background.step';
import { workStep, introWorkStep, conclusionWorkStep, workInputSchema } from './work.step';
import { assessmentStep, assessmentInputSchema } from './assessment.step';
import { behavioralStep, behavioralInputSchema } from './behavioral.step';
import {
  linguisticTestStep,
  introLinguisticStep,
  linguisticTestInputSchema,
} from './linguistic.step';
import { workplaceSafetyStep, workplaceSafetyInputSchema } from './workplace-safety.step';

/**
 * All interview step definitions
 */
export const interviewSteps: Record<string, StepDefinition> = {
  intro: introStep,
  background: backgroundStep,

  work: workStep,
  introWork: introWorkStep,
  conclusionWork: conclusionWorkStep,

  assessment: assessmentStep,

  behavioral: behavioralStep,

  linguisticTest: linguisticTestStep,
  introLinguistic: introLinguisticStep,

  workplaceSafety: workplaceSafetyStep,

  conclusion: conclusionStep,
};

/**
 * All interview step input schemas
 */
export const interviewStepSchemas: Record<string, ZodSchema> = {
  intro: introInputSchema,
  background: backgroundInputSchema,

  work: workInputSchema,

  assessment: assessmentInputSchema,

  behavioral: behavioralInputSchema,

  linguisticTest: linguisticTestInputSchema,

  workplaceSafety: workplaceSafetyInputSchema,

  conclusion: conclusionInputSchema,
};

// Re-export everything from each step file
export * from './intro.step';
export * from './conclusion.step';
export * from './background.step';
export * from './work.step';
export * from './assessment.step';
export * from './behavioral.step';
export * from './linguistic.step';
export * from './workplace-safety.step';
