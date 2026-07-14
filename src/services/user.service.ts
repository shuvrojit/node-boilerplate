import { User, IUser } from '../models';
import ApiError from '../utils/ApiError';
import { FilterQuery } from 'mongoose';

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role?: 'user' | 'admin';
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  password?: string;
  isEmailVerified?: boolean;
  role?: 'user' | 'admin';
}

export interface QueryUserInput {
  name?: string;
  email?: string;
  role?: 'user' | 'admin';
  isEmailVerified?: boolean;
  limit?: number;
  page?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class UserService {
  /**
   * Create a new user
   * @param {CreateUserInput} userInput - The user data
   * @returns {Promise<IUser>} The created user
   */
  public async createUser(userInput: CreateUserInput): Promise<IUser> {
    // Check if email already exists
    const existingUser = await User.findOne({ email: userInput.email });
    if (existingUser) {
      throw new ApiError(409, 'Email already taken');
    }

    return User.create(userInput);
  }

  /**
   * Get user by id
   * @param {string} id - The user id
   * @returns {Promise<IUser>} The found user
   */
  public async getUserById(id: string): Promise<IUser> {
    const user = await User.findById(id);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    return user;
  }

  /**
   * Get user by email
   * @param {string} email - The user email
   * @returns {Promise<IUser>} The found user
   */
  public async getUserByEmail(email: string): Promise<IUser> {
    const user = await User.findOne({ email });
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    return user;
  }

  /**
   * Update user by id
   * @param {string} id - The user id
   * @param {UpdateUserInput} updateBody - The update data
   * @returns {Promise<IUser>} The updated user
   */
  public async updateUserById(
    id: string,
    updateBody: UpdateUserInput
  ): Promise<IUser> {
    const user = await this.getUserById(id);
    const updates = { ...updateBody };

    // If email is being updated, check for uniqueness
    if (updates.email && updates.email !== user.email) {
      const emailExists = await User.findOne({ email: updates.email });
      if (emailExists) {
        throw new ApiError(409, 'Email already taken');
      }
      updates.isEmailVerified = false;
    }

    Object.assign(user, updates);
    await user.save();

    return user;
  }

  /**
   * Delete user by id
   * @param {string} id - The user id
   * @returns {Promise<void>}
   */
  public async deleteUserById(id: string): Promise<void> {
    const user = await this.getUserById(id);
    await user.deleteOne();
  }

  /**
   * Query users
   * @param {QueryUserInput} filter - The query filter
   * @returns {Promise<{users: IUser[], total: number, page: number, limit: number}>} Users list, total count and pagination info
   */
  public async queryUsers(filter: QueryUserInput): Promise<{
    users: IUser[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      name,
      email,
      role,
      isEmailVerified,
      limit = 10,
      page = 1,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filter;

    const queryFilter: FilterQuery<IUser> = {};

    if (name) queryFilter.name = { $regex: name, $options: 'i' };
    if (email) queryFilter.email = { $regex: email, $options: 'i' };
    if (role) queryFilter.role = role;
    if (isEmailVerified !== undefined)
      queryFilter.isEmailVerified = isEmailVerified;

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Create sort object
    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [users, total] = await Promise.all([
      User.find(queryFilter).sort(sort).skip(skip).limit(limit),
      User.countDocuments(queryFilter),
    ]);

    return {
      users,
      total,
      page,
      limit,
    };
  }
}

export default new UserService();
