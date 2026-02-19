import { ObjectId } from 'mongodb';
import { ConversationRepository } from '@repositories';
import { ConversationDocument } from '../models/documents/conversation.document';
import {
  MessageEntry,
  AddMessageInput,
  MessageFilterOptions,
} from '../validations/conversation.validation';
import {
  ConversationDTO,
  ConversationWithMessagesDTO,
  ConversationSummaryDTO,
  MessageDTO,
} from '@models';
import { NotFoundError } from '../utils/errors';
import { createLogger, toObjectId } from '@utils';
import { PaginatedResult } from '@utils';

const logger = createLogger('ConversationService');

export class ConversationService {
  constructor(private readonly conversationRepository: ConversationRepository) {}

  // ============================================
  // CREATION (called by SessionService)
  // ============================================

  /**
   * Create empty conversation for a new session
   */
  async createForSession(
    sessionId: ObjectId,
    agentId: ObjectId,
    participantId: ObjectId
  ): Promise<ConversationDocument> {
    const conversation = await this.conversationRepository.createForSession(
      sessionId,
      agentId,
      participantId
    );

    logger.info('Conversation created', {
      conversationId: conversation._id.toString(),
      sessionId: sessionId.toString(),
    });

    return conversation;
  }

  // ============================================
  // READ OPERATIONS (Controller-facing → DTOs)
  // ============================================

  /**
   * Get conversation by ID with messages (controller-facing)
   */
  async getByIdWithMessages(
    conversationId: string | ObjectId
  ): Promise<ConversationWithMessagesDTO> {
    const conversation = await this.conversationRepository.findByIdOrThrow(
      conversationId,
      'Conversation'
    );
    return this.toResponseWithMessages(conversation);
  }

  /**
   * Get conversation with messages by session ID (controller-facing)
   */
  async getBySessionIdWithMessages(
    sessionId: string | ObjectId,
    options?: MessageFilterOptions
  ): Promise<ConversationWithMessagesDTO> {
    const conversation = await this.getBySessionId(sessionId);
    return this.toResponseWithMessages(conversation, options);
  }

  /**
   * Get messages-only payload for a session (controller-facing, lighter payload)
   */
  async getSessionMessages(
    sessionId: string | ObjectId,
    options?: MessageFilterOptions
  ): Promise<{ sessionId: string; messageCount: number; messages: MessageDTO[] }> {
    const conversation = await this.getBySessionId(sessionId);
    const messages = this.filterMessages(conversation.messages, options);
    return {
      sessionId: conversation.sessionId.toString(),
      messageCount: messages.length,
      messages: messages.map((m) => this.messageToResponse(m)),
    };
  }

  /**
   * Get messages for a specific step (controller-facing)
   */
  async getMessagesForStep(
    sessionId: string | ObjectId,
    stepKey: string,
    options?: MessageFilterOptions
  ): Promise<MessageDTO[]> {
    const id = toObjectId(sessionId);
    const messages = await this.conversationRepository.getMessagesForStep(id, stepKey);
    return this.filterMessages(messages, options).map((m) => this.messageToResponse(m));
  }

  /**
   * Get last N messages (controller-facing)
   */
  async getLastMessages(sessionId: string | ObjectId, count: number): Promise<MessageDTO[]> {
    const id = toObjectId(sessionId);
    const messages = await this.conversationRepository.getLastMessages(id, count);
    return messages.map((m) => this.messageToResponse(m));
  }

  // ============================================
  // INTERNAL OPERATIONS (Service-to-service → Documents)
  // ============================================

  /**
   * Get conversation document by session ID
   * Used internally by SummaryService, WS engine, and other services.
   */
  async getBySessionId(sessionId: string | ObjectId): Promise<ConversationDocument> {
    const id = toObjectId(sessionId);
    const conversation = await this.conversationRepository.findBySessionId(id);

    if (!conversation) {
      throw new NotFoundError('Conversation', `session:${sessionId.toString()}`);
    }

    return conversation;
  }

  // ============================================
  // MESSAGE OPERATIONS (used by WS engine)
  // ============================================

  /**
   * Add a message to conversation
   */
  async addMessage(
    sessionId: string | ObjectId,
    input: AddMessageInput
  ): Promise<ConversationDocument> {
    const id = toObjectId(sessionId);

    const conversation = await this.conversationRepository.addMessage(id, {
      stepKey: input.stepKey,
      role: input.role,
      content: input.content,
      tokenCount: input.tokenCount,
      promptKey: input.promptKey,
      latencyMs: input.latencyMs,
    });

    if (!conversation) {
      throw new NotFoundError('Conversation', `session:${sessionId.toString()}`);
    }

    return conversation;
  }

