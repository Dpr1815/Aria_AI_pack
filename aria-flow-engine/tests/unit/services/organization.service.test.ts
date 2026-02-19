/**
 * Unit tests for OrganizationService
 *
 * Tests the service layer in isolation by mocking repositories.
 */

import { OrganizationService } from '@services/organization.service';
import { OrganizationRepository } from '@repositories/organization.repository';
import { UserRepository } from '@repositories/user.repository';
import { createMockUserRepository } from '@test/mocks/repository.mock';
import { createMockUserDocument } from '@test/helpers/mock-factories';
import { createObjectId, createMockDate } from '@test/helpers/test-utils';
import { ForbiddenError, NotFoundError } from '@utils/errors';
import { Role, PlanId } from '../../../src/constants';
import { ObjectId } from 'mongodb';
import { OrganizationDocument, OrganizationMember } from '../../../src/models/documents/organization.document';

function createMockOrganizationRepository(): jest.Mocked<OrganizationRepository> {
  return {
    findById: jest.fn(),
    findByIdOrThrow: jest.fn(),
    findOne: jest.fn(),
    findMany: jest.fn(),
    findPaginated: jest.fn(),
    distinct: jest.fn(),
    create: jest.fn(),
    upsert: jest.fn(),
    createMany: jest.fn(),
    updateById: jest.fn(),
    updateByIdOrThrow: jest.fn(),
    updateMany: jest.fn(),
    deleteById: jest.fn(),
    deleteByIdOrThrow: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    exists: jest.fn(),
    toObjectId: jest.fn().mockImplementation((id: string | ObjectId) =>
      typeof id === 'string' ? new ObjectId(id) : id
    ),
    findByCreatorId: jest.fn(),
    findByMemberId: jest.fn(),
    findMemberByUserId: jest.fn(),
    addMember: jest.fn(),
    removeMember: jest.fn(),
    updateMemberRole: jest.fn(),
    countMembers: jest.fn(),
    isMember: jest.fn(),
    getMemberRole: jest.fn(),
    createIndexes: jest.fn(),
  } as any;
}

function createMockOrgDocument(overrides: Partial<OrganizationDocument> = {}): OrganizationDocument {
  const creatorId = overrides.creatorId || createObjectId();
  return {
    _id: overrides._id || createObjectId(),
    name: overrides.name || 'Test Organization',
    logoUrl: overrides.logoUrl,
    creatorId,
    members: overrides.members || [
      {
        userId: creatorId,
        email: 'creator@test.com',
        role: Role.ADMIN,
        addedAt: createMockDate(),
      },
    ],
    active: overrides.active ?? true,
    createdAt: overrides.createdAt || createMockDate(),
    updatedAt: overrides.updatedAt || createMockDate(),
  };
}

