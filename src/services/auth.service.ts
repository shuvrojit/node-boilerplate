import jwt from 'jsonwebtoken';
import config from '../config/config';
// import bcrypt from 'bcryptjs'; // Removed unused import
import ApiError from '../utils/ApiError';
// import { userService } from './index'; // Removed unused import
import User from '../models/user.model'; // Import User model
import { toUserResponse, UserResponse } from '../utils/userResponse';

export interface TokenPayload {
  sub: string; // User ID
  type: 'ACCESS' | 'REFRESH';
  iat?: number; // Issued at
  exp?: number; // Expiration time
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Authentication Service
 */
class AuthService {
  /**
   * Generate token for a user
   * @param {string} userId - User ID
   * @param {TokenPayload['type']} type - Token type (access or refresh)
   * @returns {string} JWT token
   */
  public generateToken(userId: string, type: TokenPayload['type']): string {
    const payload: TokenPayload = {
      sub: userId,
      type,
    };

    let expiresIn: string | number;
    if (type === 'ACCESS') {
      expiresIn = config.jwt.accessExpirationMinutes * 60; // Convert to seconds
    } else {
      expiresIn = config.jwt.refreshExpirationDays * 24 * 60 * 60; // Convert to seconds
    }

    return jwt.sign(payload, config.jwt.secret, { expiresIn });
  }

  /**
   * Verify and decode JWT token
   * @param {string} token - JWT token
   * @returns {TokenPayload} Decoded token payload
   */
  public verifyToken(token: string): TokenPayload {
    try {
      const payload = jwt.verify(token, config.jwt.secret) as TokenPayload;
      return payload;
    } catch (error) {
      throw new ApiError(401, 'Invalid or expired token');
    }
  }

  /**
   * Generate auth tokens for a user
   * @param {string} userId - User ID
   * @returns {AuthTokens} Access and refresh tokens
   */
  public generateAuthTokens(userId: string): AuthTokens {
    const accessToken = this.generateToken(userId, 'ACCESS');
    const refreshToken = this.generateToken(userId, 'REFRESH');
    return { accessToken, refreshToken };
  }

  /**
   * Login with email and password
   * @param {LoginCredentials} credentials - Login credentials
   * @returns {Promise<{user: Omit<IUser, 'password' | 'refreshToken'>, tokens: AuthTokens}>} User object (without sensitive fields) and tokens
   */
  public async login(credentials: LoginCredentials): Promise<{
    user: UserResponse;
    tokens: AuthTokens;
  }> {
    try {
      // Get user by email, selecting the password and refreshToken fields explicitly
      const user = await User.findOne({ email: credentials.email }).select(
        '+password +refreshToken'
      );
      if (!user) {
        throw new ApiError(401, 'Incorrect email or password');
      }

      // Verify password
      const isPasswordMatch = await user.comparePassword(credentials.password);
      if (!isPasswordMatch) {
        throw new ApiError(401, 'Incorrect email or password');
      }

      // Ensure user has a valid ID
      if (!user._id) {
        throw new ApiError(500, 'Invalid user data');
      }

      // Generate tokens using a safe string conversion
      const tokens = this.generateAuthTokens(String(user._id));

      // Save the refresh token to the user document
      // Consider hashing the refresh token before saving for added security
      user.refreshToken = tokens.refreshToken; // Store the plain token for now, hashing can be added
      await user.save();

      return {
        user: toUserResponse(user),
        tokens,
      };
    } catch (error) {
      // Ensure consistent error message for failed login attempts
      // regardless of whether the user was not found or the password didn't match
      throw new ApiError(401, 'Incorrect email or password');
    }
  }

  /**
   * Refresh auth tokens
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<AuthTokens>} New access and refresh tokens
   */
  public async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    try {
      // Verify refresh token structure and expiration
      const payload = this.verifyToken(refreshToken);
      if (payload.type !== 'REFRESH') {
        throw new ApiError(401, 'Invalid token type');
      }

      // Find user by ID and check if the provided refresh token matches the stored one
      const userId = payload.sub;
      const user = await User.findById(userId).select('+refreshToken'); // Select refreshToken
      if (!user || !user.refreshToken) {
        throw new ApiError(401, 'Invalid refresh token or user not found');
      }

      // Compare the provided refresh token with the stored one
      // If hashing was implemented, use bcrypt.compare here
      if (refreshToken !== user.refreshToken) {
        throw new ApiError(401, 'Refresh token mismatch');
      }

      // Generate new tokens
      const newTokens = this.generateAuthTokens(userId);

      // Update the stored refresh token
      user.refreshToken = newTokens.refreshToken; // Store the new plain token
      await user.save();

      return newTokens;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(401, 'Invalid refresh token');
    }
  }
}

export default new AuthService();
