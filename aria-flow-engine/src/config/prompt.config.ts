export const DEFAULT_MODEL = 'gpt-4.1-nano';
export const DEFAULT_MAX_TOKENS = 4096;
export const DEFAULT_TEMPERATURE = 0.7;
export const DEFAULT_RESPONSE_FORMAT = 'json_object';
export const PROMPT_CONFIG = {
  DEFAULT_MODEL,
  DEFAULT_MAX_TOKENS,
  DEFAULT_TEMPERATURE,
  DEFAULT_RESPONSE_FORMAT,
} as const;
export interface PromptConfig {
  defaultModel: string;
  defaultMaxTokens: number;
  defaultTemperature: number;
}

export const loadPromptConfig = (): PromptConfig => {
  return {
    defaultModel: process.env.DEFAULT_LLM_MODEL || DEFAULT_MODEL,
    defaultMaxTokens: parseInt(process.env.DEFAULT_MAX_TOKENS || String(DEFAULT_MAX_TOKENS), 10),
    defaultTemperature: parseFloat(process.env.DEFAULT_TEMPERATURE || String(DEFAULT_TEMPERATURE)),
  };
};
