/**
 * Mock Agent Data
 */

import { ObjectId } from 'mongodb';

export function createMockAgent(overrides: Record<string, unknown> = {}) {
  return {
    _id: new ObjectId(),
    name: 'Test Agent',
    description: 'A mock agent for testing',
    ownerId: new ObjectId(),
    status: 'active' as const,
    voice: {
      languageCode: 'en-US',
      name: 'en-US-Journey-D',
      gender: 'MALE' as const,
    },
    features: {
      lipSync: false,
      sessionPersistence: false,
      autoSummary: false,
      videoRecording: false,
    },
    stepOrder: ['greeting', 'interview', 'closing'],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockAgentPrompt(overrides: Record<string, unknown> = {}) {
  return {
    _id: new ObjectId(),
    agentId: new ObjectId(),
    key: 'greeting',
    system: 'You are a helpful assistant. Greet the participant.',
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 1024,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
