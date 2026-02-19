/**
 * E2E test helper — builds a fully wired Express app with mock DB.
 *
 * The entire middleware chain (auth → tenant → requireTenantRole → tenantScope)
 * runs for real. Only the database layer is mocked.
 */

import { Application } from 'express';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { AppConfig } from '../../src/config';
import { Connectors } from '../../src/connectors';
import { createRepositories, Repositories } from '../../src/repositories';
import { createServices, Services } from '../../src/services';
import { createMiddleware, Middleware } from '../../src/middleware';
import { createControllers, Controllers } from '../../src/controllers';
import { createExpressApp } from '../../src/routes';
import { createMockDatabase } from '@test/mocks/database.mock';
import { IDatabase } from '../../src/connectors/database/IDatabase';
import { InMemoryCacheConnector } from '../../src/connectors/cache/InMemoryCacheConnector';
import { Role, PlanId } from '../../src/constants';

// ============================================
// TEST CONFIG
// ============================================

const TEST_ACCESS_SECRET = 'test-e2e-access-secret';
const TEST_REFRESH_SECRET = 'test-e2e-refresh-secret';
const TEST_SESSION_SECRET = 'test-e2e-session-secret';
const TEST_SERVICE_SECRET = 'test-e2e-service-secret';

export const testConfig: AppConfig = {
  database: { uri: 'mongodb://localhost:27017/test', dbName: 'test' },
  server: {
    port: 0,
    nodeEnv: 'test',
    accessTokenSecret: TEST_ACCESS_SECRET,
    refreshTokenSecret: TEST_REFRESH_SECRET,
    sessionTokenSecret: TEST_SESSION_SECRET,
    serviceTokenSecret: TEST_SERVICE_SECRET,
  },
  prompt: {
    defaultModel: 'gpt-4',
    defaultMaxTokens: 100,
    defaultTemperature: 0,
  },
  storage: {
    bucketName: 'test-bucket',
    keyFilePath: '/dev/null',
    signedUrlExpirySeconds: 3600,
    maxFileSizeBytes: 1000000,
  },
  openai: { apiKey: 'test-key' },
  cache: { url: 'redis://localhost:6379', keyPrefix: 'test:rl:', enabled: false },
};

// ============================================
// APP FACTORY
// ============================================

export interface TestApp {
  app: Application;
  mockDb: jest.Mocked<IDatabase>;
  config: AppConfig;
  repositories: Repositories;
  services: Services;
  middleware: Middleware;
  controllers: Controllers;
}

export function createTestApp(): TestApp {
  const mockDb = createMockDatabase();

  const repositories = createRepositories(mockDb);

  const connectors: Connectors = {
    database: mockDb,
    llm: {} as any,
    storage: {} as any,
    cache: new InMemoryCacheConnector(),
    tts: { listVoices: jest.fn().mockResolvedValue([]), listLanguages: jest.fn().mockResolvedValue([]), clearCache: jest.fn() } as any,
  };

  const services = createServices(testConfig, connectors, repositories);
  const middleware = createMiddleware(testConfig, repositories, services);
  const controllers = createControllers(services, connectors);
  const app = createExpressApp(connectors, controllers, middleware);

  return { app, mockDb, config: testConfig, repositories, services, middleware, controllers };
}

// ============================================
// JWT TOKEN HELPERS
// ============================================

export function generateAccessToken(
  userId: string | ObjectId,
  email: string = 'test@example.com'
): string {
  return jwt.sign(
    { userId: userId.toString(), email, type: 'access' },
    TEST_ACCESS_SECRET,
    { expiresIn: '15m' }
  );
}

export function generateExpiredToken(
  userId: string | ObjectId,
  email: string = 'test@example.com'
): string {
  return jwt.sign(
    { userId: userId.toString(), email, type: 'access' },
    TEST_ACCESS_SECRET,
    { expiresIn: '-1s' }
  );
}

// ============================================
// DB SETUP HELPERS
// ============================================

export interface TestUser {
  _id: ObjectId;
  email: string;
  name: string;
  passwordHash: string;
  refreshTokens: any[];
  organizationId?: ObjectId;
  planId: PlanId;
  createdAt: Date;
  updatedAt: Date;
}

