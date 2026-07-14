import { z } from 'zod';

/**
 * Environment variable schema with validation rules
 * Add all application environment variables here
 */
export const envSchema = z.object({
  // Application
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().positive().default(3000),

  // Database
  MONGODB_URL: z.string().url({
    message: 'Invalid MongoDB connection string',
  }),
  DB_NAME: z.string().default('simple-auth'),

  // Redis
  REDIS_HOST: z.string().trim().min(1).default('localhost'),
  REDIS_PORT: z.coerce.number().int().min(1).max(65535).default(6379),
  REDIS_PASSWORD: z.preprocess(
    (value) =>
      typeof value === 'string' && value.trim() === '' ? undefined : value,
    z.string().min(1).optional()
  ),
  REDIS_DB: z.coerce.number().int().nonnegative().default(0),

  // Logging (optional with defaults)
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FORMAT: z
    .enum(['combined', 'common', 'dev', 'short', 'tiny'])
    .default('dev'),

  // OpenAI Configuration
  OPENAI_API_KEY: z.string({
    required_error: 'OPENAI_API_KEY is required in environment variables',
  }),

  // Security and Authentication
  JWT_SECRET: z.string({
    required_error: 'JWT_SECRET is required in environment variables',
  }),
  JWT_ACCESS_EXPIRATION_MINUTES: z.coerce.number().positive().default(30),
  JWT_REFRESH_EXPIRATION_DAYS: z.coerce.number().positive().default(30),
  JWT_EXPIRES_IN: z.string().default('1d'),

  // Cookie settings
  COOKIE_SECRET: z.string().default('cookie-secret-key-dev'),
  COOKIE_SECURE: z.preprocess(
    (val) => val === 'true',
    z.boolean().default(false)
  ),

  // API Configuration
  API_VERSION: z.string().default('v1'),
  API_RATE_LIMIT: z.coerce.number().positive().default(100),
});

export type EnvVars = z.infer<typeof envSchema>;

/**
 * Global environment variables instance
 * Use this to access validated env vars throughout the application
 */
export let env: EnvVars;

/**
 * Validates and sanitizes environment variables
 * @throws {Error} if validation fails
 */
export const validateEnv = (): EnvVars => {
  try {
    env = envSchema.parse(process.env);
    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map((issue) => {
        return `${issue.path.join('.')}: ${issue.message}`;
      });
      throw new Error(
        `Environment validation failed:\n${errorMessages.join('\n')}`
      );
    }
    throw error;
  }
};
