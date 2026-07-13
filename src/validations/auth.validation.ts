import { z } from 'zod';

// Common schema parts
const emailSchema = z.string().email();
const passwordSchema = z.string().min(8).max(50);

// Login request schema
export const loginSchema = {
  body: z.object({
    email: emailSchema,
    password: passwordSchema,
  }),
};

// Register request schema
export const registerSchema = {
  body: z
    .object({
      name: z.string().min(3).max(100),
      email: emailSchema,
      password: passwordSchema,
    })
    .strict(),
};

// Refresh token schema
export const refreshTokensSchema = {
  cookies: z.object({
    refreshToken: z.string(),
  }),
};
