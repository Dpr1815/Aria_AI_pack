/**
 * startTest Action Unit Tests
 */

import { execute } from '@services/conversation/actions/startTest.action';
import { createMockAgent } from '../../../mocks/data/agents.mock';
import { createMockSession } from '../../../mocks/data/sessions.mock';
import { ObjectId } from 'mongodb';
import type { ActionContext } from '@types';

describe('startTest action', () => {
  function buildContext(overrides: Record<string, any> = {}): ActionContext {
    const agent = createMockAgent() as any;
    const session = createMockSession({ agentId: agent._id }) as any;

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
        assessmentRepo: overrides.assessmentRepo ?? {
          findByAgentId: jest.fn().mockResolvedValue(null),
        },
      },
    };
  }

  it('returns clientPayload with openAssessment action', async () => {
    const ctx = buildContext();
    const result = await execute(undefined, ctx);

    expect(result.isComplete).toBe(false);
    expect(result.clientPayload).toBeDefined();
    expect(result.clientPayload!.action).toEqual(
      expect.objectContaining({ type: 'openAssessment' })
    );
  });

  it('includes assessment config when available', async () => {
    const mockAssessment = {
      _id: new ObjectId(),
      agentId: new ObjectId(),
      testContent: 'Write a function...',
      language: 'javascript',
      durationSeconds: 1800,
    };

    const ctx = buildContext({
      assessmentRepo: {
        findByAgentId: jest.fn().mockResolvedValue(mockAssessment),
      },
    });

    const result = await execute(undefined, ctx);
    const payload = result.clientPayload!.action as any;

    expect(payload.payload.assessment).toEqual({
      testContent: 'Write a function...',
      language: 'javascript',
      durationSeconds: 1800,
    });
  });

  it('sets assessment to undefined when no assessment exists', async () => {
    const ctx = buildContext();
    const result = await execute(undefined, ctx);
    const payload = result.clientPayload!.action as any;

    expect(payload.payload.assessment).toBeUndefined();
  });

  it('passes through additional payload', async () => {
    const ctx = buildContext();
    const result = await execute({ customField: 'value' }, ctx);
    const payload = result.clientPayload!.action as any;

    expect(payload.payload.customField).toBe('value');
  });
});
