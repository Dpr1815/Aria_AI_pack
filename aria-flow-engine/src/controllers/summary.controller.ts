import { Request, Response, NextFunction } from 'express';
import { SummaryService } from '../services/summary.service';
import { ApiResponseBuilder } from '../utils/response';
import { GenerateSummaryInput, SummaryQueryInput } from '../validations/summary.validation';

export class SummaryController {
  constructor(private readonly summaryService: SummaryService) {}

  // ============================================
  // STANDALONE ROUTES
  // ============================================

  /**
   * GET /summaries
   * List summaries with filters (agentId, participantId, typeId)
   */
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query as unknown as SummaryQueryInput;
      const result = await this.summaryService.list(req.tenantAgentIds!, query);

      res
        .status(200)
        .json(ApiResponseBuilder.paginated(result.data, result.page, result.limit, result.total));
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /summaries/:id
   * Get summary by ID
   */
  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const summary = await this.summaryService.getById(req.params.id);

      res.status(200).json(ApiResponseBuilder.success(summary));
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /summaries/:id
   * Delete summary
   */
  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.summaryService.delete(req.params.id);

      res.status(200).json(ApiResponseBuilder.deleted('Summary deleted successfully'));
    } catch (error) {
      next(error);
    }
  };

  // ============================================
  // SESSION-SCOPED ROUTES
  // ============================================

  /**
   * POST /summaries/session/:sessionId
   * Generate summary for a session
   */
  generate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const summary = await this.summaryService.generate(req.params.sessionId);

      res.status(201).json(ApiResponseBuilder.created(summary, 'Summary generated successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /summaries/session/:sessionId
   * Get summary by session ID
   */
  getBySessionId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const summary = await this.summaryService.getBySessionId(req.params.sessionId);

      res.status(200).json(ApiResponseBuilder.success(summary));
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /summaries/session/:sessionId/regenerate
   * Regenerate summary for a session
   */
  regenerate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input: GenerateSummaryInput = req.body;
      const summary = await this.summaryService.regenerate(req.params.sessionId, input);

      res.status(200).json(ApiResponseBuilder.success(summary, 'Summary regenerated successfully'));
    } catch (error) {
      next(error);
    }
  };
}
