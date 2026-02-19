/**
 * Unit tests for ConversationService
 *
 * Tests the service layer business logic with mocked repositories
 */

import { ConversationService } from '@services/conversation.service';
import { ConversationRepository } from '@repositories/conversation.repository';
import { createObjectId } from '@test/helpers/test-utils';
import { NotFoundError } from '@utils/errors';

// Mock the repository
jest.mock('@repositories/conversation.repository');

describe('ConversationService', () => {
  let conversationService: ConversationService;
  let mockConversationRepository: jest.Mocked<ConversationRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock repository
    mockConversationRepository = new ConversationRepository(null as any) as jest.Mocked<ConversationRepository>;

    conversationService = new ConversationService(mockConversationRepository);
  });

  describe('getByIdWithMessages', () => {
    it('should return conversation with messages', async () => {
      const conversationId = createObjectId();
      const sessionId = createObjectId();
      const mockConversation = {
        _id: conversationId,
        sessionId,
        agentId: createObjectId(),
        participantId: createObjectId(),
        messages: [
          {
            sequence: 0,
            stepKey: 'welcome',
            role: 'user' as const,
            content: 'Hello',
            createdAt: new Date(),
          },
          {
            sequence: 1,
            stepKey: 'welcome',
            role: 'assistant' as const,
            content: 'Hi there!',
            createdAt: new Date(),
          },
        ],
        messageCount: 2,
        stepMessageCounts: { welcome: 2 },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockConversationRepository.findByIdOrThrow = jest.fn().mockResolvedValue(mockConversation);

      const result = await conversationService.getByIdWithMessages(conversationId.toString());

      expect(result).toEqual(
        expect.objectContaining({
          _id: conversationId.toString(),
          sessionId: sessionId.toString(),
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: 'Hello',
            }),
            expect.objectContaining({
              role: 'assistant',
              content: 'Hi there!',
            }),
          ]),
        })
      );
      expect(mockConversationRepository.findByIdOrThrow).toHaveBeenCalledWith(
        conversationId.toString(),
        'Conversation'
      );
    });

    it('should throw NotFoundError when conversation does not exist', async () => {
      const conversationId = createObjectId();
      const error = new NotFoundError('Conversation', conversationId.toString());
      mockConversationRepository.findByIdOrThrow = jest.fn().mockRejectedValue(error);

      await expect(
        conversationService.getByIdWithMessages(conversationId.toString())
      ).rejects.toThrow(error);
    });
  });

  describe('getBySessionIdWithMessages', () => {
    it('should return conversation for session with messages', async () => {
      const sessionId = createObjectId();
      const conversationId = createObjectId();
      const mockConversation = {
        _id: conversationId,
        sessionId,
        agentId: createObjectId(),
        participantId: createObjectId(),
        messages: [
          {
            sequence: 0,
            stepKey: 'conversation',
            role: 'user' as const,
            content: 'How are you?',
            createdAt: new Date(),
          },
        ],
        messageCount: 1,
        stepMessageCounts: { conversation: 1 },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockConversationRepository.findBySessionId = jest.fn().mockResolvedValue(mockConversation);

      const result = await conversationService.getBySessionIdWithMessages(sessionId.toString());

      expect(result).toEqual(
        expect.objectContaining({
          sessionId: sessionId.toString(),
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: 'How are you?',
            }),
          ]),
        })
      );
      expect(mockConversationRepository.findBySessionId).toHaveBeenCalledWith(sessionId);
    });

    it('should throw NotFoundError when conversation does not exist for session', async () => {
      const sessionId = createObjectId();
      mockConversationRepository.findBySessionId = jest.fn().mockResolvedValue(null);

      await expect(
        conversationService.getBySessionIdWithMessages(sessionId.toString())
      ).rejects.toThrow('Conversation');
    });
  });

  describe('getSessionMessages', () => {
    it('should return messages for a session', async () => {
      const sessionId = createObjectId();
      const conversationId = createObjectId();
      const mockConversation = {
        _id: conversationId,
        sessionId,
        agentId: createObjectId(),
        participantId: createObjectId(),
        messages: [
          {
            sequence: 0,
            stepKey: 'welcome',
            role: 'user' as const,
            content: 'Message 1',
            createdAt: new Date(),
          },
          {
            sequence: 1,
            stepKey: 'welcome',
            role: 'assistant' as const,
            content: 'Response 1',
            createdAt: new Date(),
          },
        ],
        messageCount: 2,
        stepMessageCounts: { welcome: 2 },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockConversationRepository.findBySessionId = jest.fn().mockResolvedValue(mockConversation);

      const result = await conversationService.getSessionMessages(sessionId.toString());

      expect(result).toEqual(
        expect.objectContaining({
          sessionId: sessionId.toString(),
          messageCount: 2,
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: 'Message 1',
            }),
            expect.objectContaining({
              role: 'assistant',
              content: 'Response 1',
            }),
          ]),
        })
      );
    });

    it('should apply filter options for role filtering', async () => {
      const sessionId = createObjectId();
      const conversationId = createObjectId();
      const mockConversation = {
        _id: conversationId,
        sessionId,
        agentId: createObjectId(),
        participantId: createObjectId(),
        messages: [
          {
            sequence: 0,
            stepKey: 'welcome',
            role: 'user' as const,
            content: 'Message 1',
            createdAt: new Date(),
          },
          {
            sequence: 1,
            stepKey: 'welcome',
            role: 'assistant' as const,
            content: 'Response 1',
            createdAt: new Date(),
          },
        ],
        messageCount: 2,
        stepMessageCounts: { welcome: 2 },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockConversationRepository.findBySessionId = jest.fn().mockResolvedValue(mockConversation);

      const filterOptions = { includeRoles: ['user' as const] };
      const result = await conversationService.getSessionMessages(
        sessionId.toString(),
        filterOptions
      );

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]).toEqual(
        expect.objectContaining({
          role: 'user',
          content: 'Message 1',
        })
      );
    });
  });

  describe('getMessagesForStep', () => {
    it('should return messages for a specific step', async () => {
      const sessionId = createObjectId();
      const stepKey = 'welcome';
      const mockMessages = [
        {
          sequence: 0,
          stepKey,
          role: 'assistant' as const,
          content: 'Welcome message',
          createdAt: new Date(),
        },
        {
          sequence: 1,
          stepKey,
          role: 'user' as const,
          content: 'Thanks!',
          createdAt: new Date(),
        },
      ];

      mockConversationRepository.getMessagesForStep = jest.fn().mockResolvedValue(mockMessages);

      const result = await conversationService.getMessagesForStep(
        sessionId.toString(),
        stepKey
      );

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            stepKey,
            content: 'Welcome message',
          }),
          expect.objectContaining({
            stepKey,
            content: 'Thanks!',
          }),
        ])
      );
      expect(mockConversationRepository.getMessagesForStep).toHaveBeenCalledWith(
        sessionId,
        stepKey
      );
    });

    it('should return empty array when no messages for step', async () => {
      const sessionId = createObjectId();
      const stepKey = 'empty-step';

      mockConversationRepository.getMessagesForStep = jest.fn().mockResolvedValue([]);

      const result = await conversationService.getMessagesForStep(
        sessionId.toString(),
        stepKey
      );

      expect(result).toEqual([]);
    });
  });

  describe('getAgentStats', () => {
    it('should return conversation statistics for an agent', async () => {
      const agentId = createObjectId();

      mockConversationRepository.getTotalMessageCount = jest.fn().mockResolvedValue(1500);
      mockConversationRepository.getAverageMessageCount = jest.fn().mockResolvedValue(15);

      const result = await conversationService.getAgentStats(agentId.toString());

      expect(result).toEqual({
        totalMessages: 1500,
        averageMessagesPerConversation: 15,
      });
      expect(mockConversationRepository.getTotalMessageCount).toHaveBeenCalledWith(agentId);
      expect(mockConversationRepository.getAverageMessageCount).toHaveBeenCalledWith(agentId);
    });

    it('should handle agent with no conversations', async () => {
      const agentId = createObjectId();
      mockConversationRepository.getTotalMessageCount = jest.fn().mockResolvedValue(0);
      mockConversationRepository.getAverageMessageCount = jest.fn().mockResolvedValue(0);

      const result = await conversationService.getAgentStats(agentId.toString());

      expect(result).toEqual({
        totalMessages: 0,
        averageMessagesPerConversation: 0,
      });
    });
  });

  // ============================================
  // createForSession
  // ============================================

  describe('createForSession', () => {
    it('should create conversation for a session', async () => {
      const sessionId = createObjectId();
      const agentId = createObjectId();
      const participantId = createObjectId();
      const mockConversation = {
        _id: createObjectId(),
        sessionId,
        agentId,
        participantId,
        messages: [],
        messageCount: 0,
        stepMessageCounts: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockConversationRepository.createForSession = jest.fn().mockResolvedValue(mockConversation);

      const result = await conversationService.createForSession(sessionId, agentId, participantId);

      expect(result).toEqual(mockConversation);
      expect(mockConversationRepository.createForSession).toHaveBeenCalledWith(
        sessionId,
        agentId,
        participantId
      );
    });
  });

  // ============================================
  // addMessage / addMessages
  // ============================================

  describe('addMessage', () => {
    it('should add message to conversation', async () => {
      const sessionId = createObjectId();
      const mockConversation = {
        _id: createObjectId(),
        sessionId,
        agentId: createObjectId(),
        participantId: createObjectId(),
        messages: [{ sequence: 0, stepKey: 'intro', role: 'user', content: 'Hello', createdAt: new Date() }],
        messageCount: 1,
        stepMessageCounts: { intro: 1 },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockConversationRepository.addMessage = jest.fn().mockResolvedValue(mockConversation);

      const result = await conversationService.addMessage(sessionId.toString(), {
        stepKey: 'intro',
        role: 'user',
        content: 'Hello',
      });

      expect(result.messageCount).toBe(1);
    });

    it('should throw NotFoundError when conversation not found', async () => {
      const sessionId = createObjectId();
      mockConversationRepository.addMessage = jest.fn().mockResolvedValue(null);

      await expect(
        conversationService.addMessage(sessionId.toString(), {
          stepKey: 'intro',
          role: 'user',
          content: 'Hello',
        })
      ).rejects.toThrow('Conversation');
    });
  });

  describe('addMessages', () => {
    it('should add multiple messages atomically', async () => {
      const sessionId = createObjectId();
      const mockConversation = {
        _id: createObjectId(),
        sessionId,
        agentId: createObjectId(),
        participantId: createObjectId(),
        messages: [],
        messageCount: 2,
        stepMessageCounts: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockConversationRepository.addMessages = jest.fn().mockResolvedValue(mockConversation);

      const result = await conversationService.addMessages(sessionId.toString(), [
        { stepKey: 'intro', role: 'user', content: 'Q1' },
        { stepKey: 'intro', role: 'assistant', content: 'A1' },
      ]);

      expect(result.messageCount).toBe(2);
    });

    it('should throw NotFoundError when conversation not found', async () => {
      const sessionId = createObjectId();
      mockConversationRepository.addMessages = jest.fn().mockResolvedValue(null);

      await expect(
        conversationService.addMessages(sessionId.toString(), [
          { stepKey: 'intro', role: 'user', content: 'Q1' },
        ])
      ).rejects.toThrow('Conversation');
    });
  });

  // ============================================
  // delete operations
  // ============================================

  describe('deleteBySession', () => {
    it('should delete conversation by session ID', async () => {
      const sessionId = createObjectId();
      mockConversationRepository.deleteBySessionId = jest.fn().mockResolvedValue(undefined);

      await conversationService.deleteBySession(sessionId);

      expect(mockConversationRepository.deleteBySessionId).toHaveBeenCalledWith(sessionId);
    });
  });

  describe('deleteByParticipant', () => {
    it('should delete conversations and return count', async () => {
      const participantId = createObjectId();
      mockConversationRepository.deleteByParticipant = jest.fn().mockResolvedValue(5);

      const count = await conversationService.deleteByParticipant(participantId);

      expect(count).toBe(5);
    });
  });

  // ============================================
  // getLastMessages
  // ============================================

  describe('getLastMessages', () => {
    it('should return last N messages', async () => {
      const sessionId = createObjectId();
      const mockMessages = [
        { sequence: 8, stepKey: 'work', role: 'user' as const, content: 'Last Q', createdAt: new Date() },
        { sequence: 9, stepKey: 'work', role: 'assistant' as const, content: 'Last A', createdAt: new Date() },
      ];

      mockConversationRepository.getLastMessages = jest.fn().mockResolvedValue(mockMessages);

      const result = await conversationService.getLastMessages(sessionId.toString(), 2);

      expect(result).toHaveLength(2);
      expect(result[0].content).toBe('Last Q');
    });
  });

  // ============================================
  // getBySessionIdWithMessages with filters
  // ============================================

  describe('getBySessionIdWithMessages with role filter', () => {
    it('should filter messages by role', async () => {
      const sessionId = createObjectId();
      const mockConversation = {
        _id: createObjectId(),
        sessionId,
        agentId: createObjectId(),
        participantId: createObjectId(),
        messages: [
          { sequence: 0, stepKey: 'intro', role: 'user' as const, content: 'Q', createdAt: new Date() },
          { sequence: 1, stepKey: 'intro', role: 'assistant' as const, content: 'A', createdAt: new Date() },
        ],
        messageCount: 2,
        stepMessageCounts: { intro: 2 },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockConversationRepository.findBySessionId = jest.fn().mockResolvedValue(mockConversation);

      const result = await conversationService.getBySessionIdWithMessages(
        sessionId.toString(),
        { includeRoles: ['assistant'] }
      );

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].role).toBe('assistant');
    });
  });

  // ============================================
  // getMessagesForStep with role filter
  // ============================================

  describe('getMessagesForStep with role filter', () => {
    it('should filter step messages by role', async () => {
      const sessionId = createObjectId();
      const mockMessages = [
        { sequence: 0, stepKey: 'intro', role: 'user' as const, content: 'Q', createdAt: new Date() },
        { sequence: 1, stepKey: 'intro', role: 'assistant' as const, content: 'A', createdAt: new Date() },
      ];

      mockConversationRepository.getMessagesForStep = jest.fn().mockResolvedValue(mockMessages);

      const result = await conversationService.getMessagesForStep(
        sessionId.toString(),
        'intro',
        { includeRoles: ['user'] }
      );

      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('user');
    });
  });
});
