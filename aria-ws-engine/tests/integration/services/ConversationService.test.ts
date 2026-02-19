/**
 * ConversationService Integration Tests
 */

import { ConversationService } from '@services/conversation/ConversationService';
import { ActionHandler } from '@services/conversation/ActionHandler';
import { createMockAgent, createMockAgentPrompt } from '../../mocks/data/agents.mock';
import {
  createMockSession,
  createMockConversation,
  createMockParticipant,
  createMockMessage,
} from '../../mocks/data/sessions.mock';
import { createMockLLMConnector } from '../../mocks/connectors/MockLLMConnector';
import { ObjectId } from 'mongodb';

describe('ConversationService', () => {
  let agent: any;
  let session: any;
  let conversation: any;
  let participant: any;
  let prompt: any;
  let llmConnector: ReturnType<typeof createMockLLMConnector>;

  function buildDeps(overrides: Record<string, any> = {}) {
    agent = createMockAgent({ stepOrder: ['greeting', 'interview', 'closing'] });
    session = createMockSession({
      agentId: agent._id,
      currentStep: 'greeting',
    });
    conversation = createMockConversation({ sessionId: session._id });
    participant = createMockParticipant();
    session.participantId = participant._id;
    prompt = createMockAgentPrompt({ agentId: agent._id, key: 'greeting' });
    llmConnector = createMockLLMConnector({ text: 'Hello there!', action: undefined });

    const sessionRepo = {
      findById: jest.fn().mockResolvedValue(session),
      findByIdOrThrow: jest.fn().mockResolvedValue(session),
      touchActivity: jest.fn().mockResolvedValue(null),
      updateById: jest.fn().mockResolvedValue(session),
      updateStatus: jest.fn().mockResolvedValue(session),
      updateCurrentStep: jest.fn().mockResolvedValue(session),
      ...overrides.sessionRepo,
    };

    const conversationRepo = {
      findBySessionIdOrThrow: jest.fn().mockResolvedValue(conversation),
      addMessage: jest.fn().mockResolvedValue(conversation),
      getMessagesForStep: jest.fn().mockResolvedValue([]),
      ...overrides.conversationRepo,
    };

    const agentRepo = {
      findByIdOrThrow: jest.fn().mockResolvedValue(agent),
      ...overrides.agentRepo,
    };

    const participantRepo = {
      findById: jest.fn().mockResolvedValue(participant),
      findByIdOrThrow: jest.fn().mockResolvedValue(participant),
      ...overrides.participantRepo,
    };

    const promptRepo = {
      findByAgentAndKeyOrThrow: jest.fn().mockResolvedValue(prompt),
      findByAgentAndKey: jest.fn().mockResolvedValue(prompt),
      ...overrides.promptRepo,
    };

    const actionHandler = new ActionHandler({
      sessionRepo: sessionRepo as any,
      conversationRepo: conversationRepo as any,
      promptRepo: promptRepo as any,
    });

    return {
      agentRepo: agentRepo as any,
      sessionRepo: sessionRepo as any,
      conversationRepo: conversationRepo as any,
      participantRepo: participantRepo as any,
      promptRepo: promptRepo as any,
      llmConnector: (overrides.llmConnector ?? llmConnector) as any,
      actionHandler,
    };
  }

  // ── initialize ──

  describe('initialize', () => {
    it('initializes a new session with greeting', async () => {
      const deps = buildDeps();
      const service = new ConversationService(deps);

      const result = await service.initialize(session._id);

      expect(result.sessionId).toEqual(session._id);
      expect(result.agent).toEqual(agent);
      expect(result.isNewSession).toBe(true);
      expect(result.text).toBe('Hello there!');
      expect(result.currentStep).toBe('greeting');
    });

    it('calls LLM for new session', async () => {
      const deps = buildDeps();
      const service = new ConversationService(deps);

      await service.initialize(session._id);

      expect(deps.llmConnector.complete).toHaveBeenCalled();
    });

    it('stores the assistant message for new session', async () => {
      const deps = buildDeps();
      const service = new ConversationService(deps);

      await service.initialize(session._id);

      expect(deps.conversationRepo.addMessage).toHaveBeenCalledWith(
        session._id,
        expect.objectContaining({
          role: 'assistant',
          content: 'Hello there!',
        })
      );
    });

    it('replays last assistant message for existing session with persistence', async () => {
      // Must build deps first (which creates agent), then mutate sessionPersistence
      const deps = buildDeps();

      const existingConversation = createMockConversation({
        sessionId: session._id,
        messageCount: 3,
        messages: [
          createMockMessage({ role: 'system', content: 'context' }),
          createMockMessage({ role: 'user', content: 'Hi' }),
          createMockMessage({ role: 'assistant', content: 'Previous greeting' }),
        ],
      });

      // Mutate AFTER buildDeps so it applies to the correct agent object
      agent.features.sessionPersistence = true;

      // Override the conversation repo mock to return the existing conversation
      deps.conversationRepo.findBySessionIdOrThrow.mockResolvedValue(existingConversation);

      const service = new ConversationService(deps);
      const result = await service.initialize(session._id);

      expect(result.isNewSession).toBe(false);
      expect(result.text).toBe('Previous greeting');
      // Should NOT call LLM — just replay
      expect(deps.llmConnector.complete).not.toHaveBeenCalled();
    });

    it('returns empty text for existing session without persistence', async () => {
      const existingConversation = createMockConversation({
        sessionId: session._id,
        messageCount: 3,
        messages: [createMockMessage()],
      });

      const deps = buildDeps({
        conversationRepo: {
          findBySessionIdOrThrow: jest.fn().mockResolvedValue(existingConversation),
          addMessage: jest.fn().mockResolvedValue(existingConversation),
          getMessagesForStep: jest.fn().mockResolvedValue([]),
        },
      });

      const service = new ConversationService(deps);
      const result = await service.initialize(session._id);

      expect(result.isNewSession).toBe(false);
      expect(result.text).toBe('');
    });
  });

  // ── processUserInput ──

  describe('processUserInput', () => {
    it('processes transcript and returns AI response', async () => {
      const deps = buildDeps();
      const service = new ConversationService(deps);

      const result = await service.processUserInput(session._id, 'Hello there');

      expect(result.text).toBe('Hello there!');
      expect(result.currentStep).toBe('greeting');
      expect(result.isComplete).toBe(false);
    });

    it('stores user message and assistant response', async () => {
      const deps = buildDeps();
      const service = new ConversationService(deps);

      await service.processUserInput(session._id, 'Hello there', 150);

      // User message
      expect(deps.conversationRepo.addMessage).toHaveBeenCalledWith(
        session._id,
        expect.objectContaining({
          role: 'user',
          content: 'Hello there',
          latencyMs: 150,
        })
      );

      // Assistant message
      expect(deps.conversationRepo.addMessage).toHaveBeenCalledWith(
        session._id,
        expect.objectContaining({
          role: 'assistant',
          content: 'Hello there!',
        })
      );
    });

    it('returns completed response for completed session', async () => {
      const completedSession = createMockSession({
        ...session,
        status: 'completed',
      });

      const deps = buildDeps({
        sessionRepo: {
          findByIdOrThrow: jest.fn().mockResolvedValue(completedSession),
        },
      });

      const service = new ConversationService(deps);
      const result = await service.processUserInput(session._id, 'Hello');

      expect(result.isComplete).toBe(true);
      expect(result.text).toContain('already ended');
    });

    it('touches session activity', async () => {
      const deps = buildDeps();
      const service = new ConversationService(deps);

      await service.processUserInput(session._id, 'Hello');

      expect(deps.sessionRepo.touchActivity).toHaveBeenCalledWith(session._id);
    });

    it('executes action when LLM returns one', async () => {
      const actionLLM = createMockLLMConnector({
        text: 'Great, moving on!',
        action: 'STEP_COMPLETED',
      });

      const deps = buildDeps({ llmConnector: actionLLM });
      const service = new ConversationService(deps);

      const result = await service.processUserInput(session._id, 'I am ready');

      expect(result.action).toBe('STEP_COMPLETED');
      expect(result.stepAdvanced).toBe(true);
      expect(result.currentStep).toBe('interview');
    });

    it('skips action when skipAction option is set', async () => {
      const actionLLM = createMockLLMConnector({
        text: 'Great!',
        action: 'STEP_COMPLETED',
      });

      const deps = buildDeps({ llmConnector: actionLLM });
      const service = new ConversationService(deps);

      const result = await service.processUserInput(session._id, 'Hello', undefined, {
        skipAction: true,
      });

      expect(result.action).toBe('STEP_COMPLETED');
      // skipAction prevents execution, but stepAdvanced is initialized to false (not undefined)
      expect(result.stepAdvanced).toBeFalsy();
    });
  });

  // ── processDataSubmission ──

  describe('processDataSubmission', () => {
    it('processes data submission and returns response', async () => {
      const deps = buildDeps();
      const service = new ConversationService(deps);

      const result = await service.processDataSubmission(
        session._id,
        'formResponse',
        { answer: 42 }
      );

      expect(result.text).toBe('Hello there!');
      expect(result.dataSaved).toBe(true);
      expect(result.field).toBe('formResponse');
    });

    it('stores data in session', async () => {
      const deps = buildDeps();
      const service = new ConversationService(deps);

      await service.processDataSubmission(session._id, 'testSolution', { code: 'fn()' });

      expect(deps.sessionRepo.updateById).toHaveBeenCalledWith(
        session._id,
        expect.objectContaining({ 'data.testSolution': { code: 'fn()' } })
      );
    });

    it('returns completed response for completed session', async () => {
      const completedSession = createMockSession({
        ...session,
        status: 'completed',
      });

      const deps = buildDeps({
        sessionRepo: {
          findByIdOrThrow: jest.fn().mockResolvedValue(completedSession),
        },
      });

      const service = new ConversationService(deps);
      const result = await service.processDataSubmission(session._id, 'test', {});

      expect(result.isComplete).toBe(true);
      expect(result.dataSaved).toBe(false);
    });
  });

  // ── getSessionStatus ──

  describe('getSessionStatus', () => {
    it('returns status for existing session', async () => {
      const deps = buildDeps();
      const service = new ConversationService(deps);

      const status = await service.getSessionStatus(session._id);

      expect(status.exists).toBe(true);
      expect(status.isComplete).toBe(false);
      expect(status.currentStep).toBe('greeting');
    });

    it('returns not-exists for missing session', async () => {
      const deps = buildDeps({
        sessionRepo: {
          findById: jest.fn().mockResolvedValue(null),
        },
      });

      const service = new ConversationService(deps);
      const status = await service.getSessionStatus(new ObjectId());

      expect(status.exists).toBe(false);
    });
  });
});
