import { ObjectId } from 'mongodb';
import { createHash } from 'crypto';
import jwt, { SignOptions } from 'jsonwebtoken';
import { SessionRepository } from '../repositories/session.repository';
import { ParticipantService, ConversationService, AgentService } from '@services';

import { SessionDocument } from '../models/documents/session.document';
import { ParticipantDocument } from '../models/documents/participant.document';
import {
  JoinSessionInput,
  SessionQueryInput,
  SessionStatus,
} from '../validations/session.validation';
import {
  AgentDTO,
  SessionDTO,
  SessionDetailDTO,
  SessionWithParticipantDTO,
  JoinSessionResponseDTO,
} from '@models';
import { TenantContext } from '../middleware/tenant.middleware';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/errors';
import { createLogger, PaginatedResult, toObjectId } from '@utils';

const logger = createLogger('SessionService');

// ============================================
// CONFIGURATION
// ============================================

interface SessionServiceConfig {
  jwtSecret: string;
  accessTokenExpirySeconds?: number; // defaults to 7200 (2 hours)
}

const DEFAULT_ACCESS_TOKEN_EXPIRY_SECONDS = 7200; // 2 hours

// ============================================
// JWT PAYLOAD
// ============================================

interface SessionTokenPayload {
  sub: string; // session ID
  sid: string; // session ID (duplicate for clarity)
  pid: string; // participant ID
  aid: string; // agent ID
  type: 'session_access';
  iat: number;
  exp: number;
}

// ============================================
// SERVICE
// ============================================

