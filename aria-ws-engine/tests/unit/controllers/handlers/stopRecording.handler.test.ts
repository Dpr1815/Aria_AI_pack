/**
 * StopRecording Handler Unit Tests
 */

import { ObjectId } from 'mongodb';

jest.mock('@controllers/handlers/ws.utils', () => ({
  send: jest.fn(),
  sendError: jest.fn(),
  sendSafeError: jest.fn(),
  sendProcessingStart: jest.fn(),
  sendProcessingEnd: jest.fn(),
  deliverResponse: jest.fn().mockResolvedValue(undefined),
}));

import { execute } from '@controllers/handlers/stopRecording.handler';
import {
  send,
  sendError,
  sendSafeError,
  sendProcessingStart,
  sendProcessingEnd,
  deliverResponse,
} from '@controllers/handlers/ws.utils';

function createMockWs() {
  return { send: jest.fn(), readyState: 1, OPEN: 1 } as any;
}

function buildContext(overrides: Record<string, any> = {}) {
  const sessionId = new ObjectId();

  return {
    message: {
      type: 'stopRecording' as const,
      latency: 150,
      ...overrides.message,
    },
    context: {
      connectionState: {
        sessionId,
        session: { _id: sessionId, currentStep: 'greeting', status: 'active' },
        agent: {
          _id: new ObjectId(),
          voice: { languageCode: 'en-US', name: 'en-US-Journey-D', gender: 'MALE' },
          features: { lipSync: false },
        },
        isAuthenticated: true,
        transcriptionSessionId: 'txn-123',
        lastActivityAt: new Date(),
        connectedAt: new Date(),
        ...overrides.connectionState,
      },
      services: {
        transcription: {
          endSession: jest.fn().mockResolvedValue('Hello, how are you?'),
          destroySession: jest.fn(),
          ...overrides.transcription,
        },
        conversation: {
          processUserInput: jest.fn().mockResolvedValue({
            text: 'I am doing great!',
            currentStep: 'greeting',
            isComplete: false,
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
  };
}

describe('stopRecording handler', () => {
  beforeEach(() => jest.clearAllMocks());

  it('ends transcription, sends transcript, processes with LLM, delivers response', async () => {
    const ws = createMockWs();
    const { message, context } = buildContext();

    await execute(ws, message as any, context as any);

    // 1. End transcription
    expect(context.services.transcription.endSession).toHaveBeenCalledWith('txn-123');

    // 2. Send transcript to client
    expect(send).toHaveBeenCalledWith(ws, expect.objectContaining({
      type: 'transcript',
      transcript: 'Hello, how are you?',
    }));

    // 3. Process with conversation service
    expect(context.services.conversation.processUserInput).toHaveBeenCalledWith(
      context.connectionState.sessionId,
      'Hello, how are you?',
      150
    );

    // 4. Deliver response
    expect(deliverResponse).toHaveBeenCalled();
  });

  it('clears transcriptionSessionId before ending session', async () => {
    const ws = createMockWs();
    const { message, context } = buildContext();

    await execute(ws, message as any, context as any);

    expect(context.connectionState.transcriptionSessionId).toBeNull();
  });

  it('sends processing indicators for STT and LLM', async () => {
    const ws = createMockWs();
    const { message, context } = buildContext();

    await execute(ws, message as any, context as any);

    expect(sendProcessingStart).toHaveBeenCalledWith(ws, 'stt');
    expect(sendProcessingEnd).toHaveBeenCalledWith(ws, 'stt');
    expect(sendProcessingStart).toHaveBeenCalledWith(ws, 'llm');
    expect(sendProcessingEnd).toHaveBeenCalledWith(ws, 'llm');
  });

  it('sends error for empty transcript', async () => {
    const ws = createMockWs();
    const { message, context } = buildContext({
      transcription: {
        endSession: jest.fn().mockResolvedValue('   '),
        destroySession: jest.fn(),
      },
    });

    await execute(ws, message as any, context as any);

    expect(sendError).toHaveBeenCalledWith(
      ws,
      expect.stringMatching(/empty/i),
      expect.any(String)
    );
    expect(context.services.conversation.processUserInput).not.toHaveBeenCalled();
  });

  it('sends error when no transcription session exists', async () => {
    const ws = createMockWs();
    const { message, context } = buildContext({
      connectionState: { transcriptionSessionId: null },
    });

    await execute(ws, message as any, context as any);

    // No transcription → empty transcript → error
    expect(sendError).toHaveBeenCalledWith(
      ws,
      expect.stringMatching(/empty/i),
      expect.any(String)
    );
  });

  it('sends error when session is not initialized', async () => {
    const ws = createMockWs();
    const { message, context } = buildContext({
      connectionState: { sessionId: null, agent: null, transcriptionSessionId: 'txn-123' },
      transcription: {
        endSession: jest.fn().mockResolvedValue('Hello'),
        destroySession: jest.fn(),
      },
    });

    await execute(ws, message as any, context as any);

    expect(sendError).toHaveBeenCalledWith(
      ws,
      expect.stringMatching(/not initialized/i),
      expect.any(String)
    );
    expect(context.services.conversation.processUserInput).not.toHaveBeenCalled();
  });

  it('applies voice override from result', async () => {
    const ws = createMockWs();
    const newVoice = { languageCode: 'it-IT', name: 'it-IT-Standard-A', gender: 'FEMALE' };
    const { message, context } = buildContext({
      conversation: {
        processUserInput: jest.fn().mockResolvedValue({
          text: 'Ciao!',
          currentStep: 'linguistic',
          isComplete: false,
          voiceOverride: newVoice,
        }),
      },
    });

    await execute(ws, message as any, context as any);

    expect(context.connectionState.agent.voice).toEqual(newVoice);
  });

  it('nullifies session on completion', async () => {
    const ws = createMockWs();
    const { message, context } = buildContext({
      conversation: {
        processUserInput: jest.fn().mockResolvedValue({
          text: 'Goodbye!',
          currentStep: 'closing',
          isComplete: true,
        }),
      },
    });

    await execute(ws, message as any, context as any);

    expect(context.connectionState.session).toBeNull();
  });

  it('sends safe error when transcription endSession throws', async () => {
    const ws = createMockWs();
    const { message, context } = buildContext({
      connectionState: { transcriptionSessionId: 'txn-456' },
      transcription: {
        endSession: jest.fn().mockRejectedValue(new Error('STT crashed')),
        destroySession: jest.fn(),
      },
    });

    await execute(ws, message as any, context as any);

    // transcriptionSessionId was already cleared before endSession call,
    // so the catch-block cleanup guard is false — no destroySession call
    expect(context.connectionState.transcriptionSessionId).toBeNull();
    expect(sendSafeError).toHaveBeenCalled();
    expect(context.services.conversation.processUserInput).not.toHaveBeenCalled();
  });

  it('cleans up transcription on error during LLM processing', async () => {
    const ws = createMockWs();
    // Simulate: transcription succeeds, but then a NEW startRecording
    // sets transcriptionSessionId again before the error path runs.
    // In practice the catch-block cleanup handles errors from processUserInput
    // when a new recording has already started.
    const { message, context } = buildContext({
      conversation: {
        processUserInput: jest.fn().mockImplementation(async () => {
          // Simulate a new recording starting between endSession and processUserInput
          context.connectionState.transcriptionSessionId = 'txn-new';
          throw new Error('LLM failed');
        }),
      },
    });

    await execute(ws, message as any, context as any);

    expect(context.services.transcription.destroySession).toHaveBeenCalledWith('txn-new');
    expect(context.connectionState.transcriptionSessionId).toBeNull();
    expect(sendSafeError).toHaveBeenCalled();
  });
});
