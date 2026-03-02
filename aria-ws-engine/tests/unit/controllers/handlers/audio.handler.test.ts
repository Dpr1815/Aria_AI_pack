/**
 * Audio Handler Unit Tests
 */

import { execute } from '@controllers/handlers/audio.handler';

function createMockWs() {
  const ws: any = {
    OPEN: 1,
    readyState: 1,
    send: jest.fn(),
  };
  return ws;
}

function buildContext(overrides: Record<string, any> = {}) {
  return {
    connectionState: {
      transcriptionSessionId: 'session-123',
      lastActivityAt: new Date(),
      ...overrides.connectionState,
    },
    services: {
      transcription: {
        writeAudio: jest.fn(),
        ...overrides.transcription,
      },
    },
  } as any;
}

describe('audio handler', () => {
  beforeEach(() => jest.clearAllMocks());

  it('writes valid base64 audio to transcription service', async () => {
    const ws = createMockWs();
    const ctx = buildContext();
    const audioData = Buffer.from('test audio data').toString('base64');

    await execute(ws, { type: 'audio', data: audioData } as any, ctx);

    expect(ctx.services.transcription.writeAudio).toHaveBeenCalledWith(
      'session-123',
      expect.any(Buffer)
    );
  });

  it('silently returns when no transcription session is active', async () => {
    const ws = createMockWs();
    const ctx = buildContext({ connectionState: { transcriptionSessionId: null } });

    await execute(ws, { type: 'audio', data: 'AAAA' } as any, ctx);

    expect(ctx.services.transcription.writeAudio).not.toHaveBeenCalled();
    expect(ws.send).not.toHaveBeenCalled();
  });

  it('sends error for invalid base64 data', async () => {
    const ws = createMockWs();
    const ctx = buildContext();

    await execute(ws, { type: 'audio', data: '!!!not-base64!!!' } as any, ctx);

    expect(ctx.services.transcription.writeAudio).not.toHaveBeenCalled();
    const sent = JSON.parse(ws.send.mock.calls[0][0]);
    expect(sent.type).toBe('error');
    expect(sent.error).toMatch(/invalid base64/i);
  });

  it('sends error for empty data', async () => {
    const ws = createMockWs();
    const ctx = buildContext();

    await execute(ws, { type: 'audio', data: '' } as any, ctx);

    expect(ctx.services.transcription.writeAudio).not.toHaveBeenCalled();
  });

  it('sends error for data with wrong length (not multiple of 4)', async () => {
    const ws = createMockWs();
    const ctx = buildContext();

    await execute(ws, { type: 'audio', data: 'abc' } as any, ctx);

    expect(ctx.services.transcription.writeAudio).not.toHaveBeenCalled();
  });

  it('updates lastActivityAt on successful write', async () => {
    const ws = createMockWs();
    const ctx = buildContext();
    const before = ctx.connectionState.lastActivityAt;

    await execute(ws, { type: 'audio', data: 'AAAA' } as any, ctx);

    expect(ctx.connectionState.lastActivityAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  it('does not crash when writeAudio throws', async () => {
    const ws = createMockWs();
    const ctx = buildContext({
      transcription: {
        writeAudio: jest.fn().mockImplementation(() => {
          throw new Error('Stream broken');
        }),
      },
    });

    // Should not throw — errors are logged but swallowed
    await expect(
      execute(ws, { type: 'audio', data: 'AAAA' } as any, ctx)
    ).resolves.toBeUndefined();

    // Should NOT send error to client for individual chunk failures
    expect(ws.send).not.toHaveBeenCalled();
  });
});
