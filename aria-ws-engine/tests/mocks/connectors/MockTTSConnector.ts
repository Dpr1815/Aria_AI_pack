/**
 * Mock TTS and LipSync Connectors
 */

export function createMockTTSConnector() {
  return {
    synthesize: jest.fn().mockResolvedValue({
      audioContent: Buffer.alloc(48000, 0), // 1 second of silence at 24kHz 16-bit
      sampleRateHertz: 24000,
      audioEncoding: 'LINEAR16',
    }),
    isReady: jest.fn().mockReturnValue(true),
    getVoices: jest.fn().mockResolvedValue([]),
  };
}

export function createMockLipSyncConnector(enabled = false) {
  return {
    generate: jest.fn().mockResolvedValue({
      cues: [
        { start: 0, end: 0.1, value: 'X', morphs: {} },
        { start: 0.1, end: 0.3, value: 'B', morphs: { mouthOpen: 0.3 } },
      ],
      duration: 1.0,
      text: 'test',
    }),
    isEnabled: jest.fn().mockReturnValue(enabled),
    isReady: jest.fn().mockReturnValue(enabled),
  };
}
