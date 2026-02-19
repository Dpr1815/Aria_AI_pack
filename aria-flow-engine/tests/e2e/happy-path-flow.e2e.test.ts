/**
 * E2E tests for the Organization happy-path flow.
 *
 * Tests cross-service operations via real HTTP requests:
 * create org → get org → update org → add member → member leaves.
 */

import request from 'supertest';
import { ObjectId } from 'mongodb';
import { Role, PlanId } from '../../src/constants';
import {
  createTestApp,
  generateAccessToken,
  createTestUser,
  createTestOrganization,
  setupUserLookup,
  setupOrgLookup,
  TestApp,
  TestUser,
} from '@test/helpers/create-test-app';

describe('Organization Happy Path - E2E', () => {
  let testApp: TestApp;

  beforeEach(() => {
    jest.clearAllMocks();
    testApp = createTestApp();
  });

  describe('Create organization', () => {
    it('should create organization via POST /api/organizations', async () => {
      const user = createTestUser();
      const token = generateAccessToken(user._id, user.email);
      const orgId = new ObjectId();

      // Auth: findById → user
      setupUserLookup(testApp.mockDb, user);

      // OrganizationService.createOrganization:
      const usersCollection = testApp.mockDb.getCollection('users');
      const orgsCollection = testApp.mockDb.getCollection('organizations');

      // 1. findByIdOrThrow(creatorId) → user (via users.findOne)
      (usersCollection.findOne as jest.Mock).mockResolvedValueOnce(user);
      // 2. findByCreatorId → null (via organizations.findOne)
      (orgsCollection.findOne as jest.Mock).mockResolvedValueOnce(null);
      // 3. create → insertOne
      (orgsCollection.insertOne as jest.Mock).mockResolvedValueOnce({
        insertedId: orgId,
        acknowledged: true,
      });
      // 4. setOrganization → users.findOneAndUpdate
      (usersCollection.findOneAndUpdate as jest.Mock).mockResolvedValueOnce({
        ...user,
        organizationId: orgId,
      });

      const res = await request(testApp.app)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'My Org', logoUrl: 'https://example.com/logo.png' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(
        expect.objectContaining({
          name: 'My Org',
          logoUrl: 'https://example.com/logo.png',
          creatorId: user._id.toString(),
          active: true,
          members: expect.arrayContaining([
            expect.objectContaining({
              userId: user._id.toString(),
              email: user.email,
              role: Role.ADMIN,
            }),
          ]),
        })
      );
    });
  });

  describe('Get user organization', () => {
    it('should return user org via GET /api/organizations', async () => {
      const user = createTestUser();
      const org = createTestOrganization({
        creatorId: user._id,
        members: [{ userId: user._id, email: user.email, role: Role.ADMIN, addedAt: new Date() }],
      });
      const token = generateAccessToken(user._id, user.email);

      // Auth: findById → user
      setupUserLookup(testApp.mockDb, user);
      // OrganizationService.getUserOrganization: findByMemberId → organizations.findOne
      setupOrgLookup(testApp.mockDb, org);

      const res = await request(testApp.app)
        .get('/api/organizations')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(org.name);
      expect(res.body.data._id).toBe(org._id.toString());
    });
  });

  describe('Update organization', () => {
    it('should update org name and logoUrl via PATCH /api/organizations/:id', async () => {
      const user = createTestUser();
      const org = createTestOrganization({
        creatorId: user._id,
        members: [{ userId: user._id, email: user.email, role: Role.ADMIN, addedAt: new Date() }],
      });
      const token = generateAccessToken(user._id, user.email);

      // Auth: findById → user
      setupUserLookup(testApp.mockDb, user);

      // OrganizationService.updateOrganization:
      const orgsCollection = testApp.mockDb.getCollection('organizations');
      // 1. findByIdOrThrow → organizations.findOne (requireRole → ADMIN ✓)
      (orgsCollection.findOne as jest.Mock).mockResolvedValueOnce(org);
      // 2. updateByIdOrThrow → organizations.findOneAndUpdate
      const updatedOrg = {
        ...org,
        name: 'Renamed Org',
        logoUrl: 'https://new-logo.com/img.png',
      };
      (orgsCollection.findOneAndUpdate as jest.Mock).mockResolvedValueOnce(updatedOrg);

      const res = await request(testApp.app)
        .patch(`/api/organizations/${org._id.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Renamed Org', logoUrl: 'https://new-logo.com/img.png' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Renamed Org');
      expect(res.body.data.logoUrl).toBe('https://new-logo.com/img.png');
    });
  });

  describe('Add member', () => {
    it('should add member via POST /api/organizations/:id/members', async () => {
      const admin = createTestUser({ email: 'admin@test.com', planId: PlanId.STARTER });
      const newMember = createTestUser({ email: 'newmember@test.com' });
      const org = createTestOrganization({
        creatorId: admin._id,
        members: [{ userId: admin._id, email: admin.email, role: Role.ADMIN, addedAt: new Date() }],
      });
      const token = generateAccessToken(admin._id, admin.email);

      // Auth: findById → admin user
      setupUserLookup(testApp.mockDb, admin);

      // OrganizationService.addMember:
      const orgsCollection = testApp.mockDb.getCollection('organizations');
      const usersCollection = testApp.mockDb.getCollection('users');
      // 1. findByIdOrThrow(orgId) → org (requireRole → ADMIN ✓)
      (orgsCollection.findOne as jest.Mock).mockResolvedValueOnce(org);
      // 2. findByIdOrThrow(creatorId) → admin for plan check (users.findOne)
      (usersCollection.findOne as jest.Mock).mockResolvedValueOnce(admin);
      // 3. findByEmail → new member (users.findOne)
      (usersCollection.findOne as jest.Mock).mockResolvedValueOnce(newMember);
      // 4. addMember → organizations.findOneAndUpdate
      const orgWithNewMember = {
        ...org,
        members: [
          ...org.members,
          { userId: newMember._id, email: newMember.email, role: Role.READ, addedAt: new Date() },
        ],
      };
      (orgsCollection.findOneAndUpdate as jest.Mock).mockResolvedValueOnce(orgWithNewMember);
      // 5. setOrganization → users.findOneAndUpdate
      (usersCollection.findOneAndUpdate as jest.Mock).mockResolvedValueOnce({
        ...newMember,
        organizationId: org._id,
      });

      const res = await request(testApp.app)
        .post(`/api/organizations/${org._id.toString()}/members`)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'newmember@test.com', role: Role.READ });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.members).toHaveLength(2);
      expect(res.body.data.members[1]).toEqual(
        expect.objectContaining({
          email: 'newmember@test.com',
          role: Role.READ,
        })
      );
    });
  });

  describe('Leave organization', () => {
    it('should allow member to leave via POST /api/organizations/:id/leave', async () => {
      const creatorId = new ObjectId();
      const member = createTestUser({ email: 'member@test.com' });
      const org = createTestOrganization({
        creatorId,
        members: [
          { userId: creatorId, email: 'creator@test.com', role: Role.ADMIN, addedAt: new Date() },
          { userId: member._id, email: member.email, role: Role.READ, addedAt: new Date() },
        ],
      });
      const token = generateAccessToken(member._id, member.email);

      // Auth: findById → member
      setupUserLookup(testApp.mockDb, member);

      // OrganizationService.leaveOrganization:
      const orgsCollection = testApp.mockDb.getCollection('organizations');
      const usersCollection = testApp.mockDb.getCollection('users');
      // 1. findByIdOrThrow(orgId) → org (checks membership)
      (orgsCollection.findOne as jest.Mock).mockResolvedValueOnce(org);
      // 2. removeMember → organizations.findOneAndUpdate
      const orgAfterLeave = {
        ...org,
        members: [org.members[0]],
      };
      (orgsCollection.findOneAndUpdate as jest.Mock).mockResolvedValueOnce(orgAfterLeave);
      // 3. setOrganization(null) → users.findOneAndUpdate
      (usersCollection.findOneAndUpdate as jest.Mock).mockResolvedValueOnce({
        ...member,
        organizationId: undefined,
      });

      const res = await request(testApp.app)
        .post(`/api/organizations/${org._id.toString()}/leave`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeNull();
    });
  });
});
