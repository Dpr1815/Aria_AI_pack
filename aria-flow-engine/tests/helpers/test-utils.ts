import { ObjectId } from 'mongodb';

/**
 * Create a valid MongoDB ObjectId for testing
 */
export function createObjectId(id?: string): ObjectId {
  return id ? new ObjectId(id) : new ObjectId();
}

/**
 * Create a mock Date for consistent testing
 */
export function createMockDate(isoString?: string): Date {
  return isoString ? new Date(isoString) : new Date('2024-01-01T00:00:00.000Z');
}

/**
 * Wait for a promise to resolve/reject (useful for testing async flows)
 */
export function wait(ms: number = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Extract error message from caught error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Type guard for checking if error is an instance of a specific class
 */
export function isErrorOfType<T extends Error>(
  error: unknown,
  errorClass: new (...args: any[]) => T
): error is T {
  return error instanceof errorClass;
}
