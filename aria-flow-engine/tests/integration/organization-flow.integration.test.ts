/**
 * Integration tests for Organization flow
 *
 * Tests the full stack: controller → service → repository (with mocked DB).
 * Organization authorization (membership + role) is handled by the service layer.
 */

import { OrganizationController } from '@controllers/organization.controller';
import { OrganizationService } from '@services/organization.service';
import { OrganizationRepository } from '@repositories/organization.repository';
import { UserRepository } from '@repositories/user.repository';
import {
  createMockDatabase,
  mockFindOne,
  mockInsertOne,
  mockFindOneAndUpdate,
} from '@test/mocks/database.mock';
import { Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import { Role, PlanId } from '../../src/constants';

describe('Organization Flow - Integration', () => {
  let controller: OrganizationController;
  let service: OrganizationService;
  let orgRepo: OrganizationRepository;
  let userRepo: UserRepository;
  let mockDb: ReturnType<typeof createMockDatabase>;

  const mockCreatorId = new ObjectId();
  const mockOrgId = new ObjectId();
  const mockDate = new Date('2024-01-01T00:00:00.000Z');

  const mockCreatorUser = {
    _id: mockCreatorId,
    email: 'creator@test.com',
    name: 'Creator',
    passwordHash: '$2b$12$hashed',
    refreshTokens: [],
    planId: PlanId.STARTER,
    createdAt: mockDate,
    updatedAt: mockDate,
  };

  const mockOrgDocument = {
    _id: mockOrgId,
    name: 'Test Organization',
    logoUrl: 'https://example.com/logo.png',
    creatorId: mockCreatorId,
    members: [
      {
        userId: mockCreatorId,
        email: 'creator@test.com',
        role: Role.ADMIN,
        addedAt: mockDate,
      },
    ],
    active: true,
    createdAt: mockDate,
    updatedAt: mockDate,
  };

  function createMockReqRes(overrides: Partial<Request> = {}) {
    const req = {
      params: {},
      body: {},
      query: {},
      user: { _id: mockCreatorId } as any,
      ...overrides,
    } as unknown as Request;

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as Response;

    const next = jest.fn() as NextFunction;

    return { req, res, next };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = createMockDatabase();
    orgRepo = new OrganizationRepository(mockDb);
    userRepo = new UserRepository(mockDb);
    service = new OrganizationService(orgRepo, userRepo);
    controller = new OrganizationController(service);
  });

  describe('Create organization flow', () => {
    it('should create organization through full stack', async () => {
      const usersCollection = mockDb.getCollection('users');
      const orgsCollection = mockDb.getCollection('organizations');

      // findByIdOrThrow(creatorId) → user exists, no org
      mockFindOne(usersCollection, mockCreatorUser as any);
      // findByCreatorId → no existing org
      mockFindOne(orgsCollection, null);
      // create → insert
      mockInsertOne(orgsCollection, mockOrgId);
      // setOrganization → update user
      mockFindOneAndUpdate(usersCollection, mockCreatorUser as any);

      const { req, res, next } = createMockReqRes({
        body: { name: 'Test Organization', logoUrl: 'https://example.com/logo.png' },
      } as any);

      await controller.create(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            name: 'Test Organization',
            logoUrl: 'https://example.com/logo.png',
            creatorId: mockCreatorId.toString(),
            active: true,
          }),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should fail when user already belongs to an org', async () => {
      const usersCollection = mockDb.getCollection('users');
      const userWithOrg = { ...mockCreatorUser, organizationId: new ObjectId() };

      mockFindOne(usersCollection, userWithOrg as any);

      const { req, res, next } = createMockReqRes({
        body: { name: 'New Org' },
      } as any);

      await controller.create(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('already belongs to an organization'),
        })
      );
    });
  });

  describe('Get organization flow', () => {
    it('should retrieve organization by ID through full stack', async () => {
      const orgsCollection = mockDb.getCollection('organizations');
      mockFindOne(orgsCollection, mockOrgDocument as any);

      const { req, res, next } = createMockReqRes({
        params: { id: mockOrgId.toString() },
      } as any);

      await controller.getById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            _id: mockOrgId.toString(),
            name: 'Test Organization',
            members: expect.arrayContaining([
              expect.objectContaining({
                userId: mockCreatorId.toString(),
                email: 'creator@test.com',
                role: Role.ADMIN,
              }),
            ]),
          }),
        })
      );
    });

    it('should retrieve user organization through full stack', async () => {
      const orgsCollection = mockDb.getCollection('organizations');
      mockFindOne(orgsCollection, mockOrgDocument as any);

      const { req, res, next } = createMockReqRes();

      await controller.getMyOrganization(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            name: 'Test Organization',
          }),
        })
      );
    });

    it('should handle organization not found', async () => {
      const orgsCollection = mockDb.getCollection('organizations');
      mockFindOne(orgsCollection, null);

      const { req, res, next } = createMockReqRes();

      await controller.getMyOrganization(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.any(String),
        })
      );
    });
  });

  describe('Update organization flow', () => {
    it('should update organization name and logoUrl through full stack', async () => {
      const orgsCollection = mockDb.getCollection('organizations');
      // findByIdOrThrow → org exists
      mockFindOne(orgsCollection, mockOrgDocument as any);

      const updatedOrg = {
        ...mockOrgDocument,
        name: 'Updated Org',
        logoUrl: 'https://new-logo.com/img.png',
      };
      // updateByIdOrThrow → returns updated doc
      mockFindOneAndUpdate(orgsCollection, updatedOrg as any);

      const { req, res, next } = createMockReqRes({
        params: { id: mockOrgId.toString() },
        body: { name: 'Updated Org', logoUrl: 'https://new-logo.com/img.png' },
      } as any);

      await controller.update(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            name: 'Updated Org',
            logoUrl: 'https://new-logo.com/img.png',
          }),
        })
      );
    });
  });

  describe('Add member flow', () => {
    it('should add member through full stack', async () => {
      const orgsCollection = mockDb.getCollection('organizations');
      const usersCollection = mockDb.getCollection('users');

      const newMemberId = new ObjectId();
      const newMemberUser = {
        _id: newMemberId,
        email: 'newmember@test.com',
        name: 'New Member',
        passwordHash: '$2b$12$hashed',
        refreshTokens: [],
        planId: PlanId.FREE,
        createdAt: mockDate,
        updatedAt: mockDate,
      };

      // findByIdOrThrow(orgId) → org exists
      mockFindOne(orgsCollection, mockOrgDocument as any);
      // findByIdOrThrow(creatorId) → creator for plan check
      // We need two user findOne calls: creator (for plan) and new member (for email lookup)
      (usersCollection.findOne as jest.Mock)
        .mockResolvedValueOnce(mockCreatorUser)   // findByIdOrThrow for creator (plan check)
        .mockResolvedValueOnce(newMemberUser);     // findByEmail for new member

      const updatedOrg = {
        ...mockOrgDocument,
        members: [
          ...mockOrgDocument.members,
          {
            userId: newMemberId,
            email: 'newmember@test.com',
            role: Role.READ,
            addedAt: new Date(),
          },
        ],
      };
      // addMember → findOneAndUpdate
      mockFindOneAndUpdate(orgsCollection, updatedOrg as any);
      // setOrganization → update user
      mockFindOneAndUpdate(usersCollection, newMemberUser as any);

      const { req, res, next } = createMockReqRes({
        params: { id: mockOrgId.toString() },
        body: { email: 'newmember@test.com', role: Role.READ },
      } as any);

      await controller.addMember(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            members: expect.arrayContaining([
              expect.objectContaining({
                email: 'newmember@test.com',
                role: Role.READ,
              }),
            ]),
          }),
        })
      );
    });
  });

  describe('Remove member flow', () => {
    it('should remove member through full stack', async () => {
      const orgsCollection = mockDb.getCollection('organizations');
      const usersCollection = mockDb.getCollection('users');

      const memberId = new ObjectId();
      const orgWithMember = {
        ...mockOrgDocument,
        members: [
          ...mockOrgDocument.members,
          {
            userId: memberId,
            email: 'member@test.com',
            role: Role.READ,
            addedAt: mockDate,
          },
        ],
      };

      // findByIdOrThrow → org with member
      mockFindOne(orgsCollection, orgWithMember as any);
      // removeMember → returns org without member
      mockFindOneAndUpdate(orgsCollection, mockOrgDocument as any);
      // setOrganization(null) → update user
      mockFindOneAndUpdate(usersCollection, null);

      const { req, res, next } = createMockReqRes({
        params: { id: mockOrgId.toString(), memberId: memberId.toString() },
      } as any);

      await controller.removeMember(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            members: expect.any(Array),
          }),
        })
      );
    });
  });

  describe('Leave organization flow', () => {
    it('should allow member to leave through full stack', async () => {
      const orgsCollection = mockDb.getCollection('organizations');
      const usersCollection = mockDb.getCollection('users');

      const memberId = new ObjectId();
      const orgWithMember = {
        ...mockOrgDocument,
        members: [
          ...mockOrgDocument.members,
          {
            userId: memberId,
            email: 'member@test.com',
            role: Role.READ,
            addedAt: mockDate,
          },
        ],
      };

      // findByIdOrThrow → org
      mockFindOne(orgsCollection, orgWithMember as any);
      // removeMember → returns updated org
      mockFindOneAndUpdate(orgsCollection, mockOrgDocument as any);
      // setOrganization(null) → update user
      mockFindOneAndUpdate(usersCollection, null);

      const { req, res, next } = createMockReqRes({
        params: { id: mockOrgId.toString() },
        user: { _id: memberId } as any,
      } as any);

      await controller.leave(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: null,
        })
      );
    });

    it('should prevent creator from leaving', async () => {
      const orgsCollection = mockDb.getCollection('organizations');
      mockFindOne(orgsCollection, mockOrgDocument as any);

      const { req, res, next } = createMockReqRes({
        params: { id: mockOrgId.toString() },
      } as any);

      await controller.leave(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('creator cannot leave'),
        })
      );
    });
  });

  describe('Update member role flow', () => {
    it('should update member role through full stack', async () => {
      const orgsCollection = mockDb.getCollection('organizations');

      const memberId = new ObjectId();
      const orgWithMember = {
        ...mockOrgDocument,
        members: [
          ...mockOrgDocument.members,
          {
            userId: memberId,
            email: 'member@test.com',
            role: Role.READ,
            addedAt: mockDate,
          },
        ],
      };

      const updatedOrg = {
        ...orgWithMember,
        members: [
          orgWithMember.members[0],
          { ...orgWithMember.members[1], role: Role.WRITE },
        ],
      };

      // findByIdOrThrow → org
      mockFindOne(orgsCollection, orgWithMember as any);
      // updateMemberRole → returns updated org
      mockFindOneAndUpdate(orgsCollection, updatedOrg as any);

      const { req, res, next } = createMockReqRes({
        params: { id: mockOrgId.toString(), memberId: memberId.toString() },
        body: { role: Role.WRITE },
      } as any);

      await controller.updateMemberRole(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            members: expect.arrayContaining([
              expect.objectContaining({
                email: 'member@test.com',
                role: Role.WRITE,
              }),
            ]),
          }),
        })
      );
    });
  });
});
