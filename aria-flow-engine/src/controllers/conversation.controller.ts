import { Request, Response, NextFunction } from 'express';
import { ConversationService } from '@services';
import { ApiResponseBuilder } from '../utils/response';
import { MessageFilterOptions } from '@validations/conversation.validation';

export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  // ============================================
  // GET /sessions/:sessionId/conversation (Protected)
  // ============================================

  /**
   * Get conversation by session ID with messages
   */
  getBySessionId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const options = req.query as unknown as MessageFilterOptions;
      const conversation = await this.conversationService.getBySessionIdWithMessages(
        req.params.sessionId,
        options
      );

      res.status(200).json(ApiResponseBuilder.success(conversation));
    } catch (error) {
      next(error);
    }
  };

  // ============================================
  // GET /sessions/:sessionId/conversation/messages (Protected)
  // ============================================

  /**
   * Get just the messages for a session (lighter payload)
   */
  getMessages = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const options = req.query as unknown as MessageFilterOptions;
      const messagesPayload = await this.conversationService.getSessionMessages(
        req.params.sessionId,
        options
      );

      res.status(200).json(ApiResponseBuilder.success(messagesPayload));
    } catch (error) {
      next(error);
    }
  };

  // ============================================
  // GET /sessions/:sessionId/conversation/steps/:stepKey/messages (Protected)
  // ============================================

  /**
   * Get messages for a specific step
   */
  getStepMessages = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const options = req.query as unknown as MessageFilterOptions;
      const messages = await this.conversationService.getMessagesForStep(
        req.params.sessionId,
        req.params.stepKey,
        options
      );

      res.status(200).json(
        ApiResponseBuilder.success({
          sessionId: req.params.sessionId,
          stepKey: req.params.stepKey,
          messageCount: messages.length,
          messages,
        })
      );
    } catch (error) {
      next(error);
    }
  };
}
