/**
 * Mock STT Connector and Stream
 */

export function createMockSTTStream(transcript = 'Hello world') {
  let interimCallback: ((result: any) => void) | null = null;
  let finalCallback: ((result: any) => void) | null = null;
  let errorCallback: ((error: Error) => void) | null = null;

  return {
    id: `mock-stream-${Date.now()}`,
    write: jest.fn(),
    end: jest.fn().mockResolvedValue(transcript),
    onInterim: jest.fn((cb: any) => {
      interimCallback = cb;
    }),
    onFinal: jest.fn((cb: any) => {
      finalCallback = cb;
    }),
    onError: jest.fn((cb: any) => {
      errorCallback = cb;
    }),
    destroy: jest.fn(),
    isActive: jest.fn().mockReturnValue(true),
    // Test helpers to trigger callbacks
    _triggerInterim: (result: any) => interimCallback?.(result),
    _triggerFinal: (result: any) => finalCallback?.(result),
    _triggerError: (error: Error) => errorCallback?.(error),
  };
}

export function createMockSTTConnector(transcript = 'Hello world') {
  const stream = createMockSTTStream(transcript);

  return {
    connector: {
      createStream: jest.fn().mockReturnValue(stream),
      isReady: jest.fn().mockReturnValue(true),
      getSupportedEncodings: jest.fn().mockReturnValue(['WEBM_OPUS', 'LINEAR16']),
      getSupportedLanguages: jest.fn().mockReturnValue(['en-US', 'it-IT']),
    },
    stream,
  };
}
