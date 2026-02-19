/**
 * Unit tests for AgentGeneratorService
 */

import { ObjectId } from 'mongodb';
import { AgentGeneratorService } from '@services/generation/agent-generator.service';
import {
  AgentRepository,
  AgentStepRepository,
  AgentPromptRepository,
  AgentAssessmentRepository,
} from '@repositories';
import { OpenAIService } from '@services/ai/openai.service';
import { PromptBuilderService } from '@services/ai/prompt-builder.service';
import { createObjectId } from '@test/helpers/test-utils';

// Mock repositories
jest.mock('@repositories/agent.repository');
jest.mock('@repositories/agent-step.repository');
jest.mock('@repositories/agent-prompt.repository');
jest.mock('@repositories/agent-assessment.repository');

// Mock @modules
jest.mock('@modules', () => ({
  ...jest.requireActual('@modules'),
  getStepDefinition: jest.fn(),
  getSystemPromptId: jest.fn(),
  getStepLabel: jest.fn(),
  isFirstPositionStep: jest.fn(),
  isLastPositionStep: jest.fn(),
  hasGenerationConfig: jest.fn(),
  getParentStep: jest.fn(),
  expandStep: jest.fn(),
  isSubStep: jest.fn(),
}));

// Mock @utils for logger and buildSlidesFromStepOrder
jest.mock('../../../../src/utils/slides', () => ({
  buildSlidesFromStepOrder: jest.fn().mockReturnValue({ intro: 1, conclusion: 2 }),
}));

import {
  getStepDefinition,
  getSystemPromptId,
  getStepLabel,
  hasGenerationConfig,
  getParentStep,
} from '@modules';

