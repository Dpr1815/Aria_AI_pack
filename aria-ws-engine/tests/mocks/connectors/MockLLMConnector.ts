/**
 * Mock LLM Connector
 */

import type { AIResponse } from '@types';

export function createMockLLMConnector(defaultResponse?: AIResponse) {
  const response: AIResponse = defaultResponse ?? {
    text: 'Hello! How can I help you?',
    action: undefined,
  };

  return {
    complete: jest.fn().mockResolvedValue({
      response,
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      finishReason: 'stop',
    }),
    isReady: jest.fn().mockReturnValue(true),
    getDefaultModel: jest.fn().mockReturnValue('gpt-4o'),
    getAvailableModels: jest.fn().mockReturnValue(['gpt-4o', 'gpt-4o-mini']),
  };
}
