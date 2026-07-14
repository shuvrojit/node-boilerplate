import mongoose from 'mongoose';
import {
  userService,
  CreateUserInput,
  UpdateUserInput,
  QueryUserInput,
} from '../../../src/services';
import { User, IUser } from '../../../src/models';
import ApiError from '../../../src/utils/ApiError';

// Mock the User model
jest.mock('../../../src/models', () => ({
  User: {
    create: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
  },
  IUser: {},
}));

describe('UserService', () => {
  let mockUser: Partial<IUser>;
  let createUserInput: CreateUserInput;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUser = {
      _id: new mongoose.Types.ObjectId().toString(),
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashed_password',
      role: 'user',
      isEmailVerified: false,
      comparePassword: jest.fn(),
      save: jest.fn().mockResolvedValue(true),
      deleteOne: jest.fn().mockResolvedValue(true),
    };

    createUserInput = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
    };
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      // Mock findOne to return null (email doesn't exist)
      (User.findOne as jest.Mock).mockResolvedValueOnce(null);
      // Mock create to return the mock user
      (User.create as jest.Mock).mockResolvedValueOnce(mockUser);

      const result = await userService.createUser(createUserInput);

      expect(User.findOne).toHaveBeenCalledWith({
        email: createUserInput.email,
      });
      expect(User.create).toHaveBeenCalledWith(createUserInput);
      expect(result).toEqual(mockUser);
    });

    it('should throw error if email already exists', async () => {
      // Mock findOne to return a user (email exists)
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);

      await expect(userService.createUser(createUserInput)).rejects.toThrow(
        'Email already taken'
      );

      expect(User.findOne).toHaveBeenCalledWith({
        email: createUserInput.email,
      });
      expect(User.create).not.toHaveBeenCalled();
    });
  });

  describe('getUserById', () => {
    it('should return user by id successfully', async () => {
      (User.findById as jest.Mock).mockResolvedValueOnce(mockUser);

      const result = await userService.getUserById(mockUser._id as string);

      expect(User.findById).toHaveBeenCalledWith(mockUser._id);
      expect(result).toEqual(mockUser);
    });

    it('should throw error if user not found', async () => {
      (User.findById as jest.Mock).mockResolvedValueOnce(null);

      await expect(userService.getUserById('nonexistent-id')).rejects.toThrow(
        ApiError
      );
      await expect(userService.getUserById('nonexistent-id')).rejects.toThrow(
        'User not found'
      );

      expect(User.findById).toHaveBeenCalledWith('nonexistent-id');
    });
  });

  describe('getUserByEmail', () => {
    it('should return user by email successfully', async () => {
      (User.findOne as jest.Mock).mockResolvedValueOnce(mockUser);

      const result = await userService.getUserByEmail(mockUser.email as string);

      expect(User.findOne).toHaveBeenCalledWith({ email: mockUser.email });
      expect(result).toEqual(mockUser);
    });

    it('should throw error if user not found', async () => {
      (User.findOne as jest.Mock).mockResolvedValueOnce(null);

      const promise = userService.getUserByEmail('nonexistent@example.com');

      await expect(promise).rejects.toThrow('User not found');
      expect(User.findOne).toHaveBeenCalledWith({
        email: 'nonexistent@example.com',
      });
    });
  });

  describe('updateUserById', () => {
    const updateBody: UpdateUserInput = {
      name: 'Updated Name',
    };

    it('should update user successfully', async () => {
      const getUserByIdSpy = jest.spyOn(userService, 'getUserById');
      const updatedUser = {
        ...mockUser,
        name: updateBody.name,
      };
      getUserByIdSpy.mockResolvedValueOnce({
        ...mockUser,
        save: jest.fn().mockResolvedValueOnce(updatedUser),
      } as any);

      const result = await userService.updateUserById(
        mockUser._id as string,
        updateBody
      );

      expect(getUserByIdSpy).toHaveBeenCalledWith(mockUser._id);
      expect(result.name).toBe(updateBody.name);

      getUserByIdSpy.mockRestore();
    });

    it('should check email uniqueness on email update', async () => {
      const updateWithEmail: UpdateUserInput = {
        email: 'newemail@example.com',
      };

      const getUserByIdSpy = jest.spyOn(userService, 'getUserById');
      getUserByIdSpy.mockResolvedValueOnce(mockUser as IUser);

      // No existing user with the new email
      (User.findOne as jest.Mock).mockResolvedValueOnce(null);

      mockUser.save = jest
        .fn()
        .mockResolvedValueOnce({ ...mockUser, email: 'newemail@example.com' });

      await userService.updateUserById(mockUser._id as string, updateWithEmail);

      expect(User.findOne).toHaveBeenCalledWith({
        email: 'newemail@example.com',
      });
      expect(mockUser.save).toHaveBeenCalled();

      getUserByIdSpy.mockRestore();
    });

    it('resets verification when the email address changes', async () => {
      mockUser.isEmailVerified = true;
      const getUserByIdSpy = jest.spyOn(userService, 'getUserById');
      getUserByIdSpy.mockResolvedValueOnce(mockUser as IUser);
      (User.findOne as jest.Mock).mockResolvedValueOnce(null);

      await userService.updateUserById(mockUser._id as string, {
        email: 'newemail@example.com',
      });

      expect(mockUser.isEmailVerified).toBe(false);
      getUserByIdSpy.mockRestore();
    });

    it('should throw error if new email already exists', async () => {
      const updateWithEmail: UpdateUserInput = {
        email: 'existing@example.com',
      };

      // Mock an existing user with the same email
      (User.findOne as jest.Mock).mockResolvedValue({
        ...mockUser,
        _id: 'another-id',
      });

      const getUserByIdSpy = jest.spyOn(userService, 'getUserById');
      getUserByIdSpy.mockResolvedValue(mockUser as IUser);

      await expect(
        userService.updateUserById(mockUser._id as string, updateWithEmail)
      ).rejects.toThrow(ApiError);
      await expect(
        userService.updateUserById(mockUser._id as string, updateWithEmail)
      ).rejects.toThrow('Email already taken');

      expect(User.findOne).toHaveBeenCalledWith({
        email: 'existing@example.com',
      });
      expect(mockUser.save).not.toHaveBeenCalled();

      getUserByIdSpy.mockRestore();
    });
  });

  describe('deleteUserById', () => {
    it('should delete user successfully', async () => {
      const getUserByIdSpy = jest.spyOn(userService, 'getUserById');
      getUserByIdSpy.mockResolvedValueOnce(mockUser as IUser);

      await userService.deleteUserById(mockUser._id as string);

      expect(getUserByIdSpy).toHaveBeenCalledWith(mockUser._id);
      expect(mockUser.deleteOne).toHaveBeenCalled();

      getUserByIdSpy.mockRestore();
    });
  });

  describe('queryUsers', () => {
    it('should query users with default parameters', async () => {
      const mockUsers = [mockUser];
      const mockTotal = 1;

      (User.find as jest.Mock).mockReturnValueOnce({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce(mockUsers),
      });

      (User.countDocuments as jest.Mock).mockResolvedValueOnce(mockTotal);

      const query: QueryUserInput = {};
      const result = await userService.queryUsers(query);

      expect(User.find).toHaveBeenCalledWith({});
      expect(User.countDocuments).toHaveBeenCalledWith({});
      expect(result).toEqual({
        users: mockUsers,
        total: mockTotal,
        page: 1,
        limit: 10,
      });
    });

    it('should query users with filters', async () => {
      const mockUsers = [mockUser];
      const mockTotal = 1;

      (User.find as jest.Mock).mockReturnValueOnce({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce(mockUsers),
      });

      (User.countDocuments as jest.Mock).mockResolvedValueOnce(mockTotal);

      const query: QueryUserInput = {
        name: 'test',
        email: 'test',
        role: 'user',
        isEmailVerified: true,
        page: 2,
        limit: 5,
        sortBy: 'name',
        sortOrder: 'asc',
      };

      const result = await userService.queryUsers(query);

      const expectedFilter = {
        name: { $regex: 'test', $options: 'i' },
        email: { $regex: 'test', $options: 'i' },
        role: 'user',
        isEmailVerified: true,
      };

      expect(User.find).toHaveBeenCalledWith(expectedFilter);
      expect(User.countDocuments).toHaveBeenCalledWith(expectedFilter);
      expect(result).toEqual({
        users: mockUsers,
        total: mockTotal,
        page: 2,
        limit: 5,
      });
    });
  });
});
