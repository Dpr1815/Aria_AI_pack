/**
 * Integration tests for User authentication flow
 *
 * These tests demonstrate how to test the full flow from controller to repository
 * using mocked database but real service and repository logic.
 */

import { UserController } from '@controllers/user.controller';
import { UserService } from '@services/user.service';
import { UserRepository } from '@repositories/user.repository';
import { createMockDatabase, mockFindOne, mockInsertOne, mockFindOneAndUpdate } from '@test/mocks/database.mock';
import { createMockSignupInput, createMockLoginInput, createMockUserDocument } from '@test/helpers/mock-factories';
import { Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcrypt';

// Mock bcrypt for deterministic testing
jest.mock('bcrypt');
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('User Authentication Flow - Integration', () => {
  let userController: UserController;
  let userService: UserService;
  let userRepository: UserRepository;
  let mockDb: ReturnType<typeof createMockDatabase>;

  const config = {
    jwtSecret: 'test-secret',
    jwtRefreshSecret: 'test-refresh-secret',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup the stack with mocked database
    mockDb = createMockDatabase();
    userRepository = new UserRepository(mockDb);
    userService = new UserService(userRepository, config);
    userController = new UserController(userService);

    // Setup bcrypt mocks
    mockBcrypt.hash.mockImplementation((password) =>
      Promise.resolve(`hashed_${password}` as never)
    );
    mockBcrypt.compare.mockImplementation((plain, hash) =>
      Promise.resolve(hash === `hashed_${plain}` as never)
    );
  });

  describe('Signup -> Login -> GetMe flow', () => {
    it('should complete full user registration and authentication flow', async () => {
      // ============ STEP 1: SIGNUP ============
      const signupInput = createMockSignupInput({
        email: 'newuser@example.com',
        name: 'New User',
        password: 'SecurePassword123',
      });

      const userId = new ObjectId();
      const newUserDoc = createMockUserDocument({
        _id: userId,
        email: signupInput.email.toLowerCase(),
        name: signupInput.name,
        passwordHash: `hashed_${signupInput.password}`,
      });

      // Mock database calls for signup
      const usersCollection = mockDb.getCollection('users');
      mockFindOne(usersCollection, null); // No existing user
      mockInsertOne(usersCollection, userId);
      mockFindOneAndUpdate(usersCollection, newUserDoc); // For adding refresh token

      // Create mock request/response for signup
      const signupReq = {
        body: signupInput,
        headers: { 'user-agent': 'Test Browser' },
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' },
      } as Request;

      const signupRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      const next = jest.fn() as NextFunction;

      await userController.signup(signupReq, signupRes, next);

      // Verify signup response
      expect(signupRes.status).toHaveBeenCalledWith(201);
      expect(signupRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            user: expect.objectContaining({
              email: signupInput.email,
              name: signupInput.name,
            }),
            accessToken: expect.any(String),
            refreshToken: expect.any(String),
          }),
        })
      );
      expect(next).not.toHaveBeenCalled();

      // Extract tokens for next steps
      const signupResponse = (signupRes.json as jest.Mock).mock.calls[0][0];
      const { accessToken, refreshToken } = signupResponse.data;

      // ============ STEP 2: LOGIN ============
      jest.clearAllMocks();

      const loginInput = createMockLoginInput({
        email: signupInput.email,
        password: signupInput.password,
      });

      // Mock database calls for login
      mockFindOne(usersCollection, newUserDoc); // Find user by email
      mockFindOneAndUpdate(usersCollection, newUserDoc); // For cleanup expired tokens
      mockFindOneAndUpdate(usersCollection, newUserDoc); // For adding new refresh token

      const loginReq = {
        body: loginInput,
        headers: { 'user-agent': 'Test Browser' },
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' },
      } as Request;

      const loginRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      await userController.login(loginReq, loginRes, next);

      // Verify login response
      expect(loginRes.status).toHaveBeenCalledWith(200);
      expect(loginRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            user: expect.objectContaining({
              email: signupInput.email,
            }),
            accessToken: expect.any(String),
            refreshToken: expect.any(String),
          }),
        })
      );
      expect(mockBcrypt.compare).toHaveBeenCalledWith(
        loginInput.password,
        newUserDoc.passwordHash
      );

      // ============ STEP 3: GET CURRENT USER ============
      jest.clearAllMocks();

      // Mock database call for getMe
      mockFindOne(usersCollection, newUserDoc);

      const getMeReq = {
        user: { _id: userId },
      } as Request;

      const getMeRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      await userController.getMe(getMeReq, getMeRes, next);

      // Verify getMe response
      expect(getMeRes.status).toHaveBeenCalledWith(200);
      expect(getMeRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            _id: userId.toString(),
            email: signupInput.email,
            name: signupInput.name,
          }),
        })
      );
    });
  });

  describe('Error handling in integration', () => {
    it('should handle duplicate email during signup', async () => {
      const signupInput = createMockSignupInput({ email: 'existing@example.com' });
      const existingUser = createMockUserDocument({ email: signupInput.email });

      // Mock existing user found
      const usersCollection = mockDb.getCollection('users');
      mockFindOne(usersCollection, existingUser);

      const req = {
        body: signupInput,
        headers: {},
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' },
      } as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      const next = jest.fn() as NextFunction;

      await userController.signup(req, res, next);

      // Verify error was passed to next middleware
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User with this email already exists',
        })
      );
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should handle invalid credentials during login', async () => {
      const loginInput = createMockLoginInput({ password: 'WrongPassword' });
      const userDoc = createMockUserDocument({
        email: loginInput.email,
        passwordHash: 'hashed_CorrectPassword',
      });

      // Mock user found but password mismatch
      const usersCollection = mockDb.getCollection('users');
      mockFindOne(usersCollection, userDoc);

      const req = {
        body: loginInput,
        headers: {},
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' },
      } as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      const next = jest.fn() as NextFunction;

      await userController.login(req, res, next);

      // Verify error was passed to next middleware
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid email or password',
        })
      );
      expect(mockBcrypt.compare).toHaveBeenCalledWith(
        loginInput.password,
        userDoc.passwordHash
      );
    });
  });
});