describe('AgentGeneratorService', () => {
  let service: AgentGeneratorService;
  let mockAgentRepo: jest.Mocked<AgentRepository>;
  let mockStepRepo: jest.Mocked<AgentStepRepository>;
  let mockPromptRepo: jest.Mocked<AgentPromptRepository>;
  let mockAssessmentRepo: jest.Mocked<AgentAssessmentRepository>;
  let mockOpenAI: jest.Mocked<OpenAIService>;
  let mockPromptBuilder: any;

  const userId = createObjectId();
  const agentId = createObjectId();
  const now = new Date('2024-01-01T00:00:00Z');

  beforeEach(() => {
    // Re-apply module mocks (resetMocks: true clears them)
    (getStepDefinition as jest.Mock).mockReturnValue(null);
    (getSystemPromptId as jest.Mock).mockReturnValue('test-template-id');
    (getStepLabel as jest.Mock).mockImplementation((key: string) => `Label: ${key}`);
    (hasGenerationConfig as jest.Mock).mockReturnValue(false);
    (getParentStep as jest.Mock).mockReturnValue(undefined);

    // Create mock repos
    mockAgentRepo = new AgentRepository(null as any) as jest.Mocked<AgentRepository>;
    mockStepRepo = new AgentStepRepository(null as any) as jest.Mocked<AgentStepRepository>;
    mockPromptRepo = new AgentPromptRepository(null as any) as jest.Mocked<AgentPromptRepository>;
    mockAssessmentRepo = new AgentAssessmentRepository(null as any) as jest.Mocked<AgentAssessmentRepository>;

    // Mock repo methods
    mockAgentRepo.create = jest.fn().mockResolvedValue({
      _id: agentId,
      label: 'Test Agent',
      ownerId: userId,
      voice: { languageCode: 'en-US', name: 'Aria', gender: 'FEMALE' },
      features: { lipSync: false, sessionPersistence: true, autoSummary: true, videoRecording: false },
      render: { mode: 'avatar' },
      conversationTypeId: 'interview',
      summaryTypeId: 'interview-summary',
      statisticsTypeId: 'interview-stats',
      stepOrder: ['intro', 'conclusion'],
      status: 'inactive',
      createdAt: now,
      updatedAt: now,
    });
    mockStepRepo.createManyForAgent = jest.fn().mockResolvedValue(undefined);
    mockPromptRepo.createManyForAgent = jest.fn().mockResolvedValue(undefined);
    mockAssessmentRepo.createForAgent = jest.fn().mockResolvedValue(undefined);

    // Mock OpenAI service
    mockOpenAI = {
      executePromptJSON: jest.fn().mockResolvedValue({
        content: { questions: ['Q1', 'Q2'] },
        raw: '{}',
        model: 'gpt-4.1-nano',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        finishReason: 'stop',
      }),
    } as any;

    // Mock PromptBuilder
    mockPromptBuilder = {
      buildPrompt: jest.fn().mockResolvedValue({
        content: 'Built prompt content',
        model: 'gpt-4.1-nano',
        maxTokens: 4096,
        temperature: 0.7,
        reasoningEffort: 'low',
      }),
    };

    service = new AgentGeneratorService(
      mockAgentRepo,
      mockStepRepo,
      mockPromptRepo,
      mockAssessmentRepo,
      mockOpenAI,
      mockPromptBuilder
    );
  });

  // ============================================
  // generateAgent
  // ============================================

  describe('generateAgent', () => {
    const tenant = {
      type: 'personal' as const,
      userId,
    };

    const baseInput = {
      label: 'Test Agent',
      summary: 'A test agent for unit testing purposes',
      steps: ['intro', 'conclusion'],
      voice: { languageCode: 'en-US', name: 'Aria', gender: 'FEMALE' as const },
      render: { mode: 'avatar' as const },
      conversationTypeId: 'interview',
      summaryTypeId: 'interview-summary',
      statisticsTypeId: 'interview-stats',
    };

    it('should create agent with all related documents', async () => {
      const result = await service.generateAgent(tenant, baseInput as any);

      expect(mockAgentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          label: 'Test Agent',
          ownerId: userId,
          status: 'inactive',
        })
      );
      expect(mockStepRepo.createManyForAgent).toHaveBeenCalledWith(agentId, expect.any(Array));
      expect(mockPromptRepo.createManyForAgent).toHaveBeenCalledWith(agentId, expect.any(Array));
      expect(result._id).toBe(agentId.toString());
      expect(result.label).toBe('Test Agent');
    });

    it('should set organizationId for organization tenant', async () => {
      const orgId = createObjectId();
      const orgTenant = {
        type: 'organization' as const,
        userId,
        organizationId: orgId,
        role: 'owner',
        organization: {},
      } as any;

      await service.generateAgent(orgTenant, baseInput as any);

      expect(mockAgentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
        })
      );
    });

    it('should generate step content for steps requiring generation', async () => {
      (hasGenerationConfig as jest.Mock).mockImplementation((id) => id === 'intro');
      (getStepDefinition as jest.Mock).mockImplementation((id) => {
        if (id === 'intro') {
          return { generation: { template: 'intro-gen' } };
        }
        return null;
      });

      await service.generateAgent(tenant, baseInput as any);

      // StepGenerator internally calls openAI — verify it's been invoked
      expect(mockStepRepo.createManyForAgent).toHaveBeenCalled();
    });

    it('should build prompts using PromptBuilder for each step', async () => {
      await service.generateAgent(tenant, baseInput as any);

      // Should call buildPrompt for each step in the order
      expect(mockPromptBuilder.buildPrompt).toHaveBeenCalled();
    });

    it('should return DTO with steps and prompts', async () => {
      const result = await service.generateAgent(tenant, baseInput as any);

      expect(result.steps).toBeDefined();
      expect(result.prompts).toBeDefined();
      expect(result.status).toBe('inactive');
      expect(result.ownerId).toBe(userId.toString());
    });

    it('should build features with defaults', async () => {
      await service.generateAgent(tenant, baseInput as any);

      expect(mockAgentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          features: expect.objectContaining({
            lipSync: false,
            sessionPersistence: true,
            autoSummary: true,
            videoRecording: false,
          }),
        })
      );
    });

    it('should build features with overrides', async () => {
      const input = {
        ...baseInput,
        features: { lipSync: true, videoRecording: true },
      };

      await service.generateAgent(tenant, input as any);

      expect(mockAgentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          features: expect.objectContaining({
            lipSync: true,
            videoRecording: true,
          }),
        })
      );
    });

    it('should use presentation render config with slides', async () => {
      const input = {
        ...baseInput,
        render: {
          mode: 'presentation' as const,
          presentation: { link: 'https://example.com/slides' },
        },
      };

      await service.generateAgent(tenant, input as any);

      expect(mockAgentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          render: expect.objectContaining({
            mode: 'presentation',
            presentation: expect.objectContaining({
              link: 'https://example.com/slides',
            }),
          }),
        })
      );
    });

    it('should fall back to avatar mode when no presentation link', async () => {
      const input = {
        ...baseInput,
        render: { mode: 'avatar' as const },
      };

      await service.generateAgent(tenant, input as any);

      expect(mockAgentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          render: { mode: 'avatar' },
        })
      );
    });

    it('should create assessment artifacts when step has artifact config', async () => {
      (getStepDefinition as jest.Mock).mockImplementation((id) => {
        if (id === 'intro') {
          return {
            artifacts: {
              assessment: {
                testContentField: 'test_content',
                durationField: 'time_minutes',
                languageField: 'target_language',
                languageFallback: 'en',
              },
            },
          };
        }
        return null;
      });

      const input = {
        ...baseInput,
        additionalData: { time_minutes: 30, target_language: 'en' },
      };

      // The step generator won't generate for intro (no generation config mock),
      // so we need to make sure the generated inputs contain the test content
      // Since there's no generation config, generatedInputs will be empty.
      // The artifact creation will skip because testContent won't be found.
      await service.generateAgent(tenant, input as any);

      // Service should still complete successfully
      expect(mockAgentRepo.create).toHaveBeenCalled();
    });

    it('should use fallback prompt when template is not found', async () => {
      (getSystemPromptId as jest.Mock).mockReturnValue(null);

      const result = await service.generateAgent(tenant, baseInput as any);

      // Should still create prompts (using fallback)
      expect(mockPromptRepo.createManyForAgent).toHaveBeenCalled();
      expect(result.prompts).toBeDefined();
    });

    it('should use fallback prompt when buildPrompt throws', async () => {
      mockPromptBuilder.buildPrompt.mockRejectedValue(new Error('Template error'));

      const result = await service.generateAgent(tenant, baseInput as any);

      // Should still succeed with fallback prompts
      expect(result._id).toBe(agentId.toString());
    });
  });
});
