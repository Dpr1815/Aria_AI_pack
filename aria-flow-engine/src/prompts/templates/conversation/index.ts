import { PromptTemplate } from '@utils';
import { INTERVIEW_PROMPTS } from './recruiting.prompts';
import { LD_PROMPTS } from './learning-development.prompts';

export const recruitingPrompts: Record<string, PromptTemplate> = {
  ...INTERVIEW_PROMPTS,
  ...LD_PROMPTS,
};

export * from './recruiting.prompts';
export * from './learning-development.prompts';
