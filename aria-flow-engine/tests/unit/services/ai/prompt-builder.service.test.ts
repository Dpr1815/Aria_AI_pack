/**
 * Unit tests for PromptBuilderService
 */

import { PromptBuilderService } from '@services/ai/prompt-builder.service';
import { PROMPT_CONFIG } from '@config/prompt.config';
import { NotFoundError, ValidationError } from '@utils/errors';
import { PromptTemplate } from '@utils';

// Override the global logger mock to include the `logger` named export
// (prompt-builder.service.ts imports { logger } directly, not createLogger)
jest.mock('../../../../src/utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    fatal: jest.fn(),
  }),
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    fatal: jest.fn(),
  },
  requestLogger: () => (_req: any, _res: any, next: any) => next(),
}));

// Mock the prompts module
jest.mock('../../../../src/prompts', () => ({
  getPromptTemplate: jest.fn(),
}));

import { getPromptTemplate } from '../../../../src/prompts';

const mockGetPromptTemplate = getPromptTemplate as jest.MockedFunction<typeof getPromptTemplate>;

describe('PromptBuilderService', () => {
  let service: PromptBuilderService;

  const mockTemplate: PromptTemplate = {
    id: 'test-template',
    name: 'Test Template',
    template: 'Hello {{name}}, welcome to {{place}}!',
    variables: ['name', 'place'],
    category: 'generation',
    model: 'gpt-4o',
    maxTokens: 2000,
    temperature: 0.5,
    responseFormat: 'json_object',
  };

  beforeEach(() => {
    service = new PromptBuilderService();
    mockGetPromptTemplate.mockReturnValue(mockTemplate);
  });

  // ============================================
  // buildPrompt
  // ============================================

  describe('buildPrompt', () => {
    it('should build a prompt with variable substitution', async () => {
      const result = await service.buildPrompt({
        templateId: 'test-template',
        variables: { name: 'John', place: 'Aria' },
      });

      expect(result.content).toBe('Hello John, welcome to Aria!');
      expect(result.model).toBe('gpt-4o');
      expect(result.maxTokens).toBe(2000);
      expect(result.temperature).toBe(0.5);
      expect(result.responseFormat).toBe('json_object');
      expect(result.templateId).toBe('test-template');
    });

    it('should use template defaults for model/tokens/temperature', async () => {
      const result = await service.buildPrompt({
        templateId: 'test-template',
        variables: { name: 'Jane', place: 'home' },
      });

      expect(result.model).toBe(mockTemplate.model);
      expect(result.maxTokens).toBe(mockTemplate.maxTokens);
      expect(result.temperature).toBe(mockTemplate.temperature);
    });

    it('should override template values with options', async () => {
      const result = await service.buildPrompt({
        templateId: 'test-template',
        variables: { name: 'Jane', place: 'home' },
        options: {
          model: 'gpt-4.1-nano',
          maxTokens: 500,
          temperature: 0.2,
          responseFormat: 'text',
        },
      });

      expect(result.model).toBe('gpt-4.1-nano');
      expect(result.maxTokens).toBe(500);
      expect(result.temperature).toBe(0.2);
      expect(result.responseFormat).toBe('text');
    });

    it('should use PROMPT_CONFIG defaults when template has no values', async () => {
      mockGetPromptTemplate.mockReturnValue({
        ...mockTemplate,
        model: undefined,
        maxTokens: undefined,
        temperature: undefined,
        responseFormat: undefined,
      });

      const result = await service.buildPrompt({
        templateId: 'test-template',
        variables: { name: 'test', place: 'test' },
      });

      expect(result.model).toBe(PROMPT_CONFIG.DEFAULT_MODEL);
      expect(result.maxTokens).toBe(PROMPT_CONFIG.DEFAULT_MAX_TOKENS);
      expect(result.temperature).toBe(PROMPT_CONFIG.DEFAULT_TEMPERATURE);
    });

    it('should throw when template not found', async () => {
      mockGetPromptTemplate.mockReturnValue(undefined as any);

      await expect(
        service.buildPrompt({
          templateId: 'nonexistent',
          variables: {},
        })
      ).rejects.toThrow('not found');
    });

    it('should throw ValidationError when required variables are missing', async () => {
      await expect(
        service.buildPrompt({
          templateId: 'test-template',
          variables: { name: 'John' }, // missing 'place'
        })
      ).rejects.toThrow('Missing required variables');
    });

    it('should append custom instructions when provided', async () => {
      const result = await service.buildPrompt({
        templateId: 'test-template',
        variables: { name: 'John', place: 'Aria' },
        options: { customInstructions: 'Be concise.' },
      });

      expect(result.content).toContain('Hello John, welcome to Aria!');
      expect(result.content).toContain('Additional Instructions:');
      expect(result.content).toContain('Be concise.');
    });

    it('should handle nested variable substitution with dot notation', async () => {
      mockGetPromptTemplate.mockReturnValue({
        ...mockTemplate,
        template: 'Role: {{scenario.role}}, Level: {{scenario.level}}',
        variables: ['scenario.role', 'scenario.level'],
      });

      const result = await service.buildPrompt({
        templateId: 'test-template',
        variables: {
          scenario: { role: 'Developer', level: 'Senior' },
        },
      });

      expect(result.content).toBe('Role: Developer, Level: Senior');
    });

    it('should JSON.stringify non-string variable values', async () => {
      mockGetPromptTemplate.mockReturnValue({
        ...mockTemplate,
        template: 'Data: {{data}}',
        variables: ['data'],
      });

      const result = await service.buildPrompt({
        templateId: 'test-template',
        variables: { data: { key: 'value' } },
      });

      expect(result.content).toContain('"key": "value"');
    });

    it('should preserve original variables and template in result', async () => {
      const variables = { name: 'John', place: 'Aria' };
      const result = await service.buildPrompt({
        templateId: 'test-template',
        variables,
      });

      expect(result.originalVariables).toEqual(variables);
      expect(result.originalTemplate).toBe(mockTemplate.template);
    });

    it('should set reasoningEffort from options', async () => {
      const result = await service.buildPrompt({
        templateId: 'test-template',
        variables: { name: 'John', place: 'Aria' },
        options: { reasoningEffort: 'high' },
      });

      expect(result.reasoningEffort).toBe('high');
    });
  });

  // ============================================
  // buildMultiplePrompts
  // ============================================

  describe('buildMultiplePrompts', () => {
    it('should build multiple prompts successfully', async () => {
      const results = await service.buildMultiplePrompts([
        { templateId: 'test-template', variables: { name: 'A', place: 'X' } },
        { templateId: 'test-template', variables: { name: 'B', place: 'Y' } },
      ]);

      expect(results).toHaveLength(2);
      expect(results[0].content).toBe('Hello A, welcome to X!');
      expect(results[1].content).toBe('Hello B, welcome to Y!');
    });

    it('should continue building remaining prompts when some fail', async () => {
      // First call succeeds, second call fails (template not found)
      mockGetPromptTemplate
        .mockReturnValueOnce(mockTemplate)
        .mockReturnValueOnce(undefined as any)
        .mockReturnValueOnce(mockTemplate);

      const results = await service.buildMultiplePrompts([
        { templateId: 'test-template', variables: { name: 'A', place: 'X' } },
        { templateId: 'missing', variables: {} },
        { templateId: 'test-template', variables: { name: 'C', place: 'Z' } },
      ]);

      // Only 2 should succeed
      expect(results).toHaveLength(2);
    });
  });

  // ============================================
  // previewPrompt
  // ============================================

  describe('previewPrompt', () => {
    it('should return substituted template without building full config', () => {
      const result = service.previewPrompt('test-template', { name: 'Preview', place: 'Test' });

      expect(result).toBe('Hello Preview, welcome to Test!');
    });

    it('should throw when template not found', () => {
      mockGetPromptTemplate.mockReturnValue(undefined as any);

      expect(() => service.previewPrompt('missing', {})).toThrow('not found');
    });

    it('should leave unresolved variables as placeholders', () => {
      const result = service.previewPrompt('test-template', { name: 'Preview' });

      expect(result).toBe('Hello Preview, welcome to {{place}}!');
    });
  });
});