describe('OrganizationService', () => {
  let service: OrganizationService;
  let mockOrgRepo: ReturnType<typeof createMockOrganizationRepository>;
  let mockUserRepo: ReturnType<typeof createMockUserRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOrgRepo = createMockOrganizationRepository();
    mockUserRepo = createMockUserRepository();
    service = new OrganizationService(mockOrgRepo, mockUserRepo);
  });

  describe('createOrganization', () => {
    it('should create organization and set user org reference', async () => {
      const creatorId = createObjectId();
      const creator = createMockUserDocument({ _id: creatorId, planId: PlanId.STARTER });
      const orgDoc = createMockOrgDocument({ creatorId, name: 'New Org' });

      mockUserRepo.findByIdOrThrow.mockResolvedValue(creator);
      mockOrgRepo.findByCreatorId.mockResolvedValue(null);
      mockOrgRepo.create.mockResolvedValue(orgDoc);
      mockUserRepo.setOrganization.mockResolvedValue(creator);

      const result = await service.createOrganization(creatorId, { name: 'New Org' });

      expect(mockUserRepo.findByIdOrThrow).toHaveBeenCalledWith(creatorId, 'User');
      expect(mockOrgRepo.findByCreatorId).toHaveBeenCalledWith(creatorId);
      expect(mockOrgRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Org',
          creatorId,
          members: expect.arrayContaining([
            expect.objectContaining({ userId: creatorId, role: Role.ADMIN }),
          ]),
          active: true,
        })
      );
      expect(mockUserRepo.setOrganization).toHaveBeenCalledWith(creatorId, orgDoc._id);
      expect(result._id).toBe(orgDoc._id.toString());
      expect(result.name).toBe('New Org');
    });

    it('should include logoUrl when provided', async () => {
      const creatorId = createObjectId();
      const creator = createMockUserDocument({ _id: creatorId });
      const orgDoc = createMockOrgDocument({ creatorId, logoUrl: 'https://example.com/logo.png' });

      mockUserRepo.findByIdOrThrow.mockResolvedValue(creator);
      mockOrgRepo.findByCreatorId.mockResolvedValue(null);
      mockOrgRepo.create.mockResolvedValue(orgDoc);
      mockUserRepo.setOrganization.mockResolvedValue(creator);

      const result = await service.createOrganization(creatorId, {
        name: 'Org',
        logoUrl: 'https://example.com/logo.png',
      });

      expect(result.logoUrl).toBe('https://example.com/logo.png');
    });

    it('should throw ConflictError if user already belongs to an organization', async () => {
      const creatorId = createObjectId();
      const creator = createMockUserDocument({
        _id: creatorId,
        organizationId: createObjectId(),
      });

      mockUserRepo.findByIdOrThrow.mockResolvedValue(creator);

      await expect(
        service.createOrganization(creatorId, { name: 'Org' })
      ).rejects.toThrow('User already belongs to an organization');
      expect(mockOrgRepo.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictError if user already created an organization', async () => {
      const creatorId = createObjectId();
      const creator = createMockUserDocument({ _id: creatorId });
      const existingOrg = createMockOrgDocument({ creatorId });

      mockUserRepo.findByIdOrThrow.mockResolvedValue(creator);
      mockOrgRepo.findByCreatorId.mockResolvedValue(existingOrg);

      await expect(
        service.createOrganization(creatorId, { name: 'Org' })
      ).rejects.toThrow('User has already created an organization');
      expect(mockOrgRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('getOrganizationById', () => {
    it('should return organization DTO when requester is a member', async () => {
      const orgDoc = createMockOrgDocument();
      const requesterId = orgDoc.members[0].userId;
      mockOrgRepo.findByIdOrThrow.mockResolvedValue(orgDoc);

      const result = await service.getOrganizationById(orgDoc._id, requesterId);

      expect(mockOrgRepo.findByIdOrThrow).toHaveBeenCalledWith(orgDoc._id, 'Organization');
      expect(result._id).toBe(orgDoc._id.toString());
      expect(result.name).toBe(orgDoc.name);
      expect(result.active).toBe(true);
    });

    it('should throw ForbiddenError when requester is not a member', async () => {
      const orgDoc = createMockOrgDocument();
      const nonMemberId = createObjectId();
      mockOrgRepo.findByIdOrThrow.mockResolvedValue(orgDoc);

      await expect(
        service.getOrganizationById(orgDoc._id, nonMemberId)
      ).rejects.toThrow('You are not a member of this organization');
    });
  });

  describe('getUserOrganization', () => {
    it('should return organization for user', async () => {
      const userId = createObjectId();
      const orgDoc = createMockOrgDocument();
      mockOrgRepo.findByMemberId.mockResolvedValue(orgDoc);

      const result = await service.getUserOrganization(userId);

      expect(mockOrgRepo.findByMemberId).toHaveBeenCalledWith(userId);
      expect(result._id).toBe(orgDoc._id.toString());
    });

    it('should throw NotFoundError if user has no organization', async () => {
      const userId = createObjectId();
      mockOrgRepo.findByMemberId.mockResolvedValue(null);

      await expect(service.getUserOrganization(userId)).rejects.toThrow('Organization for user');
    });
  });

  describe('updateOrganization', () => {
    it('should update organization when requester is admin', async () => {
      const adminId = createObjectId();
      const orgDoc = createMockOrgDocument({
        creatorId: adminId,
        members: [{ userId: adminId, email: 'admin@test.com', role: Role.ADMIN, addedAt: createMockDate() }],
      });
      const updatedDoc = { ...orgDoc, name: 'Updated Name' };

      mockOrgRepo.findByIdOrThrow.mockResolvedValue(orgDoc);
      mockOrgRepo.updateByIdOrThrow.mockResolvedValue(updatedDoc);

      const result = await service.updateOrganization(orgDoc._id.toString(), adminId, {
        name: 'Updated Name',
      });

      expect(result.name).toBe('Updated Name');
      expect(mockOrgRepo.updateByIdOrThrow).toHaveBeenCalledWith(
        orgDoc._id,
        { name: 'Updated Name' },
        'Organization'
      );
    });

    it('should allow updating logoUrl', async () => {
      const adminId = createObjectId();
      const orgDoc = createMockOrgDocument({
        creatorId: adminId,
        members: [{ userId: adminId, email: 'admin@test.com', role: Role.ADMIN, addedAt: createMockDate() }],
      });
      const updatedDoc = { ...orgDoc, logoUrl: 'https://new-logo.com/img.png' };

      mockOrgRepo.findByIdOrThrow.mockResolvedValue(orgDoc);
      mockOrgRepo.updateByIdOrThrow.mockResolvedValue(updatedDoc);

      const result = await service.updateOrganization(orgDoc._id.toString(), adminId, {
        logoUrl: 'https://new-logo.com/img.png',
      });

      expect(result.logoUrl).toBe('https://new-logo.com/img.png');
    });

    it('should throw ForbiddenError if requester is not admin', async () => {
      const readerId = createObjectId();
      const creatorId = createObjectId();
      const org = createMockOrgDocument({
        creatorId,
        members: [
          { userId: creatorId, email: 'creator@test.com', role: Role.ADMIN, addedAt: createMockDate() },
          { userId: readerId, email: 'reader@test.com', role: Role.READ, addedAt: createMockDate() },
        ],
      });

      mockOrgRepo.findByIdOrThrow.mockResolvedValue(org);

      await expect(
        service.updateOrganization(org._id.toString(), readerId, { name: 'Nope' })
      ).rejects.toThrow('Requires role_admin role or higher');
      expect(mockOrgRepo.updateByIdOrThrow).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenError if requester is not a member', async () => {
      const nonMemberId = createObjectId();
      const orgDoc = createMockOrgDocument();

      mockOrgRepo.findByIdOrThrow.mockResolvedValue(orgDoc);

      await expect(
        service.updateOrganization(orgDoc._id.toString(), nonMemberId, { name: 'Nope' })
      ).rejects.toThrow('You are not a member of this organization');
    });
  });

  describe('addMember', () => {
    it('should add member to organization', async () => {
      const adminId = createObjectId();
      const newUserId = createObjectId();
      const creator = createMockUserDocument({ _id: adminId, planId: PlanId.STARTER });
      const newUser = createMockUserDocument({ _id: newUserId, email: 'new@test.com' });
      const orgDoc = createMockOrgDocument({
        creatorId: adminId,
        members: [{ userId: adminId, email: 'admin@test.com', role: Role.ADMIN, addedAt: createMockDate() }],
      });
      const updatedOrg = {
        ...orgDoc,
        members: [
          ...orgDoc.members,
          { userId: newUserId, email: 'new@test.com', role: Role.READ, addedAt: new Date() },
        ],
      };

      mockOrgRepo.findByIdOrThrow.mockResolvedValue(orgDoc);
      mockUserRepo.findByIdOrThrow.mockResolvedValue(creator);
      mockUserRepo.findByEmail.mockResolvedValue(newUser);
      mockOrgRepo.addMember.mockResolvedValue(updatedOrg);
      mockUserRepo.setOrganization.mockResolvedValue(newUser);

      const result = await service.addMember(orgDoc._id.toString(), adminId, {
        email: 'new@test.com',
        role: Role.READ,
      });

      expect(mockOrgRepo.addMember).toHaveBeenCalledWith(
        orgDoc._id,
        expect.objectContaining({
          userId: newUserId,
          email: 'new@test.com',
          role: Role.READ,
        })
      );
      expect(mockUserRepo.setOrganization).toHaveBeenCalledWith(newUserId, orgDoc._id);
      expect(result.members).toHaveLength(2);
    });

    it('should throw ForbiddenError when plan seat limit reached', async () => {
      const adminId = createObjectId();
      const creator = createMockUserDocument({ _id: adminId, planId: PlanId.FREE });
      const orgDoc = createMockOrgDocument({
        creatorId: adminId,
        members: [{ userId: adminId, email: 'admin@test.com', role: Role.ADMIN, addedAt: createMockDate() }],
      });

      mockOrgRepo.findByIdOrThrow.mockResolvedValue(orgDoc);
      mockUserRepo.findByIdOrThrow.mockResolvedValue(creator);

      await expect(
        service.addMember(orgDoc._id.toString(), adminId, { email: 'new@test.com', role: Role.READ })
      ).rejects.toThrow('maximum seats');
      expect(mockOrgRepo.addMember).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError if user email not found', async () => {
      const adminId = createObjectId();
      const creator = createMockUserDocument({ _id: adminId, planId: PlanId.STARTER });
      const orgDoc = createMockOrgDocument({
        creatorId: adminId,
        members: [{ userId: adminId, email: 'admin@test.com', role: Role.ADMIN, addedAt: createMockDate() }],
      });

      mockOrgRepo.findByIdOrThrow.mockResolvedValue(orgDoc);
      mockUserRepo.findByIdOrThrow.mockResolvedValue(creator);
      mockUserRepo.findByEmail.mockResolvedValue(null);

      await expect(
        service.addMember(orgDoc._id.toString(), adminId, { email: 'unknown@test.com', role: Role.READ })
      ).rejects.toThrow('not found');
    });

    it('should throw ConflictError if user already belongs to an organization', async () => {
      const adminId = createObjectId();
      const newUserId = createObjectId();
      const creator = createMockUserDocument({ _id: adminId, planId: PlanId.STARTER });
      const newUser = createMockUserDocument({
        _id: newUserId,
        email: 'new@test.com',
        organizationId: createObjectId(),
      });
      const orgDoc = createMockOrgDocument({
        creatorId: adminId,
        members: [{ userId: adminId, email: 'admin@test.com', role: Role.ADMIN, addedAt: createMockDate() }],
      });

      mockOrgRepo.findByIdOrThrow.mockResolvedValue(orgDoc);
      mockUserRepo.findByIdOrThrow.mockResolvedValue(creator);
      mockUserRepo.findByEmail.mockResolvedValue(newUser);

      await expect(
        service.addMember(orgDoc._id.toString(), adminId, { email: 'new@test.com', role: Role.READ })
      ).rejects.toThrow('User already belongs to an organization');
    });

    it('should throw ConflictError if user is already a member', async () => {
      const adminId = createObjectId();
      const creator = createMockUserDocument({ _id: adminId, email: 'admin@test.com', planId: PlanId.STARTER });
      const orgDoc = createMockOrgDocument({
        creatorId: adminId,
        members: [{ userId: adminId, email: 'admin@test.com', role: Role.ADMIN, addedAt: createMockDate() }],
      });

      mockOrgRepo.findByIdOrThrow.mockResolvedValue(orgDoc);
      mockUserRepo.findByIdOrThrow.mockResolvedValue(creator);
      mockUserRepo.findByEmail.mockResolvedValue(creator);

      await expect(
        service.addMember(orgDoc._id.toString(), adminId, { email: 'admin@test.com', role: Role.READ })
      ).rejects.toThrow('User is already a member of this organization');
    });
  });

  describe('removeMember', () => {
    it('should remove member from organization', async () => {
      const adminId = createObjectId();
      const memberId = createObjectId();
      const orgDoc = createMockOrgDocument({
        creatorId: adminId,
        members: [
          { userId: adminId, email: 'admin@test.com', role: Role.ADMIN, addedAt: createMockDate() },
          { userId: memberId, email: 'member@test.com', role: Role.READ, addedAt: createMockDate() },
        ],
      });
      const updatedOrg = {
        ...orgDoc,
        members: [orgDoc.members[0]],
      };

      mockOrgRepo.findByIdOrThrow.mockResolvedValue(orgDoc);
      mockOrgRepo.removeMember.mockResolvedValue(updatedOrg);
      mockUserRepo.setOrganization.mockResolvedValue(null);

      const result = await service.removeMember(orgDoc._id.toString(), adminId, memberId);

      expect(mockOrgRepo.removeMember).toHaveBeenCalledWith(orgDoc._id, memberId);
      expect(mockUserRepo.setOrganization).toHaveBeenCalledWith(memberId, null);
      expect(result.members).toHaveLength(1);
    });

    it('should throw ForbiddenError when trying to remove creator', async () => {
      const adminId = createObjectId();
      const orgDoc = createMockOrgDocument({
        creatorId: adminId,
        members: [{ userId: adminId, email: 'admin@test.com', role: Role.ADMIN, addedAt: createMockDate() }],
      });

      mockOrgRepo.findByIdOrThrow.mockResolvedValue(orgDoc);

      await expect(
        service.removeMember(orgDoc._id.toString(), adminId, adminId)
      ).rejects.toThrow('Cannot remove the organization creator');
    });

    it('should throw NotFoundError if member not found', async () => {
      const adminId = createObjectId();
      const unknownId = createObjectId();
      const orgDoc = createMockOrgDocument({
        creatorId: adminId,
        members: [{ userId: adminId, email: 'admin@test.com', role: Role.ADMIN, addedAt: createMockDate() }],
      });

      mockOrgRepo.findByIdOrThrow.mockResolvedValue(orgDoc);

      await expect(
        service.removeMember(orgDoc._id.toString(), adminId, unknownId)
      ).rejects.toThrow('Member in organization');
    });
  });

  describe('updateMemberRole', () => {
    it('should update member role', async () => {
      const adminId = createObjectId();
      const memberId = createObjectId();
      const orgDoc = createMockOrgDocument({
        creatorId: adminId,
        members: [
          { userId: adminId, email: 'admin@test.com', role: Role.ADMIN, addedAt: createMockDate() },
          { userId: memberId, email: 'member@test.com', role: Role.READ, addedAt: createMockDate() },
        ],
      });
      const updatedOrg = {
        ...orgDoc,
        members: [
          orgDoc.members[0],
          { ...orgDoc.members[1], role: Role.WRITE },
        ],
      };

      mockOrgRepo.findByIdOrThrow.mockResolvedValue(orgDoc);
      mockOrgRepo.updateMemberRole.mockResolvedValue(updatedOrg);

      const result = await service.updateMemberRole(
        orgDoc._id.toString(),
        adminId,
        memberId,
        { role: Role.WRITE }
      );

      expect(mockOrgRepo.updateMemberRole).toHaveBeenCalledWith(orgDoc._id, memberId, Role.WRITE);
      expect(result.members[1].role).toBe(Role.WRITE);
    });

    it('should throw ForbiddenError when trying to change creator role', async () => {
      const adminId = createObjectId();
      const orgDoc = createMockOrgDocument({
        creatorId: adminId,
        members: [{ userId: adminId, email: 'admin@test.com', role: Role.ADMIN, addedAt: createMockDate() }],
      });

      mockOrgRepo.findByIdOrThrow.mockResolvedValue(orgDoc);

      await expect(
        service.updateMemberRole(orgDoc._id.toString(), adminId, adminId, { role: Role.READ })
      ).rejects.toThrow('Cannot change the role of the organization creator');
    });

    it('should throw NotFoundError if member not found', async () => {
      const adminId = createObjectId();
      const unknownId = createObjectId();
      const orgDoc = createMockOrgDocument({
        creatorId: adminId,
        members: [{ userId: adminId, email: 'admin@test.com', role: Role.ADMIN, addedAt: createMockDate() }],
      });

      mockOrgRepo.findByIdOrThrow.mockResolvedValue(orgDoc);

      await expect(
        service.updateMemberRole(orgDoc._id.toString(), adminId, unknownId, { role: Role.WRITE })
      ).rejects.toThrow('Member in organization');
    });
  });

  describe('leaveOrganization', () => {
    it('should allow member to leave organization', async () => {
      const creatorId = createObjectId();
      const memberId = createObjectId();
      const orgDoc = createMockOrgDocument({
        creatorId,
        members: [
          { userId: creatorId, email: 'creator@test.com', role: Role.ADMIN, addedAt: createMockDate() },
          { userId: memberId, email: 'member@test.com', role: Role.READ, addedAt: createMockDate() },
        ],
      });

      mockOrgRepo.findByIdOrThrow.mockResolvedValue(orgDoc);
      mockOrgRepo.removeMember.mockResolvedValue(orgDoc);
      mockUserRepo.setOrganization.mockResolvedValue(null);

      await service.leaveOrganization(orgDoc._id.toString(), memberId);

      expect(mockOrgRepo.removeMember).toHaveBeenCalledWith(orgDoc._id, memberId);
      expect(mockUserRepo.setOrganization).toHaveBeenCalledWith(memberId, null);
    });

    it('should throw ForbiddenError if creator tries to leave', async () => {
      const creatorId = createObjectId();
      const orgDoc = createMockOrgDocument({
        creatorId,
        members: [{ userId: creatorId, email: 'creator@test.com', role: Role.ADMIN, addedAt: createMockDate() }],
      });

      mockOrgRepo.findByIdOrThrow.mockResolvedValue(orgDoc);

      await expect(
        service.leaveOrganization(orgDoc._id.toString(), creatorId)
      ).rejects.toThrow('Organization creator cannot leave');
    });

    it('should throw NotFoundError if user is not a member', async () => {
      const creatorId = createObjectId();
      const nonMemberId = createObjectId();
      const orgDoc = createMockOrgDocument({
        creatorId,
        members: [{ userId: creatorId, email: 'creator@test.com', role: Role.ADMIN, addedAt: createMockDate() }],
      });

      mockOrgRepo.findByIdOrThrow.mockResolvedValue(orgDoc);

      await expect(
        service.leaveOrganization(orgDoc._id.toString(), nonMemberId)
      ).rejects.toThrow('Member in organization');
    });
  });

  describe('getOrganizationByUserId', () => {
    it('should return organization document for internal use', async () => {
      const userId = createObjectId();
      const orgDoc = createMockOrgDocument();
      mockOrgRepo.findByMemberId.mockResolvedValue(orgDoc);

      const result = await service.getOrganizationByUserId(userId);

      expect(mockOrgRepo.findByMemberId).toHaveBeenCalledWith(userId);
      expect(result).toBe(orgDoc);
    });

    it('should return null if user has no organization', async () => {
      const userId = createObjectId();
      mockOrgRepo.findByMemberId.mockResolvedValue(null);

      const result = await service.getOrganizationByUserId(userId);

      expect(result).toBeNull();
    });
  });
});