export function createTestUser(overrides: Partial<TestUser> = {}): TestUser {
  return {
    _id: overrides._id || new ObjectId(),
    email: overrides.email || 'test@example.com',
    name: overrides.name || 'Test User',
    passwordHash: overrides.passwordHash || '$2b$12$hashed',
    refreshTokens: overrides.refreshTokens || [],
    organizationId: overrides.organizationId,
    planId: overrides.planId || PlanId.STARTER,
    createdAt: overrides.createdAt || new Date(),
    updatedAt: overrides.updatedAt || new Date(),
  };
}

export interface TestOrganization {
  _id: ObjectId;
  name: string;
  logoUrl?: string;
  creatorId: ObjectId;
  members: Array<{
    userId: ObjectId;
    email: string;
    role: Role;
    addedAt: Date;
  }>;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function createTestOrganization(overrides: Partial<TestOrganization> = {}): TestOrganization {
  const creatorId = overrides.creatorId || new ObjectId();
  return {
    _id: overrides._id || new ObjectId(),
    name: overrides.name || 'Test Organization',
    logoUrl: overrides.logoUrl,
    creatorId,
    members: overrides.members || [
      { userId: creatorId, email: 'creator@test.com', role: Role.ADMIN, addedAt: new Date() },
    ],
    active: overrides.active ?? true,
    createdAt: overrides.createdAt || new Date(),
    updatedAt: overrides.updatedAt || new Date(),
  };
}

export interface TestAgent {
  _id: ObjectId;
  name: string;
  ownerId: ObjectId;
  organizationId?: ObjectId;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function createTestAgent(overrides: Partial<TestAgent> = {}): TestAgent {
  return {
    _id: overrides._id || new ObjectId(),
    name: overrides.name || 'Test Agent',
    ownerId: overrides.ownerId || new ObjectId(),
    organizationId: overrides.organizationId,
    active: overrides.active ?? true,
    createdAt: overrides.createdAt || new Date(),
    updatedAt: overrides.updatedAt || new Date(),
  };
}

/**
 * Prime the users collection to return a user on findOne.
 * Auth middleware calls: userRepository.findById(userId) → collection.findOne({_id})
 */
export function setupUserLookup(
  mockDb: jest.Mocked<IDatabase>,
  user: TestUser | null
): void {
  const usersCollection = mockDb.getCollection('users');
  (usersCollection.findOne as jest.Mock).mockResolvedValueOnce(user);
}

/**
 * Prime the organizations collection to return an org on findOne.
 * Tenant middleware calls: organizationRepository.findById(orgId) → collection.findOne({_id})
 */
export function setupOrgLookup(
  mockDb: jest.Mocked<IDatabase>,
  org: TestOrganization | null
): void {
  const orgsCollection = mockDb.getCollection('organizations');
  (orgsCollection.findOne as jest.Mock).mockResolvedValueOnce(org);
}

/**
 * Prime the agents collection for countDocuments (exists check).
 * TenantScope.agent() calls: agentRepository.isOwnedByUser or belongsToOrganization
 * → collection.countDocuments(filter) → returns 0 or 1
 */
export function setupAgentExists(
  mockDb: jest.Mocked<IDatabase>,
  exists: boolean
): void {
  const agentsCollection = mockDb.getCollection('agents');
  (agentsCollection.countDocuments as jest.Mock).mockResolvedValueOnce(exists ? 1 : 0);
}

/**
 * Prime the agents collection to return an agent on findOne.
 */
export function setupAgentLookup(
  mockDb: jest.Mocked<IDatabase>,
  agent: TestAgent | null
): void {
  const agentsCollection = mockDb.getCollection('agents');
  (agentsCollection.findOne as jest.Mock).mockResolvedValueOnce(agent);
}

/**
 * Prime the agents collection for find (list operations).
 * TenantScope.resolveAgentIds() or controller list calls.
 */
export function setupAgentList(
  mockDb: jest.Mocked<IDatabase>,
  agents: TestAgent[]
): void {
  const agentsCollection = mockDb.getCollection('agents');
  const findResult = {
    toArray: jest.fn().mockResolvedValueOnce(agents),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
  };
  (agentsCollection.find as jest.Mock).mockReturnValueOnce(findResult);
}
