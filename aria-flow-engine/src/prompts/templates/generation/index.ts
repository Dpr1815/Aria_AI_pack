import { PromptTemplate } from '@utils';
import { RECRUITING_PROMPTS } from './recruiting.prompts';
import { LD_GENERATION_PROMPTS } from './learning-development.prompts';
import { SSA_GENERATION_PROMPTS } from './soft-skill-assessment.prompts';

export const generationPrompts: Record<string, PromptTemplate> = {
  ...RECRUITING_PROMPTS,
  ...LD_GENERATION_PROMPTS,
  ...SSA_GENERATION_PROMPTS,
};

export * from './recruiting.prompts';
export * from './learning-development.prompts';
export * from './soft-skill-assessment.prompts';
