import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import { StorageConfig } from '../config/storage.config';

const ALLOWED_MIME_TYPES = ['video/webm'];

/**
 * Creates a multer instance configured for in-memory video uploads.
 *
 * Uses memory storage so the buffer can be passed directly to thes
 * storage connector without touching the filesystem.
 */
export const createVideoUpload = (config: StorageConfig): multer.Multer => {
  return multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: config.maxFileSizeBytes,
    },
    fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
      if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
      }
    },
  });
};
