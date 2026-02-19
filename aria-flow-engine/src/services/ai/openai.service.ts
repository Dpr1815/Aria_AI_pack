import { ILLMConnector } from '../../connectors/llm/ILLMConnector';
import {
  BuiltPrompt,
  LLMMessage,
  LLMCompletionConfig,
  LLMCompletionResult,
  LLMJSONCompletionResult,
} from '@utils';
import { PROMPT_CONFIG } from '../../config/prompt.config';
import { createLogger } from '../../utils/logger';
import { ExternalServiceError } from '../../utils/errors';

const logger = createLogger('OpenAIService');

export class OpenAIService {
  private readonly llmConnector: ILLMConnector;

  constructor(llmConnector: ILLMConnector) {
    this.llmConnector = llmConnector;
  }

  async complete(
    messages: LLMMessage[],
    config?: LLMCompletionConfig
  ): Promise<LLMCompletionResult> {
    try {
      const result = await this.llmConnector.complete(messages, {
        model: config?.model || PROMPT_CONFIG.DEFAULT_MODEL,
        maxTokens: config?.maxTokens || PROMPT_CONFIG.DEFAULT_MAX_TOKENS,
        temperature: config?.temperature || PROMPT_CONFIG.DEFAULT_TEMPERATURE,
        responseFormat: config?.responseFormat || PROMPT_CONFIG.DEFAULT_RESPONSE_FORMAT,
      });

      logger.info('LLM completion successful', {
        model: result.model,
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
      });

      return result;
    } catch (error) {
      logger.error('LLM completion failed', error as Error);
      throw new ExternalServiceError(
        'OpenAI',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  async completeJSON<T>(
    messages: LLMMessage[],
    config?: Omit<LLMCompletionConfig, 'responseFormat'>
  ): Promise<LLMJSONCompletionResult<T>> {
    try {
      const result = await this.llmConnector.completeJSON<T>(messages, {
        model: config?.model || PROMPT_CONFIG.DEFAULT_MODEL,
        maxTokens: config?.maxTokens || PROMPT_CONFIG.DEFAULT_MAX_TOKENS,
        temperature: config?.temperature || PROMPT_CONFIG.DEFAULT_TEMPERATURE,
      });

      logger.info('LLM JSON completion successful', {
        model: result.model,
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
      });

      return result;
    } catch (error) {
      logger.error('LLM JSON completion failed', error as Error);
      throw new ExternalServiceError(
        'OpenAI',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  async executePrompt(builtPrompt: BuiltPrompt): Promise<LLMCompletionResult> {
    const messages: LLMMessage[] = [{ role: 'user', content: builtPrompt.content }];

    return this.complete(messages, {
      model: builtPrompt.model,
      maxTokens: builtPrompt.maxTokens,
      temperature: builtPrompt.temperature,
      responseFormat: builtPrompt.responseFormat,
    });
  }

  async executePromptJSON<T>(builtPrompt: BuiltPrompt): Promise<LLMJSONCompletionResult<T>> {
    const messages: LLMMessage[] = [{ role: 'user', content: builtPrompt.content }];

    return this.completeJSON<T>(messages, {
      model: builtPrompt.model,
      maxTokens: builtPrompt.maxTokens,
      temperature: builtPrompt.temperature,
    });
  }

  async executeWithSystemPrompt(
    systemPrompt: string,
    userMessage: string,
    config?: LLMCompletionConfig
  ): Promise<LLMCompletionResult> {
    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ];

    return this.complete(messages, config);
  }

  async executeWithSystemPromptJSON<T>(
    systemPrompt: string,
    userMessage: string,
    config?: Omit<LLMCompletionConfig, 'responseFormat'>
  ): Promise<LLMJSONCompletionResult<T>> {
    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ];

    return this.completeJSON<T>(messages, config);
  }

  async executeConversation(
    messages: LLMMessage[],
    config?: LLMCompletionConfig
  ): Promise<LLMCompletionResult> {
    return this.complete(messages, config);
  }

  async executeConversationJSON<T>(
    messages: LLMMessage[],
    config?: Omit<LLMCompletionConfig, 'responseFormat'>
  ): Promise<LLMJSONCompletionResult<T>> {
    return this.completeJSON<T>(messages, config);
  }
}
