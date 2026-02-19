import { Bucket, Storage } from '@google-cloud/storage';
import { IStorageConnector, UploadMetadata } from './IStorageConnector';
import { createLogger, ExternalServiceError, CircuitBreaker } from '@utils';

const logger = createLogger('GCSConnector');

export interface GCSConnectorConfig {
  bucketName: string;
  keyFilePath: string;
}

export class GCSConnector implements IStorageConnector {
  private readonly storage: Storage;
  private readonly bucket: Bucket;
  private readonly breaker: CircuitBreaker;

  constructor(private readonly config: GCSConnectorConfig) {
    this.storage = new Storage({ keyFilename: config.keyFilePath });
    this.bucket = this.storage.bucket(config.bucketName);
    this.breaker = new CircuitBreaker('GoogleCloudStorage', {
      failureThreshold: 5,
      resetTimeoutMs: 60_000, // GCS regional outages take longer to recover
      monitorWindowMs: 60_000,
    });
  }

  async upload(filePath: string, buffer: Buffer, metadata: UploadMetadata): Promise<string> {
    return this.breaker.execute(async () => {
      try {
        const file = this.bucket.file(filePath);

        await file.save(buffer, {
          metadata: {
            contentType: metadata.contentType,
            metadata: metadata.custom,
          },
          resumable: false,
        });

        logger.info('File uploaded', { filePath, size: buffer.length });
        return filePath;
      } catch (error) {
        logger.error('Upload failed', error as Error, { filePath });
        throw new ExternalServiceError(
          'GoogleCloudStorage',
          `Upload failed: ${(error as Error).message}`
        );
      }
    });
  }

  async getSignedUrl(filePath: string, expirySeconds: number): Promise<string> {
    return this.breaker.execute(async () => {
      try {
        const file = this.bucket.file(filePath);

        const [url] = await file.getSignedUrl({
          version: 'v4',
          action: 'read',
          expires: Date.now() + expirySeconds * 1000,
        });

        return url;
      } catch (error) {
        logger.error('Signed URL generation failed', error as Error, { filePath });
        throw new ExternalServiceError(
          'GoogleCloudStorage',
          `Signed URL generation failed: ${(error as Error).message}`
        );
      }
    });
  }

  async delete(filePath: string): Promise<void> {
    return this.breaker.execute(async () => {
      try {
        await this.bucket.file(filePath).delete();
        logger.info('File deleted', { filePath });
      } catch (error) {
        logger.error('Delete failed', error as Error, { filePath });
        throw new ExternalServiceError(
          'GoogleCloudStorage',
          `Delete failed: ${(error as Error).message}`
        );
      }
    });
  }

  async deleteByPrefix(prefix: string): Promise<number> {
    return this.breaker.execute(async () => {
      try {
        const [files] = await this.bucket.getFiles({ prefix });

        if (files.length === 0) {
          return 0;
        }

        await Promise.all(files.map((file) => file.delete()));
        logger.info('Files deleted by prefix', { prefix, count: files.length });

        return files.length;
      } catch (error) {
        logger.error('Delete by prefix failed', error as Error, { prefix });
        throw new ExternalServiceError(
          'GoogleCloudStorage',
          `Delete by prefix failed: ${(error as Error).message}`
        );
      }
    });
  }

  async exists(filePath: string): Promise<boolean> {
    return this.breaker.execute(async () => {
      try {
        const [fileExists] = await this.bucket.file(filePath).exists();
        return fileExists;
      } catch (error) {
        logger.error('Existence check failed', error as Error, { filePath });
        throw new ExternalServiceError(
          'GoogleCloudStorage',
          `Existence check failed: ${(error as Error).message}`
        );
      }
    });
  }
}

export function createGCSConnector(config: GCSConnectorConfig): IStorageConnector {
  return new GCSConnector(config);
}
