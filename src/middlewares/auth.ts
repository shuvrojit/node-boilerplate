import { Request, Response, NextFunction } from 'express';
import ApiError from '../utils/ApiError';
import { authService, userService } from '../services';
import { IUser } from '../models';

declare module 'express-serve-static-core' {
  interface Request {
    user?: IUser;
  }
}

/**
 * Authentication middleware to verify JWT token
 */
export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  let token: string | undefined;

  // 1. Check for token in cookies
  if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }
  // 2. If not in cookies, check Authorization header
  else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  // If no token found in either location
  if (!token) {
    return next(new ApiError(401, 'Authentication required, token missing'));
  }

  try {
    // Verify the token
    const payload = authService.verifyToken(token);
    if (payload.type !== 'ACCESS') {
      throw new ApiError(401, 'Invalid token type');
    }

    // Get user
    const user = await userService.getUserById(payload.sub);
    if (!user) {
      throw new ApiError(401, 'User not found');
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Authorization middleware to check user role
 * @param {string[]} requiredRoles - Required roles
 */
export const authorize = (requiredRoles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      // Check if user exists in request
      if (!req.user) {
        throw new ApiError(401, 'Please authenticate');
      }

      // Check if user has required role
      if (requiredRoles.length && !requiredRoles.includes(req.user.role)) {
        throw new ApiError(403, 'Forbidden: Insufficient permissions');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
