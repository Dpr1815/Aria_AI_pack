/**
 * Integration tests for Participant flow
 *
 * Tests participant CRUD operations from controller to repository
 */

import { ParticipantController } from '@controllers/participant.controller';
import { ParticipantService } from '@services/participant.service';
import { ParticipantRepository } from '@repositories/participant.repository';
import { SessionRepository } from '@repositories/session.repository';
import { ConversationRepository } from '@repositories/conversation.repository';
import {
  createMockDatabase,
  mockFindOne,
  mockFindOneAndUpdate,
  mockDeleteMany,
  mockDeleteOne,
  mockFind,
  mockCountDocuments,
  mockDistinct,
} from '@test/mocks/database.mock';
import { Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';

describe('Participant Flow - Integration', () => {
  let participantController: ParticipantController;
  let participantService: ParticipantService;
  let participantRepository: ParticipantRepository;
  let sessionRepository: SessionRepository;
  let conversationRepository: ConversationRepository;
  let mockDb: ReturnType<typeof createMockDatabase>;

  const mockUserId = new ObjectId();
  const mockAgentId = new ObjectId();
  const mockTenant = { type: 'personal' as const, userId: mockUserId };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup the stack with mocked database
    mockDb = createMockDatabase();
    participantRepository = new ParticipantRepository(mockDb);
    sessionRepository = new SessionRepository(mockDb);
    conversationRepository = new ConversationRepository(mockDb);
    participantService = new ParticipantService(
      participantRepository,
      sessionRepository,
      conversationRepository
    );
    participantController = new ParticipantController(participantService);
  });

  describe('List participants -> GetById -> Update -> Delete flow', () => {
    it('should complete full participant management flow', async () => {
      // ============ STEP 1: LIST PARTICIPANTS ============
      const mockParticipants = [
        {
          _id: new ObjectId(),
          email: 'participant1@example.com',
          name: 'Participant 1',
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new ObjectId(),
          email: 'participant2@example.com',
          name: 'Participant 2',
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const participantsCollection = mockDb.getCollection('participants');

      // Mock distinct to get participant IDs from sessions
      const participantIds = mockParticipants.map((p) => p._id);
      mockDistinct(mockDb.getCollection('sessions'), participantIds);

      // Mock find and count for pagination
      mockFind(participantsCollection, mockParticipants);
      mockCountDocuments(participantsCollection, 2);

      const listReq = {
        user: { _id: mockUserId },
        tenant: mockTenant,
        tenantAgentIds: [mockAgentId],
        query: { page: '1', limit: '10' },
      } as unknown as Request;

      const listRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      const next = jest.fn() as NextFunction;

      await participantController.list(listReq, listRes, next);

      expect(listRes.status).toHaveBeenCalledWith(200);
      expect(listRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({
              email: 'participant1@example.com',
            }),
          ]),
          meta: expect.objectContaining({
            page: '1',
            limit: '10',
            total: 2,
          }),
        })
      );

      // ============ STEP 2: GET BY ID ============
      jest.clearAllMocks();

      const participantId = mockParticipants[0]._id;
      mockFindOne(participantsCollection, mockParticipants[0]);

      const getByIdReq = {
        user: { _id: mockUserId },
        tenant: mockTenant,
        params: { participantId: participantId.toString() },
      } as unknown as Request;

      const getByIdRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      await participantController.getById(getByIdReq, getByIdRes, next);

      expect(getByIdRes.status).toHaveBeenCalledWith(200);
      expect(getByIdRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            _id: participantId.toString(),
            email: 'participant1@example.com',
          }),
        })
      );

      // ============ STEP 3: UPDATE PARTICIPANT ============
      jest.clearAllMocks();

      const updatedParticipant = {
        ...mockParticipants[0],
        name: 'Updated Name',
        updatedAt: new Date(),
      };

      mockFindOneAndUpdate(participantsCollection, updatedParticipant);

      const updateReq = {
        user: { _id: mockUserId },
        tenant: mockTenant,
        params: { participantId: participantId.toString() },
        body: { name: 'Updated Name' },
      } as unknown as Request;

      const updateRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      await participantController.update(updateReq, updateRes, next);

      expect(updateRes.status).toHaveBeenCalledWith(200);
      expect(updateRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            name: 'Updated Name',
          }),
        })
      );

      // ============ STEP 4: DELETE PARTICIPANT ============
      jest.clearAllMocks();

      mockFindOne(participantsCollection, mockParticipants[0]);

      // Mock getSessionIds find
      const sessionsCollection = mockDb.getCollection('sessions');
      mockFind(sessionsCollection, [
        { _id: new ObjectId() },
        { _id: new ObjectId() },
      ]);

      // Mock conversation and session deletion
      const conversationsCollection = mockDb.getCollection('conversations');
      mockDeleteMany(conversationsCollection, 2);
      mockDeleteMany(sessionsCollection, 2);
      mockDeleteOne(participantsCollection, 1);

      const deleteReq = {
        user: { _id: mockUserId },
        tenant: mockTenant,
        params: { id: participantId.toString() },
      } as unknown as Request;

      const deleteRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      await participantController.delete(deleteReq, deleteRes, next);

      expect(deleteRes.status).toHaveBeenCalledWith(200);
      expect(deleteRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            sessionsDeleted: 2,
          }),
        })
      );
    });
  });

  describe('Get by email flow', () => {
    it('should retrieve participant by email', async () => {
      const mockParticipant = {
        _id: new ObjectId(),
        email: 'test@example.com',
        name: 'Test User',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const participantsCollection = mockDb.getCollection('participants');
      mockFindOne(participantsCollection, mockParticipant);

      const req = {
        user: { _id: mockUserId },
        tenant: mockTenant,
        params: { email: 'test@example.com' },
      } as unknown as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      const next = jest.fn() as NextFunction;

      await participantController.getByEmail(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            email: 'test@example.com',
            name: 'Test User',
          }),
        })
      );
    });

    it('should handle participant not found', async () => {
      const participantsCollection = mockDb.getCollection('participants');
      mockFindOne(participantsCollection, null);

      const req = {
        user: { _id: mockUserId },
        tenant: mockTenant,
        params: { email: 'nonexistent@example.com' },
      } as unknown as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      const next = jest.fn() as NextFunction;

      await participantController.getByEmail(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Participant'),
        })
      );
    });
  });
});
