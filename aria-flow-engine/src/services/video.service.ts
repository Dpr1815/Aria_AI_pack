import { ObjectId } from 'mongodb';
import { IStorageConnector } from '../connectors/storage';
import { SessionRepository } from '../repositories/session.repository';
import { createLogger } from '../utils/logger';
import { NotFoundError, ValidationError } from '../utils/errors';
import { toObjectId } from '@utils';

const logger = createLogger('VideoService');

// ============================================
// CONFIGURATION
// ============================================

export interface VideoServiceConfig {
  /** Signed URL expiry in seconds */
  signedUrlExpirySeconds: number;

  /** Max upload size in bytes */
  maxFileSizeBytes: number;

  /** Allowed MIME types */
  allowedMimeTypes: string[];
}

const DEFAULT_CONFIG: VideoServiceConfig = {
  signedUrlExpirySeconds: 604_800, // 7 days
  maxFileSizeBytes: 52_428_800, // 50 MB
  allowedMimeTypes: ['video/webm'],
};

// ============================================
// TYPES
// ============================================

export interface VideoUploadInput {
  sessionId: string;
  agentId: string;
  step: string;
  buffer: Buffer;
  mimeType: string;
  originalName: string;
}

export interface VideoUploadResult {
  filePath: string;
  signedUrl: string;
  step: string;
}

// ============================================
// SERVICE
// ============================================

export class VideoService {
  private readonly config: VideoServiceConfig;

  constructor(
    private readonly storage: IStorageConnector,
    private readonly sessionRepository: SessionRepository,
    config?: Partial<VideoServiceConfig>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Upload a video recording for a session step.
   *
   * Stores the file in GCS, generates a signed URL, and persists the
   * object path on the session document so URLs can be regenerated later.
   */
  async upload(input: VideoUploadInput): Promise<VideoUploadResult> {
    this.validateUpload(input);

    const session = await this.sessionRepository.findByIdOrThrow(input.sessionId, 'Session');

    if (session.status !== 'active') {
      throw new ValidationError('Cannot upload video to a non-active session');
    }

    if (session.agentId.toString() !== input.agentId) {
      throw new ValidationError('Agent ID does not match session');
    }

    const fileName = `${input.step}_${Date.now()}.webm`;
    const filePath = `videos/${input.agentId}/${input.sessionId}/${fileName}`;

    await this.storage.upload(filePath, input.buffer, {
      contentType: input.mimeType,
      custom: {
        sessionId: input.sessionId,
        agentId: input.agentId,
        step: input.step,
      },
    });

    const signedUrl = await this.storage.getSignedUrl(filePath, this.config.signedUrlExpirySeconds);

    // Persist the *object path* (not the signed URL) so we can regenerate URLs later
    await this.sessionRepository.updateById(session._id, {
      $set: {
        [`videoLinks.${input.step}`]: filePath,
        lastActivityAt: new Date(),
      },
    });

    logger.info('Video uploaded', {
      sessionId: input.sessionId,
      step: input.step,
      filePath,
    });

    return { filePath, signedUrl, step: input.step };
  }

  /**
   * Generate a fresh signed URL for an existing video.
   */
  async getSignedUrl(sessionId: string | ObjectId, step: string): Promise<string> {
    const session = await this.sessionRepository.findByIdOrThrow(sessionId, 'Session');
    const filePath = session.videoLinks?.[step];

    if (!filePath) {
      throw new NotFoundError('Video', `session=${sessionId}, step=${step}`);
    }

    const fileExists = await this.storage.exists(filePath);
    if (!fileExists) {
      throw new NotFoundError('Video file', filePath);
    }

    return this.storage.getSignedUrl(filePath, this.config.signedUrlExpirySeconds);
  }

  /**
   * Delete all videos associated with a session.
   */
  async deleteBySession(sessionId: string | ObjectId): Promise<number> {
    const id = toObjectId(sessionId);
    const session = await this.sessionRepository.findByIdOrThrow(id, 'Session');

    if (!session.videoLinks || Object.keys(session.videoLinks).length === 0) {
      return 0;
    }

    const deletions = Object.values(session.videoLinks).map((filePath) =>
      this.storage.delete(filePath).catch((err) => {
        logger.warn('Failed to delete video file', { filePath, error: (err as Error).message });
      })
    );

    await Promise.all(deletions);

    await this.sessionRepository.updateById(id, { $unset: { videoLinks: '' } });

    const count = deletions.length;
    logger.info('Session videos deleted', { sessionId: id.toString(), count });

    return count;
  }
  /**
   * Generate fresh signed URLs for all videos in a session.
   */
  async getAllSignedUrls(sessionId: string | ObjectId): Promise<Record<string, string>> {
    const session = await this.sessionRepository.findByIdOrThrow(sessionId, 'Session');

    if (!session.videoLinks || Object.keys(session.videoLinks).length === 0) {
      return {};
    }

    const entries = await Promise.all(
      Object.entries(session.videoLinks).map(async ([step, filePath]) => {
        try {
          const url = await this.storage.getSignedUrl(filePath, this.config.signedUrlExpirySeconds);
          return [step, url] as const;
        } catch {
          logger.warn('Failed to generate signed URL', {
            sessionId: String(sessionId),
            step,
            filePath,
          });
          return null;
        }
      })
    );

    return Object.fromEntries(entries.filter(Boolean) as [string, string][]);
  }
  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private validateUpload(input: VideoUploadInput): void {
    if (!this.config.allowedMimeTypes.includes(input.mimeType)) {
      throw new ValidationError(
        `Unsupported file type: ${input.mimeType}. Allowed: ${this.config.allowedMimeTypes.join(', ')}`
      );
    }

    if (input.buffer.length > this.config.maxFileSizeBytes) {
      const maxMB = Math.round(this.config.maxFileSizeBytes / (1024 * 1024));
      throw new ValidationError(`File size exceeds the ${maxMB}MB limit`);
    }

    if (!input.step || !input.sessionId || !input.agentId) {
      throw new ValidationError('Missing required upload fields: sessionId, agentId, step');
    }
  }
}
