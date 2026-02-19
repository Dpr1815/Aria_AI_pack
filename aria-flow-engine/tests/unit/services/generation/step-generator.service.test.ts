/**
 * Unit tests for StepGeneratorService
 */

import { StepGeneratorService } from '@services/generation/step-generator.service';
import { OpenAIService } from '@services/ai/openai.service';
import { PromptBuilderService } from '@services/ai/prompt-builder.service';

// Mock @modules
jest.mock('@modules', () => ({
  ...jest.requireActual('@modules'),
  getStepDefinition: jest.fn(),
  hasGenerationConfig: jest.fn(),
}));

import { getStepDefinition, hasGenerationConfig } from '@modules';

// Override logger mock to include logger export
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

describe('StepGeneratorService', () => {
  let service: StepGeneratorService;
  let mockOpenAI: any;
  let mockPromptBuilder: any;

  beforeEach(() => {
    // Re-apply module mocks
    (getStepDefinition as jest.Mock).mockReturnValue(null);
    (hasGenerationConfig as jest.Mock).mockReturnValue(false);

    mockOpenAI = {
      executePromptJSON: jest.fn().mockResolvedValue({
        content: { questions: ['Q1', 'Q2'], topic: 'test' },
        raw: '{}',
        model: 'gpt-4.1-nano',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        finishReason: 'stop',
      }),
    };

    mockPromptBuilder = {
      buildPrompt: jest.fn().mockResolvedValue({
        content: 'Built prompt',
        model: 'gpt-4.1-nano',
        maxTokens: 4096,
        temperature: 0.7,
      }),
    };

    service = new StepGeneratorService(mockOpenAI, mockPromptBuilder);
  });

  const baseInput = {
    summary: 'Test job summary for testing',
    language: 'en',
    steps: ['intro', 'background'],
    additionalData: { assessment_type: 'coding' as const },
  };

  // ============================================
  // generateStep
  // ============================================

  describe('generateStep', () => {
    it('should return empty object when step has no generation config', async () => {
      const result = await service.generateStep('intro', baseInput);
      expect(result).toEqual({});
    });

    it('should execute single-template generation', async () => {
      (getStepDefinition as jest.Mock).mockReturnValue({
        generation: { template: 'background-gen' },
      });

      const result = await service.generateStep('background', baseInput);

      expect(mockPromptBuilder.buildPrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          templateId: 'background-gen',
        })
      );
      expect(mockOpenAI.executePromptJSON).toHaveBeenCalled();
      expect(result).toEqual({ questions: ['Q1', 'Q2'], topic: 'test' });
    });

    it('should resolve conditional template based on additionalData', async () => {
      (getStepDefinition as jest.Mock).mockReturnValue({
        generation: {
          templates: { coding: 'coding-gen', written: 'written-gen', default: 'default-gen' },
          templateSelector: 'assessment_type',
        },
      });

      await service.generateStep('assessment', baseInput);

      expect(mockPromptBuilder.buildPrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          templateId: 'coding-gen',
        })
      );
    });

    it('should fall back to default template when selector not found', async () => {
      (getStepDefinition as jest.Mock).mockReturnValue({
        generation: {
          templates: { coding: 'coding-gen', default: 'default-gen' },
          templateSelector: 'assessment_type',
        },
      });

      const input = { ...baseInput, additionalData: { assessment_type: 'unknown' as any } };
      await service.generateStep('assessment', input);

      expect(mockPromptBuilder.buildPrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          templateId: 'default-gen',
        })
      );
    });

    it('should return empty object when template cannot be resolved', async () => {
      (getStepDefinition as jest.Mock).mockReturnValue({
        generation: {},
      });

      const result = await service.generateStep('unknown', baseInput);
      expect(result).toEqual({});
    });

    it('should execute pipeline generation when stages exist', async () => {
      (getStepDefinition as jest.Mock).mockReturnValue({
        generation: {
          stages: [
            { id: 'stage1', template: 'stage1-template' },
            { id: 'stage2', template: 'stage2-template' },
          ],
        },
      });

      mockOpenAI.executePromptJSON
        .mockResolvedValueOnce({ content: { stage1Key: 'value1' }, raw: '{}', model: 'm', usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, finishReason: 'stop' })
        .mockResolvedValueOnce({ content: { stage2Key: 'value2' }, raw: '{}', model: 'm', usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, finishReason: 'stop' });

      const result = await service.generateStep('work', baseInput);

      expect(mockPromptBuilder.buildPrompt).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ stage1Key: 'value1', stage2Key: 'value2' });
    });

    it('should include steps in variables when configured', async () => {
      (getStepDefinition as jest.Mock).mockReturnValue({
        generation: { template: 'gen-template', includeSteps: true },
      });

      await service.generateStep('step1', baseInput);

      expect(mockPromptBuilder.buildPrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            steps: JSON.stringify(['intro', 'background']),
          }),
        })
      );
    });

    it('should merge additionalData into variables', async () => {
      (getStepDefinition as jest.Mock).mockReturnValue({
        generation: { template: 'gen-template' },
      });

      await service.generateStep('step1', baseInput);

      expect(mockPromptBuilder.buildPrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            summary: baseInput.summary,
            language: 'en',
            assessment_type: 'coding',
          }),
        })
      );
    });
  });

  // ============================================
  // generateMultipleSteps
  // ============================================

  describe('generateMultipleSteps', () => {
    it('should generate content for multiple steps', async () => {
      (hasGenerationConfig as jest.Mock).mockReturnValue(true);
      (getStepDefinition as jest.Mock).mockImplementation((stepId: string) => ({
        generation: { template: `${stepId}-template` },
      }));

      const result = await service.generateMultipleSteps(
        ['step1', 'step2'],
        baseInput
      );

      expect(mockPromptBuilder.buildPrompt).toHaveBeenCalledTimes(2);
      expect(result.step1).toBeDefined();
      expect(result.step2).toBeDefined();
    });

    it('should deduplicate steps sharing the same template', async () => {
      (hasGenerationConfig as jest.Mock).mockReturnValue(true);
      (getStepDefinition as jest.Mock).mockReturnValue({
        generation: { template: 'shared-template' },
      });

      const result = await service.generateMultipleSteps(
        ['sub1', 'sub2'],
        baseInput
      );

      // Should only call once due to deduplication (same template)
      expect(mockPromptBuilder.buildPrompt).toHaveBeenCalledTimes(1);
      // But results should be propagated to both
      expect(result.sub1).toBeDefined();
      expect(result.sub2).toBeDefined();
    });

    it('should skip steps without generation config', async () => {
      (hasGenerationConfig as jest.Mock).mockReturnValue(false);

      const result = await service.generateMultipleSteps(
        ['intro', 'conclusion'],
        baseInput
      );

      expect(mockPromptBuilder.buildPrompt).not.toHaveBeenCalled();
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('should throw when step generation fails', async () => {
      (hasGenerationConfig as jest.Mock).mockReturnValue(true);
      (getStepDefinition as jest.Mock).mockReturnValue({
        generation: { template: 'bad-template' },
      });
      mockPromptBuilder.buildPrompt.mockRejectedValue(new Error('Template not found'));

      await expect(
        service.generateMultipleSteps(['failing-step'], baseInput)
      ).rejects.toThrow('Template not found');
    });
  });

  // ============================================
  // Pipeline with variable mapping
  // ============================================

  describe('pipeline variable mapping', () => {
    it('should resolve variables from input source', async () => {
      (getStepDefinition as jest.Mock).mockReturnValue({
        generation: {
          stages: [
            {
              id: 'stage1',
              template: 'tpl1',
              variableMapping: {
                jobSummary: { from: 'input', path: 'summary' },
                lang: { from: 'input', path: 'language' },
              },
            },
          ],
        },
      });

      await service.generateStep('step1', baseInput);

      expect(mockPromptBuilder.buildPrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            jobSummary: baseInput.summary,
            lang: 'en',
          }),
        })
      );
    });

    it('should resolve variables from additionalData source', async () => {
      (getStepDefinition as jest.Mock).mockReturnValue({
        generation: {
          stages: [
            {
              id: 'stage1',
              template: 'tpl1',
              variableMapping: {
                assessType: { from: 'additionalData', path: 'assessment_type' },
              },
            },
          ],
        },
      });

      await service.generateStep('step1', baseInput);

      expect(mockPromptBuilder.buildPrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            assessType: 'coding',
          }),
        })
      );
    });

    it('should resolve variables from previous stage outputs', async () => {
      (getStepDefinition as jest.Mock).mockReturnValue({
        generation: {
          stages: [
            { id: 'stage1', template: 'tpl1' },
            {
              id: 'stage2',
              template: 'tpl2',
              variableMapping: {
                previousResult: { from: 'stage:stage1', path: 'outputKey' },
              },
            },
          ],
        },
      });

      mockOpenAI.executePromptJSON
        .mockResolvedValueOnce({
          content: { outputKey: 'stage1-output' },
          raw: '{}',
          model: 'm',
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          finishReason: 'stop',
        })
        .mockResolvedValueOnce({
          content: { finalResult: 'done' },
          raw: '{}',
          model: 'm',
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          finishReason: 'stop',
        });

      const result = await service.generateStep('step1', baseInput);

      // Stage 2 should receive stage 1 output
      expect(mockPromptBuilder.buildPrompt).toHaveBeenCalledTimes(2);
      const stage2Call = mockPromptBuilder.buildPrompt.mock.calls[1];
      expect(stage2Call[0].variables.previousResult).toBe('stage1-output');
      expect(result).toEqual({ outputKey: 'stage1-output', finalResult: 'done' });
    });

    it('should use fallback for additionalData variable', async () => {
      (getStepDefinition as jest.Mock).mockReturnValue({
        generation: {
          stages: [
            {
              id: 'stage1',
              template: 'tpl1',
              variableMapping: {
                lang: { from: 'additionalData', path: 'missing_field', fallback: 'assessment_type' },
              },
            },
          ],
        },
      });

      await service.generateStep('step1', baseInput);

      expect(mockPromptBuilder.buildPrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            lang: 'coding',
          }),
        })
      );
    });
  });

  // ============================================
  // Stage validation
  // ============================================

  describe('stage requirements validation', () => {
    it('should throw when required variables are missing', async () => {
      (getStepDefinition as jest.Mock).mockReturnValue({
        generation: {
          stages: [
            {
              id: 'stage1',
              template: 'tpl1',
              requiredVariables: ['missing_field'],
            },
          ],
        },
      });

      await expect(
        service.generateStep('step1', { ...baseInput, additionalData: undefined })
      ).rejects.toThrow('requires additionalData fields');
    });

    it('should pass when required variables are present', async () => {
      (getStepDefinition as jest.Mock).mockReturnValue({
        generation: {
          stages: [
            {
              id: 'stage1',
              template: 'tpl1',
              requiredVariables: ['assessment_type'],
            },
          ],
        },
      });

      await expect(
        service.generateStep('step1', baseInput)
      ).resolves.toBeDefined();
    });

    it('should throw when stage template cannot be resolved', async () => {
      (getStepDefinition as jest.Mock).mockReturnValue({
        generation: {
          stages: [
            {
              id: 'stage1',
              template: {}, // No default, no selector match
            },
          ],
        },
      });

      await expect(
        service.generateStep('step1', baseInput)
      ).rejects.toThrow('Could not resolve template');
    });
  });

  // ============================================
  // Deep merge
  // ============================================

  describe('deep merge (via pipeline)', () => {
    it('should deep merge stage outputs', async () => {
      (getStepDefinition as jest.Mock).mockReturnValue({
        generation: {
          stages: [
            { id: 'stage1', template: 'tpl1' },
            { id: 'stage2', template: 'tpl2' },
          ],
        },
      });

      mockOpenAI.executePromptJSON
        .mockResolvedValueOnce({
          content: { nested: { a: 1 }, top: 'first' },
          raw: '{}', model: 'm', usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, finishReason: 'stop',
        })
        .mockResolvedValueOnce({
          content: { nested: { b: 2 }, extra: 'second' },
          raw: '{}', model: 'm', usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, finishReason: 'stop',
        });

      const result = await service.generateStep('step1', baseInput);

      expect(result).toEqual({
        nested: { a: 1, b: 2 },
        top: 'first',
        extra: 'second',
      });
    });

    it('should replace arrays in deep merge', async () => {
      (getStepDefinition as jest.Mock).mockReturnValue({
        generation: {
          stages: [
            { id: 's1', template: 't1' },
            { id: 's2', template: 't2' },
          ],
        },
      });

      mockOpenAI.executePromptJSON
        .mockResolvedValueOnce({
          content: { list: [1, 2, 3] },
          raw: '{}', model: 'm', usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, finishReason: 'stop',
        })
        .mockResolvedValueOnce({
          content: { list: [4, 5] },
          raw: '{}', model: 'm', usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, finishReason: 'stop',
        });

      const result = await service.generateStep('step1', baseInput);

      // Arrays should be replaced, not concatenated
      expect(result.list).toEqual([4, 5]);
    });
  });
});
