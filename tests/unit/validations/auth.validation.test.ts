import { registerSchema } from '../../../src/validations/auth.validation';

describe('Auth validation', () => {
  const validRegistration = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'Password123!',
  };

  it('accepts the public registration fields', () => {
    expect(registerSchema.body.safeParse(validRegistration).success).toBe(true);
  });

  it('rejects a role supplied during public registration', () => {
    const result = registerSchema.body.safeParse({
      ...validRegistration,
      role: 'admin',
    });

    expect(result.success).toBe(false);
  });
});
