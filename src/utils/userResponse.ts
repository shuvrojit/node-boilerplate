import { IUser } from '../models';

export interface UserResponse {
  _id: IUser['_id'];
  name: string;
  email: string;
  role: IUser['role'];
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const toUserResponse = (user: IUser): UserResponse => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  isEmailVerified: user.isEmailVerified,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});
