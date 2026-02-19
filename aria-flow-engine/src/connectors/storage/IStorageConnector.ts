/**
 * Storage connector interface.
 *
 * Abstracts object storage operations so the application layer
 * remains decoupled from a specific cloud provider (GCS, S3, etc.).
 */
export interface IStorageConnector {
  /**
   * Upload a buffer to object storage.
   *
   * @param filePath  - Full object key (e.g. "videos/agentId/sessionId/step.webm")
   * @param buffer    - File contents
   * @param metadata  - Storage-level metadata attached to the object
   * @returns The stored object path
   */
  upload(filePath: string, buffer: Buffer, metadata: UploadMetadata): Promise<string>;

  /**
   * Generate a time-limited read URL for a stored object.
   *
   * @param filePath        - Object key
   * @param expirySeconds   - How long the URL remains valid
   * @returns A pre-signed / signed URL
   */
  getSignedUrl(filePath: string, expirySeconds: number): Promise<string>;

  /**
   * Delete a single object.
   *
   * @param filePath - Object key
   */
  delete(filePath: string): Promise<void>;

  /**
   * Delete all objects under a given prefix.
   *
   * @param prefix - Object key prefix (e.g. "videos/agentId/sessionId/")
   */
  deleteByPrefix(prefix: string): Promise<number>;

  /**
   * Check whether an object exists.
   *
   * @param filePath - Object key
   */
  exists(filePath: string): Promise<boolean>;
}

export interface UploadMetadata {
  contentType: string;
  custom?: Record<string, string>;
}
