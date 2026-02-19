import { ConfigurationError } from '@utils';

// ============================================
// STORAGE CONFIGURATION
// ============================================

export interface StorageConfig {
  /** GCS bucket name for video storage */
  bucketName: string;

  /** Path to the GCS service account key file */
  keyFilePath: string;

  /** Signed URL expiry duration in seconds (default: 7 days) */
  signedUrlExpirySeconds: number;

  /** Maximum upload file size in bytes (default: 50MB) */
  maxFileSizeBytes: number;
}

export const loadStorageConfig = (): StorageConfig => {
  const bucketName = process.env.GCS_BUCKET_NAME;
  if (!bucketName) {
    throw new ConfigurationError('GCS_BUCKET_NAME is required');
  }

  const keyFilePath = process.env.GCS_KEY_FILE_PATH;
  if (!keyFilePath) {
    throw new ConfigurationError('GCS_KEY_FILE_PATH is required');
  }

  return {
    bucketName,
    keyFilePath,
    signedUrlExpirySeconds: parseInt(process.env.GCS_SIGNED_URL_EXPIRY_SECONDS || '604800', 10),
    maxFileSizeBytes: parseInt(process.env.GCS_MAX_FILE_SIZE_BYTES || '52428800', 10),
  };
};
