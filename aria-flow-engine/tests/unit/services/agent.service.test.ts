/**
 * Unit tests for AgentService
 *
 * Tests the service layer business logic with mocked repositories
 */

import { AgentService } from '@services/agent.service';
import { AgentRepository } from '@repositories/agent.repository';
import { AgentStepRepository } from '@repositories/agent-step.repository';
import { AgentPromptRepository } from '@repositories/agent-prompt.repository';
import { AgentAssessmentRepository } from '@repositories/agent-assessment.repository';
import { createObjectId } from '@test/helpers/test-utils';
import { NotFoundError } from '@utils/errors';
import { AgentStatus } from '@constants';

// Mock repositories
jest.mock('@repositories/agent.repository');
jest.mock('@repositories/agent-step.repository');
jest.mock('@repositories/agent-prompt.repository');
jest.mock('@repositories/agent-assessment.repository');

// Mock module-level functions used by AgentService and StepSequencer
jest.mock('@modules', () => ({
  ...jest.requireActual('@modules'),
  validateStepInputs: jest.fn(),
  buildStepSkeleton: jest.fn().mockReturnValue({}),
  getSystemPromptId: jest.fn().mockReturnValue('template-id'),
  getStepDefinition: jest.fn().mockReturnValue(null),
  getStepLabel: jest.fn().mockImplementation((key: string) => `Label: ${key}`),
  isSubStep: jest.fn().mockReturnValue(false),
  getParentStep: jest.fn().mockReturnValue(null),
  isLastPositionStep: jest.fn().mockReturnValue(false),
  isFirstPositionStep: jest.fn().mockReturnValue(false),
  expandStep: jest.fn().mockImplementation((key: string) => [key]),
  hasGenerationConfig: jest.fn().mockReturnValue(false),
}));

