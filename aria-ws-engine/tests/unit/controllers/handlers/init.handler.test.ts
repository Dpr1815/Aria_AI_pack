/**
 * Init Handler Unit Tests
 */

import { ObjectId } from 'mongodb';

jest.mock('@controllers/handlers/ws.utils', () => ({
  send: jest.fn(),
  sendError: jest.fn(),
  sendSafeError: jest.fn(),
  streamSynthesis: jest.fn().mockResolvedValue(undefined),
}));

import { execute } from '@controllers/handlers/init.handler';
import { send, sendError, sendSafeError, streamSynthesis } from '@controllers/handlers/ws.utils';

function createMockWs() {
  return { send: jest.fn(), readyState: 1, OPEN: 1 } as any;
}

function buildContext(overrides: Record<string, any> = {}) {
  const sessionId = new ObjectId();
  const agentId = new ObjectId();

  const session = {
    _id: sessionId,
    agentId,
    currentStep: 'greeting',
    status: 'active',
  };

  const agent = {
    _id: agentId,
    voice: { languageCode: 'en-US', name: 'en-US-Journey-D', gender: 'MALE' },
    features: { lipSync: false, sessionPersistence: false, autoSummary: false, videoRecording: false },
    render: { mode: 'avatar' },
    stepOrder: ['greeting', 'interview', 'closing'],
  };

  return {
    message: {
      type: 'init' as const,
      accessToken: 'valid-token-123',
      ...overrides.message,
    },
    context: {
      connectionState: {
        isAuthenticated: false,
        sessionId: null,
        session: null,
        agent: null,
        lastActivityAt: null,
        transcriptionSessionId: null,
        connectedAt: new Date(),
        ...overrides.connectionState,
      },
      services: {
        auth: {
          validateAccessToken: jest.fn().mockResolvedValue({
            valid: true,
            session,
          }),
          ...overrides.auth,
        },
        conversation: {
          initialize: jest.fn().mockResolvedValue({
            sessionId,
            agent,
            text: 'Welcome!',
            currentStep: 'greeting',
            isNewSession: true,
          }),
          ...overrides.conversation,
        },
        synthesis: {
          synthesize: jest.fn(),
        },
        ...overrides.services,
      },
      repositories: {},
    },
    session,
    agent,
  };
}

describe('init handler', () => {
  beforeEach(() => jest.clearAllMocks());

  it('authenticates, initializes, and sends sessionReady', async () => {
    const ws = createMockWs();
    const { message, context } = buildContext();

    await execute(ws, message as any, context as any);

    expect(context.services.auth.validateAccessToken).toHaveBeenCalledWith('valid-token-123');
    expect(context.services.conversation.initialize).toHaveBeenCalled();
    expect(send).toHaveBeenCalledWith(ws, expect.objectContaining({ type: 'sessionReady' }));
  });

  it('sends sessionReady with correct agent config', async () => {
    const ws = createMockWs();
    const { message, context, agent } = buildContext();

    await execute(ws, message as any, context as any);

    expect(send).toHaveBeenCalledWith(
      ws,
      expect.objectContaining({
        type: 'sessionReady',
        currentStep: 'greeting',
        isNewSession: true,
        agentConfig: expect.objectContaining({
          voice: agent.voice,
          features: agent.features,
          stepCount: 3,
        }),
      })
    );
  });

  it('updates connection state after successful init', async () => {
    const ws = createMockWs();
    const { message, context, session, agent } = buildContext();

    await execute(ws, message as any, context as any);

    expect(context.connectionState.isAuthenticated).toBe(true);
    expect(context.connectionState.sessionId).toEqual(session._id);
    expect(context.connectionState.session).toBe(session);
    expect(context.connectionState.agent).toEqual(agent);
    expect(context.connectionState.lastActivityAt).toBeInstanceOf(Date);
  });

  it('sends response and streams audio when init returns text', async () => {
    const ws = createMockWs();
    const { message, context } = buildContext();

    await execute(ws, message as any, context as any);

    expect(send).toHaveBeenCalledWith(
      ws,
      expect.objectContaining({ type: 'response', content: 'Welcome!' })
    );
    expect(streamSynthesis).toHaveBeenCalledWith(
      ws,
      'Welcome!',
      expect.objectContaining({ languageCode: 'en-US' }),
      context.services.synthesis,
      false // lipSync disabled
    );
  });

  it('skips response and audio when init returns no text', async () => {
    const ws = createMockWs();
    const { message, context } = buildContext({
      conversation: {
        initialize: jest.fn().mockResolvedValue({
          sessionId: new ObjectId(),
          agent: buildContext().agent,
          text: '',
          currentStep: 'greeting',
          isNewSession: false,
        }),
      },
    });

    await execute(ws, message as any, context as any);

    // sessionReady is always sent
    expect(send).toHaveBeenCalledWith(ws, expect.objectContaining({ type: 'sessionReady' }));
    // response and audio should NOT be sent
    expect(send).not.toHaveBeenCalledWith(ws, expect.objectContaining({ type: 'response' }));
    expect(streamSynthesis).not.toHaveBeenCalled();
  });

  it('sends auth error and does not initialize on invalid token', async () => {
    const ws = createMockWs();
    const { message, context } = buildContext({
      auth: {
        validateAccessToken: jest.fn().mockResolvedValue({
          valid: false,
          error: 'Invalid or expired access token',
        }),
      },
    });

    await execute(ws, message as any, context as any);

    expect(sendError).toHaveBeenCalledWith(
      ws,
      'Invalid or expired access token',
      expect.any(String),
      false
    );
    expect(context.services.conversation.initialize).not.toHaveBeenCalled();
    expect(context.connectionState.isAuthenticated).toBe(false);
  });

  it('does not mutate connection state on auth failure', async () => {
    const ws = createMockWs();
    const { message, context } = buildContext({
      auth: {
        validateAccessToken: jest.fn().mockResolvedValue({ valid: false, error: 'Bad token' }),
      },
    });

    await execute(ws, message as any, context as any);

    expect(context.connectionState.isAuthenticated).toBe(false);
    expect(context.connectionState.sessionId).toBeNull();
    expect(context.connectionState.agent).toBeNull();
  });

  it('sends safe error when conversation.initialize throws', async () => {
    const ws = createMockWs();
    const { message, context } = buildContext({
      conversation: {
        initialize: jest.fn().mockRejectedValue(new Error('DB down')),
      },
    });

    await execute(ws, message as any, context as any);

    expect(sendSafeError).toHaveBeenCalledWith(ws, expect.any(Error), expect.any(String));
  });

  it('sends safe error when auth service throws', async () => {
    const ws = createMockWs();
    const { message, context } = buildContext({
      auth: {
        validateAccessToken: jest.fn().mockRejectedValue(new Error('Auth service down')),
      },
    });

    await execute(ws, message as any, context as any);

    expect(sendSafeError).toHaveBeenCalledWith(ws, expect.any(Error), expect.any(String));
    expect(context.connectionState.isAuthenticated).toBe(false);
  });
});
