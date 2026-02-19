/**
 * Mock Session & Conversation Data
 */

import { ObjectId } from 'mongodb';

export function createMockSession(overrides: Record<string, unknown> = {}) {
  return {
    _id: new ObjectId(),
    agentId: new ObjectId(),
    participantId: new ObjectId(),
    agentOwnerId: new ObjectId(),
    accessTokenHash: 'mock-hash',
    accessTokenExpiresAt: new Date(Date.now() + 3600_000),
    status: 'active' as const,
    currentStep: 'greeting',
    data: {},
    lastActivityAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockConversation(overrides: Record<string, unknown> = {}) {
  return {
    _id: new ObjectId(),
    sessionId: new ObjectId(),
    messages: [] as any[],
    messageCount: 0,
    stepMessageCounts: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockParticipant(overrides: Record<string, unknown> = {}) {
  return {
    _id: new ObjectId(),
    name: 'Test User',
    email: 'test@example.com',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockMessage(overrides: Record<string, unknown> = {}) {
  return {
    sequence: 1,
    stepKey: 'greeting',
    role: 'assistant' as const,
    content: 'Hello! How are you today?',
    createdAt: new Date(),
    ...overrides,
  };
}
