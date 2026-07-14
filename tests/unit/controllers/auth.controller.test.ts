import { Request, Response, NextFunction } from 'express';
import authController from '../../../src/controllers/auth.controller';
import { authService, userService } from '../../../src/services';
import ApiError from '../../../src/utils/ApiError';
import config from '../../../src/config/config';
import mongoose from 'mongoose';
import { IUser } from '../../../src/models'; // Import IUser
import asyncHandler from '../../../src/middlewares/asyncHandler'; // Import asyncHandler
import { RequestHandler } from 'express'; // Import RequestHandler type

// Mock services
jest.mock('../../../src/services/auth.service');
jest.mock('../../../src/services/user.service');

// Mock config values needed for cookie options
jest.mock('../../../src/config/config', () => ({
  cookie: {
    secure: false, // Assuming false for testing environment
  },
  jwt: {
    accessExpirationMinutes: 30,
    refreshExpirationDays: 7,
  },
}));

describe('Auth Controller', () => {
  // Extend Partial<Request> to include the 'user' property
  interface MockRequestWithUser extends Partial<Request> {
    user?: IUser;
  }
  let mockReq: MockRequestWithUser;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  const userId = new mongoose.Types.ObjectId().toString();
  const mockTokens = {
    accessToken: 'mockAccessToken',
    refreshToken: 'mockRefreshToken',
  };
  const mockUser = {
    _id: userId,
    name: 'Test User',
    email: 'test@example.com',
    role: 'user',
    isEmailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  let persistedUser: typeof mockUser & {
    refreshToken?: string;
    save: jest.Mock;
  };

  // Define expected cookie options based on mocked config
  const REFRESH_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: 'strict' as const,
    maxAge: config.jwt.refreshExpirationDays * 24 * 60 * 60 * 1000,
  };
  const ACCESS_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: 'strict' as const,
    maxAge: config.jwt.accessExpirationMinutes * 60 * 1000,
  };
  const COOKIE_CLEAR_OPTIONS = {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: 'strict' as const,
  };

  beforeEach(() => {
    persistedUser = {
      ...mockUser,
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockReq = {
      body: {},
      cookies: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  // Test asyncHandler directly to ensure it catches promise rejections
  describe('asyncHandler', () => {
    it('should call next with error if the wrapped function rejects', async () => {
      const testError = new Error('Test rejection');
      // Prefix unused parameters with underscores
      const mockRejectingHandler: RequestHandler = async (
        _req,
        _res,
        _next
      ) => {
        throw testError; // Throwing directly is fine for this isolated test
      };
      const wrappedHandler = asyncHandler(mockRejectingHandler);

      await wrappedHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(testError);
    });
  });

  describe('register', () => {
    it('should create user, set cookies, and return user and tokens', async () => {
      mockReq.body = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123!',
      };
      (userService.createUser as jest.Mock).mockResolvedValue(persistedUser);
      (authService.generateAuthTokens as jest.Mock).mockReturnValue(mockTokens);

      await (authController.register as any)(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );
      await new Promise(process.nextTick);

      expect(userService.createUser).toHaveBeenCalledWith(mockReq.body);
      expect(authService.generateAuthTokens).toHaveBeenCalledWith(userId);
      expect(persistedUser.refreshToken).toBe(mockTokens.refreshToken);
      expect(persistedUser.save).toHaveBeenCalledTimes(1);
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'refreshToken',
        mockTokens.refreshToken,
        REFRESH_COOKIE_OPTIONS
      );
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'accessToken',
        mockTokens.accessToken,
        ACCESS_COOKIE_OPTIONS
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          user: mockUser,
          tokens: mockTokens,
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with error if userService.createUser fails', (done) => {
      const error = new Error('User creation failed');
      (userService.createUser as jest.Mock).mockImplementation(async () => {
        return Promise.reject(error);
      });
      mockReq.body = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123!',
      };

      // Patch mockNext to call done when called with error
      mockNext = (err) => {
        try {
          expect(err).toBe(error);
          expect(userService.createUser).toHaveBeenCalledWith(mockReq.body);
          done();
        } catch (e) {
          done(e);
        }
      };

      (authController.register as any)(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );
    });
  });

  describe('login', () => {
    it('should authenticate user, set cookies, and return user and tokens', async () => {
      mockReq.body = { email: 'test@example.com', password: 'password123!' };
      (authService.login as jest.Mock).mockResolvedValue({
        user: mockUser,
        tokens: mockTokens,
      });

      await (authController.login as any)(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(authService.login).toHaveBeenCalledWith(mockReq.body);
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'refreshToken',
        mockTokens.refreshToken,
        REFRESH_COOKIE_OPTIONS
      );
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'accessToken',
        mockTokens.accessToken,
        ACCESS_COOKIE_OPTIONS
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          user: mockUser,
          tokens: mockTokens,
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with error if authService.login fails', (done) => {
      const error = new ApiError(401, 'Incorrect email or password');
      (authService.login as jest.Mock).mockImplementation(async () => {
        return Promise.reject(error);
      });
      mockReq.body = { email: 'test@example.com', password: 'password123!' };

      mockNext = (err) => {
        try {
          expect(err).toBe(error);
          expect(authService.login).toHaveBeenCalledWith(mockReq.body);
          done();
        } catch (e) {
          done(e);
        }
      };

      (authController.login as any)(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );
    });
  });

  describe('logout', () => {
    it('should revoke the refresh token and clear both auth cookies', async () => {
      const revokeRefreshToken = jest.fn().mockResolvedValue(undefined);
      (
        authService as unknown as { revokeRefreshToken: jest.Mock }
      ).revokeRefreshToken = revokeRefreshToken;
      mockReq.cookies = { refreshToken: 'stored-refresh-token' };

      await (authController.logout as any)(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(revokeRefreshToken).toHaveBeenCalledWith('stored-refresh-token');
      expect(mockRes.clearCookie).toHaveBeenCalledWith(
        'refreshToken',
        COOKIE_CLEAR_OPTIONS
      );
      expect(mockRes.clearCookie).toHaveBeenCalledWith(
        'accessToken',
        COOKIE_CLEAR_OPTIONS
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Logged out successfully',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('clears client cookies even when server-side revocation fails', async () => {
      const error = new Error('Database unavailable');
      const revokeRefreshToken = jest.fn().mockRejectedValue(error);
      (
        authService as unknown as { revokeRefreshToken: jest.Mock }
      ).revokeRefreshToken = revokeRefreshToken;
      mockReq.cookies = { refreshToken: 'stored-refresh-token' };

      await (authController.logout as any)(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );
      await new Promise(process.nextTick);

      expect(mockRes.clearCookie).toHaveBeenCalledWith(
        'refreshToken',
        COOKIE_CLEAR_OPTIONS
      );
      expect(mockRes.clearCookie).toHaveBeenCalledWith(
        'accessToken',
        COOKIE_CLEAR_OPTIONS
      );
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens, set cookies, and return new tokens', async () => {
      mockReq.cookies = { refreshToken: 'oldRefreshToken' };
      const newTokens = {
        accessToken: 'newAccessToken',
        refreshToken: 'newRefreshToken',
      };
      (authService.refreshTokens as jest.Mock).mockResolvedValue(newTokens);

      await (authController.refreshTokens as any)(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(authService.refreshTokens).toHaveBeenCalledWith('oldRefreshToken');
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'refreshToken',
        newTokens.refreshToken,
        REFRESH_COOKIE_OPTIONS
      );
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'accessToken',
        newTokens.accessToken,
        ACCESS_COOKIE_OPTIONS
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          tokens: newTokens,
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with ApiError if refreshToken cookie is missing', async () => {
      mockReq.cookies = {}; // No refreshToken cookie

      await (authController.refreshTokens as any)(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(authService.refreshTokens).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: 'Refresh token not found in cookies',
        })
      );
    });

    it('should call next with error if authService.refreshTokens fails', (done) => {
      const error = new ApiError(401, 'Invalid refresh token');
      (authService.refreshTokens as jest.Mock).mockImplementation(async () => {
        return Promise.reject(error);
      });
      mockReq.cookies = { refreshToken: 'oldRefreshToken' };

      mockNext = (err) => {
        try {
          expect(err).toBe(error);
          expect(authService.refreshTokens).toHaveBeenCalledWith(
            'oldRefreshToken'
          );
          done();
        } catch (e) {
          done(e);
        }
      };

      (authController.refreshTokens as any)(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );
    });
  });

  describe('getProfile', () => {
    it('should return the authenticated user from req.user', async () => {
      mockReq.user = mockUser as any; // Simulate user attached by auth middleware

      await (authController.getProfile as any)(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockUser,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    // Note: Testing the case where req.user is missing is implicitly covered
    // by the auth middleware tests (which should throw an error before reaching the controller).
  });
});
