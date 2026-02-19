import { PromptTemplate } from '@utils';
import { REPORT_PROMPTS } from './recruiting-summary.prompt';
import { LD_REPORT_PROMPTS } from './learning-development-summary.prompt';

export const summaryRecruitingPrompts: Record<string, PromptTemplate> = {
  ...REPORT_PROMPTS,
  ...LD_REPORT_PROMPTS,
};

export * from './recruiting-summary.prompt';
export * from './learning-development-summary.prompt';
