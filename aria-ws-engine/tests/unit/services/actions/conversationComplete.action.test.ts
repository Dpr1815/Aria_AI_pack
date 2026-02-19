/**
 * conversationComplete Action Unit Tests
 */

import { execute } from '@services/conversation/actions/conversationComplete.action';
import { createMockAgent } from '../../../mocks/data/agents.mock';
import { createMockSession } from '../../../mocks/data/sessions.mock';
import type { ActionContext } from '@types';

describe('conversationComplete action', () => {
  function buildContext(): ActionContext {
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
      },
    };
  }

  it('marks the session as completed', async () => {
    const ctx = buildContext();
    const result = await execute(undefined, ctx);

    expect(result.isComplete).toBe(true);
    expect(ctx.services.sessionRepo.updateStatus).toHaveBeenCalledWith(
      ctx.session._id,
      'completed'
    );
  });

  it('accepts a reason payload', async () => {
    const ctx = buildContext();
    const result = await execute({ reason: 'user_quit' }, ctx);

    expect(result.isComplete).toBe(true);
    expect(ctx.services.sessionRepo.updateStatus).toHaveBeenCalled();
  });
});
