/**
 * startLinguistic Action Unit Tests
 */

import {
  execute,
  getLinguisticVoice,
  getSupportedLinguisticLanguages,
} from '@services/conversation/actions/startLinguistic.action';
import { createMockAgent } from '../../../mocks/data/agents.mock';
import { createMockSession } from '../../../mocks/data/sessions.mock';
import type { ActionContext } from '@types';

describe('startLinguistic action', () => {
  function buildContext(overrides: Record<string, any> = {}): ActionContext {
    const agent = createMockAgent({
      stepOrder: ['greeting', 'linguistic', 'closing'],
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
        stepRepo: {
          findByAgentAndKey: jest.fn().mockResolvedValue({
            _id: 'step-id',
            key: 'linguistic',
            inputs: { target_language: 'it-IT' },
          }),
          ...overrides.stepRepo,
        },
        ...overrides.services,
      },
    };
  }

  // ── execute ──

  it('advances to the next step and updates currentStep', async () => {
    const ctx = buildContext();
    const result = await execute(undefined, ctx);

    expect(result.nextStep).toBe('linguistic');
    expect(result.isComplete).toBe(false);
    expect(result.triggerAIResponse).toBe(true);
    expect(ctx.services.sessionRepo.updateCurrentStep).toHaveBeenCalledWith(
      ctx.session._id,
      'linguistic'
    );
  });

  it('injects step context into the new step', async () => {
    const ctx = buildContext();
    await execute(undefined, ctx);

    expect(ctx.services.conversationService.injectStepContext).toHaveBeenCalledWith(
      ctx.session._id,
      'linguistic',
      ctx.agent
    );
  });

  it('returns voiceOverride matching the target_language voice config', async () => {
    const ctx = buildContext();
    const result = await execute(undefined, ctx);

    expect(result.voiceOverride).toEqual({
      languageCode: 'it-IT',
      name: 'it-IT-Chirp-HD-F',
      gender: 'FEMALE',
    });
  });

  it('sets voiceOverride to undefined when target_language is absent', async () => {
    const ctx = buildContext({
      stepRepo: {
        findByAgentAndKey: jest.fn().mockResolvedValue({
          _id: 'step-id',
          key: 'linguistic',
          inputs: {},
        }),
      },
    });
    const result = await execute(undefined, ctx);

    expect(result.voiceOverride).toBeUndefined();
  });

  it('sets voiceOverride to undefined for an unsupported target_language', async () => {
    const ctx = buildContext({
      stepRepo: {
        findByAgentAndKey: jest.fn().mockResolvedValue({
          _id: 'step-id',
          key: 'linguistic',
          inputs: { target_language: 'xx-XX' },
        }),
      },
    });
    const result = await execute(undefined, ctx);

    expect(result.voiceOverride).toBeUndefined();
  });

  it('marks session as completed on the last step', async () => {
    const ctx = buildContext({
      agent: { stepOrder: ['greeting'] },
      session: { currentStep: 'greeting' },
    });
    const result = await execute(undefined, ctx);

    expect(result.isComplete).toBe(true);
    expect(ctx.services.sessionRepo.updateStatus).toHaveBeenCalledWith(
      ctx.session._id,
      'completed'
    );
  });

  it('returns error when stepRepo is not configured', async () => {
    const ctx = buildContext({ services: { stepRepo: undefined } });
    // Remove stepRepo entirely
    delete (ctx.services as any).stepRepo;

    const result = await execute(undefined, ctx);

    expect(result.error).toBe('Step repository not configured');
  });

  it('does not inject step context when on the last step', async () => {
    const ctx = buildContext({
      agent: { stepOrder: ['greeting'] },
      session: { currentStep: 'greeting' },
    });
    await execute(undefined, ctx);

    expect(ctx.services.conversationService.injectStepContext).not.toHaveBeenCalled();
  });

  // ── getLinguisticVoice (pure helper) ──

  describe('getLinguisticVoice', () => {
    it('returns the correct VoiceConfig for a supported language code', () => {
      const voice = getLinguisticVoice('it-IT');
      expect(voice).toEqual({
        languageCode: 'it-IT',
        name: 'it-IT-Chirp-HD-F',
        gender: 'FEMALE',
      });
    });

    it('returns null for an unsupported language code', () => {
      expect(getLinguisticVoice('xx-XX')).toBeNull();
    });

    it('returns null for an empty string', () => {
      expect(getLinguisticVoice('')).toBeNull();
    });
  });

  // ── getSupportedLinguisticLanguages ──

  describe('getSupportedLinguisticLanguages', () => {
    it('returns an array including known language codes', () => {
      const languages = getSupportedLinguisticLanguages();
      expect(languages).toContain('en-US');
      expect(languages).toContain('it-IT');
      expect(languages).toContain('fr-FR');
      expect(languages).toContain('de-DE');
      expect(languages).toContain('ja-JP');
    });

    it('returns an array of strings', () => {
      const languages = getSupportedLinguisticLanguages();
      expect(Array.isArray(languages)).toBe(true);
      languages.forEach((lang) => expect(typeof lang).toBe('string'));
    });
  });
});
