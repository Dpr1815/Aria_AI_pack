/**
 * Unit tests for UserController
 */

import { Request, Response, NextFunction } from 'express';
import { UserController } from '@controllers/user.controller';
import { UserService } from '@services/user.service';
import { ApiResponseBuilder } from '@utils/response';
import {
  createMockAuthResponse,
  createMockUserDTO,
  createMockSignupInput,
  createMockLoginInput,
  createMockUpdateUserInput,
  createMockChangePasswordInput,
  createMockTokenPair,
} from '@test/helpers/mock-factories';
import { ObjectId } from 'mongodb';

// Mock UserService
jest.mock('@services/user.service');

describe('UserController', () => {
  let userController: UserController;
  let mockUserService: jest.Mocked<UserService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    // Create mocked UserService
    mockUserService = {
      signup: jest.fn(),
      login: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn(),
      logoutAllSessions: jest.fn(),
      getUserById: jest.fn(),
      updateUser: jest.fn(),
      changePassword: jest.fn(),
      verifyAccessToken: jest.fn(),
    } as any;

    userController = new UserController(mockUserService);

    // Setup mock request and response
    mockRequest = {
      body: {},
      headers: {},
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' } as any,
    } as any;

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signup', () => {
    it('should create a new user and return 201 with auth response', async () => {
      const input = createMockSignupInput();
      const authResponse = createMockAuthResponse();

      mockRequest.body = input;
      mockRequest.headers = { 'user-agent': 'Test Browser' };
      mockUserService.signup.mockResolvedValue(authResponse);

      await userController.signup(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockUserService.signup).toHaveBeenCalledWith(input, {
        userAgent: 'Test Browser',
        ipAddress: '127.0.0.1',
      });
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(
        ApiResponseBuilder.created(authResponse, 'User registered successfully')
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with error if signup fails', async () => {
      const input = createMockSignupInput();
      const error = new Error('Signup failed');

      mockRequest.body = input;
      mockUserService.signup.mockRejectedValue(error);

      await userController.signup(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should authenticate user and return 200 with auth response', async () => {
      const input = createMockLoginInput();
      const authResponse = createMockAuthResponse();

      mockRequest.body = input;
      mockRequest.headers = { 'user-agent': 'Test Browser' };
      mockUserService.login.mockResolvedValue(authResponse);

      await userController.login(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockUserService.login).toHaveBeenCalledWith(input, {
        userAgent: 'Test Browser',
        ipAddress: '127.0.0.1',
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        ApiResponseBuilder.success(authResponse)
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with error if login fails', async () => {
      const input = createMockLoginInput();
      const error = new Error('Login failed');

      mockRequest.body = input;
      mockUserService.login.mockRejectedValue(error);

      await userController.login(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('should refresh tokens and return 200 with new tokens', async () => {
      const refreshToken = 'valid-refresh-token';
      const tokenPair = createMockTokenPair();

      mockRequest.body = { refreshToken };
      mockRequest.headers = { 'user-agent': 'Test Browser' };
      mockUserService.refresh.mockResolvedValue(tokenPair);

      await userController.refresh(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockUserService.refresh).toHaveBeenCalledWith(refreshToken, {
        userAgent: 'Test Browser',
        ipAddress: '127.0.0.1',
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        ApiResponseBuilder.success(tokenPair)
      );
    });

    it('should call next with error if refresh fails', async () => {
      const refreshToken = 'invalid-refresh-token';
      const error = new Error('Refresh failed');

      mockRequest.body = { refreshToken };
      mockUserService.refresh.mockRejectedValue(error);

      await userController.refresh(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('logout', () => {
    it('should logout single session when refreshToken provided', async () => {
      const userId = new ObjectId();
      const refreshToken = 'refresh-token';

      mockRequest.body = { refreshToken };
      mockRequest.user = { _id: userId } as any;
      mockUserService.logout.mockResolvedValue();

      await userController.logout(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockUserService.logout).toHaveBeenCalledWith(userId, refreshToken);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        ApiResponseBuilder.deleted('Logged out from current session')
      );
    });

    it('should logout all sessions when no refreshToken provided', async () => {
      const userId = new ObjectId();

      mockRequest.body = {};
      mockRequest.user = { _id: userId } as any;
      mockUserService.logout.mockResolvedValue();

      await userController.logout(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockUserService.logout).toHaveBeenCalledWith(userId, undefined);
      expect(mockResponse.json).toHaveBeenCalledWith(
        ApiResponseBuilder.deleted('Logged out from all sessions')
      );
    });

    it('should call next with error if logout fails', async () => {
      const userId = new ObjectId();
      const error = new Error('Logout failed');

      mockRequest.body = {};
      mockRequest.user = { _id: userId } as any;
      mockUserService.logout.mockRejectedValue(error);

      await userController.logout(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('logoutAll', () => {
    it('should logout all sessions and return 200', async () => {
      const userId = new ObjectId();

      mockRequest.user = { _id: userId } as any;
      mockUserService.logoutAllSessions.mockResolvedValue();

      await userController.logoutAll(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockUserService.logoutAllSessions).toHaveBeenCalledWith(userId);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        ApiResponseBuilder.deleted('Logged out from all sessions')
      );
    });
  });

  describe('getMe', () => {
    it('should return current user profile', async () => {
      const userId = new ObjectId();
      const userDTO = createMockUserDTO({ _id: userId.toString() });

      mockRequest.user = { _id: userId } as any;
      mockUserService.getUserById.mockResolvedValue(userDTO);

      await userController.getMe(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockUserService.getUserById).toHaveBeenCalledWith(userId);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        ApiResponseBuilder.success(userDTO)
      );
    });

    it('should call next with error if getUserById fails', async () => {
      const userId = new ObjectId();
      const error = new Error('Get user failed');

      mockRequest.user = { _id: userId } as any;
      mockUserService.getUserById.mockRejectedValue(error);

      await userController.getMe(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('updateMe', () => {
    it('should update current user and return updated profile', async () => {
      const userId = new ObjectId();
      const input = createMockUpdateUserInput();
      const updatedUser = createMockUserDTO({ _id: userId.toString(), name: input.name });

      mockRequest.body = input;
      mockRequest.user = { _id: userId } as any;
      mockUserService.updateUser.mockResolvedValue(updatedUser);

      await userController.updateMe(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockUserService.updateUser).toHaveBeenCalledWith(userId, input);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        ApiResponseBuilder.success(updatedUser, 'Profile updated successfully')
      );
    });
  });

  describe('changePassword', () => {
    it('should change password and return new auth response', async () => {
      const userId = new ObjectId();
      const input = createMockChangePasswordInput();
      const authResponse = createMockAuthResponse();

      mockRequest.body = input;
      mockRequest.user = { _id: userId } as any;
      mockRequest.headers = { 'user-agent': 'Test Browser' };
      mockUserService.changePassword.mockResolvedValue(authResponse);

      await userController.changePassword(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockUserService.changePassword).toHaveBeenCalledWith(
        userId,
        input.currentPassword,
        input.newPassword,
        {
          userAgent: 'Test Browser',
          ipAddress: '127.0.0.1',
        }
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        ApiResponseBuilder.success(authResponse, 'Password changed successfully')
      );
    });

    it('should call next with error if changePassword fails', async () => {
      const userId = new ObjectId();
      const input = createMockChangePasswordInput();
      const error = new Error('Change password failed');

      mockRequest.body = input;
      mockRequest.user = { _id: userId } as any;
      mockUserService.changePassword.mockRejectedValue(error);

      await userController.changePassword(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
