/**
 * Mock MongoDB database and collections for unit testing
 */

import { Collection, Document, Filter, FindOptions, ObjectId, UpdateFilter, WithId } from 'mongodb';
import { IDatabase } from '@connectors/database/IDatabase';

/**
 * Create a mock MongoDB collection
 */
export function createMockCollection<T extends Document>(): jest.Mocked<Collection<T>> {
  return {
    findOne: jest.fn(),
    find: jest.fn().mockReturnValue({
      toArray: jest.fn().mockResolvedValue([]),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
    }),
    insertOne: jest.fn(),
    insertMany: jest.fn(),
    updateOne: jest.fn(),
    updateMany: jest.fn(),
    findOneAndUpdate: jest.fn(),
    deleteOne: jest.fn(),
    deleteMany: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn().mockReturnValue({
      toArray: jest.fn().mockResolvedValue([]),
    }),
    createIndex: jest.fn(),
    distinct: jest.fn(),
  } as any;
}

/**
 * Create a mock IDatabase implementation
 */
export function createMockDatabase(): jest.Mocked<IDatabase> {
  const collections = new Map<string, jest.Mocked<Collection<any>>>();

  return {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    getCollection: jest.fn().mockImplementation((name: string) => {
      if (!collections.has(name)) {
        collections.set(name, createMockCollection());
      }
      return collections.get(name)!;
    }),
    isConnected: jest.fn().mockReturnValue(true),
  } as any;
}

/**
 * Helper to setup common mock behaviors for findOne
 */
export function mockFindOne<T extends Document>(
  collection: Collection<T> | jest.Mocked<Collection<T>>,
  result: WithId<T> | null
): void {
  (collection.findOne as jest.Mock).mockResolvedValue(result as any);
}

/**
 * Helper to setup common mock behaviors for find
 */
export function mockFind<T extends Document>(
  collection: Collection<T> | jest.Mocked<Collection<T>>,
  results: WithId<T>[]
): void {
  const findResult = {
    toArray: jest.fn().mockResolvedValue(results),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
  };
  (collection.find as jest.Mock).mockReturnValue(findResult as any);
}

/**
 * Helper to setup common mock behaviors for insertOne
 */
export function mockInsertOne<T extends Document>(
  collection: Collection<T> | jest.Mocked<Collection<T>>,
  insertedId: ObjectId
): void {
  (collection.insertOne as jest.Mock).mockResolvedValue({
    insertedId,
    acknowledged: true,
  } as any);
}

/**
 * Helper to setup common mock behaviors for updateOne
 */
export function mockUpdateOne(
  collection: Collection<any> | jest.Mocked<Collection<any>>,
  modifiedCount: number = 1
): void {
  (collection.updateOne as jest.Mock).mockResolvedValue({
    modifiedCount,
    matchedCount: modifiedCount,
    acknowledged: true,
    upsertedId: null,
    upsertedCount: 0,
  } as any);
}

/**
 * Helper to setup common mock behaviors for findOneAndUpdate
 */
export function mockFindOneAndUpdate<T extends Document>(
  collection: Collection<T> | jest.Mocked<Collection<T>>,
  result: WithId<T> | null
): void {
  (collection.findOneAndUpdate as jest.Mock).mockResolvedValue(result as any);
}

/**
 * Helper to setup common mock behaviors for deleteOne
 */
export function mockDeleteOne(
  collection: Collection<any> | jest.Mocked<Collection<any>>,
  deletedCount: number = 1
): void {
  (collection.deleteOne as jest.Mock).mockResolvedValue({
    deletedCount,
    acknowledged: true,
  } as any);
}

/**
 * Helper to setup common mock behaviors for deleteMany
 */
export function mockDeleteMany(
  collection: Collection<any> | jest.Mocked<Collection<any>>,
  deletedCount: number = 1
): void {
  (collection.deleteMany as jest.Mock).mockResolvedValue({
    deletedCount,
    acknowledged: true,
  } as any);
}

/**
 * Helper to setup common mock behaviors for countDocuments
 */
export function mockCountDocuments(
  collection: Collection<any> | jest.Mocked<Collection<any>>,
  count: number
): void {
  (collection.countDocuments as jest.Mock).mockResolvedValue(count);
}

/**
 * Helper to setup common mock behaviors for aggregate
 */
export function mockAggregate<T extends Document>(
  collection: Collection<T> | jest.Mocked<Collection<T>>,
  results: any[]
): void {
  const aggregateResult = {
    toArray: jest.fn().mockResolvedValue(results),
  };
  (collection.aggregate as jest.Mock) = jest.fn().mockReturnValue(aggregateResult as any);
}

/**
 * Helper to setup common mock behaviors for distinct
 */
export function mockDistinct(
  collection: Collection<any> | jest.Mocked<Collection<any>>,
  results: any[]
): void {
  (collection.distinct as jest.Mock).mockResolvedValue(results);
}
