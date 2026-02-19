import { PromptTemplate } from '@utils';
import { generationPrompts } from './generation';
import { recruitingPrompts } from './conversation';
import { summaryRecruitingPrompts } from './summary';
export const allPromptTemplates: Record<string, PromptTemplate> = {
  ...generationPrompts,
  ...recruitingPrompts,
  ...summaryRecruitingPrompts,
};

export * from './generation';
