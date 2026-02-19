import { ObjectId } from 'mongodb';
import { ParticipantRepository } from '../repositories/participant.repository';
import { SessionRepository } from '../repositories/session.repository';
import { ConversationRepository } from '@repositories';
import {
  UpdateParticipantInput,
  AgentParticipantsQueryInput,
  CreateParticipantInternalInput,
  ParticipantQueryInput,
} from '../validations/participant.validation';
import { ParticipantDTO, ParticipantWithStatsDTO, ParticipantDocument } from '@models';
import { NotFoundError } from '../utils/errors';
import { createLogger } from '../utils/logger';
import { PaginatedResult, toObjectId } from '@utils';

const logger = createLogger('ParticipantService');

export class ParticipantService {
  constructor(
    private readonly participantRepository: ParticipantRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly conversationRepository: ConversationRepository
  ) {}

  // ============================================
  // CONTROLLER-FACING OPERATIONS (→ DTOs)
  // ============================================

  /**
   * Get participant by ID
   */
  async getById(participantId: string | ObjectId): Promise<ParticipantDTO> {
    const participant = await this.participantRepository.findByIdOrThrow(
      participantId,
      'Participant'
    );
    return this.toResponse(participant);
  }

  /**
   * Get participant by email
   */
  async getByEmail(email: string): Promise<ParticipantDTO> {
    const participant = await this.participantRepository.findByEmail(email);
    if (!participant) {
      throw new NotFoundError('Participant', email);
    }
    return this.toResponse(participant);
  }

  /**
   * Update participant (name and metadata only)
   */
  async update(
    participantId: string | ObjectId,
    input: UpdateParticipantInput
  ): Promise<ParticipantDTO> {
    const updateData: Partial<ParticipantDocument> = {};

    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    if (input.metadata !== undefined) {
      updateData.metadata = input.metadata;
    }

    const participant = await this.participantRepository.updateByIdOrThrow(
      participantId,
      updateData,
      'Participant'
    );

    logger.info('Participant updated', {
      participantId: participant._id.toString(),
    });

    return this.toResponse(participant);
  }

  /**
   * List participants with filters   */
  async list(
    agentIds: ObjectId[],
    query: ParticipantQueryInput
  ): Promise<PaginatedResult<ParticipantDTO>> {
    const result = await this.participantRepository.findByAgentIdsWithFilters(agentIds, {
      agentId: query.agentId ? new ObjectId(query.agentId) : undefined,
      page: query.page,
      limit: query.limit,
    });

    return this.toPaginatedResponse(result);
  }

  /**
   * List participants for an agent (with session stats)
   */
  async listByAgent(
    agentId: string | ObjectId,
    query: AgentParticipantsQueryInput
  ): Promise<PaginatedResult<ParticipantWithStatsDTO>> {
    const id = toObjectId(agentId);

    const result = await this.participantRepository.findByAgentWithStats(id, {
      status: query.status,
      page: query.page,
      limit: query.limit,
    });

    return {
      ...result,
      data: result.data.map((p) => this.toResponseWithStats(p)),
    };
  }

  /**
   * Delete participant with cascade to sessions and conversations
   */
  async delete(participantId: string | ObjectId): Promise<{ sessionsDeleted: number }> {
    const id = toObjectId(participantId);

    await this.participantRepository.findByIdOrThrow(id, 'Participant');

    const sessionIds = await this.participantRepository.getSessionIds(id);

    if (sessionIds.length > 0) {
      await this.conversationRepository.deleteMany({
        sessionId: { $in: sessionIds },
      });
    }

    const sessionsDeleted = await this.sessionRepository.deleteMany({
      participantId: id,
    });

    await this.participantRepository.deleteByIdOrThrow(id, 'Participant');

    logger.info('Participant deleted with cascade', {
      participantId: id.toString(),
      sessionsDeleted,
    });

    return { sessionsDeleted };
  }

  // ============================================
  // INTERNAL OPERATIONS (Service-to-service → Documents)
  // ============================================

  /**
   * Find or create participant by email (used by SessionService)
   * Atomic operation - safe for concurrent calls
   */
  async findOrCreateByEmail(
    input: CreateParticipantInternalInput
  ): Promise<{ participant: ParticipantDocument; created: boolean }> {
    const result = await this.participantRepository.findOrCreateByEmail(input.email, {
      name: input.name,
      metadata: input.metadata,
    });

    if (result.created) {
      logger.info('Participant created', {
        participantId: result.participant._id.toString(),
        email: input.email,
      });
    }

    return result;
  }

  // ============================================
  // RESPONSE TRANSFORMERS (private)
  // ============================================

  private toResponse(participant: ParticipantDocument): ParticipantDTO {
    return {
      _id: participant._id.toString(),
      email: participant.email,
      name: participant.name,
      metadata: participant.metadata,
      createdAt: participant.createdAt.toISOString(),
      updatedAt: participant.updatedAt.toISOString(),
    };
  }

  private toResponseWithStats(
    participant: ParticipantDocument & { sessionCount: number; lastSessionAt: Date | null }
  ): ParticipantWithStatsDTO {
    return {
      ...this.toResponse(participant),
      sessionCount: participant.sessionCount,
      lastSessionAt: participant.lastSessionAt?.toISOString(),
    };
  }

  private toPaginatedResponse(
    result: PaginatedResult<ParticipantDocument>
  ): PaginatedResult<ParticipantDTO> {
    return {
      ...result,
      data: result.data.map((doc) => this.toResponse(doc)),
    };
  }
}
