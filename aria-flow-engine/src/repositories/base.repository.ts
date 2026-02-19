import {
  Collection,
  Document,
  Filter,
  FindOptions,
  ObjectId,
  OptionalUnlessRequiredId,
  UpdateFilter,
  WithId,
} from 'mongodb';
import { IDatabase } from '../connectors/database/IDatabase';
import { DatabaseError, NotFoundError } from '../utils/errors';
import { createLogger } from '../utils/logger';
import { PaginatedResult, QueryOptions } from '@utils';

export abstract class BaseRepository<T extends Document> {
  protected readonly collectionName: string;
  protected readonly db: IDatabase;
  protected readonly logger;

  constructor(db: IDatabase, collectionName: string) {
    this.db = db;
    this.collectionName = collectionName;
    this.logger = createLogger(`Repository:${collectionName}`);
  }

  protected getCollection(): Collection<T> {
    return this.db.getCollection<T>(this.collectionName);
  }

  async findById(id: string | ObjectId): Promise<WithId<T> | null> {
    try {
      const objectId = typeof id === 'string' ? new ObjectId(id) : id;
      const result = await this.getCollection().findOne({
        _id: objectId,
      } as Filter<T>);
      return result;
    } catch (error) {
      this.logger.error('Error finding document by ID', error as Error, {
        id: String(id),
      });
      throw new DatabaseError('Failed to find document', error as Error);
    }
  }

  async findByIdOrThrow(id: string | ObjectId, resourceName?: string): Promise<WithId<T>> {
    const result = await this.findById(id);
    if (!result) {
      throw new NotFoundError(resourceName || this.collectionName, String(id));
    }
    return result;
  }

  async findOne(filter: Filter<T>): Promise<WithId<T> | null> {
    try {
      return await this.getCollection().findOne(filter);
    } catch (error) {
      this.logger.error('Error finding document', error as Error, { filter });
      throw new DatabaseError('Failed to find document', error as Error);
    }
  }

  async findMany(filter: Filter<T>, options: QueryOptions = {}): Promise<WithId<T>[]> {
    try {
      const { skip, limit, sort, projection } = options;
      const findOptions: FindOptions = {};

      if (skip !== undefined) findOptions.skip = skip;
      if (limit !== undefined) findOptions.limit = limit;
      if (sort) findOptions.sort = sort;
      if (projection) findOptions.projection = projection;

      return await this.getCollection().find(filter, findOptions).toArray();
    } catch (error) {
      this.logger.error('Error finding documents', error as Error, {
        filter,
        options,
      });
      throw new DatabaseError('Failed to find documents', error as Error);
    }
  }

