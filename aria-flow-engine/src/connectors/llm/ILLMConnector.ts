import {
  LLMMessage,
  LLMCompletionConfig,
  LLMCompletionResult,
  LLMJSONCompletionResult,
} from '@utils';

export interface ILLMConnector {
  complete(messages: LLMMessage[], config?: LLMCompletionConfig): Promise<LLMCompletionResult>;
  completeJSON<T>(
    messages: LLMMessage[],
    config?: Omit<LLMCompletionConfig, 'responseFormat'>
  ): Promise<LLMJSONCompletionResult<T>>;
}

export interface LLMConnectorConfig {
  apiKey: string;
  defaultModel?: string;
  defaultMaxTokens?: number;
  defaultTemperature?: number;
  timeoutMs?: number;
}
