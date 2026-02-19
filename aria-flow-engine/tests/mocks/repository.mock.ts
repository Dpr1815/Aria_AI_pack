/**
 * Mock repository implementations for testing
 */

import { ObjectId, WithId, Filter, UpdateFilter } from 'mongodb';
import { UserRepository } from '@repositories/user.repository';
import { UserDocument } from '@models/documents/user.document';

/**
 * Create a mock UserRepository with all methods mocked
 */
export function createMockUserRepository(): jest.Mocked<UserRepository> {
  return {
    // Base repository methods
    findById: jest.fn(),
    findByIdOrThrow: jest.fn(),
    findOne: jest.fn(),
    findMany: jest.fn(),
    findPaginated: jest.fn(),
    distinct: jest.fn(),
    create: jest.fn(),
    upsert: jest.fn(),
    createMany: jest.fn(),
    updateById: jest.fn(),
    updateByIdOrThrow: jest.fn(),
    updateMany: jest.fn(),
    deleteById: jest.fn(),
    deleteByIdOrThrow: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    exists: jest.fn(),
    toObjectId: jest.fn().mockImplementation((id: string | ObjectId) =>
      typeof id === 'string' ? new ObjectId(id) : id
    ),

    // UserRepository specific methods
    findByEmail: jest.fn(),
    existsByEmail: jest.fn(),
    addRefreshToken: jest.fn(),
    removeRefreshToken: jest.fn(),
    removeAllRefreshTokens: jest.fn(),
    removeExpiredRefreshTokens: jest.fn(),
    setOrganization: jest.fn(),
    updatePlan: jest.fn(),
    updatePassword: jest.fn(),
    createIndexes: jest.fn(),
  } as any;
}

/**
 * Generic function to create a mock repository for any entity
 */
export function createMockRepository<T>(): jest.Mocked<any> {
  return {
    findById: jest.fn(),
    findByIdOrThrow: jest.fn(),
    findOne: jest.fn(),
    findMany: jest.fn(),
    findPaginated: jest.fn(),
    distinct: jest.fn(),
    create: jest.fn(),
    upsert: jest.fn(),
    createMany: jest.fn(),
    updateById: jest.fn(),
    updateByIdOrThrow: jest.fn(),
    updateMany: jest.fn(),
    deleteById: jest.fn(),
    deleteByIdOrThrow: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    exists: jest.fn(),
    toObjectId: jest.fn().mockImplementation((id: string | ObjectId) =>
      typeof id === 'string' ? new ObjectId(id) : id
    ),
  };
}
