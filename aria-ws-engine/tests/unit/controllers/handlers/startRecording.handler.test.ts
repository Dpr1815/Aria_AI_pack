/**
 * StartRecording Handler Unit Tests
 */

import { ObjectId } from 'mongodb';

jest.mock('@controllers/handlers/ws.utils', () => ({
  sendSafeError: jest.fn(),
}));

import { execute } from '@controllers/handlers/startRecording.handler';
import { sendSafeError } from '@controllers/handlers/ws.utils';

function createMockWs() {
  return { send: jest.fn(), readyState: 1, OPEN: 1 } as any;
}

function buildContext(overrides: Record<string, any> = {}) {
  const sessionId = new ObjectId();

  return {
    message: { type: 'startRecording' as const },
    context: {
      connectionState: {
        sessionId,
        agent: {
          voice: { languageCode: 'en-US', name: 'en-US-Journey-D', gender: 'MALE' },
        },
        transcriptionSessionId: null,
        lastActivityAt: new Date(),
        ...overrides.connectionState,
      },
      services: {
        transcription: {
          createSession: jest.fn(),
          destroySession: jest.fn(),
          ...overrides.transcription,
        },
        ...overrides.services,
      },
      repositories: {},
    },
  };
}

describe('startRecording handler', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a new transcription session', async () => {
    const ws = createMockWs();
    const { message, context } = buildContext();

    await execute(ws, message as any, context as any);

    expect(context.services.transcription.createSession).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        encoding: 'WEBM_OPUS',
        sampleRateHertz: 48000,
        languageCode: 'en-US',
      })
    );
    expect(context.connectionState.transcriptionSessionId).toBeTruthy();
  });

  it('destroys existing transcription session before creating new one', async () => {
    const ws = createMockWs();
    const { message, context } = buildContext({
      connectionState: { transcriptionSessionId: 'old-session' },
    });

    await execute(ws, message as any, context as any);

    expect(context.services.transcription.destroySession).toHaveBeenCalledWith('old-session');
    expect(context.services.transcription.createSession).toHaveBeenCalled();
    // New session ID should be different
    expect(context.connectionState.transcriptionSessionId).not.toBe('old-session');
  });

  it('does not destroy if no existing session', async () => {
    const ws = createMockWs();
    const { message, context } = buildContext();

    await execute(ws, message as any, context as any);

    expect(context.services.transcription.destroySession).not.toHaveBeenCalled();
  });

  it('uses agent language code for transcription', async () => {
    const ws = createMockWs();
    const { message, context } = buildContext({
      connectionState: {
        agent: { voice: { languageCode: 'it-IT', name: 'it-IT-Standard-A', gender: 'FEMALE' } },
      },
    });

    await execute(ws, message as any, context as any);

    expect(context.services.transcription.createSession).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ languageCode: 'it-IT' })
    );
  });

  it('falls back to en-US when no agent is set', async () => {
    const ws = createMockWs();
    const { message, context } = buildContext({
      connectionState: { agent: null },
    });

    await execute(ws, message as any, context as any);

    expect(context.services.transcription.createSession).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ languageCode: 'en-US' })
    );
  });

  it('updates lastActivityAt', async () => {
    const ws = createMockWs();
    const { message, context } = buildContext();
    const before = context.connectionState.lastActivityAt;

    await execute(ws, message as any, context as any);

    expect(context.connectionState.lastActivityAt.getTime()).toBeGreaterThanOrEqual(
      before.getTime()
    );
  });

  it('sends safe error when createSession throws', async () => {
    const ws = createMockWs();
    const { message, context } = buildContext({
      transcription: {
        createSession: jest.fn().mockImplementation(() => {
          throw new Error('STT unavailable');
        }),
        destroySession: jest.fn(),
      },
    });

    await execute(ws, message as any, context as any);

    expect(sendSafeError).toHaveBeenCalledWith(ws, expect.any(Error), expect.any(String));
  });
});
