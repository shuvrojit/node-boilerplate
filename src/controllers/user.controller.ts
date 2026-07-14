import { Request, Response, NextFunction } from 'express';
import { userService, QueryUserInput } from '../services';
import asyncHandler from '../middlewares/asyncHandler';
import ApiError from '../utils/ApiError';
import { IUser } from '../models/user.model';
import { toUserResponse } from '../utils/userResponse';

// Updated Request type to include the properly typed user
type AuthenticatedRequest = Request & {
  user?: IUser;
};

/**
 * Check if the user has permissions to access/modify the requested user
 */
const checkUserAccess = (req: AuthenticatedRequest, userId: string): void => {
  // Admin can access any user
  if (req.user?.role === 'admin') return;

  // Regular users can only access their own data
  if (req.user && req.user._id && req.user._id.toString() !== userId) {
    throw new ApiError(
      403,
      'You do not have permission to perform this action'
    );
  }
};

const createUser = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, _next: NextFunction) => {
    const user = await userService.createUser(req.body);
    res.status(201).json({
      status: 'success',
      data: toUserResponse(user),
    });
  }
);

const getUser = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, _next: NextFunction) => {
    // Check if user has access
    checkUserAccess(req, req.params.userId);

    const user = await userService.getUserById(req.params.userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    res.status(200).json({
      status: 'success',
      data: toUserResponse(user),
    });
  }
);

const updateUser = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, _next: NextFunction) => {
    // Check if user has access
    checkUserAccess(req, req.params.userId);

    // Regular users cannot change their role
    if (req.user?.role !== 'admin') {
      delete req.body.role;
      delete req.body.isEmailVerified;
    }

    const user = await userService.updateUserById(req.params.userId, req.body);
    res.status(200).json({
      status: 'success',
      data: toUserResponse(user),
    });
  }
);

const deleteUser = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, _next: NextFunction) => {
    await userService.deleteUserById(req.params.userId);
    res.status(204).send();
  }
);

const getUsers = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, _next: NextFunction) => {
    const filter = req.query as unknown as QueryUserInput;
    const result = await userService.queryUsers(filter);

    res.status(200).json({
      status: 'success',
      data: result.users.map(toUserResponse),
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        pages: Math.ceil(result.total / result.limit),
      },
    });
  }
);

export default {
  createUser,
  getUser,
  updateUser,
  deleteUser,
  getUsers,
};
