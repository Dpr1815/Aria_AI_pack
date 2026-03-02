/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Directories
  roots: ['<rootDir>/tests', '<rootDir>/src'],
  testMatch: [
    '**/tests/**/*.test.ts',
    '**/tests/**/*.spec.ts'
  ],

  // Coverage
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/server.ts',
    '!src/bootstrap.ts',
    '!src/**/index.ts',
    '!src/types/**',
    // Infrastructure adapters — tested at E2E/integration level
    '!src/connectors/database/**',
    '!src/connectors/storage/**',
    '!src/connectors/llm/OpenAIConnector.ts',
    '!src/connectors/cache/RedisConnector.ts',
    // Repositories are thin CRUD wrappers over BaseRepository — covered by integration tests
    '!src/repositories/**',
    // Logger is a thin wrapper around pino — not worth unit testing
    '!src/utils/logger.ts',
    // Config files are environment configuration, not business logic
    '!src/config/server.config.ts',
    '!src/config/database.config.ts',
    '!src/config/storage.config.ts',
    '!src/config/cache.config.ts',
    // Video service is infrastructure (file upload/processing) — not unit-testable
    '!src/services/video.service.ts',
    // Multer upload middleware — infrastructure configuration
    '!src/middleware/upload.middleware.ts',
    // Health routes — trivial status endpoint
    '!src/routes/health.routes.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  // Module resolution - match tsconfig paths
  moduleNameMapper: {
    '^@config$': '<rootDir>/src/config/index.ts',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@connectors$': '<rootDir>/src/connectors/index.ts',
    '^@connectors/(.*)$': '<rootDir>/src/connectors/$1',
    '^@constants$': '<rootDir>/src/constants/index.ts',
    '^@constants/(.*)$': '<rootDir>/src/constants/$1',
    '^@models$': '<rootDir>/src/models/index.ts',
    '^@models/(.*)$': '<rootDir>/src/models/$1',
    '^@modules$': '<rootDir>/src/modules/index.ts',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@middleware$': '<rootDir>/src/middleware/index.ts',
    '^@middleware/(.*)$': '<rootDir>/src/middleware/$1',
    '^@repositories$': '<rootDir>/src/repositories/index.ts',
    '^@repositories/(.*)$': '<rootDir>/src/repositories/$1',
    '^@services$': '<rootDir>/src/services/index.ts',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@controllers$': '<rootDir>/src/controllers/index.ts',
    '^@controllers/(.*)$': '<rootDir>/src/controllers/$1',
    '^@routes$': '<rootDir>/src/routes/index.ts',
    '^@routes/(.*)$': '<rootDir>/src/routes/$1',
    '^@validations$': '<rootDir>/src/validations/index.ts',
    '^@validations/(.*)$': '<rootDir>/src/validations/$1',
    '^@utils$': '<rootDir>/src/utils/index.ts',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@projecttypes$': '<rootDir>/src/types/index.ts',
    '^@projecttypes/(.*)$': '<rootDir>/src/types/$1',
    // Test utilities
    '^@test/(.*)$': '<rootDir>/tests/$1',
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],

  // Transform
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json',
    }],
  },

  // Performance
  maxWorkers: '50%',

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Timeouts
  testTimeout: 10000,

  // Verbose output
  verbose: true,
};
