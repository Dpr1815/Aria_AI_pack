/**
 * Unit tests for OpenAIService
 */

import { OpenAIService } from '@services/ai/openai.service';
import { ILLMConnector } from '../../../../src/connectors/llm/ILLMConnector';
import { PROMPT_CONFIG } from '@config/prompt.config';
import { ExternalServiceError } from '@utils/errors';
import {
  LLMMessage,
  LLMCompletionResult,
  LLMJSONCompletionResult,
  BuiltPrompt,
} from '@utils';

describe('OpenAIService', () => {
  let service: OpenAIService;
  let mockConnector: jest.Mocked<ILLMConnector>;

  const mockCompletionResult: LLMCompletionResult = {
    content: 'Hello, world!',
    model: 'gpt-4.1-nano',
    usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    finishReason: 'stop',
  };

  const mockJSONResult: LLMJSONCompletionResult<{ answer: string }> = {
    content: { answer: 'test' },
    raw: '{"answer":"test"}',
    model: 'gpt-4.1-nano',
    usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    finishReason: 'stop',
  };

  beforeEach(() => {
    mockConnector = {
      complete: jest.fn().mockResolvedValue(mockCompletionResult),
      completeJSON: jest.fn().mockResolvedValue(mockJSONResult),
    };

    service = new OpenAIService(mockConnector);
  });

  // ============================================
  // complete
  // ============================================

  describe('complete', () => {
    const messages: LLMMessage[] = [{ role: 'user', content: 'Hello' }];

    it('should call connector with default config when no config provided', async () => {
      const result = await service.complete(messages);

      expect(mockConnector.complete).toHaveBeenCalledWith(messages, {
        model: PROMPT_CONFIG.DEFAULT_MODEL,
        maxTokens: PROMPT_CONFIG.DEFAULT_MAX_TOKENS,
        temperature: PROMPT_CONFIG.DEFAULT_TEMPERATURE,
        responseFormat: PROMPT_CONFIG.DEFAULT_RESPONSE_FORMAT,
      });
      expect(result).toEqual(mockCompletionResult);
    });

    it('should use provided config values', async () => {
      const config = { model: 'gpt-4o', maxTokens: 1000, temperature: 0.5, responseFormat: 'text' as const };

      await service.complete(messages, config);

      expect(mockConnector.complete).toHaveBeenCalledWith(messages, config);
    });

    it('should wrap connector errors in ExternalServiceError', async () => {
      mockConnector.complete.mockRejectedValue(new Error('API timeout'));

      await expect(service.complete(messages)).rejects.toThrow('OpenAI error: API timeout');
    });

    it('should handle non-Error thrown values', async () => {
      mockConnector.complete.mockRejectedValue('string error');

      await expect(service.complete(messages)).rejects.toThrow('OpenAI error: Unknown error');
    });
  });

  // ============================================
  // completeJSON
  // ============================================

  describe('completeJSON', () => {
    const messages: LLMMessage[] = [{ role: 'user', content: 'Give me JSON' }];

    it('should call connector completeJSON with default config', async () => {
      const result = await service.completeJSON(messages);

      expect(mockConnector.completeJSON).toHaveBeenCalledWith(messages, {
        model: PROMPT_CONFIG.DEFAULT_MODEL,
        maxTokens: PROMPT_CONFIG.DEFAULT_MAX_TOKENS,
        temperature: PROMPT_CONFIG.DEFAULT_TEMPERATURE,
      });
      expect(result).toEqual(mockJSONResult);
    });

    it('should use provided config values', async () => {
      const config = { model: 'gpt-4o', maxTokens: 2000, temperature: 0.3 };

      await service.completeJSON(messages, config);

      expect(mockConnector.completeJSON).toHaveBeenCalledWith(messages, config);
    });

    it('should wrap connector errors in ExternalServiceError', async () => {
      mockConnector.completeJSON.mockRejectedValue(new Error('Parse error'));

      await expect(service.completeJSON(messages)).rejects.toThrow('OpenAI error: Parse error');
    });
  });

  // ============================================
  // executePrompt
  // ============================================

  describe('executePrompt', () => {
    const builtPrompt: BuiltPrompt = {
      content: 'Test prompt content',
      model: 'gpt-4o',
      maxTokens: 2000,
      temperature: 0.5,
      responseFormat: 'text',
    };

    it('should create user message from built prompt and call complete', async () => {
      const result = await service.executePrompt(builtPrompt);

      expect(mockConnector.complete).toHaveBeenCalledWith(
        [{ role: 'user', content: 'Test prompt content' }],
        {
          model: 'gpt-4o',
          maxTokens: 2000,
          temperature: 0.5,
          responseFormat: 'text',
        }
      );
      expect(result).toEqual(mockCompletionResult);
    });
  });

  // ============================================
  // executePromptJSON
  // ============================================

  describe('executePromptJSON', () => {
    const builtPrompt: BuiltPrompt = {
      content: 'Generate JSON',
      model: 'gpt-4.1-nano',
      maxTokens: 4096,
      temperature: 0.7,
    };

    it('should create user message and call completeJSON', async () => {
      const result = await service.executePromptJSON(builtPrompt);

      expect(mockConnector.completeJSON).toHaveBeenCalledWith(
        [{ role: 'user', content: 'Generate JSON' }],
        {
          model: 'gpt-4.1-nano',
          maxTokens: 4096,
          temperature: 0.7,
        }
      );
      expect(result).toEqual(mockJSONResult);
    });
  });

  // ============================================
  // executeWithSystemPrompt
  // ============================================

  describe('executeWithSystemPrompt', () => {
    it('should create system + user messages and call complete', async () => {
      const result = await service.executeWithSystemPrompt(
        'You are an assistant',
        'Hello there'
      );

      expect(mockConnector.complete).toHaveBeenCalledWith(
        [
          { role: 'system', content: 'You are an assistant' },
          { role: 'user', content: 'Hello there' },
        ],
        {
          model: PROMPT_CONFIG.DEFAULT_MODEL,
          maxTokens: PROMPT_CONFIG.DEFAULT_MAX_TOKENS,
          temperature: PROMPT_CONFIG.DEFAULT_TEMPERATURE,
          responseFormat: PROMPT_CONFIG.DEFAULT_RESPONSE_FORMAT,
        }
      );
      expect(result).toEqual(mockCompletionResult);
    });

    it('should pass custom config', async () => {
      await service.executeWithSystemPrompt('system', 'user', {
        model: 'gpt-4o',
        temperature: 0.2,
      });

      expect(mockConnector.complete).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ model: 'gpt-4o', temperature: 0.2 })
      );
    });
  });

  // ============================================
  // executeWithSystemPromptJSON
  // ============================================

  describe('executeWithSystemPromptJSON', () => {
    it('should create system + user messages and call completeJSON', async () => {
      const result = await service.executeWithSystemPromptJSON(
        'You return JSON',
        'Give me data'
      );

      expect(mockConnector.completeJSON).toHaveBeenCalledWith(
        [
          { role: 'system', content: 'You return JSON' },
          { role: 'user', content: 'Give me data' },
        ],
        {
          model: PROMPT_CONFIG.DEFAULT_MODEL,
          maxTokens: PROMPT_CONFIG.DEFAULT_MAX_TOKENS,
          temperature: PROMPT_CONFIG.DEFAULT_TEMPERATURE,
        }
      );
      expect(result).toEqual(mockJSONResult);
    });
  });

  // ============================================
  // executeConversation
  // ============================================

  describe('executeConversation', () => {
    it('should pass messages directly to complete', async () => {
      const messages: LLMMessage[] = [
        { role: 'system', content: 'system' },
        { role: 'user', content: 'hi' },
        { role: 'assistant', content: 'hello' },
        { role: 'user', content: 'how are you?' },
      ];

      const result = await service.executeConversation(messages);

      expect(mockConnector.complete).toHaveBeenCalledWith(messages, {
        model: PROMPT_CONFIG.DEFAULT_MODEL,
        maxTokens: PROMPT_CONFIG.DEFAULT_MAX_TOKENS,
        temperature: PROMPT_CONFIG.DEFAULT_TEMPERATURE,
        responseFormat: PROMPT_CONFIG.DEFAULT_RESPONSE_FORMAT,
      });
      expect(result).toEqual(mockCompletionResult);
    });
  });

  // ============================================
  // executeConversationJSON
  // ============================================

  describe('executeConversationJSON', () => {
    it('should pass messages directly to completeJSON', async () => {
      const messages: LLMMessage[] = [
        { role: 'user', content: 'give me json' },
      ];

      const result = await service.executeConversationJSON(messages);

      expect(mockConnector.completeJSON).toHaveBeenCalledWith(messages, {
        model: PROMPT_CONFIG.DEFAULT_MODEL,
        maxTokens: PROMPT_CONFIG.DEFAULT_MAX_TOKENS,
        temperature: PROMPT_CONFIG.DEFAULT_TEMPERATURE,
      });
      expect(result).toEqual(mockJSONResult);
    });
  });
});
