# Testing Guide for Aria Flow Engine

This guide explains the testing strategy and practices for the Aria Flow Engine API server.

## Table of Contents

1. [Overview](#overview)
2. [Test Structure](#test-structure)
3. [Running Tests](#running-tests)
4. [Writing Tests](#writing-tests)
5. [Best Practices](#best-practices)
6. [Common Patterns](#common-patterns)

## Overview

Our testing strategy follows these principles:

- **Unit Tests**: Test individual components (controllers, services, repositories) in isolation
- **Integration Tests**: Test the complete flow from controller to repository
- **Mocking**: Use Jest mocks for external dependencies (database, external APIs)
- **Type Safety**: Leverage TypeScript for type-safe tests
- **Code Coverage**: Maintain minimum 70% coverage across the codebase

## Test Structure

```
tests/
├── setup.ts                      # Global test setup
├── helpers/                      # Test utilities and factories
│   ├── index.ts                 # Exports all helpers
│   ├── test-utils.ts            # Utility functions
│   └── mock-factories.ts        # Mock data factories
├── mocks/                        # Mock implementations
│   ├── database.mock.ts         # MongoDB mocks
│   └── repository.mock.ts       # Repository mocks
├── unit/                         # Unit tests
│   ├── controllers/             # Controller tests
│   ├── services/                # Service tests
│   └── repositories/            # Repository tests
├── integration/                  # Integration tests
│   └── *.integration.test.ts    # End-to-end flow tests
└── fixtures/                     # Test data files
```

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- user.service.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="signup"
```

### Coverage Reports

After running `npm run test:coverage`, view the HTML report:

```bash
open coverage/index.html
```

## Writing Tests

### Architecture Layers

Our application follows this flow:

```
Request → Validation → Controller → Service → Repository → Database
                           ↓           ↓
                         DTO ← Document conversion
```

### 1. Controller Tests

Controllers should test:
- Request handling
- Response formatting (using ApiResponseBuilder)
- Error propagation to error middleware

**Example:**

```typescript
import { UserController } from '@controllers/user.controller';
import { UserService } from '@services/user.service';

jest.mock('@services/user.service');

describe('UserController', () => {
  let controller: UserController;
  let mockService: jest.Mocked<UserService>;

  beforeEach(() => {
    mockService = {
      signup: jest.fn(),
      // ... other methods
    } as any;

    controller = new UserController(mockService);
  });

  it('should create user and return 201', async () => {
    const input = createMockSignupInput();
    const authResponse = createMockAuthResponse();

    mockService.signup.mockResolvedValue(authResponse);

    const req = { body: input } as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as Response;
    const next = jest.fn();

    await controller.signup(req, res, next);

    expect(mockService.signup).toHaveBeenCalledWith(input, expect.any(Object));
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: authResponse,
      })
    );
  });
});
```

### 2. Service Tests

Services should test:
- Business logic
- Data transformations (Document → DTO)
- Error handling (throwing custom errors)
- Repository interactions

**Example:**

```typescript
import { UserService } from '@services/user.service';
import { createMockUserRepository } from '@test/mocks/repository.mock';

describe('UserService', () => {
  let service: UserService;
  let mockRepository: ReturnType<typeof createMockUserRepository>;

  beforeEach(() => {
    mockRepository = createMockUserRepository();
    service = new UserService(mockRepository, config);
  });

  it('should throw ConflictError if email exists', async () => {
    const input = createMockSignupInput();
    mockRepository.findByEmail.mockResolvedValue(createMockUserDocument());

    await expect(service.signup(input)).rejects.toThrow(ConflictError);
    expect(mockRepository.create).not.toHaveBeenCalled();
  });
});
```

### 3. Repository Tests

Repositories should test:
- Database query construction
- Data mapping
- MongoDB operations

**Example:**

```typescript
import { UserRepository } from '@repositories/user.repository';
import { createMockDatabase, mockFindOne } from '@test/mocks/database.mock';

describe('UserRepository', () => {
  let repository: UserRepository;
  let mockDb: ReturnType<typeof createMockDatabase>;

  beforeEach(() => {
    mockDb = createMockDatabase();
    repository = new UserRepository(mockDb);
  });

  it('should find user by email (case-insensitive)', async () => {
    const mockUser = createMockUserDocument();
    const collection = mockDb.getCollection('users');
    mockFindOne(collection, mockUser);

    const result = await repository.findByEmail('Test@Example.COM');

    expect(collection.findOne).toHaveBeenCalledWith({
      email: 'test@example.com'
    });
    expect(result).toEqual(mockUser);
  });
});
```

### 4. Integration Tests

Integration tests verify the complete flow:

```typescript
describe('User Authentication Flow - Integration', () => {
  let controller: UserController;
  let service: UserService;
  let repository: UserRepository;
  let mockDb: ReturnType<typeof createMockDatabase>;

  beforeEach(() => {
    mockDb = createMockDatabase();
    repository = new UserRepository(mockDb);
    service = new UserService(repository, config);
    controller = new UserController(service);
  });

  it('should complete signup -> login -> getMe flow', async () => {
    // Test complete user journey
  });
});
```

## Best Practices

### 1. Use Mock Factories

Always use mock factories for consistent test data:

```typescript
// ✅ Good
const user = createMockUserDocument({ email: 'test@example.com' });

// ❌ Bad
const user = {
  _id: new ObjectId(),
  email: 'test@example.com',
  // ... manually typing all fields
};
```

### 2. Test Error Cases

Always test both success and error scenarios:

```typescript
describe('login', () => {
  it('should return auth response on success', async () => {
    // Success case
  });

  it('should throw UnauthorizedError when password invalid', async () => {
    // Error case
  });

  it('should throw UnauthorizedError when user not found', async () => {
    // Error case
  });
});
```

### 3. Arrange-Act-Assert Pattern

Structure tests clearly:

```typescript
it('should create user', async () => {
  // Arrange - setup test data and mocks
  const input = createMockSignupInput();
  mockRepository.findByEmail.mockResolvedValue(null);
  mockRepository.create.mockResolvedValue(mockUser);

  // Act - execute the code under test
  const result = await service.signup(input);

  // Assert - verify the results
  expect(mockRepository.create).toHaveBeenCalledWith(
    expect.objectContaining({ email: input.email })
  );
  expect(result).toHaveProperty('user');
  expect(result).toHaveProperty('accessToken');
});
```

### 4. Clear Mocks Between Tests

Always clear mocks in `beforeEach`:

```typescript
beforeEach(() => {
  jest.clearAllMocks();
  // Setup fresh mocks
});
```

### 5. Test One Thing Per Test

Each test should verify one specific behavior:

```typescript
// ✅ Good - focused tests
it('should normalize email to lowercase', async () => { ... });
it('should hash password before saving', async () => { ... });
it('should return user DTO', async () => { ... });

// ❌ Bad - testing too much
it('should signup user', async () => {
  // Tests email normalization, password hashing,
  // DTO conversion, token generation all in one
});
```

### 6. Use Descriptive Test Names

Test names should clearly describe what is being tested:

```typescript
// ✅ Good
it('should throw ConflictError when email already exists', async () => { ... });

// ❌ Bad
it('should fail', async () => { ... });
```

## Common Patterns

### Testing Async Functions

```typescript
it('should handle async operations', async () => {
  mockRepository.findById.mockResolvedValue(mockUser);

  const result = await service.getUserById(userId);

  expect(result).toEqual(expectedDTO);
});
```

### Testing Error Throwing

```typescript
it('should throw specific error', async () => {
  mockRepository.findByEmail.mockResolvedValue(existingUser);

  await expect(service.signup(input)).rejects.toThrow(ConflictError);
  await expect(service.signup(input)).rejects.toThrow('User with this email already exists');
});
```

### Testing With Spies

```typescript
it('should call private method', async () => {
  const hashSpy = jest.spyOn(service as any, 'hashToken');
  hashSpy.mockReturnValue('hashed');

  await service.refresh(token);

  expect(hashSpy).toHaveBeenCalledWith(token);
  hashSpy.mockRestore();
});
```

### Mocking External Libraries

```typescript
jest.mock('bcrypt');
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

mockBcrypt.hash.mockResolvedValue('hashed' as never);
mockBcrypt.compare.mockResolvedValue(true as never);
```

## File Naming Conventions

- Unit tests: `*.test.ts`
- Integration tests: `*.integration.test.ts`
- Mock files: `*.mock.ts`
- Factories: `*.factory.ts` or `mock-factories.ts`

## Template for New Tests

Use this template when creating new test files:

```typescript
/**
 * Unit tests for [ComponentName]
 */

import { ComponentName } from '@path/to/component';
import { createMock... } from '@test/helpers/mock-factories';

describe('ComponentName', () => {
  let component: ComponentName;
  let mockDependency: jest.Mocked<DependencyType>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDependency = createMockDependency();
    component = new ComponentName(mockDependency);
  });

  describe('methodName', () => {
    it('should [expected behavior]', async () => {
      // Arrange
      const input = createMockInput();
      mockDependency.method.mockResolvedValue(expectedValue);

      // Act
      const result = await component.methodName(input);

      // Assert
      expect(mockDependency.method).toHaveBeenCalledWith(expectedArgs);
      expect(result).toEqual(expectedResult);
    });

    it('should throw [ErrorType] when [condition]', async () => {
      // Arrange
      const input = createMockInput();
      mockDependency.method.mockRejectedValue(new Error());

      // Act & Assert
      await expect(component.methodName(input)).rejects.toThrow(ErrorType);
    });
  });
});
```

## Questions?

For questions about testing practices, refer to:
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- Internal team Slack: #engineering-testing

Happy Testing! 🧪
