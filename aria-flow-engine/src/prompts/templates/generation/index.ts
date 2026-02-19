import { PromptTemplate } from '@utils';
import { RECRUITING_PROMPTS } from './recruiting.prompts';
import { LD_GENERATION_PROMPTS } from './learning-development.prompts';

export const generationPrompts: Record<string, PromptTemplate> = {
  ...RECRUITING_PROMPTS,
  ...LD_GENERATION_PROMPTS,
};

export * from './recruiting.prompts';
export * from './learning-development.prompts';
