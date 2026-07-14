import { z } from 'zod';

// Common schema parts
const nameSchema = z.string().min(3).max(100);
const emailSchema = z.string().email();
const passwordSchema = z.string().min(8).max(50);
const roleSchema = z.enum(['user', 'admin']).default('user');
const idSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ID');

// Create user request schema
export const createUserSchema = {
  body: z.object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    role: roleSchema.optional(),
  }),
};

// Get user by ID schema
export const getUserSchema = {
  params: z.object({
    userId: idSchema,
  }),
};

// Update user schema
export const updateUserSchema = {
  params: z.object({
    userId: idSchema,
  }),
  body: z
    .object({
      name: nameSchema.optional(),
      email: emailSchema.optional(),
      password: passwordSchema.optional(),
      role: roleSchema.optional(),
      isEmailVerified: z.boolean().optional(),
    })
    .strict(),
};

// Delete user schema
export const deleteUserSchema = {
  params: z.object({
    userId: idSchema,
  }),
};

// Query users schema
export const queryUsersSchema = {
  query: z.object({
    name: z.string().optional(),
    email: z.string().optional(),
    role: roleSchema.optional(),
    isEmailVerified: z.preprocess(
      (val) => (val === 'true' ? true : val === 'false' ? false : undefined),
      z.boolean().optional()
    ),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    sortBy: z.string().optional().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
};
