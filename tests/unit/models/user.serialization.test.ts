import User from '../../../src/models/user.model';
import { toUserResponse } from '../../../src/utils/userResponse';

describe('User serialization', () => {
  it('excludes sensitive fields from queries by default', () => {
    expect(User.schema.path('password').options.select).toBe(false);
    expect(User.schema.path('refreshToken').options.select).toBe(false);
  });

  it('removes sensitive fields when a user document is serialized', () => {
    const user = new User({
      name: 'Test User',
      email: 'test@example.com',
      password: 'Password123!',
      refreshToken: 'refresh-token',
    });

    const serialized = user.toJSON();

    expect(serialized).not.toHaveProperty('password');
    expect(serialized).not.toHaveProperty('refreshToken');
    expect(serialized).toMatchObject({
      name: 'Test User',
      email: 'test@example.com',
    });
  });

  it('allowlists fields returned from the HTTP boundary', () => {
    const user = new User({
      name: 'Test User',
      email: 'test@example.com',
      password: 'Password123!',
      refreshToken: 'refresh-token',
    });

    const response = toUserResponse(user);

    expect(response).not.toHaveProperty('password');
    expect(response).not.toHaveProperty('refreshToken');
  });
});
