# Testing Quick Reference

## Commands

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# Specific file
npm test -- user.service.test

# Pattern match
npm test -- --testNamePattern="login"
```

## Creating a New Test

### 1. Controller Test Template

```typescript
import { XController } from '@controllers/x.controller';
import { XService } from '@services/x.service';

jest.mock('@services/x.service');

describe('XController', () => {
  let controller: XController;
  let mockService: jest.Mocked<XService>;

  beforeEach(() => {
    mockService = { method: jest.fn() } as any;
    controller = new XController(mockService);
  });

  it('should handle request', async () => {
    const req = { body: input } as Request;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
    const next = jest.fn();

    mockService.method.mockResolvedValue(result);

    await controller.method(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
  });
});
```

### 2. Service Test Template

```typescript
import { XService } from '@services/x.service';
import { createMockXRepository } from '@test/mocks/repository.mock';

describe('XService', () => {
  let service: XService;
  let mockRepo: ReturnType<typeof createMockXRepository>;

  beforeEach(() => {
    mockRepo = createMockXRepository();
    service = new XService(mockRepo);
  });

  it('should process data', async () => {
    mockRepo.findById.mockResolvedValue(mockDocument);

    const result = await service.method(id);

    expect(mockRepo.findById).toHaveBeenCalledWith(id);
    expect(result).toEqual(expectedDTO);
  });
});
```

### 3. Repository Test Template

```typescript
import { XRepository } from '@repositories/x.repository';
import { createMockDatabase, mockFindOne } from '@test/mocks/database.mock';

describe('XRepository', () => {
  let repo: XRepository;
  let mockDb: ReturnType<typeof createMockDatabase>;

  beforeEach(() => {
    mockDb = createMockDatabase();
    repo = new XRepository(mockDb);
  });

  it('should query database', async () => {
    const collection = mockDb.getCollection('collection-name');
    mockFindOne(collection, mockDoc);

    const result = await repo.findByField(value);

    expect(collection.findOne).toHaveBeenCalledWith({ field: value });
  });
});
```

## Mock Factories

```typescript
// User mocks
createMockUserDocument({ email: 'test@example.com' })
createMockUserDTO({ name: 'Test User' })
createMockAuthResponse()
createMockTokenPair()
createMockRefreshTokenEntry()

// Validation inputs
createMockSignupInput({ email: 'new@example.com' })
createMockLoginInput({ password: 'test123' })
createMockUpdateUserInput({ name: 'Updated' })
createMockChangePasswordInput()

// Utilities
createObjectId()  // Create MongoDB ObjectId
createMockDate('2024-01-01')  // Create consistent Date
```

## Common Assertions

```typescript
// Success response
expect(res.status).toHaveBeenCalledWith(200);
expect(res.json).toHaveBeenCalledWith(
  expect.objectContaining({
    success: true,
    data: expect.any(Object),
  })
);

// Error handling
expect(next).toHaveBeenCalledWith(expect.any(Error));
await expect(service.method()).rejects.toThrow(CustomError);

// Mock calls
expect(mockRepo.create).toHaveBeenCalledWith(
  expect.objectContaining({ email: 'test@example.com' })
);
expect(mockService.method).toHaveBeenCalledTimes(1);
expect(mockRepo.findById).not.toHaveBeenCalled();
```

## Mocking External Libraries

### Bcrypt

```typescript
jest.mock('bcrypt');
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

mockBcrypt.hash.mockResolvedValue('hashed' as never);
mockBcrypt.compare.mockResolvedValue(true as never);
```

### JWT

```typescript
jest.mock('jsonwebtoken');
const mockJwt = jwt as jest.Mocked<typeof jwt>;

mockJwt.sign.mockReturnValue('token' as any);
mockJwt.verify.mockReturnValue({ userId: '123' } as any);
```

### MongoDB Collection

```typescript
const collection = mockDb.getCollection('users');

// Find one
mockFindOne(collection, mockDoc);

// Find many
mockFind(collection, [mockDoc1, mockDoc2]);

// Insert
mockInsertOne(collection, new ObjectId());

// Update
mockFindOneAndUpdate(collection, updatedDoc);

// Delete
mockDeleteOne(collection, 1);

// Count
mockCountDocuments(collection, 5);
```

## Test Organization

```typescript
describe('ComponentName', () => {
  // Setup
  beforeEach(() => { /* ... */ });
  afterEach(() => { jest.clearAllMocks(); });

  describe('methodName', () => {
    it('should handle success case', () => { /* ... */ });
    it('should throw error when invalid', () => { /* ... */ });
  });

  describe('anotherMethod', () => {
    it('should ...', () => { /* ... */ });
  });
});
```

## Debugging Tests

```typescript
// Log values
console.log('Value:', JSON.stringify(value, null, 2));

// Check mock calls
console.log('Mock calls:', mockFn.mock.calls);

// Run single test
npm test -- --testNamePattern="should handle success"

// Run with verbose output
npm test -- --verbose

// Update snapshots
npm test -- --updateSnapshot
```

## Common Pitfalls

❌ **Don't**: Forget to clear mocks
```typescript
// Missing jest.clearAllMocks() in beforeEach
```

❌ **Don't**: Test implementation details
```typescript
expect(service['privateMethod']).toHaveBeenCalled(); // Bad
```

❌ **Don't**: Have flaky tests
```typescript
const now = new Date(); // Changes every run - use createMockDate()
```

❌ **Don't**: Forget async/await
```typescript
it('test', () => {  // Missing async
  await service.method(); // This won't wait!
});
```

✅ **Do**: Use factories
✅ **Do**: Test error cases
✅ **Do**: Keep tests isolated
✅ **Do**: Use descriptive names
✅ **Do**: Follow AAA pattern (Arrange-Act-Assert)

## Coverage Goals

- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

Focus on critical paths and business logic!
