import bcrypt from 'bcryptjs';

jest.mock('bcryptjs', () => ({
  genSalt: jest.fn().mockResolvedValue('salt'),
  hash: jest.fn().mockResolvedValue('$2b$hashed-password1!'),
  compare: jest.fn().mockImplementation((candidatePassword) => {
    return Promise.resolve(candidatePassword === 'correct_password');
  }),
}));

import { User } from '../../../src/models';

describe('User Model', () => {
  const newUser = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123!',
    role: 'user' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(User.collection, 'insertOne')
      .mockImplementation(async (document) => {
        return {
          acknowledged: true,
          insertedId: document._id,
        } as never;
      });
    jest.spyOn(User.collection, 'updateOne').mockResolvedValue({
      acknowledged: true,
      matchedCount: 1,
      modifiedCount: 1,
      upsertedCount: 0,
      upsertedId: null,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const saveUser = async (attributes = newUser) => {
    const user = new User(attributes);
    await user.save();
    return user;
  };

  it('saves a user with defaults and timestamps', async () => {
    const user = await saveUser();

    expect(User.collection.insertOne).toHaveBeenCalledTimes(1);
    expect(user).toMatchObject({
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      isEmailVerified: false,
    });
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.updatedAt).toBeInstanceOf(Date);
  });

  it('validates required fields without a database connection', () => {
    const validationError = new User({}).validateSync();

    expect(validationError).toBeDefined();
    expect(validationError?.errors.name).toBeUndefined();
    expect(validationError?.errors.email).toBeDefined();
    expect(validationError?.errors.password).toBeDefined();
  });

  it('declares a unique index for email addresses', () => {
    expect(User.schema.path('email').options).toMatchObject({ unique: true });
  });

  it('hashes the password before saving', async () => {
    const user = await saveUser();

    expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
    expect(bcrypt.hash).toHaveBeenCalledWith(newUser.password, 'salt');
    expect(user.password).toBe('$2b$hashed-password1!');
  });

  it('does not hash the password when another field changes', async () => {
    const user = await saveUser();
    jest.mocked(bcrypt.genSalt).mockClear();
    jest.mocked(bcrypt.hash).mockClear();

    user.name = 'Updated Name';
    await user.save();

    expect(User.collection.updateOne).toHaveBeenCalledTimes(1);
    expect(bcrypt.genSalt).not.toHaveBeenCalled();
    expect(bcrypt.hash).not.toHaveBeenCalled();
  });

  it('compares candidate passwords with the stored hash', async () => {
    const user = await saveUser();

    await expect(user.comparePassword('correct_password')).resolves.toBe(true);
    await expect(user.comparePassword('wrong_password')).resolves.toBe(false);
    expect(bcrypt.compare).toHaveBeenCalledWith(
      'correct_password',
      user.password
    );
  });

  it('validates email format', async () => {
    const user = new User({ ...newUser, email: 'invalid-email' });

    await expect(user.validate()).rejects.toThrow();
  });

  it.each(['password!', 'password123', 'pw1!'])(
    'rejects the invalid password %s',
    async (password) => {
      const user = new User({ ...newUser, password });

      await expect(user.validate()).rejects.toThrow();
    }
  );

  it('validates role enum values', async () => {
    const user = new User({ ...newUser, role: 'invalid-role' });

    await expect(user.validate()).rejects.toThrow();
  });
});
