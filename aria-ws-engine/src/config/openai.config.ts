/**
 * OpenAI Configuration
 *
 * Settings for OpenAI API integration.
 */

import type { LLMConnectorConfig } from '../connectors/llm/ILLMConnector';

// ============================================
// Environment Variables
// ============================================

const {
  OPENAI_API_KEY = '',
  OPENAI_BASE_URL = 'https://api.openai.com/v1',
  OPENAI_ORGANIZATION = '',
  OPENAI_DEFAULT_MODEL = 'gpt-4.1-nano',
  OPENAI_MAX_RETRIES = '3',
  OPENAI_RETRY_DELAY_MS = '1000',
  OPENAI_TIMEOUT_MS = '60000',
} = process.env;

// ============================================
// Configuration
// ============================================

export const openaiConfig: LLMConnectorConfig = {
  apiKey: OPENAI_API_KEY,
  baseUrl: OPENAI_BASE_URL,
  organization: OPENAI_ORGANIZATION || undefined,
  defaultModel: OPENAI_DEFAULT_MODEL,
  maxRetries: parseInt(OPENAI_MAX_RETRIES, 10),
  retryDelayMs: parseInt(OPENAI_RETRY_DELAY_MS, 10),
  timeoutMs: parseInt(OPENAI_TIMEOUT_MS, 10),
};

// ============================================
// Model Presets
// ============================================

export const MODEL_PRESETS = {
  fast: 'gpt-4.1-nano',
  balanced: 'gpt-4.1-mini',
  powerful: 'gpt-4.1',
} as const;

export type ModelPreset = keyof typeof MODEL_PRESETS;

/**
 * Get model name from preset or return as-is.
 */
export function resolveModel(modelOrPreset: string | ModelPreset): string {
  if (modelOrPreset in MODEL_PRESETS) {
    return MODEL_PRESETS[modelOrPreset as ModelPreset];
  }
  return modelOrPreset;
}

// ============================================
// Validation
// ============================================

export function validateOpenAIConfig(): void {
  if (!openaiConfig.apiKey) {
    throw new Error('OPENAI_API_KEY is required');
  }
}
