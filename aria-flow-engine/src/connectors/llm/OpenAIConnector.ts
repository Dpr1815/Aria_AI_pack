import OpenAI from 'openai';
import { ILLMConnector, LLMConnectorConfig } from './ILLMConnector';
import {
  LLMMessage,
  LLMCompletionConfig,
  LLMCompletionResult,
  LLMJSONCompletionResult,
} from '@utils';
import { PROMPT_CONFIG } from '../../config/prompt.config';
import { createLogger, retryWithBackoff, CircuitBreaker, ExternalServiceError } from '@utils';

const logger = createLogger('OpenAIConnector');

function isRetryableOpenAIError(error: unknown): boolean {
  if (error instanceof OpenAI.APIError) {
    const status = error.status;
    return status === 429 || status === 500 || status === 502 || status === 503;
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes('timeout') || msg.includes('network') || msg.includes('econnreset');
  }
  return false;
}

export class OpenAIConnector implements ILLMConnector {
  private readonly client: OpenAI;
  private readonly breaker: CircuitBreaker;
  private readonly defaultModel: string;
  private readonly defaultMaxTokens: number;
  private readonly defaultTemperature: number;

  constructor(config: LLMConnectorConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      timeout: config.timeoutMs ?? 360_000,
    });
    this.breaker = new CircuitBreaker('OpenAI', {
      failureThreshold: 5,
      resetTimeoutMs: 30_000,
      monitorWindowMs: 60_000,
    });
    this.defaultModel = config.defaultModel ?? PROMPT_CONFIG.DEFAULT_MODEL;
    this.defaultMaxTokens = config.defaultMaxTokens ?? PROMPT_CONFIG.DEFAULT_MAX_TOKENS;
    this.defaultTemperature = config.defaultTemperature ?? PROMPT_CONFIG.DEFAULT_TEMPERATURE;
  }

  async complete(
    messages: LLMMessage[],
    config?: LLMCompletionConfig
  ): Promise<LLMCompletionResult> {
    const model = config?.model ?? this.defaultModel;
    const maxTokens = config?.maxTokens ?? this.defaultMaxTokens;
    const temperature = config?.temperature ?? this.defaultTemperature;

    logger.debug('Calling OpenAI API', {
      model,
      maxTokens,
      temperature,
      messageCount: messages.length,
    });

    return this.breaker.execute(async () => {
      const response = await retryWithBackoff(
        async () => {
          return this.client.chat.completions.create({
            model,
            messages: messages.map((m) => ({ role: m.role, content: m.content })),
            max_tokens: maxTokens,
            temperature,
          });
        },
        { maxRetries: 3, initialDelayMs: 1000, shouldRetry: isRetryableOpenAIError }
      );

      const choice = response.choices[0];

      return {
        content: choice.message.content || '',
        model: response.model,
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
        finishReason: choice.finish_reason || 'unknown',
      };
    });
  }

  async completeJSON<T>(
    messages: LLMMessage[],
    config?: Omit<LLMCompletionConfig, 'responseFormat'>
  ): Promise<LLMJSONCompletionResult<T>> {
    const model = config?.model ?? this.defaultModel;
    const maxTokens = config?.maxTokens ?? this.defaultMaxTokens;
    const temperature = config?.temperature ?? this.defaultTemperature;

    logger.debug('Calling OpenAI API (JSON mode)', {
      model,
      maxTokens,
      temperature,
      messageCount: messages.length,
    });

    return this.breaker.execute(async () => {
      const response = await retryWithBackoff(
        async () => {
          return this.client.chat.completions.create({
            model,
            messages: messages.map((m) => ({ role: m.role, content: m.content })),
            max_tokens: maxTokens,
            temperature,
            response_format: { type: 'json_object' },
          });
        },
        { maxRetries: 3, initialDelayMs: 1000, shouldRetry: isRetryableOpenAIError }
      );

      const choice = response.choices[0];
      const raw = choice.message.content || '{}';

      let content: T;
      try {
        content = JSON.parse(raw) as T;
      } catch (error) {
        logger.error('Failed to parse JSON response', error as Error, { raw });
        throw new ExternalServiceError('OpenAI', 'Failed to parse JSON response');
      }

      return {
        content,
        raw,
        model: response.model,
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
        finishReason: choice.finish_reason || 'unknown',
      };
    });
  }
}
