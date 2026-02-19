/**
 * OpenAI Connector
 *
 * Implements ILLMConnector using OpenAI's API.
 * Supports both standard and reasoning models via model-capabilities.
 * Automatic retries with exponential backoff.
 */

import OpenAI from 'openai';
import type { AIResponse } from '../../types/conversation.types';
import { safeParseAIResponse } from '../../validations/ai.validation';
import type {
  ILLMConnector,
  LLMMessage,
  CompletionOptions,
  CompletionResult,
  LLMConnectorConfig,
} from './ILLMConnector';
import { DEFAULT_LLM_CONFIG, DEFAULT_COMPLETION_OPTIONS } from './ILLMConnector';
import { getModelCapabilities, type ModelCapabilities } from './model-capabilities';
import { createLogger, ExternalServiceError, CircuitBreaker } from '@utils';

const logger = createLogger('OpenAI');

// ============================================
// OpenAI Connector Class
// ============================================

export class OpenAIConnector implements ILLMConnector {
  private client: OpenAI;
  private ready = false;
  private readonly config: Required<LLMConnectorConfig>;
  private readonly breaker: CircuitBreaker;

  constructor(config: LLMConnectorConfig) {
    this.config = {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl ?? 'https://api.openai.com/v1',
      defaultModel: config.defaultModel ?? DEFAULT_LLM_CONFIG.defaultModel!,
      maxRetries: config.maxRetries ?? DEFAULT_LLM_CONFIG.maxRetries!,
      retryDelayMs: config.retryDelayMs ?? DEFAULT_LLM_CONFIG.retryDelayMs!,
      timeoutMs: config.timeoutMs ?? DEFAULT_LLM_CONFIG.timeoutMs!,
      organization: config.organization ?? '',
    };

    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseUrl,
      organization: this.config.organization || undefined,
      timeout: this.config.timeoutMs,
      maxRetries: 0,
    });

    this.breaker = new CircuitBreaker('OpenAI', {
      failureThreshold: 5,
      resetTimeoutMs: 30_000,
      monitorWindowMs: 60_000,
    });

    this.ready = true;
  }

  async complete(messages: LLMMessage[], options?: CompletionOptions): Promise<CompletionResult> {
    if (!this.ready) {
      throw new ExternalServiceError('OpenAI', 'Connector not ready');
    }

    const mergedOptions = { ...DEFAULT_COMPLETION_OPTIONS, ...options };
    return this.breaker.execute(() =>
      this.executeWithRetry(() => this.doComplete(messages, mergedOptions)),
    );
  }

  // ------------------------------------------
  // Request Building & Execution
  // ------------------------------------------

  private async doComplete(
    messages: LLMMessage[],
    options: CompletionOptions
  ): Promise<CompletionResult> {
    const model = options.model ?? this.config.defaultModel;
    const capabilities = getModelCapabilities(model);
    const request = this.buildRequest(model, messages, options, capabilities);

    const completion = await this.client.chat.completions.create(request);

    const choice = completion.choices[0];
    const rawContent = choice?.message?.content ?? '';
    const response = this.parseResponse(rawContent, options.responseFormat);

    return {
      response,
      rawContent,
      usage: completion.usage
        ? {
            promptTokens: completion.usage.prompt_tokens,
            completionTokens: completion.usage.completion_tokens,
            totalTokens: completion.usage.total_tokens,
          }
        : undefined,
      model: completion.model,
      finishReason: choice?.finish_reason ?? undefined,
    };
  }

  /**
   * Build the API request, adapting parameters to model capabilities.
   *
   * Standard models (GPT-4.1, GPT-4o, GPT-3.5):
   *  - `max_tokens` for output limit
   *  - `temperature`, `top_p`, `frequency_penalty`, `presence_penalty`
   *
   * Reasoning models (GPT-5, o3, o4):
   *  - `max_completion_tokens` for output limit
   *  - `reasoning_effort` for controlling reasoning depth
   *  - No sampling params (temperature, top_p, penalties)
   */
  private buildRequest(
    model: string,
    messages: LLMMessage[],
    options: CompletionOptions,
    capabilities: ModelCapabilities
  ): OpenAI.ChatCompletionCreateParamsNonStreaming {
    const formattedMessages = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Base request — required fields that satisfy the OpenAI type
    const request: OpenAI.ChatCompletionCreateParamsNonStreaming = {
      model,
      messages: formattedMessages,
      stop: options.stop,
    };

    // Output token limit — parameter name varies by model family
    if (options.maxTokens != null) {
      if (capabilities.tokenLimitParam === 'max_completion_tokens') {
        request.max_completion_tokens = options.maxTokens;
      } else {
        request.max_tokens = options.maxTokens;
      }
    }

    // Sampling parameters — standard models only
    if (capabilities.supportsSamplingParams) {
      if (options.temperature != null) request.temperature = options.temperature;
      if (options.topP != null) request.top_p = options.topP;
      if (options.frequencyPenalty != null) request.frequency_penalty = options.frequencyPenalty;
      if (options.presencePenalty != null) request.presence_penalty = options.presencePenalty;
    }
    // Reasoning effort — reasoning models only
    if (capabilities.supportsReasoning && options.reasoningEffort) {
      Object.assign(request, { reasoning_effort: options.reasoningEffort });
    }

    // JSON mode
    if (options.responseFormat === 'json') {
      request.response_format = { type: 'json_object' };
    }

    return request;
  }

  // ------------------------------------------
  // Response Parsing
  // ------------------------------------------

  /**
   * Parse raw LLM output into AIResponse.
   *
   * Expects: { "text": "...", "action": "STEP_COMPLETED" }
   * or:      { "text": "...", "action": "" }
   *
   * safeParseAIResponse handles normalizing empty action to undefined.
   */
  private parseResponse(rawContent: string, format?: 'text' | 'json'): AIResponse {
    if (format !== 'json') {
      return { text: rawContent };
    }

    try {
      const parsed = JSON.parse(rawContent);
      const result = safeParseAIResponse(parsed);

      if (result.success) {
        return result.data;
      }

      logger.warn('Response JSON does not match expected schema', { error: result.error });
      return { text: parsed.text ?? rawContent };
    } catch (error) {
      logger.warn('Failed to parse JSON response', { error: error instanceof Error ? error.message : error });
      return { text: rawContent };
    }
  }

  // ------------------------------------------
  // Retry Logic
  // ------------------------------------------

  private async executeWithRetry<T>(fn: () => Promise<T>, attempt = 1): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      const isRetryable = this.isRetryableError(error);

      if (!isRetryable || attempt >= this.config.maxRetries) {
        const message = error instanceof Error ? error.message : String(error);
        throw new ExternalServiceError('OpenAI', message);
      }

      const delay = this.calculateBackoff(attempt);
      logger.info('Retrying request', {
        attempt: attempt + 1,
        maxRetries: this.config.maxRetries,
        delayMs: Math.round(delay),
      });

      await this.sleep(delay);
      return this.executeWithRetry(fn, attempt + 1);
    }
  }

  private isRetryableError(error: unknown): boolean {
    if (error instanceof OpenAI.APIError) {
      const status = error.status;
      return status === 429 || status === 500 || status === 502 || status === 503;
    }

    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('timeout') || message.includes('network') || message.includes('econnreset')
      );
    }

    return false;
  }

  private calculateBackoff(attempt: number): number {
    const base = this.config.retryDelayMs;
    const maxDelay = 30000;
    const delay = Math.min(base * Math.pow(2, attempt - 1), maxDelay);
    return delay + Math.random() * 1000;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ------------------------------------------
  // Public Accessors
  // ------------------------------------------

  isReady(): boolean {
    return this.ready;
  }

  getDefaultModel(): string {
    return this.config.defaultModel;
  }

  getAvailableModels(): string[] {
    return ['gpt-4.1-nano', 'gpt-4.1-mini', 'gpt-4.1', 'gpt-5-nano', 'gpt-5-mini', 'gpt-5'];
  }
}

export function createOpenAIConnector(config: LLMConnectorConfig): OpenAIConnector {
  return new OpenAIConnector(config);
}
