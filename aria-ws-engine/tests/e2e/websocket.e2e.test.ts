/**
 * WebSocket E2E Tests
 *
 * Spins up a real HTTP + WebSocket server with mocked services/repos,
 * connects via a real WebSocket client, and tests the full message flow.
 */

import { createServer, type Server as HttpServer } from 'http';
import WebSocket from 'ws';

import { WebSocketController } from '@controllers/WebSocketController';
import { setupWebSocketRoute } from '@routes/websocket.routes';
import { createMockAgent, createMockAgentPrompt } from '../mocks/data/agents.mock';
import {
  createMockSession,
  createMockConversation,
  createMockParticipant,
} from '../mocks/data/sessions.mock';

// ============================================
// Helpers
// ============================================

/** Collect messages from a WebSocket until a condition is met or timeout */
function collectMessages(
  ws: WebSocket,
  count: number,
  timeoutMs = 5000
): Promise<any[]> {
  return new Promise((resolve) => {
    const messages: any[] = [];
    const timer = setTimeout(
      () => resolve(messages), // resolve with whatever we have on timeout
      timeoutMs
    );

    ws.on('message', (data: Buffer) => {
      const msg = JSON.parse(data.toString());
      messages.push(msg);
      if (messages.length >= count) {
        clearTimeout(timer);
        resolve(messages);
      }
    });
  });
}