export class SessionService {
  private readonly config: Required<SessionServiceConfig>;

  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly participantService: ParticipantService,
    private readonly conversationService: ConversationService,
    private readonly agentService: AgentService,
    config: SessionServiceConfig
  ) {
    this.config = {
      jwtSecret: config.jwtSecret,
      accessTokenExpirySeconds:
        config.accessTokenExpirySeconds ?? DEFAULT_ACCESS_TOKEN_EXPIRY_SECONDS,
    };
  }

  // ============================================
  // JOIN SESSION
  // ============================================

  /**
   * Join a session - creates participant if needed, handles persistence logic.
   * Requires the agent to be active.
   */
  async joinSession(input: JoinSessionInput): Promise<JoinSessionResponseDTO> {
    const agent = await this.agentService.getAgent(input.agentId, {
      includeSteps: false,
      includePrompts: false,
      includeAssessment: false,
    });

    if (agent.status !== 'active') {
      throw new ValidationError('Agent is not active');
    }

    return this.resolveSession(agent, input);
  }

  /**
   * Test join - allows the agent owner (or org member) to join
   * regardless of agent status, for testing conversations.
   */
  async testJoinSession(
    input: JoinSessionInput,
    tenant: TenantContext
  ): Promise<JoinSessionResponseDTO> {
    const agent = await this.agentService.getAgent(input.agentId, {
      includeSteps: false,
      includePrompts: false,
      includeAssessment: false,
    });

    this.verifyAgentAccess(agent, tenant);

    return this.resolveSession(agent, input);
  }

  // ============================================
  // CONTROLLER-FACING OPERATIONS (→ DTOs)
  // ============================================

  /**
   * Get session with full details   */
  async getDetailById(sessionId: string | ObjectId): Promise<SessionDetailDTO> {
    const session = await this.sessionRepository.findByIdOrThrow(sessionId, 'Session');
    return this.toDetailResponse(session);
  }

  /**
   * List sessions with filters   */
  async list(agentIds: ObjectId[], query: SessionQueryInput): Promise<PaginatedResult<SessionDTO>> {
    const result = await this.sessionRepository.findByAgentIdsWithFilters(agentIds, {
      agentId: query.agentId ? new ObjectId(query.agentId) : undefined,
      participantId: query.participantId ? new ObjectId(query.participantId) : undefined,
      status: query.status,
      page: query.page,
      limit: query.limit,
    });

    return this.toPaginatedResponse(result);
  }

  /**
   * List sessions for an agent (with participant info)
   */
  async listByAgent(
    agentId: string | ObjectId,
    query: SessionQueryInput
  ): Promise<PaginatedResult<SessionWithParticipantDTO>> {
    const id = toObjectId(agentId);
    const participantId = query.participantId ? new ObjectId(query.participantId) : undefined;

    const result = await this.sessionRepository.findByAgentWithParticipant(id, {
      participantId,
      status: query.status,
      page: query.page,
      limit: query.limit,
    });

    return {
      ...result,
      data: result.data.map((s) => this.toResponseWithParticipant(s)),
    };
  }

  /**
   * Complete a session   */
  async completeSession(sessionId: string | ObjectId): Promise<SessionDTO> {
    const id = toObjectId(sessionId);
    const existing = await this.sessionRepository.findByIdOrThrow(id, 'Session');

    if (existing.status !== 'active') {
      throw new ValidationError(`Cannot complete session with status '${existing.status}' (must be 'active')`);
    }

    const session = await this.sessionRepository.updateStatus(id, 'completed');
    if (!session) {
      throw new NotFoundError('Session', String(sessionId));
    }

    logger.info('Session completed', { sessionId: session._id.toString() });
    return this.toResponse(session);
  }

  /**
   * Abandon a session   */
  async abandonSession(sessionId: string | ObjectId): Promise<SessionDTO> {
    const id = toObjectId(sessionId);
    const existing = await this.sessionRepository.findByIdOrThrow(id, 'Session');

    if (existing.status !== 'active') {
      throw new ValidationError(`Cannot abandon session with status '${existing.status}' (must be 'active')`);
    }

    const session = await this.sessionRepository.updateStatus(id, 'abandoned');
    if (!session) {
      throw new NotFoundError('Session', String(sessionId));
    }

    logger.info('Session abandoned', { sessionId: session._id.toString() });
    return this.toResponse(session);
  }

  /**
   * Refresh access token for an active session   */
  async refreshAccessToken(sessionId: string | ObjectId): Promise<{
    accessToken: string;
    expiresAt: string;
  }> {
    const session = await this.sessionRepository.findByIdOrThrow(sessionId, 'Session');

    if (session.status !== 'active') {
      throw new ValidationError('Cannot refresh token for non-active session');
    }

    const { token, hash, expiresAt } = this.generateAccessToken(
      session._id,
      session.participantId,
      session.agentId
    );

    await this.sessionRepository.updateAccessToken(session._id, hash, expiresAt);

    return { accessToken: token, expiresAt: expiresAt.toISOString() };
  }

  /**
   * Delete session and its conversation   */
  async delete(sessionId: string | ObjectId): Promise<void> {
    const id = toObjectId(sessionId);

    await this.conversationService.deleteBySession(id);
    await this.sessionRepository.deleteByIdOrThrow(id, 'Session');

    logger.info('Session deleted', { sessionId: id.toString() });
  }

  // ============================================
  // INTERNAL OPERATIONS (Service-to-service → Documents)
  // ============================================

  /**
   * Get session document by ID
   * Used internally by ConversationController for ownership checks,
   * SummaryService, and WebSocket engine.
   */
  async getById(sessionId: string | ObjectId): Promise<SessionDocument> {
    return this.sessionRepository.findByIdOrThrow(sessionId, 'Session');
  }

  /**
   * List sessions for owner's dashboard (document-level)
   */
  async listByOwner(
    ownerId: ObjectId,
    query: SessionQueryInput & { agentId?: string }
  ): Promise<PaginatedResult<SessionDocument>> {
    const agentId = query.agentId ? new ObjectId(query.agentId) : undefined;

    return this.sessionRepository.findByOwner(ownerId, {
      agentId,
      status: query.status,
      page: query.page,
      limit: query.limit,
    });
  }

  // ============================================
  // TOKEN VALIDATION (for WebSocket auth)
  // ============================================

  /**
   * Validate access token and return session
   * Used by WebSocket server for authentication
   */
  async validateAccessToken(token: string): Promise<{
    valid: boolean;
    session?: SessionDocument;
    payload?: SessionTokenPayload;
    error?: string;
  }> {
    try {
      const payload = jwt.verify(token, this.config.jwtSecret) as SessionTokenPayload;

      if (payload.type !== 'session_access') {
        return { valid: false, error: 'Invalid token type' };
      }

      const hash = this.hashToken(token);
      const session = await this.sessionRepository.findByAccessTokenHash(hash);

      if (!session) {
        return { valid: false, error: 'Session not found or token expired' };
      }

      if (session.status === 'completed' || session.status === 'abandoned') {
        return { valid: false, error: `Session is ${session.status}` };
      }

      return { valid: true, session, payload };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return { valid: false, error: 'Token expired' };
      }
      if (error instanceof jwt.JsonWebTokenError) {
        return { valid: false, error: 'Invalid token' };
      }
      return { valid: false, error: 'Token validation failed' };
    }
  }

  // ============================================
  // STATISTICS
  // ============================================

  /**
   * Get session statistics for an agent
   */
  async getAgentStats(agentId: string | ObjectId): Promise<{
    total: number;
    byStatus: Record<SessionStatus, number>;
  }> {
    const id = toObjectId(agentId);
    const byStatus = await this.sessionRepository.countByStatus(id);
    const total = byStatus.active + byStatus.completed + byStatus.abandoned;

    return { total, byStatus };
  }

  // ============================================
  // RESPONSE TRANSFORMERS (private)
  // ============================================

  private toResponse(session: SessionDocument): SessionDTO {
    return {
      _id: session._id.toString(),
      agentId: session.agentId.toString(),
      participantId: session.participantId.toString(),
      status: session.status,
      currentStep: session.currentStep,
      lastActivityAt: session.lastActivityAt.toISOString(),
      completedAt: session.completedAt?.toISOString(),
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    };
  }

  private toDetailResponse(session: SessionDocument): SessionDetailDTO {
    return {
      ...this.toResponse(session),
      data: session.data,
      videoLinks: session.videoLinks,
    };
  }

  private toResponseWithParticipant(
    session: SessionDocument & { participant: { _id: ObjectId; email: string; name?: string } }
  ): SessionWithParticipantDTO {
    return {
      ...this.toResponse(session),
      participant: {
        _id: session.participant._id.toString(),
        email: session.participant.email,
        name: session.participant.name,
      },
    };
  }

  private toPaginatedResponse(
    result: PaginatedResult<SessionDocument>
  ): PaginatedResult<SessionDTO> {
    return {
      ...result,
      data: result.data.map((doc) => this.toResponse(doc)),
    };
  }

  private buildJoinResponse(
    session: SessionDocument,
    accessToken: string,
    expiresAt: Date,
    isResumed: boolean,
    participant: ParticipantDocument
  ): JoinSessionResponseDTO {
    return {
      session: this.toResponse(session),
      accessToken,
      expiresAt: expiresAt.toISOString(),
      isResumed,
      participant: {
        _id: participant._id.toString(),
        email: participant.email,
        name: participant.name,
      },
    };
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  /**
   * Shared session creation/resumption logic used by both joinSession and testJoinSession.
   */
  private async resolveSession(
    agent: AgentDTO,
    input: JoinSessionInput
  ): Promise<JoinSessionResponseDTO> {
    const agentId = new ObjectId(agent._id);

    const { participant, created: participantCreated } =
      await this.participantService.findOrCreateByEmail({
        email: input.email,
        name: input.name,
        metadata: input.metadata,
      });

    const participantId = participant._id;

    let session: SessionDocument | null = null;
    let isResumed = false;

    if (agent.features?.sessionPersistence) {
      session = await this.sessionRepository.findActiveSession(participantId, agentId);

      if (session) {
        isResumed = true;
        logger.info('Resuming existing session', {
          sessionId: session._id.toString(),
          participantId: participantId.toString(),
        });
      }
    }

    if (!session) {
      const initialStep = agent.stepOrder?.[0] || 'intro';

      // Create session first, then generate token with the real session ID
      session = await this.sessionRepository.create({
        agentId,
        participantId,
        agentOwnerId: new ObjectId(agent.ownerId),
        accessTokenHash: '',
        accessTokenExpiresAt: new Date(),
        status: 'active',
        currentStep: initialStep,
        data: {},
        lastActivityAt: new Date(),
      } as Omit<SessionDocument, '_id' | 'createdAt' | 'updatedAt'>);

      const { token: accessToken, hash: accessTokenHash, expiresAt } =
        this.generateAccessToken(session._id, participantId, agentId);

      await this.sessionRepository.updateAccessToken(session._id, accessTokenHash, expiresAt);

      await this.conversationService.createForSession(session._id, agentId, participantId);

      logger.info('Created new session', {
        sessionId: session._id.toString(),
        participantId: participantId.toString(),
        agentId: agentId.toString(),
        participantCreated,
      });

      return this.buildJoinResponse(session, accessToken, expiresAt, false, participant);
    } else {
      const { token: accessToken, hash: accessTokenHash, expiresAt } =
        this.generateAccessToken(session._id, participantId, agentId);

      await this.sessionRepository.updateAccessToken(session._id, accessTokenHash, expiresAt);
      session = await this.sessionRepository.findByIdOrThrow(session._id, 'Session');

      return this.buildJoinResponse(session, accessToken, expiresAt, true, participant);
    }
  }

  /**
   * Verify the tenant has access to the agent.
   * Personal: agent must be owned by the user.
   * Organization: agent must belong to the tenant's org.
   */
  private verifyAgentAccess(agent: AgentDTO, tenant: TenantContext): void {
    if (tenant.type === 'personal') {
      if (agent.ownerId !== tenant.userId.toString()) {
        throw new ForbiddenError('Access denied');
      }
    } else {
      if (agent.organizationId !== tenant.organizationId.toString()) {
        throw new ForbiddenError('Access denied');
      }
    }
  }

  private generateAccessToken(
    sessionId: ObjectId,
    participantId: ObjectId,
    agentId: ObjectId
  ): { token: string; hash: string; expiresAt: Date } {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + this.config.accessTokenExpirySeconds;
    const expiresAt = new Date(exp * 1000);

    const payload: Omit<SessionTokenPayload, 'iat' | 'exp'> = {
      sub: sessionId.toString(),
      sid: sessionId.toString(),
      pid: participantId.toString(),
      aid: agentId.toString(),
      type: 'session_access',
    };

    const signOptions: SignOptions = {
      expiresIn: this.config.accessTokenExpirySeconds,
    };

    const token = jwt.sign(payload, this.config.jwtSecret, signOptions);
    const hash = this.hashToken(token);

    return { token, hash, expiresAt };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
