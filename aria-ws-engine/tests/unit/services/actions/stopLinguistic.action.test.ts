/**
 * stopLinguistic Action Unit Tests
 */

import { execute } from '@services/conversation/actions/stopLinguistic.action';
import { createMockAgent } from '../../../mocks/data/agents.mock';
import { createMockSession } from '../../../mocks/data/sessions.mock';
import type { ActionContext } from '@types';

describe('stopLinguistic action', () => {
  function buildContext(overrides: Record<string, any> = {}): ActionContext {
    const agent = createMockAgent({
      stepOrder: ['greeting', 'linguistic', 'closing'],
      ...overrides.agent,
    }) as any;
    const session = createMockSession({
      agentId: agent._id,
      currentStep: 'linguistic',
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

  it('advances to the next step and updates currentStep', async () => {
    const ctx = buildContext();
    const result = await execute(undefined, ctx);

    expect(result.nextStep).toBe('closing');
    expect(result.isComplete).toBe(false);
    expect(result.triggerAIResponse).toBe(true);
    expect(ctx.services.sessionRepo.updateCurrentStep).toHaveBeenCalledWith(
      ctx.session._id,
      'closing'
    );
  });

  it('injects step context into the new step', async () => {
    const ctx = buildContext();
    await execute(undefined, ctx);

    expect(ctx.services.conversationService.injectStepContext).toHaveBeenCalledWith(
      ctx.session._id,
      'closing',
      ctx.agent
    );
  });

  it('returns voiceOverride equal to agent.voice (reverts to original)', async () => {
    const ctx = buildContext();
    const result = await execute(undefined, ctx);

    expect(result.voiceOverride).toEqual(ctx.agent.voice);
  });

  it('marks session as completed on the last step', async () => {
    const ctx = buildContext({
      agent: { stepOrder: ['closing'] },
      session: { currentStep: 'closing' },
    });
    const result = await execute(undefined, ctx);

    expect(result.isComplete).toBe(true);
    expect(ctx.services.sessionRepo.updateStatus).toHaveBeenCalledWith(
      ctx.session._id,
      'completed'
    );
  });

  it('does not call updateCurrentStep when on the last step', async () => {
    const ctx = buildContext({
      agent: { stepOrder: ['closing'] },
      session: { currentStep: 'closing' },
    });
    await execute(undefined, ctx);

    expect(ctx.services.sessionRepo.updateCurrentStep).not.toHaveBeenCalled();
  });

  it('does not call injectStepContext when on the last step', async () => {
    const ctx = buildContext({
      agent: { stepOrder: ['closing'] },
      session: { currentStep: 'closing' },
    });
    await execute(undefined, ctx);

    expect(ctx.services.conversationService.injectStepContext).not.toHaveBeenCalled();
  });
});
