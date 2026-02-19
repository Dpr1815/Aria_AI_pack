import { ObjectId } from 'mongodb';
import { BaseRepository } from './base.repository';
import { UserDocument, RefreshTokenEntry } from '../models/documents/user.document';
import { IDatabase } from '../connectors/database/IDatabase';

const COLLECTION_NAME = 'users';

export class UserRepository extends BaseRepository<UserDocument> {
  constructor(db: IDatabase) {
    super(db, COLLECTION_NAME);
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.findOne({ email: email.toLowerCase() });
  }

  async existsByEmail(email: string): Promise<boolean> {
    return this.exists({ email: email.toLowerCase() });
  }

  async addRefreshToken(
    userId: ObjectId,
    tokenEntry: RefreshTokenEntry
  ): Promise<UserDocument | null> {
    const collection = this.getCollection();
    const result = await collection.findOneAndUpdate(
      { _id: userId },
      {
        $push: { refreshTokens: tokenEntry },
        $set: { updatedAt: new Date() },
      },
      { returnDocument: 'after' }
    );
    return result ?? null;
  }

  async removeRefreshToken(userId: ObjectId, tokenHash: string): Promise<UserDocument | null> {
    const collection = this.getCollection();
    const result = await collection.findOneAndUpdate(
      { _id: userId },
      {
        $pull: { refreshTokens: { tokenHash } },
        $set: { updatedAt: new Date() },
      },
      { returnDocument: 'after' }
    );
    return result ?? null;
  }

  async removeAllRefreshTokens(userId: ObjectId): Promise<UserDocument | null> {
    const collection = this.getCollection();
    const result = await collection.findOneAndUpdate(
      { _id: userId },
      {
        $set: { refreshTokens: [], updatedAt: new Date() },
      },
      { returnDocument: 'after' }
    );
    return result ?? null;
  }

  async removeExpiredRefreshTokens(userId: ObjectId): Promise<UserDocument | null> {
    const collection = this.getCollection();
    const result = await collection.findOneAndUpdate(
      { _id: userId },
      {
        $pull: { refreshTokens: { expiresAt: { $lt: new Date() } } },
        $set: { updatedAt: new Date() },
      },
      { returnDocument: 'after' }
    );
    return result ?? null;
  }

  async setOrganization(
    userId: ObjectId,
    organizationId: ObjectId | null
  ): Promise<UserDocument | null> {
    if (organizationId === null) {
      const collection = this.getCollection();
      const result = await collection.findOneAndUpdate(
        { _id: userId },
        {
          $unset: { organizationId: '' },
          $set: { updatedAt: new Date() },
        },
        { returnDocument: 'after' }
      );
      return result ?? null;
    }
    return this.updateById(userId, { organizationId });
  }

  async updatePlan(userId: ObjectId, planId: string): Promise<UserDocument | null> {
    return this.updateById(userId, { planId });
  }

  async updatePassword(userId: ObjectId, passwordHash: string): Promise<UserDocument | null> {
    const collection = this.getCollection();
    const result = await collection.findOneAndUpdate(
      { _id: userId },
      {
        $set: { passwordHash, refreshTokens: [], updatedAt: new Date() },
      },
      { returnDocument: 'after' }
    );
    return result ?? null;
  }

  async createIndexes(): Promise<void> {
    const collection = this.getCollection();
    await collection.createIndex({ email: 1 }, { unique: true });
    await collection.createIndex({ 'refreshTokens.tokenHash': 1 });
    await collection.createIndex({ 'refreshTokens.expiresAt': 1 });
  }
}
