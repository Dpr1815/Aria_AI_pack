import { ObjectId } from 'mongodb';
import { PlanId } from '../../constants';

export interface RefreshTokenEntry {
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  userAgent?: string;
  ipAddress?: string;
}

export interface UserDocument {
  _id: ObjectId;
  email: string;
  name: string;
  companyName?: string;
  passwordHash: string;
  refreshTokens: RefreshTokenEntry[];
  organizationId?: ObjectId;
  planId: PlanId;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateUserDocument = Omit<
  UserDocument,
  '_id' | 'createdAt' | 'updatedAt' | 'refreshTokens'
>;
