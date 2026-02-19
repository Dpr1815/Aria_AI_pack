/**
 * ActionRegistry Unit Tests
 */

import {
  executeAction,
  getActionTiming,
  isActionRegistered,
  getRegisteredActionTypes,
} from '@services/conversation/actions/registry';
import { ActionType } from '@types';
import { createMockAgent } from '../../../mocks/data/agents.mock';
import { createMockSession } from '../../../mocks/data/sessions.mock';
import type { ActionContext } from '@types';

describe('ActionRegistry', () => {
  function buildContext(overrides: Record<string, any> = {}): ActionContext {
    const agent = createMockAgent({
      stepOrder: ['greeting', 'interview', 'closing'],
      ...overrides.agent,
    }) as any;
    const session = createMockSession({
      agentId: agent._id,
      currentStep: 'greeting',
      ...overrides.session,
    }) as any;

    return {
      session,
      agent,
      services: {
        sessionRepo: {
          updateStatus: jest.fn().mockResolvedValue(session),
          updateCurrentStep: jest.fn().mockResolvedValue(session),
          updateById: jest.fn().mockResolvedValue(session),
        },
        conversationRepo: {
          getMessagesForStep: jest.fn().mockResolvedValue([]),
          addMessage: jest.fn().mockResolvedValue(null),
        },
        promptRepo: {
          findByAgentAndKey: jest.fn().mockResolvedValue(null),
        },
        conversationService: {
          injectStepContext: jest.fn().mockResolvedValue(undefined),
        },
        ...overrides.services,
      },
    };
  }

  // ── isActionRegistered ──

  describe('isActionRegistered', () => {
    it('returns true for each known ActionType', () => {
      expect(isActionRegistered(ActionType.STEP_COMPLETED)).toBe(true);
      expect(isActionRegistered(ActionType.CONVERSATION_COMPLETE)).toBe(true);
      expect(isActionRegistered(ActionType.START_TEST)).toBe(true);
      expect(isActionRegistered(ActionType.START_LINGUISTIC)).toBe(true);
      expect(isActionRegistered(ActionType.STOP_LINGUISTIC)).toBe(true);
    });

    it('returns false for an unregistered type', () => {
      expect(isActionRegistered('UNKNOWN_ACTION')).toBe(false);
    });

    it('returns false for an empty string', () => {
      expect(isActionRegistered('')).toBe(false);
    });
  });

  // ── getActionTiming ──

  describe('getActionTiming', () => {
    it('returns "after_response" for STEP_COMPLETED', () => {
      expect(getActionTiming(ActionType.STEP_COMPLETED)).toBe('after_response');
    });

    it('returns "after_response" for CONVERSATION_COMPLETE', () => {
      expect(getActionTiming(ActionType.CONVERSATION_COMPLETE)).toBe('after_response');
    });

    it('returns "after_response" for START_LINGUISTIC', () => {
      expect(getActionTiming(ActionType.START_LINGUISTIC)).toBe('after_response');
    });

    it('returns "after_response" for STOP_LINGUISTIC', () => {
      expect(getActionTiming(ActionType.STOP_LINGUISTIC)).toBe('after_response');
    });

    it('returns null for an unknown type', () => {
      expect(getActionTiming('NONEXISTENT')).toBeNull();
    });
  });

  // ── getRegisteredActionTypes ──

  describe('getRegisteredActionTypes', () => {
    it('returns an array containing all five ActionType values', () => {
      const types = getRegisteredActionTypes();
      expect(types).toContain(ActionType.STEP_COMPLETED);
      expect(types).toContain(ActionType.CONVERSATION_COMPLETE);
      expect(types).toContain(ActionType.START_TEST);
      expect(types).toContain(ActionType.START_LINGUISTIC);
      expect(types).toContain(ActionType.STOP_LINGUISTIC);
      expect(types).toHaveLength(5);
    });
  });

  // ── executeAction ──

  describe('executeAction', () => {
    it('returns empty object for an unknown action type', async () => {
      const ctx = buildContext();
      const result = await executeAction('NONEXISTENT', undefined, ctx);
      expect(result).toEqual({});
    });

    it('executes a known action and returns its result', async () => {
      const ctx = buildContext({ session: { currentStep: 'closing' } });
      const result = await executeAction(
        ActionType.CONVERSATION_COMPLETE,
        undefined,
        ctx
      );

      expect(result.isComplete).toBe(true);
      expect(ctx.services.sessionRepo.updateStatus).toHaveBeenCalledWith(
        ctx.session._id,
        'completed'
      );
    });

    it('catches executor errors and returns { error: message }', async () => {
      const ctx = buildContext();
      ctx.services.sessionRepo.updateCurrentStep = jest.fn().mockRejectedValue(
        new Error('DB connection lost')
      );

      const result = await executeAction(
        ActionType.STEP_COMPLETED,
        undefined,
        ctx
      );

      expect(result.error).toBe('DB connection lost');
    });
  });
});
