/**
 * ActionHandler Integration Tests
 */

import { ActionHandler } from '@services/conversation/ActionHandler';
import { ActionType } from '@types';
import { createMockAgent } from '../../mocks/data/agents.mock';
import { createMockSession } from '../../mocks/data/sessions.mock';

describe('ActionHandler', () => {
  function createHandler(overrides: Record<string, any> = {}) {
    return new ActionHandler({
      sessionRepo: {
        updateStatus: jest.fn().mockResolvedValue(null),
        updateCurrentStep: jest.fn().mockResolvedValue(null),
        findByIdOrThrow: jest.fn().mockResolvedValue(createMockSession()),
        ...overrides.sessionRepo,
      } as any,
      conversationRepo: {
        addMessage: jest.fn().mockResolvedValue(null),
        getMessagesForStep: jest.fn().mockResolvedValue([]),
        findBySessionIdOrThrow: jest.fn().mockResolvedValue({ messages: [] }),
        ...overrides.conversationRepo,
      } as any,
      promptRepo: {
        findByAgentAndKey: jest.fn().mockResolvedValue(null),
        findByAgentAndKeyOrThrow: jest.fn().mockResolvedValue({
          system: 'test prompt',
          model: 'gpt-4o',
          temperature: 0.7,
          maxTokens: 1024,
        }),
        ...overrides.promptRepo,
      } as any,
      assessmentRepo: {
        findByAgentId: jest.fn().mockResolvedValue(null),
        ...overrides.assessmentRepo,
      } as any,
      stepRepo: {
        findByAgentAndKey: jest.fn().mockResolvedValue(null),
        ...overrides.stepRepo,
      } as any,
    });
  }

  describe('execute', () => {
    it('executes CONVERSATION_COMPLETE and marks session completed', async () => {
      const handler = createHandler();
      const session = createMockSession() as any;
      const agent = createMockAgent() as any;
      const mockConversationService = {
        injectStepContext: jest.fn(),
      };

      const result = await handler.execute(
        ActionType.CONVERSATION_COMPLETE,
        session,
        agent,
        mockConversationService
      );

      expect(result.isComplete).toBe(true);
    });

    it('executes STEP_COMPLETED and advances step', async () => {
      const handler = createHandler();
      const agent = createMockAgent({
        stepOrder: ['greeting', 'interview', 'closing'],
      }) as any;
      const session = createMockSession({
        agentId: agent._id,
        currentStep: 'greeting',
      }) as any;
      const mockConversationService = {
        injectStepContext: jest.fn(),
      };

      const result = await handler.execute(
        ActionType.STEP_COMPLETED,
        session,
        agent,
        mockConversationService
      );

      expect(result.nextStep).toBe('interview');
      expect(result.triggerAIResponse).toBe(true);
    });

    it('returns empty result for unknown action type', async () => {
      const handler = createHandler();
      const session = createMockSession() as any;
      const agent = createMockAgent() as any;
      const mockConversationService = {
        injectStepContext: jest.fn(),
      };

      const result = await handler.execute(
        'UNKNOWN_ACTION',
        session,
        agent,
        mockConversationService
      );

      expect(result).toEqual({});
    });

    it('returns error result when action throws', async () => {
      const handler = createHandler({
        sessionRepo: {
          updateStatus: jest.fn().mockRejectedValue(new Error('DB error')),
          updateCurrentStep: jest.fn().mockRejectedValue(new Error('DB error')),
        },
      });
      const session = createMockSession() as any;
      const agent = createMockAgent() as any;
      const mockConversationService = {
        injectStepContext: jest.fn(),
      };

      const result = await handler.execute(
        ActionType.CONVERSATION_COMPLETE,
        session,
        agent,
        mockConversationService
      );

      expect(result.error).toBeDefined();
    });
  });

  describe('getTiming', () => {
    it('returns after_response for STEP_COMPLETED', () => {
      const handler = createHandler();
      expect(handler.getTiming(ActionType.STEP_COMPLETED)).toBe('after_response');
    });

    it('returns after_response for CONVERSATION_COMPLETE', () => {
      const handler = createHandler();
      expect(handler.getTiming(ActionType.CONVERSATION_COMPLETE)).toBe('after_response');
    });

    it('returns after_response for unknown action (default)', () => {
      const handler = createHandler();
      expect(handler.getTiming('UNKNOWN')).toBe('after_response');
    });
  });
});
