/**
 * Unit tests for ParticipantController
 *
 * Tests the controller layer in isolation by mocking the service layer
 */

import { Request, Response, NextFunction } from 'express';
import { ParticipantController } from '@controllers/participant.controller';
import { ParticipantService } from '@services/participant.service';
import { ObjectId } from 'mongodb';
import { createObjectId } from '@test/helpers/test-utils';

// Mock the ParticipantService
jest.mock('@services/participant.service');

describe('ParticipantController', () => {
  let controller: ParticipantController;
  let mockService: jest.Mocked<ParticipantService>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  const mockUserId = createObjectId();
  const mockAgentId = createObjectId();
  const mockTenant = { type: 'personal' as const, userId: mockUserId };

  beforeEach(() => {
    // Create mock service
    mockService = {
      list: jest.fn(),
      getById: jest.fn(),
      getByEmail: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;

    controller = new ParticipantController(mockService);

    // Setup mock request/response
    mockReq = {
      params: {},
      query: {},
      body: {},
      user: { _id: mockUserId } as any,
      tenant: mockTenant,
      tenantAgentIds: [mockAgentId],
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('list', () => {
    it('should return paginated participants successfully', async () => {
      const mockResult = {
        data: [
          {
            _id: createObjectId().toString(),
            email: 'participant1@example.com',
            name: 'Participant 1',
          },
          {
            _id: createObjectId().toString(),
            email: 'participant2@example.com',
            name: 'Participant 2',
          },
        ],
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      };

      mockService.list.mockResolvedValue(mockResult as any);
      mockReq.query = { page: '1', limit: '10' };

      await controller.list(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.list).toHaveBeenCalledWith([mockAgentId], mockReq.query);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockResult.data,
          meta: expect.objectContaining({
            page: 1,
            limit: 10,
            total: 2,
          }),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle errors and call next', async () => {
      const error = new Error('Database error');
      mockService.list.mockRejectedValue(error);

      await controller.list(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('should return participant by id successfully', async () => {
      const participantId = createObjectId().toString();
      const mockParticipant = {
        _id: participantId,
        email: 'test@example.com',
        name: 'Test Participant',
      };

      mockService.getById.mockResolvedValue(mockParticipant as any);
      mockReq.params = { id: participantId };

      await controller.getById(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.getById).toHaveBeenCalledWith(participantId);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockParticipant,
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle errors when participant not found', async () => {
      const error = new Error('Participant not found');
      mockService.getById.mockRejectedValue(error);
      mockReq.params = { id: createObjectId().toString() };

      await controller.getById(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('getByEmail', () => {
    it('should return participant by email successfully', async () => {
      const email = 'test@example.com';
      const mockParticipant = {
        _id: createObjectId().toString(),
        email,
        name: 'Test Participant',
      };

      mockService.getByEmail.mockResolvedValue(mockParticipant as any);
      mockReq.params = { email };

      await controller.getByEmail(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.getByEmail).toHaveBeenCalledWith(email);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockParticipant,
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle errors when participant not found by email', async () => {
      const error = new Error('Participant not found');
      mockService.getByEmail.mockRejectedValue(error);
      mockReq.params = { email: 'nonexistent@example.com' };

      await controller.getByEmail(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('update', () => {
    it('should update participant successfully', async () => {
      const participantId = createObjectId().toString();
      const updateInput = { name: 'Updated Name' };
      const mockUpdatedParticipant = {
        _id: participantId,
        email: 'test@example.com',
        name: 'Updated Name',
      };

      mockService.update.mockResolvedValue(mockUpdatedParticipant as any);
      mockReq.params = { id: participantId };
      mockReq.body = updateInput;

      await controller.update(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.update).toHaveBeenCalledWith(participantId, updateInput);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockUpdatedParticipant,
          message: 'Participant updated successfully',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle errors during update', async () => {
      const error = new Error('Failed to update');
      mockService.update.mockRejectedValue(error);
      mockReq.params = { id: createObjectId().toString() };
      mockReq.body = { name: 'New Name' };

      await controller.update(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('delete', () => {
    it('should delete participant and associated sessions successfully', async () => {
      const participantId = createObjectId().toString();
      const mockResult = { sessionsDeleted: 5 };

      mockService.delete.mockResolvedValue(mockResult);
      mockReq.params = { id: participantId };

      await controller.delete(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.delete).toHaveBeenCalledWith(participantId);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: { sessionsDeleted: 5 },
          message: 'Participant and associated sessions deleted successfully',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle errors during deletion', async () => {
      const error = new Error('Failed to delete');
      mockService.delete.mockRejectedValue(error);
      mockReq.params = { id: createObjectId().toString() };

      await controller.delete(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
