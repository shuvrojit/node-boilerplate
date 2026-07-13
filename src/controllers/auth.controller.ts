import { Request, Response, NextFunction } from 'express';
import { authService, userService } from '../services';
import asyncHandler from '../middlewares/asyncHandler';
import config from '../config/config';
import { IUser } from '../models';
import ApiError from '../utils/ApiError'; // Import ApiError
import { toUserResponse } from '../utils/userResponse';

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.cookie.secure,
  sameSite: 'strict' as const,
  maxAge: config.jwt.refreshExpirationDays * 24 * 60 * 60 * 1000, // days to milliseconds
};

const ACCESS_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.cookie.secure,
  sameSite: 'strict' as const,
  maxAge: config.jwt.accessExpirationMinutes * 60 * 1000, // minutes to milliseconds
};

/**
 * Register a new user
 */
const register = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    // Create user in the database
    const user: IUser = await userService.createUser(req.body);

    // Generate auth tokens
    const tokens = authService.generateAuthTokens(String(user._id));

    // Set tokens in HTTP-only cookies
    res.cookie('refreshToken', tokens.refreshToken, REFRESH_COOKIE_OPTIONS);
    res.cookie('accessToken', tokens.accessToken, ACCESS_COOKIE_OPTIONS);

    // Return the user data and tokens
    res.status(201).json({
      status: 'success',
      data: {
        user: toUserResponse(user),
        tokens,
      },
    });
  }
);

/**
 * Login with email and password
 */
const login = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    // Get credentials from request body
    const { email, password } = req.body;

    // Authenticate user
    const { user, tokens } = await authService.login({ email, password });

    // Set tokens in HTTP-only cookies
    res.cookie('refreshToken', tokens.refreshToken, REFRESH_COOKIE_OPTIONS);
    res.cookie('accessToken', tokens.accessToken, ACCESS_COOKIE_OPTIONS);

    // Return user data and tokens
    res.status(200).json({
      status: 'success',
      data: {
        user, // User object already sanitized in authService.login
        tokens,
      },
    });
  }
);

/**
 * Logout the user
 */
const logout = asyncHandler(
  async (_req: Request, res: Response, _next: NextFunction) => {
    // Clear the refresh token cookie
    res.clearCookie('refreshToken');

    // Return success
    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully',
    });
  }
);

/**
 * Refresh tokens
 */
const refreshTokens = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    // Get refresh token from cookies (accessToken is not needed here)
    const { refreshToken } = req.cookies;
    if (!refreshToken) {
      throw new ApiError(401, 'Refresh token not found in cookies');
    }

    // Generate new auth tokens
    const tokens = await authService.refreshTokens(refreshToken);

    // Set the new tokens in cookies
    res.cookie('refreshToken', tokens.refreshToken, REFRESH_COOKIE_OPTIONS);
    res.cookie('accessToken', tokens.accessToken, ACCESS_COOKIE_OPTIONS);

    // Return new tokens
    res.status(200).json({
      status: 'success',
      data: {
        tokens,
      },
    });
  }
);

/**
 * Get current user profile
 */
const getProfile = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    // Return authenticated user (added by auth middleware)
    if (!req.user) {
      throw new ApiError(401, 'Please authenticate');
    }

    res.status(200).json({
      status: 'success',
      data: toUserResponse(req.user),
    });
  }
);

export default {
  register,
  login,
  logout,
  refreshTokens,
  getProfile,
};
