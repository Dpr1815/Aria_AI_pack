/**
 * Unit tests for ParticipantService
 *
 * Tests the service layer business logic with mocked repositories
 */

import { ParticipantService } from '@services/participant.service';
import { ParticipantRepository } from '@repositories/participant.repository';
import { SessionRepository } from '@repositories/session.repository';
import { ConversationRepository } from '@repositories/conversation.repository';
import { createObjectId } from '@test/helpers/test-utils';
import { NotFoundError, ValidationError } from '@utils/errors';

// Mock all repositories
jest.mock('@repositories/participant.repository');
jest.mock('@repositories/session.repository');
jest.mock('@repositories/conversation.repository');

describe('ParticipantService', () => {
  let participantService: ParticipantService;
  let mockParticipantRepository: jest.Mocked<ParticipantRepository>;
  let mockSessionRepository: jest.Mocked<SessionRepository>;
  let mockConversationRepository: jest.Mocked<ConversationRepository>;

  const mockUserId = createObjectId();
  const mockAgentId = createObjectId();

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock repositories
    mockParticipantRepository = new ParticipantRepository(null as any) as jest.Mocked<ParticipantRepository>;
    mockSessionRepository = new SessionRepository(null as any) as jest.Mocked<SessionRepository>;
    mockConversationRepository = new ConversationRepository(null as any) as jest.Mocked<ConversationRepository>;

    participantService = new ParticipantService(
      mockParticipantRepository,
      mockSessionRepository,
      mockConversationRepository
    );
  });

  describe('list', () => {
    it('should return paginated participants', async () => {
      const mockParticipants = [
        {
          _id: createObjectId(),
          email: 'participant1@example.com',
          name: 'Participant 1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: createObjectId(),
          email: 'participant2@example.com',
          name: 'Participant 2',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockParticipantRepository.findByAgentIdsWithFilters = jest.fn().mockResolvedValue({
        data: mockParticipants,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      const result = await participantService.list([mockAgentId], { page: 1, limit: 10 });

      expect(result).toEqual({
        data: expect.arrayContaining([
          expect.objectContaining({
            email: 'participant1@example.com',
            name: 'Participant 1',
          }),
        ]),
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      });
      expect(mockParticipantRepository.findByAgentIdsWithFilters).toHaveBeenCalled();
    });

    it('should handle empty result', async () => {
      mockParticipantRepository.findByAgentIdsWithFilters = jest.fn().mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });

      const result = await participantService.list([mockAgentId], { page: 1, limit: 10 });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });
  });

  describe('getById', () => {
    it('should return participant by id', async () => {
      const participantId = createObjectId();
      const mockParticipant = {
        _id: participantId,
        email: 'test@example.com',
        name: 'Test Participant',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockParticipantRepository.findByIdOrThrow = jest.fn().mockResolvedValue(mockParticipant);

      const result = await participantService.getById(participantId.toString());

      expect(result).toEqual(
        expect.objectContaining({
          _id: participantId.toString(),
          email: 'test@example.com',
          name: 'Test Participant',
        })
      );
      expect(mockParticipantRepository.findByIdOrThrow).toHaveBeenCalledWith(
        participantId.toString(),
        'Participant'
      );
    });

    it('should throw NotFoundError when participant does not exist', async () => {
      const participantId = createObjectId();
      const error = new NotFoundError('Participant', participantId.toString());
      mockParticipantRepository.findByIdOrThrow = jest.fn().mockRejectedValue(error);

      await expect(participantService.getById(participantId.toString())).rejects.toThrow(error);
    });
  });

  describe('getByEmail', () => {
    it('should return participant by email', async () => {
      const email = 'test@example.com';
      const mockParticipant = {
        _id: createObjectId(),
        email,
        name: 'Test Participant',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockParticipantRepository.findByEmail = jest.fn().mockResolvedValue(mockParticipant);

      const result = await participantService.getByEmail(email);

      expect(result).toEqual(
        expect.objectContaining({
          email,
          name: 'Test Participant',
        })
      );
      expect(mockParticipantRepository.findByEmail).toHaveBeenCalledWith(email);
    });

    it('should throw NotFoundError when participant not found by email', async () => {
      const email = 'nonexistent@example.com';
      const error = new NotFoundError('Participant', email);
      mockParticipantRepository.findByEmail = jest.fn().mockResolvedValue(null);

      await expect(participantService.getByEmail(email)).rejects.toThrow(error);
    });
  });

  describe('findOrCreateByEmail', () => {
    it('should return existing participant if found', async () => {
      const email = 'existing@example.com';
      const mockParticipant = {
        _id: createObjectId(),
        email,
        name: 'Existing Participant',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockParticipantRepository.findOrCreateByEmail = jest.fn().mockResolvedValue({
        participant: mockParticipant,
        created: false,
      });

      const result = await participantService.findOrCreateByEmail({
        email,
        name: 'New Name',
      });

      expect(result.participant).toEqual(mockParticipant);
      expect(result.created).toBe(false);
      expect(mockParticipantRepository.findOrCreateByEmail).toHaveBeenCalledWith(
        email,
        expect.objectContaining({
          name: 'New Name',
        })
      );
    });

    it('should create new participant if not found', async () => {
      const email = 'new@example.com';
      const name = 'New Participant';
      const newParticipant = {
        _id: createObjectId(),
        email,
        name,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockParticipantRepository.findOrCreateByEmail = jest.fn().mockResolvedValue({
        participant: newParticipant,
        created: true,
      });

      const result = await participantService.findOrCreateByEmail({ email, name });

      expect(result.participant).toEqual(newParticipant);
      expect(result.created).toBe(true);
      expect(mockParticipantRepository.findOrCreateByEmail).toHaveBeenCalledWith(
        email,
        expect.objectContaining({
          name,
        })
      );
    });
  });

  describe('update', () => {
    it('should update participant successfully', async () => {
      const participantId = createObjectId();
      const updatedParticipant = {
        _id: participantId,
        email: 'test@example.com',
        name: 'Updated Name',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockParticipantRepository.updateByIdOrThrow = jest
        .fn()
        .mockResolvedValue(updatedParticipant);

      const result = await participantService.update(participantId.toString(), {
        name: 'Updated Name',
      });

      expect(result).toEqual(
        expect.objectContaining({
          name: 'Updated Name',
        })
      );
      expect(mockParticipantRepository.updateByIdOrThrow).toHaveBeenCalledWith(
        participantId.toString(),
        expect.objectContaining({
          name: 'Updated Name',
        }),
        'Participant'
      );
    });

    it('should throw NotFoundError when updating non-existent participant', async () => {
      const participantId = createObjectId();
      const error = new NotFoundError('Participant', participantId.toString());
      mockParticipantRepository.updateByIdOrThrow = jest.fn().mockRejectedValue(error);

      await expect(
        participantService.update(participantId.toString(), { name: 'New Name' })
      ).rejects.toThrow(error);
    });
  });

  describe('delete', () => {
    it('should delete participant and associated sessions/conversations', async () => {
      const participantId = createObjectId();
      const sessionIds = [createObjectId(), createObjectId()];

      mockParticipantRepository.findByIdOrThrow = jest.fn().mockResolvedValue({
        _id: participantId,
        email: 'test@example.com',
      });
      mockParticipantRepository.getSessionIds = jest.fn().mockResolvedValue(sessionIds);
      mockConversationRepository.deleteMany = jest.fn().mockResolvedValue(2);
      mockSessionRepository.deleteMany = jest.fn().mockResolvedValue(5);
      mockParticipantRepository.deleteByIdOrThrow = jest.fn().mockResolvedValue(undefined);

      const result = await participantService.delete(participantId.toString());

      expect(result).toEqual({ sessionsDeleted: 5 });
      expect(mockConversationRepository.deleteMany).toHaveBeenCalledWith({
        sessionId: { $in: sessionIds },
      });
      expect(mockSessionRepository.deleteMany).toHaveBeenCalledWith({
        participantId,
      });
      expect(mockParticipantRepository.deleteByIdOrThrow).toHaveBeenCalledWith(
        participantId,
        'Participant'
      );
    });

    it('should throw NotFoundError when deleting non-existent participant', async () => {
      const participantId = createObjectId();
      const error = new NotFoundError('Participant', participantId.toString());
      mockParticipantRepository.findByIdOrThrow = jest.fn().mockRejectedValue(error);

      await expect(participantService.delete(participantId.toString())).rejects.toThrow(error);
    });
  });
});
