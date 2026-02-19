/**
 * Unit tests for ConversationController
 *
 * Tests the controller layer in isolation by mocking the service layer.
 * Authorization (tenant scope) is handled by middleware, not the controller.
 */

import { Request, Response, NextFunction } from 'express';
import { ConversationController } from '@controllers/conversation.controller';
import { ConversationService } from '@services';
import { createObjectId } from '@test/helpers/test-utils';

// Mock the services
jest.mock('@services');

describe('ConversationController', () => {
  let controller: ConversationController;
  let mockConversationService: jest.Mocked<ConversationService>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    // Create mock services
    mockConversationService = {
      getBySessionIdWithMessages: jest.fn(),
      getSessionMessages: jest.fn(),
      getMessagesForStep: jest.fn(),
    } as any;

    controller = new ConversationController(mockConversationService);

    // Setup mock request/response
    mockReq = {
      params: {},
      query: {},
      body: {},
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('getBySessionId', () => {
    it('should return conversation by session id successfully', async () => {
      const sessionId = createObjectId().toString();
      const mockConversation = {
        sessionId,
        messages: [{ role: 'user', content: 'Hello' }],
      };

      mockConversationService.getBySessionIdWithMessages.mockResolvedValue(
        mockConversation as any
      );
      mockReq.params = { sessionId };
      mockReq.query = {};

      await controller.getBySessionId(mockReq as Request, mockRes as Response, mockNext);

      expect(mockConversationService.getBySessionIdWithMessages).toHaveBeenCalledWith(
        sessionId,
        expect.any(Object)
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockConversation,
        })
      );
    });

    it('should apply message filter options', async () => {
      const sessionId = createObjectId().toString();
      const filterOptions = { stepKey: 'welcome', limit: 10 };
      const mockConversation = { sessionId, messages: [] };

      mockConversationService.getBySessionIdWithMessages.mockResolvedValue(
        mockConversation as any
      );
      mockReq.params = { sessionId };
      mockReq.query = filterOptions as any;

      await controller.getBySessionId(mockReq as Request, mockRes as Response, mockNext);

      expect(mockConversationService.getBySessionIdWithMessages).toHaveBeenCalledWith(
        sessionId,
        filterOptions
      );
    });

    it('should handle errors', async () => {
      const error = new Error('Service error');
      mockConversationService.getBySessionIdWithMessages.mockRejectedValue(error);
      mockReq.params = { sessionId: createObjectId().toString() };

      await controller.getBySessionId(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getMessages', () => {
    it('should return session messages successfully', async () => {
      const sessionId = createObjectId().toString();
      const mockMessages = {
        sessionId,
        totalMessages: 5,
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi!' },
        ],
      };

      mockConversationService.getSessionMessages.mockResolvedValue(mockMessages as any);
      mockReq.params = { sessionId };
      mockReq.query = {};

      await controller.getMessages(mockReq as Request, mockRes as Response, mockNext);

      expect(mockConversationService.getSessionMessages).toHaveBeenCalledWith(
        sessionId,
        expect.any(Object)
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockMessages,
        })
      );
    });

    it('should apply filter options to messages', async () => {
      const sessionId = createObjectId().toString();
      const filterOptions = { limit: 20, offset: 5 };
      const mockMessages = { messages: [] };

      mockConversationService.getSessionMessages.mockResolvedValue(mockMessages as any);
      mockReq.params = { sessionId };
      mockReq.query = filterOptions as any;

      await controller.getMessages(mockReq as Request, mockRes as Response, mockNext);

      expect(mockConversationService.getSessionMessages).toHaveBeenCalledWith(
        sessionId,
        filterOptions
      );
    });

    it('should handle errors', async () => {
      const error = new Error('Service error');
      mockConversationService.getSessionMessages.mockRejectedValue(error);
      mockReq.params = { sessionId: createObjectId().toString() };

      await controller.getMessages(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getStepMessages', () => {
    it('should return step messages successfully', async () => {
      const sessionId = createObjectId().toString();
      const stepKey = 'welcome';
      const mockMessages = [
        { role: 'assistant', content: 'Welcome message', stepKey },
        { role: 'user', content: 'Thanks', stepKey },
      ];

      mockConversationService.getMessagesForStep.mockResolvedValue(mockMessages as any);
      mockReq.params = { sessionId, stepKey };
      mockReq.query = {};

      await controller.getStepMessages(mockReq as Request, mockRes as Response, mockNext);

      expect(mockConversationService.getMessagesForStep).toHaveBeenCalledWith(
        sessionId,
        stepKey,
        expect.any(Object)
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            sessionId,
            stepKey,
            messageCount: mockMessages.length,
            messages: mockMessages,
          }),
        })
      );
    });

    it('should apply filter options to step messages', async () => {
      const sessionId = createObjectId().toString();
      const stepKey = 'feedback';
      const filterOptions = { limit: 5 };
      const mockMessages: any[] = [];

      mockConversationService.getMessagesForStep.mockResolvedValue(mockMessages);
      mockReq.params = { sessionId, stepKey };
      mockReq.query = filterOptions as any;

      await controller.getStepMessages(mockReq as Request, mockRes as Response, mockNext);

      expect(mockConversationService.getMessagesForStep).toHaveBeenCalledWith(
        sessionId,
        stepKey,
        filterOptions
      );
    });

    it('should return empty messages array for step with no messages', async () => {
      const sessionId = createObjectId().toString();
      const stepKey = 'empty-step';
      const mockMessages: any[] = [];

      mockConversationService.getMessagesForStep.mockResolvedValue(mockMessages);
      mockReq.params = { sessionId, stepKey };
      mockReq.query = {};

      await controller.getStepMessages(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            messageCount: 0,
            messages: [],
          }),
        })
      );
    });

    it('should handle errors', async () => {
      const error = new Error('Service error');
      mockConversationService.getMessagesForStep.mockRejectedValue(error);
      mockReq.params = { sessionId: createObjectId().toString(), stepKey: 'welcome' };

      await controller.getStepMessages(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
