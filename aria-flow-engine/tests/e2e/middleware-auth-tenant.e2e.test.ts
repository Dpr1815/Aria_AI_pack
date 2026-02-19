/**
 * E2E tests for the Auth → Tenant → RequireTenantRole → TenantScope middleware pipeline.
 *
 * Uses supertest against a real Express app with real middleware.
 * Only the database layer is mocked.
 */

import request from 'supertest';
import { ObjectId } from 'mongodb';
import { Role, PlanId } from '../../src/constants';
import {
  createTestApp,
  generateAccessToken,
  generateExpiredToken,
  createTestUser,
  createTestOrganization,
  createTestAgent,
  setupUserLookup,
  setupOrgLookup,
  setupAgentExists,
  setupAgentLookup,
  setupAgentList,
  TestApp,
} from '@test/helpers/create-test-app';

describe('Middleware Pipeline - E2E', () => {
  let testApp: TestApp;

  beforeEach(() => {
    jest.clearAllMocks();
    testApp = createTestApp();
  });

  // ============================================
  // AUTH LAYER
  // ============================================

  describe('Auth middleware', () => {
    it('should return 401 when no Authorization header', async () => {
      const res = await request(testApp.app).get('/api/agents');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 when JWT is invalid', async () => {
      const res = await request(testApp.app)
        .get('/api/agents')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 when JWT is expired', async () => {
      const userId = new ObjectId();
      const token = generateExpiredToken(userId);

      const res = await request(testApp.app)
        .get('/api/agents')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 when user not found in database', async () => {
      const userId = new ObjectId();
      const token = generateAccessToken(userId);

      // Auth middleware looks up user → not found
      setupUserLookup(testApp.mockDb, null);

      const res = await request(testApp.app)
        .get('/api/agents')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ============================================
  // TENANT LAYER — Personal
  // ============================================

  describe('Tenant middleware - personal', () => {
    it('should resolve personal tenant when no X-Organization-ID header', async () => {
      const user = createTestUser();
      const token = generateAccessToken(user._id, user.email);

      // Auth middleware: findById → user
      setupUserLookup(testApp.mockDb, user);
      // Tenant middleware: no org header → personal tenant
      // Agent list route calls resolveAgentIds (not used here — list uses tenant directly)
      // The controller calls agentService.listAgents which queries agents collection
      const agentsCollection = testApp.mockDb.getCollection('agents');
      // findPaginated calls findMany + count
      const findResult = {
        toArray: jest.fn().mockResolvedValue([]),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
      };
      (agentsCollection.find as jest.Mock).mockReturnValueOnce(findResult);
      (agentsCollection.countDocuments as jest.Mock).mockResolvedValueOnce(0);

      const res = await request(testApp.app)
        .get('/api/agents')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ============================================
  // TENANT LAYER — Organization
  // ============================================

  describe('Tenant middleware - organization', () => {
    it('should resolve org tenant when X-Organization-ID header is valid', async () => {
      const user = createTestUser();
      const org = createTestOrganization({
        creatorId: user._id,
        members: [{ userId: user._id, email: user.email, role: Role.ADMIN, addedAt: new Date() }],
      });
      const token = generateAccessToken(user._id, user.email);

      // Auth: findById → user
      setupUserLookup(testApp.mockDb, user);
      // Tenant: findById(orgId) → org
      setupOrgLookup(testApp.mockDb, org);
      // Agent list: findPaginated
      const agentsCollection = testApp.mockDb.getCollection('agents');
      const findResult = {
        toArray: jest.fn().mockResolvedValue([]),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
      };
      (agentsCollection.find as jest.Mock).mockReturnValueOnce(findResult);
      (agentsCollection.countDocuments as jest.Mock).mockResolvedValueOnce(0);

      const res = await request(testApp.app)
        .get('/api/agents')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-ID', org._id.toString());

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 403 when organization not found', async () => {
      const user = createTestUser();
      const token = generateAccessToken(user._id, user.email);
      const fakeOrgId = new ObjectId();

      // Auth: findById → user
      setupUserLookup(testApp.mockDb, user);
      // Tenant: findById(orgId) → null
      setupOrgLookup(testApp.mockDb, null);

      const res = await request(testApp.app)
        .get('/api/agents')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-ID', fakeOrgId.toString());

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should return 403 when user is not a member of the organization', async () => {
      const user = createTestUser();
      const otherUserId = new ObjectId();
      const org = createTestOrganization({
        creatorId: otherUserId,
        members: [{ userId: otherUserId, email: 'other@test.com', role: Role.ADMIN, addedAt: new Date() }],
      });
      const token = generateAccessToken(user._id, user.email);

      // Auth: findById → user
      setupUserLookup(testApp.mockDb, user);
      // Tenant: findById(orgId) → org (user is not a member)
      setupOrgLookup(testApp.mockDb, org);

      const res = await request(testApp.app)
        .get('/api/agents')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-ID', org._id.toString());

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // ============================================
  // ORGANIZATION ROLE ENFORCEMENT (service-level)
  // ============================================

  describe('Organization role enforcement', () => {
    it('should return 403 when org member has insufficient role', async () => {
      const user = createTestUser();
      const creatorId = new ObjectId();
      const orgWithReadMember = createTestOrganization({
        creatorId,
        members: [
          { userId: creatorId, email: 'creator@test.com', role: Role.ADMIN, addedAt: new Date() },
          { userId: user._id, email: user.email, role: Role.READ, addedAt: new Date() },
        ],
      });
      const token = generateAccessToken(user._id, user.email);

      // Auth: findById → user
      setupUserLookup(testApp.mockDb, user);
      // Service: findByIdOrThrow(orgId) → org (requireRole finds READ < ADMIN → 403)
      const orgsCollection = testApp.mockDb.getCollection('organizations');
      (orgsCollection.findOne as jest.Mock).mockResolvedValueOnce(orgWithReadMember);

      // PATCH /api/organizations/:id — service checks ADMIN role
      const res = await request(testApp.app)
        .patch(`/api/organizations/${orgWithReadMember._id.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should allow access when org member has sufficient role', async () => {
      const user = createTestUser();
      const org = createTestOrganization({
        creatorId: user._id,
        members: [
          { userId: user._id, email: user.email, role: Role.ADMIN, addedAt: new Date() },
        ],
      });
      const token = generateAccessToken(user._id, user.email);

      // Auth: findById → user
      setupUserLookup(testApp.mockDb, user);
      // OrganizationService.updateOrganization:
      // 1. findByIdOrThrow(orgId) → org (requireRole → ADMIN ✓)
      const orgsCollection = testApp.mockDb.getCollection('organizations');
      (orgsCollection.findOne as jest.Mock).mockResolvedValueOnce(org);
      // 2. updateByIdOrThrow → findOneAndUpdate → updated org
      const updatedOrg = { ...org, name: 'Updated' };
      (orgsCollection.findOneAndUpdate as jest.Mock).mockResolvedValueOnce(updatedOrg);

      const res = await request(testApp.app)
        .patch(`/api/organizations/${org._id.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Updated');
    });

    it('should return 403 when non-member tries to view organization', async () => {
      const user = createTestUser();
      const otherUserId = new ObjectId();
      const org = createTestOrganization({
        creatorId: otherUserId,
        members: [
          { userId: otherUserId, email: 'other@test.com', role: Role.ADMIN, addedAt: new Date() },
        ],
      });
      const token = generateAccessToken(user._id, user.email);

      // Auth: findById → user
      setupUserLookup(testApp.mockDb, user);
      // Service: findByIdOrThrow(orgId) → org (user is not a member → 403)
      const orgsCollection = testApp.mockDb.getCollection('organizations');
      (orgsCollection.findOne as jest.Mock).mockResolvedValueOnce(org);

      const res = await request(testApp.app)
        .get(`/api/organizations/${org._id.toString()}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // ============================================
  // TENANT SCOPE
  // ============================================

  describe('tenantScope', () => {
    it('should return 403 when agent belongs to a different organization', async () => {
      const user = createTestUser();
      const org = createTestOrganization({
        creatorId: user._id,
        members: [
          { userId: user._id, email: user.email, role: Role.ADMIN, addedAt: new Date() },
        ],
      });
      const agentId = new ObjectId();
      const token = generateAccessToken(user._id, user.email);

      // Auth: findById → user
      setupUserLookup(testApp.mockDb, user);
      // Tenant: findById(orgId) → org
      setupOrgLookup(testApp.mockDb, org);
      // tenantScope.agent(): belongsToOrganization → countDocuments → 0 (not found)
      setupAgentExists(testApp.mockDb, false);

      const res = await request(testApp.app)
        .get(`/api/agents/${agentId.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-ID', org._id.toString());

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should allow access when agent belongs to the user org', async () => {
      const user = createTestUser();
      const org = createTestOrganization({
        creatorId: user._id,
        members: [
          { userId: user._id, email: user.email, role: Role.ADMIN, addedAt: new Date() },
        ],
      });
      const agent = createTestAgent({
        ownerId: user._id,
        organizationId: org._id,
      });
      const token = generateAccessToken(user._id, user.email);

      // Auth: findById → user
      setupUserLookup(testApp.mockDb, user);
      // Tenant: findById(orgId) → org
      setupOrgLookup(testApp.mockDb, org);
      // tenantScope.agent(): belongsToOrganization → countDocuments → 1
      setupAgentExists(testApp.mockDb, true);
      // AgentService.getAgent: findByIdOrThrow → findOne
      setupAgentLookup(testApp.mockDb, agent);

      const res = await request(testApp.app)
        .get(`/api/agents/${agent._id.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Organization-ID', org._id.toString());

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should allow personal tenant to access own agent', async () => {
      const user = createTestUser();
      const agent = createTestAgent({ ownerId: user._id });
      const token = generateAccessToken(user._id, user.email);

      // Auth: findById → user
      setupUserLookup(testApp.mockDb, user);
      // Tenant: no org header → personal tenant
      // tenantScope.agent(): isOwnedByUser → countDocuments → 1
      setupAgentExists(testApp.mockDb, true);
      // AgentService.getAgent: findByIdOrThrow → findOne
      setupAgentLookup(testApp.mockDb, agent);

      const res = await request(testApp.app)
        .get(`/api/agents/${agent._id.toString()}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should deny personal tenant access to another user agent', async () => {
      const user = createTestUser();
      const otherAgentId = new ObjectId();
      const token = generateAccessToken(user._id, user.email);

      // Auth: findById → user
      setupUserLookup(testApp.mockDb, user);
      // Tenant: no org header → personal
      // tenantScope.agent(): isOwnedByUser → countDocuments → 0
      setupAgentExists(testApp.mockDb, false);

      const res = await request(testApp.app)
        .get(`/api/agents/${otherAgentId.toString()}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});
