/**
 * Mock factories for creating test data
 * These factories help create consistent test data for documents and DTOs
 */

import { ObjectId } from 'mongodb';
import { UserDocument, RefreshTokenEntry } from '@models/documents/user.document';
import { UserDTO, AuthResponseDTO, TokenPairDTO } from '@models/dto/user.dto';
import { PlanId } from '@constants';
import { createObjectId, createMockDate } from './test-utils';

// ============================================
// USER MOCKS
// ============================================

export interface MockUserDocumentOptions {
  _id?: ObjectId;
  email?: string;
  name?: string;
  companyName?: string;
  passwordHash?: string;
  refreshTokens?: RefreshTokenEntry[];
  organizationId?: ObjectId;
  planId?: PlanId;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Create a mock UserDocument for testing
 */
export function createMockUserDocument(options: MockUserDocumentOptions = {}): UserDocument {
  return {
    _id: options._id || createObjectId(),
    email: options.email || 'test@example.com',
    name: options.name || 'Test User',
    companyName: options.companyName,
    passwordHash: options.passwordHash || '$2b$12$mockHashedPassword',
    refreshTokens: options.refreshTokens || [],
    organizationId: options.organizationId,
    planId: options.planId || PlanId.FREE,
    createdAt: options.createdAt || createMockDate(),
    updatedAt: options.updatedAt || createMockDate(),
  };
}

export interface MockUserDTOOptions {
  _id?: string;
  email?: string;
  name?: string;
  companyName?: string;
  organizationId?: string;
  planId?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Create a mock UserDTO for testing
 */
export function createMockUserDTO(options: MockUserDTOOptions = {}): UserDTO {
  const defaultId = createObjectId().toString();
  return {
    _id: options._id || defaultId,
    email: options.email || 'test@example.com',
    name: options.name || 'Test User',
    companyName: options.companyName,
    organizationId: options.organizationId,
    planId: options.planId || PlanId.FREE,
    createdAt: options.createdAt || createMockDate().toISOString(),
    updatedAt: options.updatedAt || createMockDate().toISOString(),
  };
}

/**
 * Create a mock RefreshTokenEntry for testing
 */
export function createMockRefreshTokenEntry(
  options: Partial<RefreshTokenEntry> = {}
): RefreshTokenEntry {
  return {
    tokenHash: options.tokenHash || 'mock-token-hash',
    expiresAt: options.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    createdAt: options.createdAt || createMockDate(),
    userAgent: options.userAgent || 'Mozilla/5.0 Test Browser',
    ipAddress: options.ipAddress || '127.0.0.1',
  };
}

/**
 * Create a mock TokenPairDTO for testing
 */
export function createMockTokenPair(options: Partial<TokenPairDTO> = {}): TokenPairDTO {
  return {
    accessToken: options.accessToken || 'mock-access-token',
    refreshToken: options.refreshToken || 'mock-refresh-token',
  };
}

/**
 * Create a mock AuthResponseDTO for testing
 */
export function createMockAuthResponse(
  userOptions: MockUserDTOOptions = {},
  tokenOptions: Partial<TokenPairDTO> = {}
): AuthResponseDTO {
  return {
    user: createMockUserDTO(userOptions),
    ...createMockTokenPair(tokenOptions),
  };
}

// ============================================
// VALIDATION INPUT MOCKS
// ============================================

export function createMockSignupInput(overrides = {}) {
  return {
    email: 'newuser@example.com',
    name: 'New User',
    password: 'SecurePassword123!',
    companyName: 'Test Company',
    ...overrides,
  };
}

export function createMockLoginInput(overrides = {}) {
  return {
    email: 'test@example.com',
    password: 'password123',
    ...overrides,
  };
}

export function createMockUpdateUserInput(overrides = {}) {
  return {
    name: 'Updated Name',
    companyName: 'Updated Company',
    ...overrides,
  };
}

export function createMockChangePasswordInput(overrides = {}) {
  return {
    currentPassword: 'oldPassword123',
    newPassword: 'newPassword123',
    ...overrides,
  };
}
