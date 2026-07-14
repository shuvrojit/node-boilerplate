import { env, validateEnv } from './env.validation';

// Initialize env if not already done
if (!env) {
  validateEnv();
}

const config = {
  // Application
  env: env.NODE_ENV,
  port: env.PORT,

  // API
  apiVersion: env.API_VERSION,
  rateLimit: env.API_RATE_LIMIT,

  // Logging
  logs: {
    level: env.LOG_LEVEL,
    format: env.LOG_FORMAT,
  },

  // OpenAI configuration
  openai: {
    apiKey: env.OPENAI_API_KEY,
  },

  // Redis configuration
  redis: {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD,
    db: env.REDIS_DB,
  },

  // JWT configuration
  jwt: {
    secret: env.JWT_SECRET,
    accessExpirationMinutes: env.JWT_ACCESS_EXPIRATION_MINUTES,
    refreshExpirationDays: env.JWT_REFRESH_EXPIRATION_DAYS,
    expiresIn: env.JWT_EXPIRES_IN,
  },

  // Cookie configuration
  cookie: {
    secret: env.COOKIE_SECRET,
    secure: env.COOKIE_SECURE,
    httpOnly: true,
  },
};

export default config;
