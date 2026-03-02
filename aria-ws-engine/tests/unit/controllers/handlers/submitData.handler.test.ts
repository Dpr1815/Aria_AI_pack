/**
 * submitData Handler Unit Tests
 */

import { ObjectId } from 'mongodb';

// Mock the ws.utils module before importing the handler
jest.mock('@controllers/handlers/ws.utils', () => ({
  sendError: jest.fn(),
  sendSafeError: jest.fn(),
  deliverResponse: jest.fn().mockResolvedValue(undefined),
}));

import { execute } from '@controllers/handlers/submitData.handler';
import { sendError, sendSafeError, deliverResponse } from '@controllers/handlers/ws.utils';

describe('submitData handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function buildContext(overrides: Record<string, any> = {}) {
    const sessionId = new ObjectId();

    return {
      ws: { send: jest.fn(), readyState: 1, OPEN: 1 } as any,
      message: {
        type: 'submitData' as const,
        dataType: 'formResponse',
        payload: { answer: 42 },
        latency: 100,
      },
      context: {
        connectionState: {
          sessionId,
          session: {
            _id: sessionId,
            currentStep: 'greeting',
            status: 'active',
          },
          agent: {
            _id: new ObjectId(),
            voice: { languageCode: 'en-US', name: 'en-US-Journey-D', gender: 'MALE' },
            features: { lipSync: false },
          },
          isAuthenticated: true,
          transcriptionSessionId: null,
          connectedAt: new Date(),
          lastActivityAt: new Date(),
          ...overrides.connectionState,
        },
        services: {
          conversation: {
            processDataSubmission: jest.fn().mockResolvedValue({
              text: 'Data received!',
              currentStep: 'greeting',
              isComplete: false,
              dataSaved: true,
              field: 'formResponse',
            }),
            ...overrides.conversation,
          },
          synthesis: {
            synthesize: jest.fn(),
          },
          transcription: {
            destroySession: jest.fn(),
          },
          ...overrides.services,
        },
        repositories: {},
      },
    };
  }

  it('calls processDataSubmission with correct parameters', async () => {
    const { ws, message, context } = buildContext();

    await execute(ws, message as any, context as any);

    expect(context.services.conversation.processDataSubmission).toHaveBeenCalledWith(
      context.connectionState.sessionId,
      'formResponse',
      { answer: 42 },
      100
    );
  });

  it('delivers response after processing', async () => {
    const { ws, message, context } = buildContext();

    await execute(ws, message as any, context as any);

    expect(deliverResponse).toHaveBeenCalled();
  });

  it('sends error when session is not initialized', async () => {
    const { ws, message, context } = buildContext({
      connectionState: { sessionId: null, session: null, agent: null },
    });

    await execute(ws, message as any, context as any);

    expect(sendError).toHaveBeenCalled();
    expect(deliverResponse).not.toHaveBeenCalled();
  });

  it('sends error when processing throws', async () => {
    const { ws, message, context } = buildContext({
      conversation: {
        processDataSubmission: jest.fn().mockRejectedValue(new Error('DB failed')),
      },
    });

    await execute(ws, message as any, context as any);

    expect(sendSafeError).toHaveBeenCalled();
  });
});