/** Wait for a single message matching a type */
function waitForMessage(
  ws: WebSocket,
  type: string,
  timeoutMs = 5000
): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timeout waiting for message type: ${type}`)),
      timeoutMs
    );

    const handler = (data: Buffer) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === type) {
        clearTimeout(timer);
        ws.off('message', handler);
        resolve(msg);
      }
    };

    ws.on('message', handler);
  });
}

/** Send a JSON message */
function sendJSON(ws: WebSocket, message: Record<string, unknown>): void {
  ws.send(JSON.stringify(message));
}

/** Wait for WebSocket to reach open state */
function waitForOpen(ws: WebSocket): Promise<void> {
  return new Promise((resolve) => {
    if (ws.readyState === WebSocket.OPEN) return resolve();
    ws.once('open', resolve);
  });
}

// ============================================
// Mock Factories
// ============================================

function buildMockDeps() {
  const agent = createMockAgent({
    render: { avatarUrl: null, theme: 'default' },
  });
  const session = createMockSession({ agentId: agent._id });
  const conversation = createMockConversation({ sessionId: session._id });
  const participant = createMockParticipant();
  const prompt = createMockAgentPrompt({ agentId: agent._id });

  session.participantId = participant._id;

  const services = {
    auth: {
      validateAccessToken: jest.fn().mockResolvedValue({
        valid: true,
        session,
      }),
    },
    conversation: {
      initialize: jest.fn().mockResolvedValue({
        sessionId: session._id,
        agent,
        isNewSession: true,
        text: 'Welcome! How can I help you today?',
        currentStep: 'greeting',
      }),
      processUserInput: jest.fn().mockResolvedValue({
        text: 'That is a great answer!',
        currentStep: 'greeting',
        isComplete: false,
        action: undefined,
        stepAdvanced: false,
        actionTiming: 'after_response',
      }),
      processDataSubmission: jest.fn().mockResolvedValue({
        text: 'Data received, thank you!',
        currentStep: 'greeting',
        isComplete: false,
        dataSaved: true,
        field: 'formResponse',
        action: undefined,
        stepAdvanced: false,
        actionTiming: 'after_response',
      }),
      getSessionStatus: jest.fn().mockResolvedValue({
        exists: true,
        isComplete: false,
        currentStep: 'greeting',
      }),
    },
    transcription: {
      createSession: jest.fn().mockReturnValue('txn-session-123'),
      getSession: jest.fn().mockReturnValue({ id: 'txn-session-123' }),
      hasSession: jest.fn().mockReturnValue(true),
      destroySession: jest.fn(),
      destroyAllSessions: jest.fn(),
      writeAudio: jest.fn(),
      endSession: jest.fn().mockResolvedValue('Hello, I am the user.'),
    },
    synthesis: {
      synthesize: jest.fn().mockImplementation(function* () {
        yield {
          audio: Buffer.alloc(1000),
          visemes: [],
          duration: 1.5,
          text: 'Welcome!',
          chunkIndex: 0,
          totalChunks: 1,
          isFirst: true,
          isLast: true,
          sampleRate: 24000,
        };
      }),
    },
  };

  const repositories = {
    session: {
      findById: jest.fn().mockResolvedValue(session),
      findByIdOrThrow: jest.fn().mockResolvedValue(session),
      findByAccessTokenHash: jest.fn().mockResolvedValue(session),
      touchActivity: jest.fn().mockResolvedValue(null),
      updateById: jest.fn().mockResolvedValue(session),
      updateStatus: jest.fn().mockResolvedValue(session),
      updateCurrentStep: jest.fn().mockResolvedValue(session),
    },
    agent: {
      findById: jest.fn().mockResolvedValue(agent),
      findByIdOrThrow: jest.fn().mockResolvedValue(agent),
    },
    participant: {
      findById: jest.fn().mockResolvedValue(participant),
      findByIdOrThrow: jest.fn().mockResolvedValue(participant),
    },
    conversation: {
      findBySessionIdOrThrow: jest.fn().mockResolvedValue(conversation),
      addMessage: jest.fn().mockResolvedValue(conversation),
      getMessagesForStep: jest.fn().mockResolvedValue([]),
    },
    prompt: {
      findByAgentAndKeyOrThrow: jest.fn().mockResolvedValue(prompt),
      findByAgentAndKey: jest.fn().mockResolvedValue(prompt),
    },
    assessment: {
      findByAgentAndKey: jest.fn().mockResolvedValue(null),
    },
  };

  const apiConnector = {
    generateSummary: jest.fn().mockResolvedValue({ success: true }),
    refreshStatistics: jest.fn().mockResolvedValue({ success: true }),
  };

  return { agent, session, services, repositories, apiConnector };
}

// ============================================
// Test Suite
// ============================================

describe('WebSocket E2E', () => {
  let httpServer: HttpServer;
  let wss: import('ws').WebSocketServer;
  let serverUrl: string;
  let controller: WebSocketController;
  let deps: ReturnType<typeof buildMockDeps>;

  beforeEach(async () => {
    deps = buildMockDeps();

    controller = new WebSocketController({
      services: deps.services as any,
      repositories: deps.repositories as any,
      apiConnector: deps.apiConnector as any,
      config: {
        pingIntervalMs: 60_000, // Long interval to avoid noise in tests
        pongTimeoutMs: 10_000,
      },
    });

    httpServer = createServer();
    wss = setupWebSocketRoute(httpServer, controller, { path: '/ws' });

    await new Promise<void>((resolve) => {
      httpServer.listen(0, '127.0.0.1', () => resolve());
    });

    const addr = httpServer.address();
    if (typeof addr === 'string' || !addr) throw new Error('Bad address');
    serverUrl = `ws://127.0.0.1:${addr.port}/ws`;
  });

  afterEach(async () => {
    await controller.closeAll('test cleanup');
    wss.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  // ── Connection ──

  describe('connection', () => {
    it('accepts WebSocket connections', async () => {
      const client = new WebSocket(serverUrl);
      await waitForOpen(client);

      expect(client.readyState).toBe(WebSocket.OPEN);
      expect(controller.getConnectionCount()).toBe(1);

      client.close();
    });

    it('tracks multiple connections', async () => {
      const client1 = new WebSocket(serverUrl);
      const client2 = new WebSocket(serverUrl);
      await Promise.all([waitForOpen(client1), waitForOpen(client2)]);

      expect(controller.getConnectionCount()).toBe(2);

      client1.close();
      client2.close();
    });
  });

  // ── Init Flow ──

  describe('init flow', () => {
    it('authenticates and sends sessionReady + response + audio', async () => {
      const client = new WebSocket(serverUrl);
      await waitForOpen(client);

      // Collect: sessionReady, response, processingStart(tts), audio, processingEnd(tts)
      const collecting = collectMessages(client, 5);
      sendJSON(client, { type: 'init', accessToken: 'test-token-123' });
      const messages = await collecting;

      const types = messages.map((m) => m.type);
      expect(types).toContain('sessionReady');
      expect(types).toContain('response');
      expect(types).toContain('audio');

      const sessionReady = messages.find((m) => m.type === 'sessionReady');
      expect(sessionReady.isNewSession).toBe(true);
      expect(sessionReady.currentStep).toBe('greeting');
      expect(sessionReady.sessionId).toBeDefined();

      const response = messages.find((m) => m.type === 'response');
      expect(response.content).toBe('Welcome! How can I help you today?');
      expect(response.currentStep).toBe('greeting');

      expect(deps.services.auth.validateAccessToken).toHaveBeenCalledWith('test-token-123');
      expect(deps.services.conversation.initialize).toHaveBeenCalled();

      client.close();
    });

    it('sends error for invalid token', async () => {
      deps.services.auth.validateAccessToken.mockResolvedValue({
        valid: false,
        error: 'Invalid or expired access token',
      });

      const client = new WebSocket(serverUrl);
      await waitForOpen(client);

      const errorPromise = waitForMessage(client, 'error');
      sendJSON(client, { type: 'init', accessToken: 'bad-token' });
      const errorMsg = await errorPromise;

      expect(errorMsg.error).toContain('Invalid or expired');
      expect(errorMsg.code).toBe('AUTH_FAILED');

      client.close();
    });
  });

  // ── Auth Guard ──

  describe('auth guard', () => {
    it('rejects messages before init', async () => {
      const client = new WebSocket(serverUrl);
      await waitForOpen(client);

      const errorPromise = waitForMessage(client, 'error');
      sendJSON(client, { type: 'startRecording' });
      const errorMsg = await errorPromise;

      expect(errorMsg.error).toContain('initialize the session');
      expect(errorMsg.code).toBe('AUTH_REQUIRED');

      client.close();
    });

    it('allows messages after successful init', async () => {
      const client = new WebSocket(serverUrl);
      await waitForOpen(client);

      // Init first
      const sessionReadyPromise = waitForMessage(client, 'sessionReady');
      sendJSON(client, { type: 'init', accessToken: 'valid-token' });
      await sessionReadyPromise;

      // Wait for all init messages to finish (response + audio)
      await new Promise((r) => setTimeout(r, 200));

      // Now send startRecording — should not get AUTH_REQUIRED
      sendJSON(client, { type: 'startRecording' });

      // Give it a moment — if we get an AUTH_REQUIRED error, the test should fail
      await new Promise((r) => setTimeout(r, 200));

      // startRecording should have called createSession
      expect(deps.services.transcription.createSession).toHaveBeenCalled();

      client.close();
    });
  });

  // ── Recording Flow ──

  describe('recording flow', () => {
    let client: WebSocket;

    beforeEach(async () => {
      client = new WebSocket(serverUrl);
      await waitForOpen(client);

      // Init the session
      const ready = waitForMessage(client, 'sessionReady');
      sendJSON(client, { type: 'init', accessToken: 'valid-token' });
      await ready;

      // Wait for init messages to settle
      await new Promise((r) => setTimeout(r, 300));
    });

    afterEach(() => {
      client.close();
    });

    it('processes startRecording → audio → stopRecording flow', async () => {
      // 1. startRecording
      sendJSON(client, { type: 'startRecording' });
      await new Promise((r) => setTimeout(r, 100));

      expect(deps.services.transcription.createSession).toHaveBeenCalled();

      // 2. Send audio chunk
      sendJSON(client, {
        type: 'audio',
        data: Buffer.alloc(100).toString('base64'),
      });
      await new Promise((r) => setTimeout(r, 100));

      expect(deps.services.transcription.writeAudio).toHaveBeenCalled();

      // 3. stopRecording → should get transcript + response + audio
      const messages = collectMessages(client, 6, 5000);
      sendJSON(client, { type: 'stopRecording' });
      const received = await messages;

      const types = received.map((m) => m.type);

      // Should receive transcript
      expect(types).toContain('transcript');
      const transcript = received.find((m) => m.type === 'transcript');
      expect(transcript.transcript).toBe('Hello, I am the user.');

      // Should receive AI response
      expect(types).toContain('response');
      const response = received.find((m) => m.type === 'response');
      expect(response.content).toBe('That is a great answer!');

      // Should receive audio
      expect(types).toContain('audio');
    });

    it('handles empty transcript gracefully', async () => {
      deps.services.transcription.endSession.mockResolvedValue('');

      sendJSON(client, { type: 'startRecording' });
      await new Promise((r) => setTimeout(r, 100));

      const errorPromise = waitForMessage(client, 'error');
      sendJSON(client, { type: 'stopRecording' });
      const errorMsg = await errorPromise;

      expect(errorMsg.error).toContain('empty');
      expect(errorMsg.code).toBe('EMPTY_TRANSCRIPT');
    });
  });

  // ── submitData Flow ──

  describe('submitData flow', () => {
    it('processes data submission and returns response', async () => {
      const client = new WebSocket(serverUrl);
      await waitForOpen(client);

      // Init
      const ready = waitForMessage(client, 'sessionReady');
      sendJSON(client, { type: 'init', accessToken: 'valid-token' });
      await ready;
      await new Promise((r) => setTimeout(r, 300));

      // Submit data
      const messages = collectMessages(client, 4, 5000);
      sendJSON(client, {
        type: 'submitData',
        dataType: 'formResponse',
        payload: { answer: 42 },
      });
      const received = await messages;

      const types = received.map((m) => m.type);
      expect(types).toContain('response');

      const response = received.find((m) => m.type === 'response');
      expect(response.content).toBe('Data received, thank you!');

      expect(deps.services.conversation.processDataSubmission).toHaveBeenCalledWith(
        expect.anything(), // sessionId
        'formResponse',
        { answer: 42 },
        undefined // latency
      );

      client.close();
    });
  });

  // ── Invalid Messages ──

  describe('invalid messages', () => {
    it('rejects invalid JSON', async () => {
      const client = new WebSocket(serverUrl);
      await waitForOpen(client);

      const errorPromise = waitForMessage(client, 'error');
      client.send('not valid json {{{');
      const errorMsg = await errorPromise;

      expect(errorMsg.error).toContain('Invalid JSON');

      client.close();
    });

    it('rejects unknown message types', async () => {
      const client = new WebSocket(serverUrl);
      await waitForOpen(client);

      const errorPromise = waitForMessage(client, 'error');
      sendJSON(client, { type: 'unknownType' });
      const errorMsg = await errorPromise;

      expect(errorMsg.error).toBeDefined();

      client.close();
    });
  });

  // ── Disconnect ──

  describe('disconnect', () => {
    it('cleans up on client disconnect', async () => {
      const client = new WebSocket(serverUrl);
      await waitForOpen(client);

      // Init
      const ready = waitForMessage(client, 'sessionReady');
      sendJSON(client, { type: 'init', accessToken: 'valid-token' });
      await ready;
      await new Promise((r) => setTimeout(r, 200));

      expect(controller.getConnectionCount()).toBe(1);

      // Close
      client.close();
      await new Promise((r) => setTimeout(r, 200));

      expect(controller.getConnectionCount()).toBe(0);
    });

    it('cleans up transcription session on disconnect', async () => {
      const client = new WebSocket(serverUrl);
      await waitForOpen(client);

      // Init + startRecording
      const ready = waitForMessage(client, 'sessionReady');
      sendJSON(client, { type: 'init', accessToken: 'valid-token' });
      await ready;
      await new Promise((r) => setTimeout(r, 200));

      sendJSON(client, { type: 'startRecording' });
      await new Promise((r) => setTimeout(r, 200));

      // Close without stopRecording
      client.close();
      await new Promise((r) => setTimeout(r, 300));

      // Transcription session should be cleaned up
      expect(deps.services.transcription.destroySession).toHaveBeenCalled();
    });
  });

  // ── Step Advancement ──

  describe('step advancement', () => {
    it('sends stepChanged when action advances step', async () => {
      // Override processUserInput to return step advancement
      deps.services.conversation.processUserInput.mockResolvedValue({
        text: 'Great, moving to the next step!',
        currentStep: 'interview',
        isComplete: false,
        action: 'STEP_COMPLETED',
        stepAdvanced: true,
        actionTiming: 'after_response',
      });

      const client = new WebSocket(serverUrl);
      await waitForOpen(client);

      // Init
      const ready = waitForMessage(client, 'sessionReady');
      sendJSON(client, { type: 'init', accessToken: 'valid-token' });
      await ready;
      await new Promise((r) => setTimeout(r, 300));

      // Start → audio → stop
      sendJSON(client, { type: 'startRecording' });
      await new Promise((r) => setTimeout(r, 100));

      const messages = collectMessages(client, 8, 5000);
      sendJSON(client, { type: 'stopRecording' });
      const received = await messages;

      const types = received.map((m) => m.type);
      expect(types).toContain('stepChanged');

      const stepChanged = received.find((m) => m.type === 'stepChanged');
      expect(stepChanged.to).toBe('interview');
    });
  });

  // ── Conversation Complete ──

  describe('conversation complete', () => {
    it('sends conversationComplete when session ends', async () => {
      deps.services.conversation.processUserInput.mockResolvedValue({
        text: 'Thank you for the conversation!',
        currentStep: 'closing',
        isComplete: true,
        action: 'CONVERSATION_COMPLETE',
        stepAdvanced: false,
        actionTiming: 'after_response',
      });

      const client = new WebSocket(serverUrl);
      await waitForOpen(client);

      // Init
      const ready = waitForMessage(client, 'sessionReady');
      sendJSON(client, { type: 'init', accessToken: 'valid-token' });
      await ready;
      await new Promise((r) => setTimeout(r, 300));

      // Trigger stopRecording
      sendJSON(client, { type: 'startRecording' });
      await new Promise((r) => setTimeout(r, 100));

      const messages = collectMessages(client, 8, 5000);
      sendJSON(client, { type: 'stopRecording' });
      const received = await messages;

      const types = received.map((m) => m.type);
      expect(types).toContain('conversationComplete');

      const response = received.find((m) => m.type === 'response');
      expect(response.isComplete).toBe(true);
    });
  });

  // ── closeAll ──

  describe('closeAll', () => {
    it('closes all connections', async () => {
      const client1 = new WebSocket(serverUrl);
      const client2 = new WebSocket(serverUrl);
      await Promise.all([waitForOpen(client1), waitForOpen(client2)]);

      expect(controller.getConnectionCount()).toBe(2);

      const closed = Promise.all([
        new Promise<void>((r) => client1.on('close', () => r())),
        new Promise<void>((r) => client2.on('close', () => r())),
      ]);

      await controller.closeAll('test shutdown');
      await closed;

      expect(controller.getConnectionCount()).toBe(0);
    });
  });
});
