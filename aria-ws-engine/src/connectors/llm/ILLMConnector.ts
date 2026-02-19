/**
 * LLM Connector Interface
 *
 * Defines the contract for Language Model services.
 * Allows swapping OpenAI for other providers (Anthropic, etc.).
 *
 * NOTE: LLMMessage, LLMMessageRole, and AIResponse are defined in
 * conversation.types.ts (single source of truth) and re-exported here.
 */

import type { LLMMessage, LLMMessageRole, AIResponse } from '../../types/conversation.types';
import type { ReasoningEffort } from './model-capabilities';

export type { LLMMessage, LLMMessageRole as MessageRole, AIResponse };
export type { ReasoningEffort };

// ============================================
// Completion Options
// ============================================

export interface CompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
  stop?: string[];
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;

  /**
   * Controls reasoning depth for reasoning models (GPT-5, o-series).
   * Silently ignored for standard models (GPT-4.1, GPT-4o).
   *
   * - 'minimal' — Fastest, lowest token cost. Ideal for simple conversational turns.
   * - 'low'     — Light reasoning. Good for structured output and classification.
   * - 'medium'  — Balanced reasoning and latency.
   * - 'high'    — Maximum reasoning depth.
   *
   * @see https://platform.openai.com/docs/guides/reasoning
   */
  reasoningEffort?: ReasoningEffort;
}

// ============================================
// Completion Result
// ============================================

export interface CompletionResult {
  response: AIResponse;
  rawContent: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason?: string;
}

// ============================================
// Connector Interface
// ============================================

export interface ILLMConnector {
  complete(messages: LLMMessage[], options?: CompletionOptions): Promise<CompletionResult>;
  isReady(): boolean;
  getDefaultModel(): string;
  getAvailableModels(): string[];
}

// ============================================
// Configuration
// ============================================

export interface LLMConnectorConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
  maxRetries?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
  organization?: string;
}

export const DEFAULT_LLM_CONFIG: Partial<LLMConnectorConfig> = {
  defaultModel: 'gpt-4.1-mini',
  maxRetries: 3,
  retryDelayMs: 1000,
  timeoutMs: 60000,
};

export const DEFAULT_COMPLETION_OPTIONS: CompletionOptions = {
  temperature: 0.7,
  maxTokens: 1024,
  responseFormat: 'json',
};
