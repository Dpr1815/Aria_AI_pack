/**
 * Unit tests for SummaryService
 *
 * Tests the service layer business logic with mocked repositories
 */

import { SummaryService } from '@services/summary.service';
import { SummaryRepository } from '@repositories/summary.repository';
import { SessionRepository } from '@repositories/session.repository';
import { AgentRepository } from '@repositories/agent.repository';
import { createObjectId } from '@test/helpers/test-utils';
import { NotFoundError } from '@utils/errors';
import { getSummaryConfig } from '@modules/summaries';
import { getStepDefinition } from '@modules/steps';

// Mock all repositories
jest.mock('@repositories/summary.repository');
jest.mock('@repositories/session.repository');
jest.mock('@repositories/agent.repository');

// Mock module-level imports used by the service
jest.mock('@modules/summaries', () => ({
  ...jest.requireActual('@modules/summaries'),
  getSummaryConfig: jest.fn(),
}));
jest.mock('@modules/steps', () => ({
  ...jest.requireActual('@modules/steps'),
  getStepDefinition: jest.fn(),
}));

// Mock OpenAI
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    })),
  };
});

const mockGetSummaryConfig = getSummaryConfig as jest.Mock;
const mockGetStepDefinition = getStepDefinition as jest.Mock;

describe('SummaryService', () => {
  let summaryService: SummaryService;
  let mockSummaryRepository: jest.Mocked<SummaryRepository>;
  let mockSessionRepository: jest.Mocked<SessionRepository>;
  let mockAgentRepository: jest.Mocked<AgentRepository>;

  const mockUserId = createObjectId();
  const mockAgentId = createObjectId();

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock repositories
    mockSummaryRepository = new SummaryRepository(null as any) as jest.Mocked<SummaryRepository>;
    mockSessionRepository = new SessionRepository(null as any) as jest.Mocked<SessionRepository>;
    mockAgentRepository = new AgentRepository(null as any) as jest.Mocked<AgentRepository>;

    // Mock additional repositories needed by SummaryService
    const mockAgentStepRepository = {} as any;
    const mockAgentAssessmentRepository = {} as any;
    const mockConversationService = {} as any;
    const mockOpenAIService = {} as any;
    const mockPromptBuilder = {} as any;

    summaryService = new SummaryService(
      mockSummaryRepository,
      mockSessionRepository,
      mockAgentRepository,
      mockAgentStepRepository,
      mockAgentAssessmentRepository,
      mockConversationService,
      mockOpenAIService,
      mockPromptBuilder
    );
  });

  describe('list', () => {
    it('should return paginated summaries', async () => {
      const mockSummaries = [
        {
          _id: createObjectId(),
          sessionId: createObjectId(),
          agentId: createObjectId(),
          participantId: createObjectId(),
          typeId: 'session-summary',
          data: { text: 'Summary 1' },
          generatedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: createObjectId(),
          sessionId: createObjectId(),
          agentId: createObjectId(),
          participantId: createObjectId(),
          typeId: 'session-summary',
          data: { text: 'Summary 2' },
          generatedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockSummaryRepository.findByAgentIdsWithFilters = jest.fn().mockResolvedValue({
        data: mockSummaries,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      const result = await summaryService.list([mockAgentId], { page: 1, limit: 10 });

      expect(result).toEqual({
        data: expect.arrayContaining([
          expect.objectContaining({
            _id: mockSummaries[0]._id.toString(),
            typeId: 'session-summary',
          }),
        ]),
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      });
      expect(mockSummaryRepository.findByAgentIdsWithFilters).toHaveBeenCalled();
    });

    it('should filter summaries by agentId', async () => {
      const agentId = createObjectId();
      mockSummaryRepository.findByAgentIdsWithFilters = jest.fn().mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });

      await summaryService.list([agentId], { agentId: agentId.toString(), page: 1, limit: 10 });

      expect(mockSummaryRepository.findByAgentIdsWithFilters).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('should return summary by id', async () => {
      const summaryId = createObjectId();
      const mockSummary = {
        _id: summaryId,
        sessionId: createObjectId(),
        agentId: createObjectId(),
        participantId: createObjectId(),
        typeId: 'session-summary',
        data: { text: 'Test summary' },
        generatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSummaryRepository.findByIdOrThrow = jest.fn().mockResolvedValue(mockSummary);

      const result = await summaryService.getById(summaryId.toString());

      expect(result).toEqual(
        expect.objectContaining({
          _id: summaryId.toString(),
          typeId: 'session-summary',
        })
      );
      expect(mockSummaryRepository.findByIdOrThrow).toHaveBeenCalledWith(
        summaryId.toString(),
        'Summary'
      );
    });

    it('should throw NotFoundError when summary does not exist', async () => {
      const summaryId = createObjectId();
      const error = new NotFoundError('Summary', summaryId.toString());
      mockSummaryRepository.findByIdOrThrow = jest.fn().mockRejectedValue(error);

      await expect(summaryService.getById(summaryId.toString())).rejects.toThrow(error);
    });
  });

  describe('getBySessionId', () => {
    it('should return summary by session id', async () => {
      const sessionId = createObjectId();
      const mockSummary = {
        _id: createObjectId(),
        sessionId,
        agentId: createObjectId(),
        participantId: createObjectId(),
        typeId: 'session-summary',
        data: { text: 'Session summary' },
        generatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSummaryRepository.findBySessionId = jest.fn().mockResolvedValue(mockSummary);

      const result = await summaryService.getBySessionId(sessionId.toString());

      expect(result).toEqual(
        expect.objectContaining({
          sessionId: sessionId.toString(),
        })
      );
      expect(mockSummaryRepository.findBySessionId).toHaveBeenCalledWith(sessionId);
    });

    it('should throw NotFoundError when summary does not exist for session', async () => {
      const sessionId = createObjectId();
      mockSummaryRepository.findBySessionId = jest.fn().mockResolvedValue(null);

      await expect(summaryService.getBySessionId(sessionId.toString())).rejects.toThrow(
        'Summary for session'
      );
    });
  });

  describe('delete', () => {
    it('should delete summary successfully', async () => {
      const summaryId = createObjectId();

      mockSummaryRepository.deleteByIdOrThrow = jest.fn().mockResolvedValue(undefined);

      await summaryService.delete(summaryId.toString());

      expect(mockSummaryRepository.deleteByIdOrThrow).toHaveBeenCalledWith(
        summaryId.toString(),
        'Summary'
      );
    });

    it('should throw NotFoundError when trying to delete non-existent summary', async () => {
      const summaryId = createObjectId();
      const error = new NotFoundError('Summary', summaryId.toString());
      mockSummaryRepository.deleteByIdOrThrow = jest.fn().mockRejectedValue(error);

      await expect(summaryService.delete(summaryId.toString())).rejects.toThrow(error);
    });
  });

  // ============================================
  // list with filters
  // ============================================

  describe('list with all filters', () => {
    it('should pass participantId and typeId filters', async () => {
      const participantId = createObjectId();
      mockSummaryRepository.findByAgentIdsWithFilters = jest.fn().mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });

      await summaryService.list([mockAgentId], {
        page: 1,
        limit: 10,
        participantId: participantId.toString(),
        typeId: 'interview',
      });

      expect(mockSummaryRepository.findByAgentIdsWithFilters).toHaveBeenCalledWith(
        [mockAgentId],
        expect.objectContaining({
          participantId: expect.any(Object),
          typeId: 'interview',
        }),
        expect.any(Object)
      );
    });
  });

  // ============================================
  // listByAgent / listByParticipant
  // ============================================

  describe('listByAgent', () => {
    it('should list summaries for agent', async () => {
      mockSummaryRepository.findByAgentId = jest.fn().mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });

      const result = await summaryService.listByAgent(mockAgentId.toString());
      expect(result.data).toEqual([]);
    });

    it('should pass typeId filter', async () => {
      mockSummaryRepository.findByAgentId = jest.fn().mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });

      await summaryService.listByAgent(mockAgentId.toString(), { typeId: 'interview' });

      expect(mockSummaryRepository.findByAgentId).toHaveBeenCalledWith(
        mockAgentId,
        expect.objectContaining({ typeId: 'interview' })
      );
    });
  });

  describe('listByParticipant', () => {
    it('should list summaries for participant', async () => {
      const participantId = createObjectId();
      mockSummaryRepository.findByParticipantId = jest.fn().mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });

      const result = await summaryService.listByParticipant(participantId.toString());
      expect(result.data).toEqual([]);
    });
  });

  // ============================================
  // deleteBySession
  // ============================================

  describe('deleteBySession', () => {
    it('should delete summary by session ID', async () => {
      const sessionId = createObjectId();
      mockSummaryRepository.deleteBySessionId = jest.fn().mockResolvedValue(undefined);

      await summaryService.deleteBySession(sessionId.toString());

      expect(mockSummaryRepository.deleteBySessionId).toHaveBeenCalledWith(sessionId);
    });
  });

  // ============================================
  // generate
  // ============================================

  describe('generate', () => {
    const sessionId = createObjectId();
    const agentId = createObjectId();
    const participantId = createObjectId();

    const mockSession = {
      _id: sessionId,
      agentId,
      participantId,
      status: 'completed' as const,
      currentStep: 'conclusion',
      data: { intro: { name: 'Test' } },
      lastActivityAt: new Date(),
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:30:00Z'),
    };

    let mockConversationService: any;
    let mockOpenAIService: any;
    let mockPromptBuilder: any;
    let mockAgentStepRepository: any;
    let mockAgentAssessmentRepository: any;

    beforeEach(() => {
      mockConversationService = {
        getBySessionId: jest.fn().mockResolvedValue({
          _id: createObjectId(),
          sessionId,
          messages: [
            { sequence: 0, stepKey: 'intro', role: 'user', content: 'Hello', createdAt: new Date(), latencyMs: 1500 },
            { sequence: 1, stepKey: 'intro', role: 'assistant', content: 'Hi', createdAt: new Date(), latencyMs: 2000 },
          ],
          messageCount: 2,
          stepMessageCounts: { intro: 2 },
        }),
      };

      mockOpenAIService = {
        executeWithSystemPromptJSON: jest.fn().mockResolvedValue({
          content: { score: 8, feedback: 'Good' },
          raw: '{}',
          model: 'gpt-4.1-nano',
          usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
          finishReason: 'stop',
        }),
        executePromptJSON: jest.fn().mockResolvedValue({
          content: { overallScore: 8, summary: 'Good performance' },
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
          responseFormat: 'json_object',
        }),
      };

      mockAgentStepRepository = {
        findByAgentId: jest.fn().mockResolvedValue([
          { key: 'intro', inputs: { name: 'Test', role: 'Dev' } },
        ]),
      };

      mockAgentAssessmentRepository = {
        findByAgentId: jest.fn().mockResolvedValue(null),
      };

      // Re-create service with functional mocks
      summaryService = new SummaryService(
        mockSummaryRepository,
        mockSessionRepository,
        mockAgentRepository,
        mockAgentStepRepository,
        mockAgentAssessmentRepository,
        mockConversationService,
        mockOpenAIService,
        mockPromptBuilder
      );
    });

    it('should throw when agent has no summaryTypeId', async () => {
      mockSessionRepository.findByIdOrThrow = jest.fn().mockResolvedValue(mockSession);
      mockAgentRepository.findByIdOrThrow = jest.fn().mockResolvedValue({
        _id: agentId,
        summaryTypeId: undefined,
      });

      await expect(summaryService.generate(sessionId.toString())).rejects.toThrow('Summary ID');
    });

    it('should generate summary and upsert', async () => {
      const summaryId = createObjectId();

      mockSessionRepository.findByIdOrThrow = jest.fn().mockResolvedValue(mockSession);
      mockAgentRepository.findByIdOrThrow = jest.fn().mockResolvedValue({
        _id: agentId,
        summaryTypeId: 'interview',
        label: 'Test Agent',
        voice: { languageCode: 'en-US' },
        stepOrder: ['intro'],
      });

      // Mock the summary config via the module-level mock
      mockGetSummaryConfig.mockReturnValue({
        id: 'interview',
        name: 'Interview',
        sections: [
          {
            key: 'intro',
            promptId: 'section-intro',
            required: true,
            outputSchema: { parse: (v: any) => v },
            variables: {
              injectConversation: true,
              injectSessiondata: true,
              fromStepCard: ['name'],
            },
          },
        ],
        main: {
          promptId: 'main-summary',
          variables: {
            injectSectionResults: true,
            injectTimeAnalysis: true,
          },
        },
      });

      // Mock step definition for resolveStepKeys
      mockGetStepDefinition.mockReturnValue({ id: 'intro' });

      mockSummaryRepository.upsert = jest.fn().mockResolvedValue({
        _id: summaryId,
        sessionId,
        agentId,
        participantId,
        typeId: 'interview',
        data: { overallScore: 8 },
        generatedAt: new Date(),
      });

      const result = await summaryService.generate(sessionId.toString());

      expect(result._id).toBe(summaryId.toString());
      expect(mockPromptBuilder.buildPrompt).toHaveBeenCalled();
    });
  });

  // ============================================
  // regenerate
  // ============================================

  describe('regenerate', () => {
    it('should delete existing summary before regenerating', async () => {
      const sessionId = createObjectId();
      const existingSummaryId = createObjectId();

      mockSessionRepository.findByIdOrThrow = jest.fn().mockResolvedValue({
        _id: sessionId,
        agentId: mockAgentId,
        participantId: createObjectId(),
        data: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockAgentRepository.findByIdOrThrow = jest.fn().mockResolvedValue({
        _id: mockAgentId,
        summaryTypeId: 'interview',
      });
      mockSummaryRepository.findBySessionId = jest.fn().mockResolvedValue({
        _id: existingSummaryId,
      });
      mockSummaryRepository.deleteById = jest.fn().mockResolvedValue(undefined);

      // getSummaryConfig will throw during the inner generate() call — that's fine,
      // we're testing that deleteById is called before generate runs
      mockGetSummaryConfig.mockImplementation(() => {
        throw new Error('Config not found');
      });

      await expect(summaryService.regenerate(sessionId.toString())).rejects.toThrow();

      expect(mockSummaryRepository.deleteById).toHaveBeenCalledWith(existingSummaryId);
    });

    it('should skip delete when no existing summary', async () => {
      const sessionId = createObjectId();

      mockSessionRepository.findByIdOrThrow = jest.fn().mockResolvedValue({
        _id: sessionId,
        agentId: mockAgentId,
        participantId: createObjectId(),
        data: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockAgentRepository.findByIdOrThrow = jest.fn().mockResolvedValue({
        _id: mockAgentId,
        summaryTypeId: 'interview',
      });
      mockSummaryRepository.findBySessionId = jest.fn().mockResolvedValue(null);
      mockSummaryRepository.deleteById = jest.fn();

      // Let generate() fail after the delete-check
      mockGetSummaryConfig.mockImplementation(() => {
        throw new Error('Config not found');
      });

      await expect(summaryService.regenerate(sessionId.toString())).rejects.toThrow();

      expect(mockSummaryRepository.deleteById).not.toHaveBeenCalled();
    });
  });
});
