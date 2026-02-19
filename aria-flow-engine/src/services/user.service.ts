import { ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { UserRepository } from '@repositories/user.repository';
import { UserDocument, RefreshTokenEntry } from '@models/documents/user.document';
import { SignupInput, LoginInput, UpdateUserInput } from '@validations/user.validation';
import { PlanId } from '@constants';
import { ConflictError, NotFoundError, UnauthorizedError } from '@utils/errors';
import { createLogger, toObjectId } from '@utils';
import { TokenPairDTO, AuthResponseDTO, UserDTO } from '@models';
import type { AccessTokenPayload, RefreshTokenPayload, RefreshContext } from '@middleware';

const logger = createLogger('UserService');

const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY_SECONDS = 15 * 60; // 15 minutes
const REFRESH_TOKEN_EXPIRY_SECONDS = 30 * 24 * 60 * 60; // 30 days
const MAX_REFRESH_TOKENS_PER_USER = 10;

export interface UserServiceConfig {
  jwtSecret: string;
  jwtRefreshSecret: string;
}

export class UserService {
  private readonly userRepository: UserRepository;
  private readonly config: UserServiceConfig;

  constructor(userRepository: UserRepository, config: UserServiceConfig) {
    this.userRepository = userRepository;
    this.config = config;
  }

  async signup(input: SignupInput, context?: RefreshContext): Promise<AuthResponseDTO> {
    const emailLower = input.email.toLowerCase();

    const existingUser = await this.userRepository.findByEmail(emailLower);
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

    const user = await this.userRepository.create({
      email: emailLower,
      name: input.name,
      companyName: input.companyName,
      passwordHash,
      planId: PlanId.FREE,
      refreshTokens: [],
    });

    const tokens = await this.generateAndStoreTokens(user, context);

    logger.info('User signed up', { userId: user._id.toString(), email: emailLower });

    return this.buildAuthResponseDTO(user, tokens);
  }

  async login(input: LoginInput, context?: RefreshContext): Promise<AuthResponseDTO> {
    const emailLower = input.email.toLowerCase();

    const user = await this.userRepository.findByEmail(emailLower);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    await this.cleanupExpiredTokens(user._id);
    const tokens = await this.generateAndStoreTokens(user, context);

    logger.info('User logged in', { userId: user._id.toString() });

    return this.buildAuthResponseDTO(user, tokens);
  }

  async refresh(refreshToken: string, context?: RefreshContext): Promise<TokenPairDTO> {
    const payload = this.verifyRefreshToken(refreshToken);
    const userId = new ObjectId(payload.userId);

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    const tokenHash = this.hashToken(refreshToken);
    const storedToken = user.refreshTokens.find((t) => t.tokenHash === tokenHash);

    if (!storedToken) {
      logger.warn('Refresh token not found in database - possible token reuse', {
        userId: user._id.toString(),
      });
      await this.userRepository.removeAllRefreshTokens(user._id);
      throw new UnauthorizedError('Invalid refresh token');
    }

    if (storedToken.expiresAt < new Date()) {
      await this.userRepository.removeRefreshToken(user._id, tokenHash);
      throw new UnauthorizedError('Refresh token expired');
    }

    await this.userRepository.removeRefreshToken(user._id, tokenHash);
    const tokens = await this.generateAndStoreTokens(user, context);

    logger.info('Tokens refreshed', { userId: user._id.toString() });

    return tokens;
  }

  async changePassword(
    userId: string | ObjectId,
    currentPassword: string,
    newPassword: string,
    context?: RefreshContext
  ): Promise<AuthResponseDTO> {
    const user = await this.userRepository.findByIdOrThrow(userId, 'User');

    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    const updatedUser = await this.userRepository.updatePassword(user._id, passwordHash);

    if (!updatedUser) {
      throw new NotFoundError('User', userId.toString());
    }

    const tokens = await this.generateAndStoreTokens(updatedUser, context);

    logger.info('Password changed, all sessions revoked', { userId: user._id.toString() });

    return this.buildAuthResponseDTO(updatedUser, tokens);
  }

  async logout(userId: string | ObjectId, refreshToken?: string): Promise<void> {
    const objectId = toObjectId(userId);

    if (refreshToken) {
      const tokenHash = this.hashToken(refreshToken);
      await this.userRepository.removeRefreshToken(objectId, tokenHash);
      logger.info('User logged out (single session)', { userId: objectId.toString() });
    } else {
      await this.userRepository.removeAllRefreshTokens(objectId);
      logger.info('User logged out (all sessions)', { userId: objectId.toString() });
    }
  }

  async logoutAllSessions(userId: string | ObjectId): Promise<void> {
    const objectId = toObjectId(userId);
    await this.userRepository.removeAllRefreshTokens(objectId);
    logger.info('All sessions revoked', { userId: objectId.toString() });
  }

  async getUserById(userId: string | ObjectId): Promise<UserDTO> {
    const user = await this.userRepository.findByIdOrThrow(userId, 'User');
    return this.toResponse(user);
  }

  async updateUser(userId: string | ObjectId, input: UpdateUserInput): Promise<UserDTO> {
    const user = await this.userRepository.updateByIdOrThrow(userId, input, 'User');
    logger.info('User updated', { userId: user._id.toString() });
    return this.toResponse(user);
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    try {
      const payload = jwt.verify(token, this.config.jwtSecret) as AccessTokenPayload;

      if (payload.type !== 'access') {
        throw new UnauthorizedError('Invalid token type');
      }

      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Access token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedError('Invalid access token');
      }
      throw error;
    }
  }

  // ============================================
  // RESPONSE TRANSFORMERS
  // ============================================

  private toResponse(user: UserDocument): UserDTO {
    return {
      _id: user._id.toString(),
      email: user.email,
      name: user.name,
      companyName: user.companyName,
      organizationId: user.organizationId?.toString(),
      planId: user.planId,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  private buildAuthResponseDTO(user: UserDocument, tokens: TokenPairDTO): AuthResponseDTO {
    return {
      user: this.toResponse(user),
      ...tokens,
    };
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private async generateAndStoreTokens(
    user: UserDocument,
    context?: RefreshContext
  ): Promise<TokenPairDTO> {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    const tokenEntry: RefreshTokenEntry = {
      tokenHash: this.hashToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_SECONDS * 1000),
      createdAt: new Date(),
      userAgent: context?.userAgent,
      ipAddress: context?.ipAddress,
    };

    await this.enforceMaxTokens(user._id);
    await this.userRepository.addRefreshToken(user._id, tokenEntry);

    return { accessToken, refreshToken };
  }

  private verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      const payload = jwt.verify(token, this.config.jwtRefreshSecret) as RefreshTokenPayload;

      if (payload.type !== 'refresh') {
        throw new UnauthorizedError('Invalid token type');
      }

      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Refresh token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedError('Invalid refresh token');
      }
      throw error;
    }
  }

  private generateAccessToken(user: UserDocument): string {
    const payload: Omit<AccessTokenPayload, 'iat' | 'exp'> = {
      userId: user._id.toString(),
      email: user.email,
      type: 'access',
    };

    return jwt.sign(payload, this.config.jwtSecret, {
      expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
    });
  }

  private generateRefreshToken(user: UserDocument): string {
    const payload: Omit<RefreshTokenPayload, 'iat' | 'exp'> = {
      userId: user._id.toString(),
      type: 'refresh',
    };

    return jwt.sign(payload, this.config.jwtRefreshSecret, {
      expiresIn: REFRESH_TOKEN_EXPIRY_SECONDS,
    });
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async enforceMaxTokens(userId: ObjectId): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) return;

    if (user.refreshTokens.length >= MAX_REFRESH_TOKENS_PER_USER) {
      const sortedTokens = [...user.refreshTokens].sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
      );
      const oldestToken = sortedTokens[0];
      await this.userRepository.removeRefreshToken(userId, oldestToken.tokenHash);
    }
  }

  private async cleanupExpiredTokens(userId: ObjectId): Promise<void> {
    await this.userRepository.removeExpiredRefreshTokens(userId);
  }
}
