/**
 * Unit tests for OrganizationController
 *
 * Tests the controller layer in isolation by mocking the service layer.
 * Organization authorization is handled by the service (membership + role checks).
 */

import { Request, Response, NextFunction } from 'express';
import { OrganizationController } from '@controllers/organization.controller';
import { OrganizationService } from '@services';
import { createObjectId } from '@test/helpers/test-utils';
import { Role } from '../../../src/constants';

jest.mock('@services');

describe('OrganizationController', () => {
  let controller: OrganizationController;
  let mockService: jest.Mocked<OrganizationService>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  const userId = createObjectId();
  const orgId = createObjectId();

  const mockOrgDTO = {
    _id: orgId.toString(),
    name: 'Test Org',
    logoUrl: 'https://example.com/logo.png',
    creatorId: userId.toString(),
    members: [
      {
        userId: userId.toString(),
        email: 'creator@test.com',
        role: Role.ADMIN,
        addedAt: '2024-01-01T00:00:00.000Z',
      },
    ],
    active: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    mockService = {
      createOrganization: jest.fn(),
      getUserOrganization: jest.fn(),
      getOrganizationById: jest.fn(),
      updateOrganization: jest.fn(),
      addMember: jest.fn(),
      removeMember: jest.fn(),
      updateMemberRole: jest.fn(),
      leaveOrganization: jest.fn(),
    } as any;

    controller = new OrganizationController(mockService);

    mockReq = {
      params: {},
      body: {},
      user: { _id: userId } as any,
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('create', () => {
    it('should create organization and return 201', async () => {
      const input = { name: 'New Org', logoUrl: 'https://example.com/logo.png' };
      mockReq.body = input;
      mockService.createOrganization.mockResolvedValue(mockOrgDTO);

      await controller.create(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.createOrganization).toHaveBeenCalledWith(userId, input);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: mockOrgDTO })
      );
    });

    it('should handle errors', async () => {
      const error = new Error('Conflict');
      mockReq.body = { name: 'Org' };
      mockService.createOrganization.mockRejectedValue(error);

      await controller.create(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getMyOrganization', () => {
    it('should return user organization', async () => {
      mockService.getUserOrganization.mockResolvedValue(mockOrgDTO);

      await controller.getMyOrganization(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.getUserOrganization).toHaveBeenCalledWith(userId);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: mockOrgDTO })
      );
    });

    it('should handle errors', async () => {
      const error = new Error('Not found');
      mockService.getUserOrganization.mockRejectedValue(error);

      await controller.getMyOrganization(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getById', () => {
    it('should return organization by id', async () => {
      mockReq.params = { id: orgId.toString() };
      mockService.getOrganizationById.mockResolvedValue(mockOrgDTO);

      await controller.getById(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.getOrganizationById).toHaveBeenCalledWith(orgId.toString(), userId);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: mockOrgDTO })
      );
    });

    it('should handle errors', async () => {
      const error = new Error('Not found');
      mockReq.params = { id: orgId.toString() };
      mockService.getOrganizationById.mockRejectedValue(error);

      await controller.getById(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('update', () => {
    it('should update organization and return 200', async () => {
      const input = { name: 'Updated Org' };
      mockReq.params = { id: orgId.toString() };
      mockReq.body = input;
      const updatedOrg = { ...mockOrgDTO, name: 'Updated Org' };
      mockService.updateOrganization.mockResolvedValue(updatedOrg);

      await controller.update(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.updateOrganization).toHaveBeenCalledWith(
        orgId.toString(),
        userId,
        input
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: updatedOrg })
      );
    });

    it('should handle errors', async () => {
      const error = new Error('Forbidden');
      mockReq.params = { id: orgId.toString() };
      mockReq.body = { name: 'X' };
      mockService.updateOrganization.mockRejectedValue(error);

      await controller.update(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('addMember', () => {
    it('should add member and return 201', async () => {
      const input = { email: 'new@test.com', role: Role.READ };
      mockReq.params = { id: orgId.toString() };
      mockReq.body = input;
      const newMemberId = createObjectId();
      const updatedOrg = {
        ...mockOrgDTO,
        members: [
          ...mockOrgDTO.members,
          {
            userId: newMemberId.toString(),
            email: 'new@test.com',
            role: Role.READ,
            addedAt: '2024-01-02T00:00:00.000Z',
          },
        ],
      };
      mockService.addMember.mockResolvedValue(updatedOrg);

      await controller.addMember(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.addMember).toHaveBeenCalledWith(orgId.toString(), userId, input);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: updatedOrg })
      );
    });

    it('should handle errors', async () => {
      const error = new Error('User not found');
      mockReq.params = { id: orgId.toString() };
      mockReq.body = { email: 'unknown@test.com' };
      mockService.addMember.mockRejectedValue(error);

      await controller.addMember(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('removeMember', () => {
    it('should remove member and return 200', async () => {
      const memberId = createObjectId();
      mockReq.params = { id: orgId.toString(), memberId: memberId.toString() };
      mockService.removeMember.mockResolvedValue(mockOrgDTO);

      await controller.removeMember(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.removeMember).toHaveBeenCalledWith(
        orgId.toString(),
        userId,
        memberId.toString()
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: mockOrgDTO })
      );
    });

    it('should handle errors', async () => {
      const error = new Error('Cannot remove creator');
      mockReq.params = { id: orgId.toString(), memberId: userId.toString() };
      mockService.removeMember.mockRejectedValue(error);

      await controller.removeMember(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('updateMemberRole', () => {
    it('should update member role and return 200', async () => {
      const memberId = createObjectId();
      const input = { role: Role.WRITE };
      mockReq.params = { id: orgId.toString(), memberId: memberId.toString() };
      mockReq.body = input;
      mockService.updateMemberRole.mockResolvedValue(mockOrgDTO);

      await controller.updateMemberRole(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.updateMemberRole).toHaveBeenCalledWith(
        orgId.toString(),
        userId,
        memberId.toString(),
        input
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: mockOrgDTO })
      );
    });

    it('should handle errors', async () => {
      const error = new Error('Forbidden');
      mockReq.params = { id: orgId.toString(), memberId: createObjectId().toString() };
      mockReq.body = { role: Role.ADMIN };
      mockService.updateMemberRole.mockRejectedValue(error);

      await controller.updateMemberRole(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('leave', () => {
    it('should leave organization and return 200', async () => {
      mockReq.params = { id: orgId.toString() };
      mockService.leaveOrganization.mockResolvedValue(undefined);

      await controller.leave(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.leaveOrganization).toHaveBeenCalledWith(orgId.toString(), userId);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: null })
      );
    });

    it('should handle errors', async () => {
      const error = new Error('Creator cannot leave');
      mockReq.params = { id: orgId.toString() };
      mockService.leaveOrganization.mockRejectedValue(error);

      await controller.leave(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