  async findPaginated(
    filter: Filter<T>,
    page: number = 1,
    limit: number = 20,
    sort?: Record<string, 1 | -1>
  ): Promise<PaginatedResult<WithId<T>>> {
    try {
      const skip = (page - 1) * limit;
      const [data, total] = await Promise.all([
        this.findMany(filter, { skip, limit, sort }),
        this.count(filter),
      ]);

      return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error('Error finding paginated documents', error as Error, {
        filter,
        page,
        limit,
      });
      throw new DatabaseError('Failed to find paginated documents', error as Error);
    }
  }
  /**
   * Get distinct values for a field
   */
  async distinct<K extends keyof T>(field: K, filter: Filter<T> = {}): Promise<T[K][]> {
    try {
      return await this.getCollection().distinct(field as string, filter);
    } catch (error) {
      this.logger.error('Error getting distinct values', error as Error, { field, filter });
      throw new DatabaseError('Failed to get distinct values', error as Error);
    }
  }
  async create(document: Omit<T, '_id' | 'createdAt' | 'updatedAt'>): Promise<WithId<T>> {
    try {
      const now = new Date();
      const docWithTimestamps = {
        ...document,
        createdAt: now,
        updatedAt: now,
      };

      const result = await this.getCollection().insertOne(
        docWithTimestamps as unknown as OptionalUnlessRequiredId<T>
      );
      return { ...docWithTimestamps, _id: result.insertedId } as unknown as WithId<T>;
    } catch (error) {
      this.logger.error('Error creating document', error as Error);
      throw new DatabaseError('Failed to create document', error as Error);
    }
  }
  async upsert(
    filter: Filter<T>,
    document: Omit<T, '_id' | 'createdAt' | 'updatedAt'>
  ): Promise<WithId<T>> {
    try {
      const now = new Date();

      const result = await this.getCollection().findOneAndUpdate(
        filter,
        {
          $set: { ...document, updatedAt: now } as any,
          $setOnInsert: { createdAt: now } as any,
        },
        { upsert: true, returnDocument: 'after' }
      );

      if (!result) {
        throw new DatabaseError('Upsert returned no document');
      }

      return result;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      this.logger.error('Error upserting document', error as Error, { filter });
      throw new DatabaseError('Failed to upsert document', error as Error);
    }
  }
  async createMany(documents: Omit<T, '_id' | 'createdAt' | 'updatedAt'>[]): Promise<WithId<T>[]> {
    try {
      const now = new Date();
      const docsWithTimestamps = documents.map((doc) => ({
        ...doc,
        createdAt: now,
        updatedAt: now,
      }));

      const result = await this.getCollection().insertMany(
        docsWithTimestamps as unknown as OptionalUnlessRequiredId<T>[]
      );
      return docsWithTimestamps.map((doc, index) => ({
        ...doc,
        _id: result.insertedIds[index],
      })) as unknown as WithId<T>[];
    } catch (error) {
      this.logger.error('Error creating documents', error as Error);
      throw new DatabaseError('Failed to create documents', error as Error);
    }
  }
  async updateById(
    id: string | ObjectId,
    update: UpdateFilter<T> | Partial<T>
  ): Promise<WithId<T> | null> {
    try {
      const objectId = typeof id === 'string' ? new ObjectId(id) : id;
      const isOperatorUpdate = Object.keys(update).some((key) => key.startsWith('$'));

      const updateDoc = isOperatorUpdate
        ? {
            ...update,
            $set: {
              ...(update as UpdateFilter<T>).$set,
              updatedAt: new Date(),
            },
          }
        : { $set: { ...update, updatedAt: new Date() } };

      const result = await this.getCollection().findOneAndUpdate(
        { _id: objectId } as Filter<T>,
        updateDoc as UpdateFilter<T>,
        { returnDocument: 'after' }
      );

      return result;
    } catch (error) {
      this.logger.error('Error updating document', error as Error, {
        id: String(id),
      });
      throw new DatabaseError('Failed to update document', error as Error);
    }
  }

  async updateByIdOrThrow(
    id: string | ObjectId,
    update: UpdateFilter<T> | Partial<T>,
    resourceName?: string
  ): Promise<WithId<T>> {
    const result = await this.updateById(id, update);
    if (!result) {
      throw new NotFoundError(resourceName || this.collectionName, String(id));
    }
    return result;
  }
  async updateMany(filter: Filter<T>, update: UpdateFilter<T>): Promise<number> {
    try {
      const updateDoc = {
        ...update,
        $set: { ...(update.$set || {}), updatedAt: new Date() },
      } as unknown as UpdateFilter<T>;

      const result = await this.getCollection().updateMany(filter, updateDoc);
      return result.modifiedCount;
    } catch (error) {
      this.logger.error('Error updating documents', error as Error, { filter });
      throw new DatabaseError('Failed to update documents', error as Error);
    }
  }

  async deleteById(id: string | ObjectId): Promise<boolean> {
    try {
      const objectId = typeof id === 'string' ? new ObjectId(id) : id;
      const result = await this.getCollection().deleteOne({
        _id: objectId,
      } as Filter<T>);
      return result.deletedCount === 1;
    } catch (error) {
      this.logger.error('Error deleting document', error as Error, {
        id: String(id),
      });
      throw new DatabaseError('Failed to delete document', error as Error);
    }
  }

  async deleteByIdOrThrow(id: string | ObjectId, resourceName?: string): Promise<void> {
    const deleted = await this.deleteById(id);
    if (!deleted) {
      throw new NotFoundError(resourceName || this.collectionName, String(id));
    }
  }

  async deleteMany(filter: Filter<T>): Promise<number> {
    try {
      const result = await this.getCollection().deleteMany(filter);
      return result.deletedCount;
    } catch (error) {
      this.logger.error('Error deleting documents', error as Error, { filter });
      throw new DatabaseError('Failed to delete documents', error as Error);
    }
  }

  async count(filter: Filter<T> = {}): Promise<number> {
    try {
      return await this.getCollection().countDocuments(filter);
    } catch (error) {
      this.logger.error('Error counting documents', error as Error, { filter });
      throw new DatabaseError('Failed to count documents', error as Error);
    }
  }
  toObjectId(id: string | ObjectId): ObjectId {
    return typeof id === 'string' ? new ObjectId(id) : id;
  }
  async exists(filter: Filter<T>): Promise<boolean> {
    const count = await this.count(filter);
    return count > 0;
  }
}