describe('AgentService', () => {
  let agentService: AgentService;
  let mockAgentRepo: jest.Mocked<AgentRepository>;
  let mockStepRepo: jest.Mocked<AgentStepRepository>;
  let mockPromptRepo: jest.Mocked<AgentPromptRepository>;
  let mockAssessmentRepo: jest.Mocked<AgentAssessmentRepository>;
  let mockPromptBuilder: any;

  const mockAgentId = createObjectId();
  const mockUserId = createObjectId();
  const mockOrgId = createObjectId();
  const mockDate = new Date('2024-01-01T00:00:00Z');

  // ============================================
  // MOCK DOCUMENT FACTORIES
  // ============================================

  const createMockAgentDoc = (overrides: Record<string, unknown> = {}) => ({
    _id: mockAgentId,
    label: 'Test Agent',
    ownerId: mockUserId,
    voice: { languageCode: 'en-US', name: 'en-US-Neural2-F' },
    features: { lipSync: false, sessionPersistence: true, autoSummary: true, videoRecording: false },
    render: { mode: 'avatar' },
    conversationTypeId: 'interview',
    stepOrder: ['intro', 'work', 'conclusion'],
    summaryTypeId: 'interview',
    statisticsTypeId: 'interview',
    status: AgentStatus.ACTIVE,
    createdAt: mockDate,
    updatedAt: mockDate,
    ...overrides,
  });

  const createMockStepDoc = (overrides: Record<string, unknown> = {}) => ({
    _id: createObjectId(),
    agentId: mockAgentId,
    key: 'intro',
    label: 'Introduction',
    order: 1,
    nextStep: 'work',
    inputs: { greeting: 'Hello' },
    createdAt: mockDate,
    updatedAt: mockDate,
    ...overrides,
  });

  const createMockPromptDoc = (overrides: Record<string, unknown> = {}) => ({
    _id: createObjectId(),
    agentId: mockAgentId,
    key: 'intro',
    system: 'You are an interviewer...',
    model: 'gpt-4.1-nano',
    temperature: 0.7,
    maxTokens: 4096,
    createdAt: mockDate,
    updatedAt: mockDate,
    ...overrides,
  });

  const createMockAssessmentDoc = (overrides: Record<string, unknown> = {}) => ({
    _id: createObjectId(),
    agentId: mockAgentId,
    testContent: 'Test assessment content',
    language: 'en',
    durationSeconds: 300,
    createdAt: mockDate,
    updatedAt: mockDate,
    ...overrides,
  });

  const mockSteps = [
    createMockStepDoc({ key: 'intro', order: 1, nextStep: 'work' }),
    createMockStepDoc({ key: 'work', order: 2, nextStep: 'conclusion' }),
    createMockStepDoc({ key: 'conclusion', order: 3, nextStep: null }),
  ];

  const mockPrompts = [
    createMockPromptDoc({ key: 'intro' }),
    createMockPromptDoc({ key: 'work' }),
    createMockPromptDoc({ key: 'conclusion' }),
  ];

  const mockAssessment = createMockAssessmentDoc();

  /**
   * Helper: setup mocks needed by the internal toResponse method
   */
  const setupToResponseMocks = (
    agent = createMockAgentDoc(),
    steps: any[] = mockSteps,
    prompts: any[] = mockPrompts,
    assessment: any = mockAssessment
  ) => {
    mockAgentRepo.findByIdOrThrow = jest.fn().mockResolvedValue(agent);
    mockStepRepo.findByAgentId = jest.fn().mockResolvedValue(steps);
    mockPromptRepo.findByAgentId = jest.fn().mockResolvedValue(prompts);
    mockAssessmentRepo.findByAgentId = jest.fn().mockResolvedValue(assessment);
  };

  beforeEach(() => {
    // Re-setup @modules mocks (resetMocks: true in jest config clears implementations)
    const modules = require('@modules');
    (modules.validateStepInputs as jest.Mock).mockImplementation(() => {});
    (modules.buildStepSkeleton as jest.Mock).mockReturnValue({});
    (modules.getSystemPromptId as jest.Mock).mockReturnValue('template-id');
    (modules.getStepDefinition as jest.Mock).mockReturnValue(null);
    (modules.getStepLabel as jest.Mock).mockImplementation((key: string) => `Label: ${key}`);
    (modules.isSubStep as jest.Mock).mockReturnValue(false);
    (modules.getParentStep as jest.Mock).mockReturnValue(null);
    (modules.isLastPositionStep as jest.Mock).mockReturnValue(false);
    (modules.isFirstPositionStep as jest.Mock).mockReturnValue(false);
    (modules.expandStep as jest.Mock).mockImplementation((key: string) => [key]);
    (modules.hasGenerationConfig as jest.Mock).mockReturnValue(false);

    mockAgentRepo = new AgentRepository(null as any) as jest.Mocked<AgentRepository>;
    mockStepRepo = new AgentStepRepository(null as any) as jest.Mocked<AgentStepRepository>;
    mockPromptRepo = new AgentPromptRepository(null as any) as jest.Mocked<AgentPromptRepository>;
    mockAssessmentRepo = new AgentAssessmentRepository(
      null as any
    ) as jest.Mocked<AgentAssessmentRepository>;

    mockPromptBuilder = {
      buildPrompt: jest.fn().mockResolvedValue({
        content: 'Built prompt content',
        model: 'gpt-4.1-nano',
        maxTokens: 4096,
        temperature: 0.7,
      }),
    };

    agentService = new AgentService(
      mockAgentRepo,
      mockStepRepo,
      mockPromptRepo,
      mockAssessmentRepo,
      mockPromptBuilder
    );
  });

  // ============================================
  // AGENT CRUD
  // ============================================

  describe('createAgent', () => {
    const baseInput = {
      label: 'New Agent',
      voice: { languageCode: 'en-US', name: 'en-US-Neural2-F' },
      render: { mode: 'avatar' as const },
      steps: {
        intro: { label: 'Intro', order: 1, inputs: {} },
        conclusion: { label: 'Conclusion', order: 2, inputs: {} },
      },
      prompts: {
        intro: { system: 'sys', model: 'gpt-4.1-nano', temperature: 0.7, maxTokens: 4096 },
        conclusion: { system: 'sys', model: 'gpt-4.1-nano', temperature: 0.7, maxTokens: 4096 },
      },
    };

    it('should create agent with personal tenant', async () => {
      const tenant = { type: 'personal' as const, userId: mockUserId };
      const agentDoc = createMockAgentDoc({ label: 'New Agent' });

      mockAgentRepo.create = jest.fn().mockResolvedValue(agentDoc);
      mockStepRepo.createManyForAgent = jest.fn().mockResolvedValue([]);
      mockPromptRepo.createManyForAgent = jest.fn().mockResolvedValue([]);
      setupToResponseMocks(agentDoc);

      const result = await agentService.createAgent(tenant, baseInput as any);

      expect(mockAgentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          label: 'New Agent',
          ownerId: mockUserId,
          status: AgentStatus.ACTIVE,
        })
      );
      expect(mockAgentRepo.create).toHaveBeenCalledWith(
        expect.not.objectContaining({ organizationId: expect.anything() })
      );
      expect(mockStepRepo.createManyForAgent).toHaveBeenCalledWith(
        agentDoc._id,
        expect.any(Array)
      );
      expect(mockPromptRepo.createManyForAgent).toHaveBeenCalledWith(
        agentDoc._id,
        expect.any(Array)
      );
      expect(result).toHaveProperty('_id');
      expect(result).toHaveProperty('label', 'New Agent');
    });

    it('should create agent with organization tenant', async () => {
      const tenant = {
        type: 'organization' as const,
        userId: mockUserId,
        organizationId: mockOrgId,
        role: 'owner',
        organization: {},
      } as any;
      const agentDoc = createMockAgentDoc({ organizationId: mockOrgId });

      mockAgentRepo.create = jest.fn().mockResolvedValue(agentDoc);
      mockStepRepo.createManyForAgent = jest.fn().mockResolvedValue([]);
      mockPromptRepo.createManyForAgent = jest.fn().mockResolvedValue([]);
      setupToResponseMocks(agentDoc);

      await agentService.createAgent(tenant, baseInput as any);

      expect(mockAgentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ organizationId: mockOrgId })
      );
    });

    it('should create agent with assessment', async () => {
      const tenant = { type: 'personal' as const, userId: mockUserId };
      const inputWithAssessment = {
        ...baseInput,
        assessment: { testContent: 'Test', language: 'en', durationSeconds: 300 },
      };
      const agentDoc = createMockAgentDoc();

      mockAgentRepo.create = jest.fn().mockResolvedValue(agentDoc);
      mockStepRepo.createManyForAgent = jest.fn().mockResolvedValue([]);
      mockPromptRepo.createManyForAgent = jest.fn().mockResolvedValue([]);
      mockAssessmentRepo.createForAgent = jest.fn().mockResolvedValue(mockAssessment);
      setupToResponseMocks(agentDoc);

      await agentService.createAgent(tenant, inputWithAssessment as any);

      expect(mockAssessmentRepo.createForAgent).toHaveBeenCalledWith(
        agentDoc._id,
        expect.objectContaining({ testContent: 'Test', language: 'en', durationSeconds: 300 })
      );
    });

    it('should handle errors during creation', async () => {
      const tenant = { type: 'personal' as const, userId: mockUserId };
      const error = new Error('DB error');
      mockAgentRepo.create = jest.fn().mockRejectedValue(error);

      await expect(agentService.createAgent(tenant, baseInput as any)).rejects.toThrow('DB error');
    });
  });

  describe('getAgentById', () => {
    it('should return agent by id', async () => {
      const agentDoc = createMockAgentDoc();
      mockAgentRepo.findByIdOrThrow = jest.fn().mockResolvedValue(agentDoc);

      const result = await agentService.getAgentById(mockAgentId.toString());

      expect(mockAgentRepo.findByIdOrThrow).toHaveBeenCalledWith(mockAgentId.toString(), 'Agent');
      expect(result).toEqual(agentDoc);
    });

    it('should propagate NotFoundError', async () => {
      const error = new NotFoundError('Agent', mockAgentId.toString());
      mockAgentRepo.findByIdOrThrow = jest.fn().mockRejectedValue(error);

      await expect(agentService.getAgentById(mockAgentId.toString())).rejects.toThrow(error);
    });
  });

  describe('getAgent', () => {
    it('should return agent DTO with all expansions when requested', async () => {
      const agentDoc = createMockAgentDoc();
      setupToResponseMocks(agentDoc);

      const result = await agentService.getAgent(mockAgentId.toString(), {
        includeSteps: true,
        includePrompts: true,
        includeAssessment: true,
      });

      expect(result).toHaveProperty('_id', mockAgentId.toString());
      expect(result).toHaveProperty('steps');
      expect(result).toHaveProperty('prompts');
    });

    it('should respect options to exclude fields', async () => {
      const agentDoc = createMockAgentDoc();
      mockAgentRepo.findByIdOrThrow = jest.fn().mockResolvedValue(agentDoc);

      const result = await agentService.getAgent(mockAgentId.toString(), {
        includeSteps: false,
        includePrompts: false,
        includeAssessment: false,
      });

      expect(result).toHaveProperty('_id');
      expect(result.steps).toBeUndefined();
      expect(result.prompts).toBeUndefined();
      expect(result.assessment).toBeUndefined();
      expect(mockStepRepo.findByAgentId).not.toHaveBeenCalled();
      expect(mockPromptRepo.findByAgentId).not.toHaveBeenCalled();
      expect(mockAssessmentRepo.findByAgentId).not.toHaveBeenCalled();
    });
  });

  describe('getAgentPublicProfile', () => {
    it('should return profile for active agent', async () => {
      const agentDoc = createMockAgentDoc({ status: AgentStatus.ACTIVE });
      mockAgentRepo.findByIdOrThrow = jest.fn().mockResolvedValue(agentDoc);

      const result = await agentService.getAgentPublicProfile(mockAgentId.toString());

      expect(result).toHaveProperty('_id', mockAgentId.toString());
      // Public profile should not include steps/prompts/assessment
      expect(result.steps).toBeUndefined();
      expect(result.prompts).toBeUndefined();
      expect(result.assessment).toBeUndefined();
    });

    it('should throw NotFoundError for inactive agent', async () => {
      const agentDoc = createMockAgentDoc({ status: AgentStatus.INACTIVE });
      mockAgentRepo.findByIdOrThrow = jest.fn().mockResolvedValue(agentDoc);

      await expect(agentService.getAgentPublicProfile(mockAgentId.toString())).rejects.toThrow(
        'not found'
      );
    });
  });

  describe('listAgents', () => {
    const mockPaginatedResult = {
      data: [createMockAgentDoc()],
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    };

    it('should list personal agents', async () => {
      const tenant = { type: 'personal' as const, userId: mockUserId };
      mockAgentRepo.findPersonalAgents = jest.fn().mockResolvedValue(mockPaginatedResult);

      const result = await agentService.listAgents(tenant, { page: 1, limit: 10 } as any);

      expect(mockAgentRepo.findPersonalAgents).toHaveBeenCalledWith(mockUserId, {
        status: undefined,
        page: 1,
        limit: 10,
      });
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toHaveProperty('_id', mockAgentId.toString());
    });

    it('should list organization agents', async () => {
      const tenant = {
        type: 'organization' as const,
        userId: mockUserId,
        organizationId: mockOrgId,
        role: 'owner',
        organization: {},
      } as any;
      mockAgentRepo.findOrganizationAgents = jest.fn().mockResolvedValue(mockPaginatedResult);

      const result = await agentService.listAgents(tenant, { page: 1, limit: 10 } as any);

      expect(mockAgentRepo.findOrganizationAgents).toHaveBeenCalledWith(mockOrgId, {
        status: undefined,
        page: 1,
        limit: 10,
      });
      expect(result.data).toHaveLength(1);
    });

    it('should pass status filter', async () => {
      const tenant = { type: 'personal' as const, userId: mockUserId };
      mockAgentRepo.findPersonalAgents = jest.fn().mockResolvedValue(mockPaginatedResult);

      await agentService.listAgents(tenant, {
        status: AgentStatus.ACTIVE,
        page: 1,
        limit: 10,
      } as any);

      expect(mockAgentRepo.findPersonalAgents).toHaveBeenCalledWith(mockUserId, {
        status: AgentStatus.ACTIVE,
        page: 1,
        limit: 10,
      });
    });
  });

  describe('updateAgent', () => {
    it('should update basic fields', async () => {
      const agentDoc = createMockAgentDoc();
      mockAgentRepo.findByIdOrThrow = jest.fn().mockResolvedValue(agentDoc);
      mockAgentRepo.updateByIdOrThrow = jest.fn().mockResolvedValue(agentDoc);
      mockStepRepo.findByAgentId = jest.fn().mockResolvedValue(mockSteps);
      mockPromptRepo.findByAgentId = jest.fn().mockResolvedValue(mockPrompts);
      mockAssessmentRepo.findByAgentId = jest.fn().mockResolvedValue(mockAssessment);

      await agentService.updateAgent(mockAgentId.toString(), { label: 'Updated Label' } as any);

      expect(mockAgentRepo.updateByIdOrThrow).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ label: 'Updated Label' }),
        'Agent'
      );
    });

    it('should merge features with existing', async () => {
      const agentDoc = createMockAgentDoc();
      mockAgentRepo.findByIdOrThrow = jest.fn().mockResolvedValue(agentDoc);
      mockAgentRepo.updateByIdOrThrow = jest.fn().mockResolvedValue(agentDoc);
      mockStepRepo.findByAgentId = jest.fn().mockResolvedValue(mockSteps);
      mockPromptRepo.findByAgentId = jest.fn().mockResolvedValue(mockPrompts);
      mockAssessmentRepo.findByAgentId = jest.fn().mockResolvedValue(mockAssessment);

      await agentService.updateAgent(mockAgentId.toString(), {
        features: { lipSync: true },
      } as any);

      expect(mockAgentRepo.updateByIdOrThrow).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          features: expect.objectContaining({ lipSync: true, sessionPersistence: true }),
        }),
        'Agent'
      );
    });

    it('should not call update when no fields provided', async () => {
      const agentDoc = createMockAgentDoc();
      mockAgentRepo.findByIdOrThrow = jest.fn().mockResolvedValue(agentDoc);
      mockStepRepo.findByAgentId = jest.fn().mockResolvedValue(mockSteps);
      mockPromptRepo.findByAgentId = jest.fn().mockResolvedValue(mockPrompts);
      mockAssessmentRepo.findByAgentId = jest.fn().mockResolvedValue(mockAssessment);

      await agentService.updateAgent(mockAgentId.toString(), {} as any);

      expect(mockAgentRepo.updateByIdOrThrow).not.toHaveBeenCalled();
    });

    it('should handle render mode change to avatar', async () => {
      const agentDoc = createMockAgentDoc({ render: { mode: 'presentation' } });
      mockAgentRepo.findByIdOrThrow = jest.fn().mockResolvedValue(agentDoc);
      mockAgentRepo.updateByIdOrThrow = jest.fn().mockResolvedValue(agentDoc);
      mockStepRepo.findByAgentId = jest.fn().mockResolvedValue(mockSteps);
      mockPromptRepo.findByAgentId = jest.fn().mockResolvedValue(mockPrompts);
      mockAssessmentRepo.findByAgentId = jest.fn().mockResolvedValue(mockAssessment);

      await agentService.updateAgent(mockAgentId.toString(), {
        render: { mode: 'avatar' },
      } as any);

      expect(mockAgentRepo.updateByIdOrThrow).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ render: { mode: 'avatar' } }),
        'Agent'
      );
    });
  });

  describe('deleteAgent', () => {
    it('should cascade delete all related data', async () => {
      mockStepRepo.deleteByAgentId = jest.fn().mockResolvedValue(3);
      mockPromptRepo.deleteByAgentId = jest.fn().mockResolvedValue(3);
      mockAssessmentRepo.deleteByAgentId = jest.fn().mockResolvedValue(true);
      mockAgentRepo.deleteByIdOrThrow = jest.fn().mockResolvedValue(undefined);

      await agentService.deleteAgent(mockAgentId.toString());

      expect(mockStepRepo.deleteByAgentId).toHaveBeenCalled();
      expect(mockPromptRepo.deleteByAgentId).toHaveBeenCalled();
      expect(mockAssessmentRepo.deleteByAgentId).toHaveBeenCalled();
      expect(mockAgentRepo.deleteByIdOrThrow).toHaveBeenCalled();
    });
  });

  describe('activateAgent', () => {
    it('should activate an inactive agent', async () => {
      const agentDoc = createMockAgentDoc({ status: AgentStatus.INACTIVE });
      const activatedDoc = createMockAgentDoc({ status: AgentStatus.ACTIVE });

      mockAgentRepo.findByIdOrThrow = jest.fn().mockResolvedValue(agentDoc);
      mockAgentRepo.updateStatus = jest.fn().mockResolvedValue(activatedDoc);
      mockStepRepo.findByAgentId = jest.fn().mockResolvedValue(mockSteps);
      mockPromptRepo.findByAgentId = jest.fn().mockResolvedValue(mockPrompts);
      mockAssessmentRepo.findByAgentId = jest.fn().mockResolvedValue(mockAssessment);

      // findByIdOrThrow is called twice: once for status check, once for toResponse
      mockAgentRepo.findByIdOrThrow = jest
        .fn()
        .mockResolvedValueOnce(agentDoc)
        .mockResolvedValueOnce(activatedDoc);

      const result = await agentService.activateAgent(mockAgentId.toString());

      expect(mockAgentRepo.updateStatus).toHaveBeenCalledWith(
        expect.any(Object),
        AgentStatus.ACTIVE
      );
      expect(result).toHaveProperty('_id');
    });

    it('should return existing response for already active agent', async () => {
      const agentDoc = createMockAgentDoc({ status: AgentStatus.ACTIVE });
      setupToResponseMocks(agentDoc);

      const result = await agentService.activateAgent(mockAgentId.toString());

      expect(mockAgentRepo.updateStatus).not.toHaveBeenCalled();
      expect(result).toHaveProperty('_id');
    });

    it('should throw NotFoundError when updateStatus returns null', async () => {
      const agentDoc = createMockAgentDoc({ status: AgentStatus.INACTIVE });
      mockAgentRepo.findByIdOrThrow = jest.fn().mockResolvedValue(agentDoc);
      mockAgentRepo.updateStatus = jest.fn().mockResolvedValue(null);

      await expect(agentService.activateAgent(mockAgentId.toString())).rejects.toThrow(
        'not found'
      );
    });
  });

  describe('deactivateAgent', () => {
    it('should deactivate an active agent', async () => {
      const agentDoc = createMockAgentDoc({ status: AgentStatus.ACTIVE });
      const deactivatedDoc = createMockAgentDoc({ status: AgentStatus.INACTIVE });

      mockAgentRepo.findByIdOrThrow = jest
        .fn()
        .mockResolvedValueOnce(agentDoc)
        .mockResolvedValueOnce(deactivatedDoc);
      mockAgentRepo.updateStatus = jest.fn().mockResolvedValue(deactivatedDoc);
      mockStepRepo.findByAgentId = jest.fn().mockResolvedValue(mockSteps);
      mockPromptRepo.findByAgentId = jest.fn().mockResolvedValue(mockPrompts);
      mockAssessmentRepo.findByAgentId = jest.fn().mockResolvedValue(mockAssessment);

      const result = await agentService.deactivateAgent(mockAgentId.toString());

      expect(mockAgentRepo.updateStatus).toHaveBeenCalledWith(
        expect.any(Object),
        AgentStatus.INACTIVE
      );
      expect(result).toHaveProperty('_id');
    });

    it('should return existing response for already inactive agent', async () => {
      const agentDoc = createMockAgentDoc({ status: AgentStatus.INACTIVE });
      setupToResponseMocks(agentDoc);

      const result = await agentService.deactivateAgent(mockAgentId.toString());

      expect(mockAgentRepo.updateStatus).not.toHaveBeenCalled();
      expect(result).toHaveProperty('_id');
    });
  });

  // ============================================
  // STEP OPERATIONS
  // ============================================

  describe('getAgentSteps', () => {
    it('should return agent steps', async () => {
      mockAgentRepo.findByIdOrThrow = jest.fn().mockResolvedValue(createMockAgentDoc());
      mockStepRepo.findByAgentId = jest.fn().mockResolvedValue(mockSteps);

      const result = await agentService.getAgentSteps(mockAgentId.toString());

      expect(mockAgentRepo.findByIdOrThrow).toHaveBeenCalled();
      expect(mockStepRepo.findByAgentId).toHaveBeenCalled();
      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('key', 'intro');
    });
  });

  describe('getAgentStep', () => {
    it('should return specific step', async () => {
      const stepDoc = createMockStepDoc({ key: 'intro' });
      mockAgentRepo.findByIdOrThrow = jest.fn().mockResolvedValue(createMockAgentDoc());
      mockStepRepo.findByAgentAndKeyOrThrow = jest.fn().mockResolvedValue(stepDoc);

      const result = await agentService.getAgentStep(mockAgentId.toString(), 'intro');

      expect(mockStepRepo.findByAgentAndKeyOrThrow).toHaveBeenCalled();
      expect(result).toHaveProperty('key', 'intro');
    });
  });

  describe('updateAgentStep', () => {
    it('should update label without prompt recompilation', async () => {
      const agentDoc = createMockAgentDoc();
      const updatedStep = createMockStepDoc({ key: 'intro', label: 'New Label' });

      mockAgentRepo.findByIdOrThrow = jest.fn().mockResolvedValue(agentDoc);
      mockStepRepo.updateByAgentAndKey = jest.fn().mockResolvedValue(updatedStep);

      const result = await agentService.updateAgentStep(mockAgentId.toString(), 'intro', {
        label: 'New Label',
      } as any);

      expect(result.promptRecompiled).toBe(false);
      expect(result.step).toHaveProperty('label', 'New Label');
      expect(mockPromptBuilder.buildPrompt).not.toHaveBeenCalled();
    });

    it('should recompile prompt when inputs are updated', async () => {
      const agentDoc = createMockAgentDoc();
      const updatedStep = createMockStepDoc({
        key: 'intro',
        inputs: { greeting: 'Updated' },
      });

      mockAgentRepo.findByIdOrThrow = jest.fn().mockResolvedValue(agentDoc);
      mockStepRepo.updateByAgentAndKey = jest.fn().mockResolvedValue(updatedStep);
      mockPromptRepo.updateByAgentAndKey = jest.fn().mockResolvedValue(createMockPromptDoc());

      const result = await agentService.updateAgentStep(mockAgentId.toString(), 'intro', {
        inputs: { greeting: 'Updated' },
      } as any);

      expect(result.promptRecompiled).toBe(true);
      expect(mockPromptBuilder.buildPrompt).toHaveBeenCalled();
    });

    it('should throw NotFoundError when step not found', async () => {
      const agentDoc = createMockAgentDoc();
      mockAgentRepo.findByIdOrThrow = jest.fn().mockResolvedValue(agentDoc);
      mockStepRepo.updateByAgentAndKey = jest.fn().mockResolvedValue(null);

      await expect(
        agentService.updateAgentStep(mockAgentId.toString(), 'nonexistent', {
          label: 'Test',
        } as any)
      ).rejects.toThrow('not found');
    });
  });

  describe('removeAgentStep', () => {
    it('should remove step successfully', async () => {
      const agentDoc = createMockAgentDoc({ stepOrder: ['intro', 'work', 'conclusion'] });
      mockAgentRepo.findByIdOrThrow = jest.fn().mockResolvedValue(agentDoc);
      mockStepRepo.deleteByAgentAndKey = jest.fn().mockResolvedValue(true);
      mockPromptRepo.deleteByAgentAndKey = jest.fn().mockResolvedValue(true);
      mockAgentRepo.updateByIdOrThrow = jest.fn().mockResolvedValue(agentDoc);
      mockStepRepo.updateByAgentAndKey = jest.fn().mockResolvedValue(createMockStepDoc());
      mockStepRepo.findByAgentAndKey = jest.fn().mockResolvedValue(null);

      await agentService.removeAgentStep(mockAgentId.toString(), 'work');

      expect(mockStepRepo.deleteByAgentAndKey).toHaveBeenCalled();
      expect(mockPromptRepo.deleteByAgentAndKey).toHaveBeenCalled();
      expect(mockAgentRepo.updateByIdOrThrow).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ stepOrder: ['intro', 'conclusion'] }),
        'Agent'
      );
    });

    it('should throw NotFoundError when step not in stepOrder', async () => {
      const agentDoc = createMockAgentDoc({ stepOrder: ['intro', 'conclusion'] });
      mockAgentRepo.findByIdOrThrow = jest.fn().mockResolvedValue(agentDoc);

      await expect(
        agentService.removeAgentStep(mockAgentId.toString(), 'nonexistent')
      ).rejects.toThrow('not found');
    });

    it('should throw ValidationError when removing sub-step', async () => {
      const { isSubStep, getParentStep } = require('@modules');
      (isSubStep as jest.Mock).mockReturnValueOnce(true);
      (getParentStep as jest.Mock).mockReturnValueOnce('parentStep');

      const agentDoc = createMockAgentDoc({ stepOrder: ['intro', 'subStep', 'conclusion'] });
      mockAgentRepo.findByIdOrThrow = jest.fn().mockResolvedValue(agentDoc);

      await expect(
        agentService.removeAgentStep(mockAgentId.toString(), 'subStep')
      ).rejects.toThrow('Cannot remove sub-step');
    });
  });

  // ============================================
  // PROMPT OPERATIONS
  // ============================================

  describe('getAgentPrompts', () => {
    it('should return agent prompts', async () => {
      mockAgentRepo.findByIdOrThrow = jest.fn().mockResolvedValue(createMockAgentDoc());
      mockPromptRepo.findByAgentId = jest.fn().mockResolvedValue(mockPrompts);

      const result = await agentService.getAgentPrompts(mockAgentId.toString());

      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('key', 'intro');
      expect(result[0]).toHaveProperty('system');
      expect(result[0]).toHaveProperty('model');
    });
  });

  describe('getAgentPrompt', () => {
    it('should return specific prompt', async () => {
      const promptDoc = createMockPromptDoc({ key: 'intro' });
      mockAgentRepo.findByIdOrThrow = jest.fn().mockResolvedValue(createMockAgentDoc());
      mockPromptRepo.findByAgentAndKeyOrThrow = jest.fn().mockResolvedValue(promptDoc);

      const result = await agentService.getAgentPrompt(mockAgentId.toString(), 'intro');

      expect(result).toHaveProperty('key', 'intro');
      expect(result).toHaveProperty('system');
    });
  });

  describe('updateAgentPrompt', () => {
    it('should update prompt model settings', async () => {
      const updatedPrompt = createMockPromptDoc({ model: 'gpt-4o', temperature: 0.5 });
      mockAgentRepo.findByIdOrThrow = jest.fn().mockResolvedValue(createMockAgentDoc());
      mockPromptRepo.updateByAgentAndKey = jest.fn().mockResolvedValue(updatedPrompt);

      const result = await agentService.updateAgentPrompt(mockAgentId.toString(), 'intro', {
        model: 'gpt-4o',
        temperature: 0.5,
      } as any);

      expect(mockPromptRepo.updateByAgentAndKey).toHaveBeenCalledWith(
        expect.any(Object),
        'intro',
        expect.objectContaining({ model: 'gpt-4o', temperature: 0.5 })
      );
      expect(result).toHaveProperty('model', 'gpt-4o');
    });

    it('should return existing prompt when no fields provided', async () => {
      const existingPrompt = createMockPromptDoc({ key: 'intro' });
      mockAgentRepo.findByIdOrThrow = jest.fn().mockResolvedValue(createMockAgentDoc());
      mockPromptRepo.findByAgentAndKeyOrThrow = jest.fn().mockResolvedValue(existingPrompt);

      const result = await agentService.updateAgentPrompt(
        mockAgentId.toString(),
        'intro',
        {} as any
      );

      expect(mockPromptRepo.updateByAgentAndKey).not.toHaveBeenCalled();
      expect(result).toHaveProperty('key', 'intro');
    });

    it('should throw NotFoundError when prompt not found', async () => {
      mockAgentRepo.findByIdOrThrow = jest.fn().mockResolvedValue(createMockAgentDoc());
      mockPromptRepo.updateByAgentAndKey = jest.fn().mockResolvedValue(null);

      await expect(
        agentService.updateAgentPrompt(mockAgentId.toString(), 'nonexistent', {
          model: 'gpt-4o',
        } as any)
      ).rejects.toThrow('not found');
    });
  });

  // ============================================
  // ASSESSMENT OPERATIONS
  // ============================================

  describe('getAgentAssessment', () => {
    it('should return assessment when it exists', async () => {
      mockAgentRepo.findByIdOrThrow = jest.fn().mockResolvedValue(createMockAgentDoc());
      mockAssessmentRepo.findByAgentId = jest.fn().mockResolvedValue(mockAssessment);

      const result = await agentService.getAgentAssessment(mockAgentId.toString());

      expect(result).not.toBeNull();
      expect(result).toHaveProperty('testContent', 'Test assessment content');
      expect(result).toHaveProperty('durationSeconds', 300);
    });

    it('should return null when no assessment exists', async () => {
      mockAgentRepo.findByIdOrThrow = jest.fn().mockResolvedValue(createMockAgentDoc());
      mockAssessmentRepo.findByAgentId = jest.fn().mockResolvedValue(null);

      const result = await agentService.getAgentAssessment(mockAgentId.toString());

      expect(result).toBeNull();
    });
  });

  describe('updateAgentAssessment', () => {
    it('should update assessment successfully', async () => {
      const updatedAssessment = createMockAssessmentDoc({ durationSeconds: 600 });
      mockAgentRepo.findByIdOrThrow = jest.fn().mockResolvedValue(createMockAgentDoc());
      mockAssessmentRepo.updateByAgentId = jest.fn().mockResolvedValue(updatedAssessment);

      const result = await agentService.updateAgentAssessment(mockAgentId.toString(), {
        durationSeconds: 600,
      } as any);

      expect(mockAssessmentRepo.updateByAgentId).toHaveBeenCalled();
      expect(result).toHaveProperty('durationSeconds', 600);
    });

    it('should throw NotFoundError when assessment not found', async () => {
      mockAgentRepo.findByIdOrThrow = jest.fn().mockResolvedValue(createMockAgentDoc());
      mockAssessmentRepo.updateByAgentId = jest.fn().mockResolvedValue(null);

      await expect(
        agentService.updateAgentAssessment(mockAgentId.toString(), {
          durationSeconds: 600,
        } as any)
      ).rejects.toThrow('not found');
    });
  });

  // ============================================
  // COMBINED OPERATIONS
  // ============================================

  describe('getStepWithPrompt', () => {
    it('should return step and prompt together', async () => {
      const stepDoc = createMockStepDoc({ key: 'intro' });
      const promptDoc = createMockPromptDoc({ key: 'intro' });

      mockStepRepo.findByAgentAndKeyOrThrow = jest.fn().mockResolvedValue(stepDoc);
      mockPromptRepo.findByAgentAndKeyOrThrow = jest.fn().mockResolvedValue(promptDoc);

      const result = await agentService.getStepWithPrompt(mockAgentId.toString(), 'intro');

      expect(result.step).toEqual(stepDoc);
      expect(result.prompt).toEqual(promptDoc);
    });
  });

  // ============================================
  // RESPONSE TRANSFORMERS
  // ============================================

  describe('toListItems', () => {
    it('should transform agent documents to list item DTOs', () => {
      const agents = [createMockAgentDoc(), createMockAgentDoc({ label: 'Agent 2' })] as any[];

      const result = agentService.toListItems(agents);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('_id', mockAgentId.toString());
      expect(result[0]).toHaveProperty('label', 'Test Agent');
      expect(result[0]).toHaveProperty('status', AgentStatus.ACTIVE);
      expect(result[0]).toHaveProperty('createdAt', mockDate.toISOString());
      expect(result[1]).toHaveProperty('label', 'Agent 2');
    });
  });
});
