/**
 * Unit tests for UserService
 */

import { UserService } from '@services/user.service';
import { createMockUserRepository } from '@test/mocks/repository.mock';
import {
  createMockUserDocument,
  createMockSignupInput,
  createMockLoginInput,
  createMockUpdateUserInput,
  createMockChangePasswordInput,
  createMockRefreshTokenEntry,
} from '@test/helpers/mock-factories';
import { ConflictError, NotFoundError, UnauthorizedError } from '@utils/errors';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Mock bcrypt
jest.mock('bcrypt');
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

// Mock jwt
jest.mock('jsonwebtoken');
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('UserService', () => {
  let userService: UserService;
  let mockUserRepository: ReturnType<typeof createMockUserRepository>;

  const mockConfig = {
    jwtSecret: 'test-secret',
    jwtRefreshSecret: 'test-refresh-secret',
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create fresh mocks
    mockUserRepository = createMockUserRepository();
    userService = new UserService(mockUserRepository, mockConfig);
  });

  describe('signup', () => {
    it('should create a new user and return auth response', async () => {
      const input = createMockSignupInput();
      const mockUser = createMockUserDocument({ email: input.email, name: input.name });
      const mockHashedPassword = '$2b$12$hashedPassword';
      const mockAccessToken = 'mock-access-token';
      const mockRefreshToken = 'mock-refresh-token';

      // Setup mocks
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockBcrypt.hash.mockResolvedValue(mockHashedPassword as never);
      mockUserRepository.create.mockResolvedValue(mockUser);
      mockUserRepository.addRefreshToken.mockResolvedValue(mockUser);
      mockJwt.sign.mockReturnValueOnce(mockAccessToken as any).mockReturnValueOnce(mockRefreshToken as any);

      // Execute
      const result = await userService.signup(input);

      // Verify
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(input.email.toLowerCase());
      expect(mockBcrypt.hash).toHaveBeenCalledWith(input.password, 12);
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: input.email.toLowerCase(),
          name: input.name,
          passwordHash: mockHashedPassword,
        })
      );
      expect(result).toEqual(
        expect.objectContaining({
          user: expect.objectContaining({
            email: input.email,
            name: input.name,
          }),
          accessToken: mockAccessToken,
          refreshToken: mockRefreshToken,
        })
      );
    });

    it('should throw ConflictError if email already exists', async () => {
      const input = createMockSignupInput();
      const existingUser = createMockUserDocument({ email: input.email });

      mockUserRepository.findByEmail.mockResolvedValue(existingUser);

      await expect(userService.signup(input)).rejects.toThrow('User with this email already exists');
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(input.email.toLowerCase());
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should normalize email to lowercase', async () => {
      const input = createMockSignupInput({ email: 'Test@Example.COM' });
      const mockUser = createMockUserDocument();

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockBcrypt.hash.mockResolvedValue('hashed' as never);
      mockUserRepository.create.mockResolvedValue(mockUser);
      mockUserRepository.addRefreshToken.mockResolvedValue(mockUser);
      mockJwt.sign.mockReturnValue('token' as any);

      await userService.signup(input);

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
        })
      );
    });
  });

  describe('login', () => {
    it('should authenticate user and return auth response', async () => {
      const input = createMockLoginInput();
      const mockUser = createMockUserDocument({
        email: input.email,
        passwordHash: '$2b$12$hashedPassword',
      });
      const mockAccessToken = 'mock-access-token';
      const mockRefreshToken = 'mock-refresh-token';

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockUserRepository.removeExpiredRefreshTokens.mockResolvedValue(mockUser);
      mockUserRepository.addRefreshToken.mockResolvedValue(mockUser);
      mockJwt.sign.mockReturnValueOnce(mockAccessToken as any).mockReturnValueOnce(mockRefreshToken as any);

      const result = await userService.login(input);

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(input.email.toLowerCase());
      expect(mockBcrypt.compare).toHaveBeenCalledWith(input.password, mockUser.passwordHash);
      expect(result).toEqual(
        expect.objectContaining({
          user: expect.objectContaining({
            email: input.email,
          }),
          accessToken: mockAccessToken,
          refreshToken: mockRefreshToken,
        })
      );
    });

    it('should throw UnauthorizedError if user not found', async () => {
      const input = createMockLoginInput();

      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(userService.login(input)).rejects.toThrow('Invalid email or password');
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(input.email.toLowerCase());
      expect(mockBcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedError if password is invalid', async () => {
      const input = createMockLoginInput();
      const mockUser = createMockUserDocument({ email: input.email });

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(false as never);

      await expect(userService.login(input)).rejects.toThrow('Invalid email or password');
      expect(mockBcrypt.compare).toHaveBeenCalledWith(input.password, mockUser.passwordHash);
    });
  });

  describe('refresh', () => {
    it('should refresh tokens successfully', async () => {
      const refreshToken = 'valid-refresh-token';
      const tokenHash = 'token-hash';
      const userId = new ObjectId();
      const mockUser = createMockUserDocument({
        _id: userId,
        refreshTokens: [createMockRefreshTokenEntry({ tokenHash })],
      });

      mockJwt.verify.mockReturnValue({ userId: userId.toString(), type: 'refresh' } as any);
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.removeRefreshToken.mockResolvedValue(mockUser);
      mockUserRepository.addRefreshToken.mockResolvedValue(mockUser);
      mockJwt.sign.mockReturnValue('new-token' as any);

      // Mock the hash function
      jest.spyOn(userService as any, 'hashToken').mockReturnValue(tokenHash);

      const result = await userService.refresh(refreshToken);

      expect(mockJwt.verify).toHaveBeenCalledWith(refreshToken, mockConfig.jwtRefreshSecret);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedError if user not found', async () => {
      const refreshToken = 'valid-refresh-token';
      const userId = new ObjectId();

      mockJwt.verify.mockReturnValue({ userId: userId.toString(), type: 'refresh' } as any);
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(userService.refresh(refreshToken)).rejects.toThrow('User not found');
    });

    it('should throw UnauthorizedError if token not in database', async () => {
      const refreshToken = 'invalid-refresh-token';
      const userId = new ObjectId();
      const mockUser = createMockUserDocument({ _id: userId, refreshTokens: [] });

      mockJwt.verify.mockReturnValue({ userId: userId.toString(), type: 'refresh' } as any);
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.removeAllRefreshTokens.mockResolvedValue(mockUser);

      await expect(userService.refresh(refreshToken)).rejects.toThrow('Invalid refresh token');
      expect(mockUserRepository.removeAllRefreshTokens).toHaveBeenCalledWith(userId);
    });

    it('should throw UnauthorizedError if stored token is expired', async () => {
      const refreshToken = 'expired-stored-token';
      const tokenHash = 'expired-hash';
      const userId = new ObjectId();
      const expiredTokenEntry = createMockRefreshTokenEntry({
        tokenHash,
        expiresAt: new Date(Date.now() - 1000), // expired 1 second ago
      });
      const mockUser = createMockUserDocument({
        _id: userId,
        refreshTokens: [expiredTokenEntry],
      });

      mockJwt.verify.mockReturnValue({ userId: userId.toString(), type: 'refresh' } as any);
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.removeRefreshToken.mockResolvedValue(mockUser);
      jest.spyOn(userService as any, 'hashToken').mockReturnValue(tokenHash);

      await expect(userService.refresh(refreshToken)).rejects.toThrow('Refresh token expired');
      expect(mockUserRepository.removeRefreshToken).toHaveBeenCalledWith(userId, tokenHash);
    });
  });

  describe('changePassword', () => {
    it('should change password and return new auth response', async () => {
      const userId = new ObjectId();
      const currentPassword = 'oldPassword123';
      const newPassword = 'newPassword123';
      const mockUser = createMockUserDocument({
        _id: userId,
        passwordHash: '$2b$12$oldHashedPassword',
      });
      const newPasswordHash = '$2b$12$newHashedPassword';

      mockUserRepository.findByIdOrThrow.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockBcrypt.hash.mockResolvedValue(newPasswordHash as never);
      mockUserRepository.updatePassword.mockResolvedValue({
        ...mockUser,
        passwordHash: newPasswordHash,
      });
      mockUserRepository.addRefreshToken.mockResolvedValue(mockUser);
      mockJwt.sign.mockReturnValue('token' as any);

      const result = await userService.changePassword(userId, currentPassword, newPassword);

      expect(mockUserRepository.findByIdOrThrow).toHaveBeenCalledWith(userId, 'User');
      expect(mockBcrypt.compare).toHaveBeenCalledWith(currentPassword, mockUser.passwordHash);
      expect(mockBcrypt.hash).toHaveBeenCalledWith(newPassword, 12);
      expect(mockUserRepository.updatePassword).toHaveBeenCalledWith(userId, newPasswordHash);
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedError if current password is incorrect', async () => {
      const userId = new ObjectId();
      const mockUser = createMockUserDocument({ _id: userId });

      mockUserRepository.findByIdOrThrow.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(false as never);

      await expect(
        userService.changePassword(userId, 'wrongPassword', 'newPassword')
      ).rejects.toThrow('Current password is incorrect');

      expect(mockUserRepository.updatePassword).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should remove single refresh token when provided', async () => {
      const userId = new ObjectId();
      const refreshToken = 'refresh-token';
      const tokenHash = 'token-hash';

      jest.spyOn(userService as any, 'hashToken').mockReturnValue(tokenHash);
      mockUserRepository.removeRefreshToken.mockResolvedValue(null);

      await userService.logout(userId, refreshToken);

      expect(mockUserRepository.removeRefreshToken).toHaveBeenCalledWith(userId, tokenHash);
      expect(mockUserRepository.removeAllRefreshTokens).not.toHaveBeenCalled();
    });

    it('should remove all refresh tokens when token not provided', async () => {
      const userId = new ObjectId();

      mockUserRepository.removeAllRefreshTokens.mockResolvedValue(null);

      await userService.logout(userId);

      expect(mockUserRepository.removeAllRefreshTokens).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.removeRefreshToken).not.toHaveBeenCalled();
    });
  });

  describe('logoutAllSessions', () => {
    it('should remove all refresh tokens for user', async () => {
      const userId = new ObjectId();

      mockUserRepository.removeAllRefreshTokens.mockResolvedValue(null);

      await userService.logoutAllSessions(userId);

      expect(mockUserRepository.removeAllRefreshTokens).toHaveBeenCalledWith(userId);
    });

    it('should accept string userId', async () => {
      const userId = new ObjectId();

      mockUserRepository.removeAllRefreshTokens.mockResolvedValue(null);

      await userService.logoutAllSessions(userId.toString());

      expect(mockUserRepository.removeAllRefreshTokens).toHaveBeenCalled();
    });
  });

  describe('getUserById', () => {
    it('should return user DTO when user exists', async () => {
      const userId = new ObjectId();
      const mockUser = createMockUserDocument({
        _id: userId,
        email: 'test@example.com',
        name: 'Test User',
      });

      mockUserRepository.findByIdOrThrow.mockResolvedValue(mockUser);

      const result = await userService.getUserById(userId);

      expect(mockUserRepository.findByIdOrThrow).toHaveBeenCalledWith(userId, 'User');
      expect(result).toEqual(
        expect.objectContaining({
          _id: userId.toString(),
          email: 'test@example.com',
          name: 'Test User',
        })
      );
    });
  });

  describe('updateUser', () => {
    it('should update user and return DTO', async () => {
      const userId = new ObjectId();
      const input = createMockUpdateUserInput({ name: 'Updated Name' });
      const updatedUser = createMockUserDocument({ _id: userId, name: 'Updated Name' });

      mockUserRepository.updateByIdOrThrow.mockResolvedValue(updatedUser);

      const result = await userService.updateUser(userId, input);

      expect(mockUserRepository.updateByIdOrThrow).toHaveBeenCalledWith(userId, input, 'User');
      expect(result.name).toBe('Updated Name');
    });
  });

  describe('enforceMaxTokens (via signup)', () => {
    it('should remove oldest token when user has 10+ refresh tokens', async () => {
      const input = createMockSignupInput();
      const userId = new ObjectId();

      // Create 10 tokens with staggered creation times
      const tokens = Array.from({ length: 10 }, (_, i) =>
        createMockRefreshTokenEntry({
          tokenHash: `hash-${i}`,
          createdAt: new Date(Date.now() - (10 - i) * 60000), // oldest first
        })
      );

      const mockUser = createMockUserDocument({ _id: userId, refreshTokens: tokens });

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockBcrypt.hash.mockResolvedValue('hashed' as never);
      mockUserRepository.create.mockResolvedValue(mockUser);
      // findById is called by enforceMaxTokens
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.removeRefreshToken.mockResolvedValue(mockUser);
      mockUserRepository.addRefreshToken.mockResolvedValue(mockUser);
      mockJwt.sign.mockReturnValue('token' as any);

      await userService.signup(input);

      // Should remove the oldest token (hash-0)
      expect(mockUserRepository.removeRefreshToken).toHaveBeenCalledWith(userId, 'hash-0');
    });

    it('should not remove tokens when user has fewer than 10', async () => {
      const input = createMockSignupInput();
      const userId = new ObjectId();

      const tokens = Array.from({ length: 5 }, (_, i) =>
        createMockRefreshTokenEntry({ tokenHash: `hash-${i}` })
      );

      const mockUser = createMockUserDocument({ _id: userId, refreshTokens: tokens });

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockBcrypt.hash.mockResolvedValue('hashed' as never);
      mockUserRepository.create.mockResolvedValue(mockUser);
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.addRefreshToken.mockResolvedValue(mockUser);
      mockJwt.sign.mockReturnValue('token' as any);

      await userService.signup(input);

      expect(mockUserRepository.removeRefreshToken).not.toHaveBeenCalled();
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify and return valid access token payload', () => {
      const token = 'valid-access-token';
      const payload = {
        userId: new ObjectId().toString(),
        email: 'test@example.com',
        type: 'access',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 900,
      };

      mockJwt.verify.mockReturnValue(payload as any);

      const result = userService.verifyAccessToken(token);

      expect(mockJwt.verify).toHaveBeenCalledWith(token, mockConfig.jwtSecret);
      expect(result).toEqual(payload);
    });

    it('should throw UnauthorizedError for invalid token type', () => {
      const token = 'invalid-type-token';
      mockJwt.verify.mockReturnValue({ type: 'refresh' } as any);

      expect(() => userService.verifyAccessToken(token)).toThrow('Invalid token type');
    });

    it('should throw UnauthorizedError for expired token', () => {
      const token = 'expired-token';
      mockJwt.verify.mockImplementation(() => {
        throw new jwt.TokenExpiredError('jwt expired', new Date());
      });

      expect(() => userService.verifyAccessToken(token)).toThrow('Access token expired');
    });

    it('should throw UnauthorizedError for invalid token', () => {
      const token = 'malformed-token';
      mockJwt.verify.mockImplementation(() => {
        throw new jwt.JsonWebTokenError('jwt malformed');
      });

      expect(() => userService.verifyAccessToken(token)).toThrow('Invalid access token');
    });
  });
});
