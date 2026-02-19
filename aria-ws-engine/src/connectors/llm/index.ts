/**
 * LLM Connector Index
 */

export type {
  ILLMConnector,
  LLMMessage,
  MessageRole,
  CompletionOptions,
  CompletionResult,
  LLMConnectorConfig,
} from './ILLMConnector';

export { DEFAULT_LLM_CONFIG, DEFAULT_COMPLETION_OPTIONS } from './ILLMConnector';

export { OpenAIConnector, createOpenAIConnector } from './OpenAIConnector';
