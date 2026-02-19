/**
 * Integration tests for Conversation flow
 *
 * Tests conversation retrieval and message operations.
 * Authorization (tenant scope) is handled by middleware, not tested here.
 */

import { ConversationController } from '@controllers/conversation.controller';
import { ConversationService } from '@services/conversation.service';
import { ConversationRepository } from '@repositories/conversation.repository';
import {
  createMockDatabase,
  mockFindOne,
} from '@test/mocks/database.mock';
import { Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';

describe('Conversation Flow - Integration', () => {
  let conversationController: ConversationController;
  let conversationService: ConversationService;
  let conversationRepository: ConversationRepository;
  let mockDb: ReturnType<typeof createMockDatabase>;

  const mockSessionId = new ObjectId();
  const mockAgentId = new ObjectId();
  const mockParticipantId = new ObjectId();
  const mockConversationId = new ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup the stack with mocked database
    mockDb = createMockDatabase();
    conversationRepository = new ConversationRepository(mockDb);
    conversationService = new ConversationService(conversationRepository);
    conversationController = new ConversationController(conversationService);
  });

  describe('Get conversation by session flow', () => {
    it('should retrieve conversation by session ID', async () => {
      const mockConversation = {
        _id: mockConversationId,
        sessionId: mockSessionId,
        agentId: mockAgentId,
        participantId: mockParticipantId,
        messages: [
          {
            sequence: 0,
            stepKey: 'welcome',
            role: 'user' as const,
            content: 'Hello',
            createdAt: new Date(),
          },
        ],
        messageCount: 1,
        stepMessageCounts: { welcome: 1 },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const conversationsCollection = mockDb.getCollection('conversations');
      mockFindOne(conversationsCollection, mockConversation);

      const req = {
        params: { sessionId: mockSessionId.toString() },
        query: {},
      } as unknown as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      const next = jest.fn() as NextFunction;

      await conversationController.getBySessionId(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            sessionId: mockSessionId.toString(),
            messageCount: 1,
          }),
        })
      );
    });
  });

  describe('Get session messages with filtering', () => {
    it('should retrieve messages filtered by role', async () => {
      const mockConversation = {
        _id: mockConversationId,
        sessionId: mockSessionId,
        agentId: mockAgentId,
        participantId: mockParticipantId,
        messages: [
          {
            sequence: 0,
            stepKey: 'welcome',
            role: 'assistant' as const,
            content: 'Welcome!',
            createdAt: new Date(),
          },
          {
            sequence: 1,
            stepKey: 'welcome',
            role: 'user' as const,
            content: 'Hello',
            createdAt: new Date(),
          },
          {
            sequence: 2,
            stepKey: 'information',
            role: 'assistant' as const,
            content: 'How can I help?',
            createdAt: new Date(),
          },
        ],
        messageCount: 3,
        stepMessageCounts: { welcome: 2, information: 1 },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const conversationsCollection = mockDb.getCollection('conversations');
      mockFindOne(conversationsCollection, mockConversation);

      const req = {
        params: { sessionId: mockSessionId.toString() },
        query: { includeRoles: 'user' },
      } as unknown as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      const next = jest.fn() as NextFunction;

      await conversationController.getMessages(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.messages).toHaveLength(1);
      expect(responseData.data.messages[0]).toEqual(
        expect.objectContaining({
          role: 'user',
          content: 'Hello',
        })
      );
    });
  });

  describe('Get messages for specific step', () => {
    it('should retrieve messages for a specific step key', async () => {
      const mockMessages = [
        {
          sequence: 0,
          stepKey: 'welcome',
          role: 'assistant' as const,
          content: 'Welcome message',
          createdAt: new Date(),
        },
        {
          sequence: 1,
          stepKey: 'welcome',
          role: 'user' as const,
          content: 'User response',
          createdAt: new Date(),
        },
      ];

      const conversationsCollection = mockDb.getCollection('conversations');
      mockFindOne(conversationsCollection, {
        _id: mockConversationId,
        sessionId: mockSessionId,
        messages: mockMessages,
      });

      const req = {
        params: {
          sessionId: mockSessionId.toString(),
          stepKey: 'welcome',
        },
        query: {},
      } as unknown as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      const next = jest.fn() as NextFunction;

      await conversationController.getStepMessages(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            sessionId: mockSessionId.toString(),
            stepKey: 'welcome',
            messageCount: 2,
            messages: expect.arrayContaining([
              expect.objectContaining({
                stepKey: 'welcome',
                content: 'Welcome message',
              }),
              expect.objectContaining({
                stepKey: 'welcome',
                content: 'User response',
              }),
            ]),
          }),
        })
      );
    });
  });

  describe('Error handling', () => {
    it('should handle conversation not found', async () => {
      const conversationsCollection = mockDb.getCollection('conversations');
      mockFindOne(conversationsCollection, null);

      const req = {
        params: { sessionId: mockSessionId.toString() },
        query: {},
      } as unknown as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      const next = jest.fn() as NextFunction;

      await conversationController.getBySessionId(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.any(String),
        })
      );
    });
  });
});
