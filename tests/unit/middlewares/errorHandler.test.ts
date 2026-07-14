import { Request, Response, NextFunction } from 'express';
import {
  errorConverter,
  errorHandler,
} from '../../../src/middlewares/errorHandler';
import ApiError from '../../../src/utils/ApiError';
import config from '../../../src/config/config';
import logger from '../../../src/config/logger';

jest.mock('../../../src/config/logger');
jest.mock('../../../src/config/config', () => ({
  default: {
    env: 'test',
  },
}));

describe('Error Handler Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe('Error Converter', () => {
    test('should convert error to ApiError if not instance of ApiError', () => {
      const error = new Error('Any error');
      errorConverter(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockNext.mock.calls[0][0]).toBeInstanceOf(ApiError);
      const convertedError = mockNext.mock.calls[0][0] as unknown as ApiError;
      expect(convertedError.statusCode).toBe(500);
      expect(convertedError.message).toBe(error.message);
      expect(convertedError.isOperational).toBe(false);
    });

    test('should convert non-Error object to ApiError', () => {
      const error = { message: 'Any error' };
      errorConverter(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockNext.mock.calls[0][0]).toBeInstanceOf(ApiError);
      const convertedError = mockNext.mock.calls[0][0] as unknown as ApiError;
      expect(convertedError.statusCode).toBe(500);
      expect(convertedError.message).toBe(error.message);
      expect(convertedError.isOperational).toBe(false);
    });

    test('should not convert if already ApiError', () => {
      const error = new ApiError(400, 'Any error');
      errorConverter(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('Error Handler', () => {
    beforeEach(() => {
      config.env = 'development';
    });

    test('should send detailed error in development mode', () => {
      const error = new ApiError(400, 'Any error');
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        error,
        message: error.message,
        stack: error.stack,
      });
    });

    test('should send operational error in production mode', () => {
      config.env = 'production';
      const error = new ApiError(400, 'Any error');
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: error.message,
      });
    });

    test('should hide error details for non-operational errors in production', () => {
      config.env = 'production';
      const error = new ApiError(400, 'Any error', false);
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Something went very wrong!',
      });
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