  /**
   * Add multiple messages atomically
   */
  async addMessages(
    sessionId: string | ObjectId,
    messages: AddMessageInput[]
  ): Promise<ConversationDocument> {
    const id = toObjectId(sessionId);

    const conversation = await this.conversationRepository.addMessages(
      id,
      messages.map((m) => ({
        stepKey: m.stepKey,
        role: m.role,
        content: m.content,
        tokenCount: m.tokenCount,
        promptKey: m.promptKey,
        latencyMs: m.latencyMs,
      }))
    );

    if (!conversation) {
      throw new NotFoundError('Conversation', `session:${sessionId.toString()}`);
    }

    return conversation;
  }

  // ============================================
  // DELETE OPERATIONS
  // ============================================

  /**
   * Delete conversation by session ID
   */
  async deleteBySession(sessionId: ObjectId): Promise<void> {
    await this.conversationRepository.deleteBySessionId(sessionId);
    logger.info('Conversation deleted', { sessionId: sessionId.toString() });
  }

  /**
   * Delete conversations by participant (cascade)
   */
  async deleteByParticipant(participantId: ObjectId): Promise<number> {
    const count = await this.conversationRepository.deleteByParticipant(participantId);
    logger.info('Conversations deleted for participant', {
      participantId: participantId.toString(),
      count,
    });
    return count;
  }

  // ============================================
  // STATISTICS
  // ============================================

  /**
   * Get conversation statistics for an agent
   */
  async getAgentStats(agentId: string | ObjectId): Promise<{
    totalMessages: number;
    averageMessagesPerConversation: number;
  }> {
    const id = toObjectId(agentId);

    const [totalMessages, averageMessages] = await Promise.all([
      this.conversationRepository.getTotalMessageCount(id),
      this.conversationRepository.getAverageMessageCount(id),
    ]);

    return {
      totalMessages,
      averageMessagesPerConversation: Math.round(averageMessages * 100) / 100,
    };
  }

  // ============================================
  // RESPONSE TRANSFORMERS (private)
  // ============================================

  private messageToResponse(message: MessageEntry): MessageDTO {
    return {
      sequence: message.sequence,
      stepKey: message.stepKey,
      role: message.role,
      content: message.content,
      tokenCount: message.tokenCount,
      promptKey: message.promptKey,
      latencyMs: message.latencyMs,
      createdAt: message.createdAt.toISOString(),
    };
  }

  private toResponse(conversation: ConversationDocument): ConversationDTO {
    return {
      _id: conversation._id.toString(),
      sessionId: conversation.sessionId.toString(),
      agentId: conversation.agentId.toString(),
      participantId: conversation.participantId.toString(),
      messageCount: conversation.messageCount,
      stepMessageCounts: conversation.stepMessageCounts,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
    };
  }

  private filterMessages(messages: MessageEntry[], options?: MessageFilterOptions): MessageEntry[] {
    if (!options?.includeRoles?.length) return messages;
    return messages.filter((m) => options.includeRoles!.includes(m.role));
  }

  private toResponseWithMessages(
    conversation: ConversationDocument,
    options?: MessageFilterOptions
  ): ConversationWithMessagesDTO {
    const messages = this.filterMessages(conversation.messages, options);
    return {
      ...this.toResponse(conversation),
      messages: messages.map((m) => this.messageToResponse(m)),
    };
  }

  private toSummaryResponse(conversation: ConversationDocument): ConversationSummaryDTO {
    const lastMessage = conversation.messages[conversation.messages.length - 1];

    return {
      _id: conversation._id.toString(),
      sessionId: conversation.sessionId.toString(),
      agentId: conversation.agentId.toString(),
      participantId: conversation.participantId.toString(),
      messageCount: conversation.messageCount,
      lastMessageAt: lastMessage?.createdAt?.toISOString(),
      createdAt: conversation.createdAt.toISOString(),
    };
  }

  private toPaginatedSummaryResponse(
    result: PaginatedResult<ConversationDocument>
  ): PaginatedResult<ConversationSummaryDTO> {
    return {
      ...result,
      data: result.data.map((c) => this.toSummaryResponse(c)),
    };
  }
}
