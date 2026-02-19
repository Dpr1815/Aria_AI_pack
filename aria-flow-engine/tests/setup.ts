/**
 * Global test setup
 * This file is executed before all tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-testing-only';
process.env.ACCESS_TOKEN_SECRET = 'test-access-secret';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret';
process.env.MONGODB_URI = 'mongodb://localhost:27017/aria-test';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.GCS_BUCKET_NAME = 'test-bucket';
process.env.GCS_KEY_FILE_PATH = '/dev/null';

// Mock logger to reduce noise in tests
jest.mock('../src/utils/logger', () => ({
  createLogger: (name: string) => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    fatal: jest.fn(),
  }),
  requestLogger: () => (_req: any, _res: any, next: any) => next(),
}));

// Global test timeout
jest.setTimeout(10000);
