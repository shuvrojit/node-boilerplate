import { authService } from '../../../src/services';
// import { userService } from '../../../src/services'; // No longer used directly
import ApiError from '../../../src/utils/ApiError';
import jwt from 'jsonwebtoken';
import config from '../../../src/config/config';
import mongoose from 'mongoose';
import User /*, { IUser } */ from '../../../src/models/user.model'; // Import User model, removed unused IUser

// Mocking dependencies
// jest.mock('../../../src/services/user.service'); // No longer mocking userService
jest.mock('jsonwebtoken');
jest.mock('../../../src/models/user.model'); // Mock the User model

describe('Auth Service', () => {
  const userId = new mongoose.Types.ObjectId().toString();
  const userEmail = 'test@example.com';
  const userPassword = 'password123!';
  const mockRefreshToken = 'mock-refresh-token';
  const mockAccessToken = 'mock-access-token';

  // Mock User instance methods
  const mockUserInstance = {
    _id: userId,
    name: 'Test User', // Add name directly
    email: userEmail,
    password: 'hashedPassword', // Assume password is saved hashed
    role: 'user', // Add role directly
    isEmailVerified: false, // Add isEmailVerified directly
    refreshToken: 'old-refresh-token' as string | undefined, // Explicitly allow undefined
    createdAt: new Date(), // Add createdAt directly
    updatedAt: new Date(), // Add updatedAt directly
    comparePassword: jest.fn(),
    save: jest.fn().mockResolvedValue(this), // Mock save method
    toObject: jest.fn().mockImplementation(() => ({
      // Keep toObject mock in case it's needed elsewhere, though not for login response
      _id: userId,
      name: 'Test User', // Keep properties here too for consistency if toObject is used
      email: userEmail,
      role: 'user',
      isEmailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mocks for User static methods and instance methods
    (User.findOne as jest.Mock).mockClear();
    (User.findById as jest.Mock).mockClear();
    mockUserInstance.comparePassword.mockClear();
    mockUserInstance.save.mockClear();
    mockUserInstance.toObject.mockClear();
    mockUserInstance.refreshToken = 'old-refresh-token';
  });

  describe('generateToken', () => {
    it('should generate a JWT token', () => {
      const tokenPayload = {
        sub: userId,
        type: 'ACCESS',
      };

      (jwt.sign as jest.Mock).mockReturnValueOnce('generated-token');

      const token = authService.generateToken(userId, 'ACCESS');

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining(tokenPayload),
        config.jwt.secret,
        { expiresIn: 1800 } // Corrected: 30 minutes * 60 seconds
      );
      expect(token).toBe('generated-token');
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const tokenPayload = {
        sub: userId,
        type: 'ACCESS',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      (jwt.verify as jest.Mock).mockReturnValueOnce(tokenPayload);

      const result = authService.verifyToken('valid-token');

      expect(jwt.verify).toHaveBeenCalledWith('valid-token', config.jwt.secret);
      expect(result).toEqual(tokenPayload);
    });

    it('should throw an error if token is invalid', () => {
      (jwt.verify as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Invalid token');
      });

      expect(() => {
        authService.verifyToken('invalid-token');
      }).toThrow(ApiError);
    });

    // Removed test for token type check within verifyToken as it's handled elsewhere
  });

  describe('generateAuthTokens', () => {
    it('should generate access and refresh tokens', () => {
      const mockAccessToken = 'mock-access-token';
      const mockRefreshToken = 'mock-refresh-token';

      jest
        .spyOn(authService, 'generateToken')
        .mockReturnValueOnce(mockAccessToken)
        .mockReturnValueOnce(mockRefreshToken);

      const tokens = authService.generateAuthTokens(userId);

      expect(authService.generateToken).toHaveBeenCalledTimes(2);
      expect(authService.generateToken).toHaveBeenNthCalledWith(
        1,
        userId,
        'ACCESS'
      ); // Removed expiration arg
      expect(authService.generateToken).toHaveBeenNthCalledWith(
        2,
        userId,
        'REFRESH'
      ); // Removed expiration arg

      // Updated expectation to match actual return structure
      expect(tokens).toEqual({
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
      });
    });
  });

  // Updated describe block name
  describe('login', () => {
    it('should return sanitized user and tokens, and save refresh token if login is successful', async () => {
      // Setup mocks for this specific test
      mockUserInstance.comparePassword.mockResolvedValue(true);
      (User.findOne as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUserInstance), // Mock chained select call
      });

      // Define expected tokens
      const expectedTokens = {
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
      };
      jest
        .spyOn(authService, 'generateAuthTokens')
        .mockReturnValue(expectedTokens);

      const result = await authService.login({
        email: userEmail,
        password: userPassword,
      });

      // Assertions
      expect(User.findOne).toHaveBeenCalledWith({ email: userEmail });
      expect(User.findOne({}).select).toHaveBeenCalledWith(
        '+password +refreshToken'
      );
      expect(mockUserInstance.comparePassword).toHaveBeenCalledWith(
        userPassword
      );
      expect(authService.generateAuthTokens).toHaveBeenCalledWith(userId);
      expect(mockUserInstance.save).toHaveBeenCalled(); // Check if save was called
      expect(mockUserInstance.refreshToken).toBe(mockRefreshToken); // Check if refreshToken was set before save
      expect(result.tokens).toEqual(expectedTokens);
      // Check sanitized user object structure (based on mockUserInstance.toObject)
      expect(result.user).toEqual({
        _id: userId,
        name: 'Test User',
        email: userEmail,
        role: 'user',
        isEmailVerified: false,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
      expect(result.user).not.toHaveProperty('password');
      expect(result.user).not.toHaveProperty('refreshToken');
    });

    it('should throw error if user is not found', async () => {
      (User.findOne as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(null), // Mock user not found
      });

      await expect(
        authService.login({
          email: 'invalid@example.com',
          password: userPassword,
        })
      ).rejects.toThrow(new ApiError(401, 'Incorrect email or password'));
      expect(User.findOne).toHaveBeenCalledWith({
        email: 'invalid@example.com',
      });
    });

    it('should throw error if password is incorrect', async () => {
      mockUserInstance.comparePassword.mockResolvedValue(false); // Mock incorrect password
      (User.findOne as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUserInstance),
      });

      await expect(
        authService.login({
          email: userEmail,
          password: 'wrong-password',
        })
      ).rejects.toThrow(new ApiError(401, 'Incorrect email or password'));
      expect(User.findOne).toHaveBeenCalledWith({ email: userEmail });
      expect(mockUserInstance.comparePassword).toHaveBeenCalledWith(
        'wrong-password'
      );
    });
  });

  // Updated describe block name and tests
  describe('refreshTokens', () => {
    it('should generate and save new tokens if refresh token is valid and matches stored token', async () => {
      // Setup mocks
      mockUserInstance.refreshToken = mockRefreshToken; // Ensure the current token matches
      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUserInstance),
      });
      jest.spyOn(authService, 'verifyToken').mockReturnValue({
        sub: userId,
        type: 'REFRESH',
      });
      const newExpectedTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };
      jest
        .spyOn(authService, 'generateAuthTokens')
        .mockReturnValue(newExpectedTokens);

      // Execute
      const result = await authService.refreshTokens(mockRefreshToken);

      // Assertions
      expect(authService.verifyToken).toHaveBeenCalledWith(mockRefreshToken);
      expect(User.findById).toHaveBeenCalledWith(userId);
      expect(User.findById({}).select).toHaveBeenCalledWith('+refreshToken');
      expect(authService.generateAuthTokens).toHaveBeenCalledWith(userId);
      expect(mockUserInstance.save).toHaveBeenCalled(); // Check save was called
      expect(mockUserInstance.refreshToken).toBe(
        newExpectedTokens.refreshToken
      ); // Check new token was saved
      expect(result).toEqual(newExpectedTokens);
    });

    it('should throw error if token type is not REFRESH', async () => {
      jest.spyOn(authService, 'verifyToken').mockReturnValue({
        sub: userId,
        type: 'ACCESS', // Invalid type
      });

      await expect(authService.refreshTokens(mockRefreshToken)).rejects.toThrow(
        new ApiError(401, 'Invalid token type')
      );
    });

    it('should throw error if user is not found', async () => {
      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(null), // Mock user not found
      });
      jest.spyOn(authService, 'verifyToken').mockReturnValue({
        sub: userId,
        type: 'REFRESH',
      });

      await expect(authService.refreshTokens(mockRefreshToken)).rejects.toThrow(
        new ApiError(401, 'Invalid refresh token or user not found')
      );
      expect(User.findById).toHaveBeenCalledWith(userId);
    });

    it('should throw error if user has no stored refresh token', async () => {
      mockUserInstance.refreshToken = undefined; // Simulate no stored token
      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUserInstance),
      });
      jest.spyOn(authService, 'verifyToken').mockReturnValue({
        sub: userId,
        type: 'REFRESH',
      });

      await expect(authService.refreshTokens(mockRefreshToken)).rejects.toThrow(
        new ApiError(401, 'Invalid refresh token or user not found')
      );
    });

    it('should throw error if provided refresh token does not match stored token', async () => {
      mockUserInstance.refreshToken = 'different-stored-token'; // Mismatch
      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUserInstance),
      });
      jest.spyOn(authService, 'verifyToken').mockReturnValue({
        sub: userId,
        type: 'REFRESH',
      });

      await expect(authService.refreshTokens(mockRefreshToken)).rejects.toThrow(
        new ApiError(401, 'Refresh token mismatch')
      );
    });
  });

  describe('revokeRefreshToken', () => {
    it('clears a matching stored refresh token', async () => {
      mockUserInstance.refreshToken = mockRefreshToken;
      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUserInstance),
      });
      jest.spyOn(authService, 'verifyToken').mockReturnValue({
        sub: userId,
        type: 'REFRESH',
      });

      await (authService as any).revokeRefreshToken(mockRefreshToken);

      expect(User.findById).toHaveBeenCalledWith(userId);
      expect(mockUserInstance.refreshToken).toBeUndefined();
      expect(mockUserInstance.save).toHaveBeenCalledTimes(1);
    });

    it('does not revoke a different stored refresh token', async () => {
      mockUserInstance.refreshToken = 'different-refresh-token';
      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUserInstance),
      });
      jest.spyOn(authService, 'verifyToken').mockReturnValue({
        sub: userId,
        type: 'REFRESH',
      });

      await (authService as any).revokeRefreshToken(mockRefreshToken);

      expect(mockUserInstance.refreshToken).toBe('different-refresh-token');
      expect(mockUserInstance.save).not.toHaveBeenCalled();
    });
  });
});
