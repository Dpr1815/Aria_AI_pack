import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { ApiResponseBuilder } from '../utils/response';
import {
  SignupInput,
  LoginInput,
  UpdateUserInput,
  RefreshTokenInput,
  ChangePasswordInput,
  LogoutInput,
} from '@validations';
import { RefreshContext } from '@middleware';

export class UserController {
  constructor(private readonly userService: UserService) {}

  signup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input: SignupInput = req.body;
      const context = this.extractRefreshContext(req);
      const authResponse = await this.userService.signup(input, context);

      res
        .status(201)
        .json(ApiResponseBuilder.created(authResponse, 'User registered successfully'));
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input: LoginInput = req.body;
      const context = this.extractRefreshContext(req);
      const authResponse = await this.userService.login(input, context);

      res.status(200).json(ApiResponseBuilder.success(authResponse));
    } catch (error) {
      next(error);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken }: RefreshTokenInput = req.body;
      const context = this.extractRefreshContext(req);
      const tokens = await this.userService.refresh(refreshToken, context);

      res.status(200).json(ApiResponseBuilder.success(tokens));
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken }: LogoutInput = req.body;
      await this.userService.logout(req.user!._id, refreshToken);

      const message = refreshToken
        ? 'Logged out from current session'
        : 'Logged out from all sessions';

      res.status(200).json(ApiResponseBuilder.deleted(message));
    } catch (error) {
      next(error);
    }
  };

  logoutAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.userService.logoutAllSessions(req.user!._id);

      res.status(200).json(ApiResponseBuilder.deleted('Logged out from all sessions'));
    } catch (error) {
      next(error);
    }
  };

  getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.userService.getUserById(req.user!._id);

      res.status(200).json(ApiResponseBuilder.success(user));
    } catch (error) {
      next(error);
    }
  };

  updateMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input: UpdateUserInput = req.body;
      const user = await this.userService.updateUser(req.user!._id, input);

      res.status(200).json(ApiResponseBuilder.success(user, 'Profile updated successfully'));
    } catch (error) {
      next(error);
    }
  };

  changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { currentPassword, newPassword }: ChangePasswordInput = req.body;
      const context = this.extractRefreshContext(req);
      const authResponse = await this.userService.changePassword(
        req.user!._id,
        currentPassword,
        newPassword,
        context
      );

      res
        .status(200)
        .json(ApiResponseBuilder.success(authResponse, 'Password changed successfully'));
    } catch (error) {
      next(error);
    }
  };

  private extractRefreshContext(req: Request): RefreshContext {
    return {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.socket.remoteAddress,
    };
  }
}
