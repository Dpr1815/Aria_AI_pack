import { Request, Response, NextFunction } from 'express';
import { SessionService } from '@services';
import { VideoService } from '../services/video.service';
import { ApiResponseBuilder } from '../utils/response';
import { JoinSessionInput, SessionQueryInput } from '../validations/session.validation';
import { ValidationError } from '../utils/errors';

export class SessionController {
  constructor(
    private readonly sessionService: SessionService,
    private readonly videoService: VideoService
  ) {}

  // ============================================
  // SESSION LIFECYCLE
  // ============================================

  join = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input: JoinSessionInput = req.body;
      const result = await this.sessionService.joinSession(input);

      res
        .status(result.isResumed ? 200 : 201)
        .json(
          result.isResumed
            ? ApiResponseBuilder.success(result, 'Session resumed successfully')
            : ApiResponseBuilder.created(result, 'Session created successfully')
        );
    } catch (error) {
      next(error);
    }
  };

  testJoin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input: JoinSessionInput = req.body;
      const result = await this.sessionService.testJoinSession(input, req.tenant!);

      res
        .status(result.isResumed ? 200 : 201)
        .json(
          result.isResumed
            ? ApiResponseBuilder.success(result, 'Test session resumed successfully')
            : ApiResponseBuilder.created(result, 'Test session created successfully')
        );
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const detail = await this.sessionService.getDetailById(req.params.id);

      res.status(200).json(ApiResponseBuilder.success(detail));
    } catch (error) {
      next(error);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query as unknown as SessionQueryInput;
      const result = await this.sessionService.list(req.tenantAgentIds!, query);

      res
        .status(200)
        .json(ApiResponseBuilder.paginated(result.data, result.page, result.limit, result.total));
    } catch (error) {
      next(error);
    }
  };

  listByAgent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query as unknown as SessionQueryInput;
      const result = await this.sessionService.listByAgent(req.params.agentId, query);

      res
        .status(200)
        .json(ApiResponseBuilder.paginated(result.data, result.page, result.limit, result.total));
    } catch (error) {
      next(error);
    }
  };

  complete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const completed = await this.sessionService.completeSession(req.params.id);

      res.status(200).json(ApiResponseBuilder.success(completed, 'Session completed successfully'));
    } catch (error) {
      next(error);
    }
  };

  abandon = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const abandoned = await this.sessionService.abandonSession(req.params.id);

      res.status(200).json(ApiResponseBuilder.success(abandoned, 'Session abandoned successfully'));
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.sessionService.delete(req.params.id);

      res.status(200).json(ApiResponseBuilder.deleted('Session deleted successfully'));
    } catch (error) {
      next(error);
    }
  };

  refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.sessionService.refreshAccessToken(req.params.id);

      res.status(200).json(ApiResponseBuilder.success(result, 'Token refreshed successfully'));
    } catch (error) {
      next(error);
    }
  };

  getStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await this.sessionService.getAgentStats(req.params.agentId);

      res.status(200).json(ApiResponseBuilder.success(stats));
    } catch (error) {
      next(error);
    }
  };

  // ============================================
  // VIDEO OPERATIONS (session-auth)
  // ============================================

  /**
   * POST /sessions/:id/upload-video
   * Uploads a video recording for a specific session step.
   * Authenticated via session access token.
   */
  uploadVideo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { sessionAuth } = req;

      if (!sessionAuth) {
        throw new ValidationError('Session authentication context missing');
      }

      if (!req.file) {
        throw new ValidationError('Video file is required');
      }

      const step = req.body.step;
      if (!step) {
        throw new ValidationError('Step name is required');
      }

      // Ensure the route param matches the authenticated session
      if (req.params.id !== sessionAuth.sessionId.toString()) {
        throw new ValidationError('Session ID mismatch');
      }

      const result = await this.videoService.upload({
        sessionId: sessionAuth.sessionId.toString(),
        agentId: sessionAuth.agentId.toString(),
        step,
        buffer: req.file.buffer,
        mimeType: req.file.mimetype,
        originalName: req.file.originalname,
      });

      res.status(201).json(ApiResponseBuilder.created(result, 'Video uploaded successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /sessions/:id/video-urls
   * Returns fresh signed URLs for all videos in a session.
   * Authenticated via owner auth.
   */
  getVideoUrls = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const urls = await this.videoService.getAllSignedUrls(req.params.id);

      res.status(200).json(ApiResponseBuilder.success(urls));
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /sessions/:id/video-url/:step
   * Generates a fresh signed URL for a single session video.
   * Authenticated via owner auth.
   */
  getVideoUrl = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const signedUrl = await this.videoService.getSignedUrl(req.params.id, req.params.step);

      res.status(200).json(ApiResponseBuilder.success({ signedUrl, step: req.params.step }));
    } catch (error) {
      next(error);
    }
  };
}
