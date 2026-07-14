import { validateEnv, env } from '../../../src/config/env.validation';

describe('Environment Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Required Variables', () => {
    it('should validate MONGODB_URL', () => {
      process.env.MONGODB_URL = 'mongodb://localhost:27017/test';
      const result = validateEnv();
      expect(result.MONGODB_URL).toBe('mongodb://localhost:27017/test');
    });

    it('should throw error for missing MONGODB_URL', () => {
      delete process.env.MONGODB_URL;
      expect(() => validateEnv()).toThrow();
    });

    it('should throw error for invalid MONGODB_URL', () => {
      process.env.MONGODB_URL = 'invalid-url';
      expect(() => validateEnv()).toThrow();
    });
  });

  describe('Optional Variables with Defaults', () => {
    beforeEach(() => {
      // Set required variables
      process.env.MONGODB_URL = 'mongodb://localhost:27017/test';
    });

    it('should use default NODE_ENV', () => {
      delete process.env.NODE_ENV;
      const result = validateEnv();
      expect(result.NODE_ENV).toBe('development');
    });

    it('should use default PORT', () => {
      delete process.env.PORT;
      const result = validateEnv();
      expect(result.PORT).toBe(3000);
    });

    it('should use default DB_NAME', () => {
      delete process.env.DB_NAME;
      const result = validateEnv();
      expect(result.DB_NAME).toBe('simple-auth');
    });

    it('should use default Redis connection settings', () => {
      delete process.env.REDIS_HOST;
      delete process.env.REDIS_PORT;
      delete process.env.REDIS_PASSWORD;
      delete process.env.REDIS_DB;

      const result = validateEnv();

      expect(result.REDIS_HOST).toBe('localhost');
      expect(result.REDIS_PORT).toBe(6379);
      expect(result.REDIS_PASSWORD).toBeUndefined();
      expect(result.REDIS_DB).toBe(0);
    });

    it('should use default LOG_LEVEL', () => {
      delete process.env.LOG_LEVEL;
      const result = validateEnv();
      expect(result.LOG_LEVEL).toBe('info');
    });

    it('should use default LOG_FORMAT', () => {
      delete process.env.LOG_FORMAT;
      const result = validateEnv();
      expect(result.LOG_FORMAT).toBe('dev');
    });

    it('should use default API_VERSION', () => {
      delete process.env.API_VERSION;
      const result = validateEnv();
      expect(result.API_VERSION).toBe('v1');
    });

    it('should use default API_RATE_LIMIT', () => {
      delete process.env.API_RATE_LIMIT;
      const result = validateEnv();
      expect(result.API_RATE_LIMIT).toBe(100);
    });

    it('should use default JWT_EXPIRES_IN', () => {
      delete process.env.JWT_EXPIRES_IN;
      const result = validateEnv();
      expect(result.JWT_EXPIRES_IN).toBe('1d');
    });
  });

  describe('Validation Rules', () => {
    beforeEach(() => {
      // Set required variables
      process.env.MONGODB_URL = 'mongodb://localhost:27017/test';
    });

    it('should validate NODE_ENV values', () => {
      process.env.NODE_ENV = 'invalid';
      expect(() => validateEnv()).toThrow();

      process.env.NODE_ENV = 'development';
      expect(validateEnv().NODE_ENV).toBe('development');

      process.env.NODE_ENV = 'production';
      expect(validateEnv().NODE_ENV).toBe('production');

      process.env.NODE_ENV = 'test';
      expect(validateEnv().NODE_ENV).toBe('test');
    });

    it('should validate PORT is positive', () => {
      process.env.PORT = '-3000';
      expect(() => validateEnv()).toThrow();

      process.env.PORT = '0';
      expect(() => validateEnv()).toThrow();

      process.env.PORT = '3000';
      expect(validateEnv().PORT).toBe(3000);
    });

    it('should coerce valid Redis connection settings', () => {
      process.env.REDIS_HOST = 'cache.internal';
      process.env.REDIS_PORT = '6380';
      process.env.REDIS_PASSWORD = 'redis-secret';
      process.env.REDIS_DB = '2';

      const result = validateEnv();

      expect(result.REDIS_HOST).toBe('cache.internal');
      expect(result.REDIS_PORT).toBe(6380);
      expect(result.REDIS_PASSWORD).toBe('redis-secret');
      expect(result.REDIS_DB).toBe(2);
    });

    it.each([
      ['REDIS_HOST', ''],
      ['REDIS_PORT', '0'],
      ['REDIS_PORT', '65536'],
      ['REDIS_PORT', '6379.5'],
      ['REDIS_DB', '-1'],
      ['REDIS_DB', '1.5'],
    ])('should reject an invalid %s value', (name, value) => {
      process.env[name] = value;

      expect(() => validateEnv()).toThrow();
    });

    it('should validate LOG_LEVEL values', () => {
      process.env.LOG_LEVEL = 'invalid';
      expect(() => validateEnv()).toThrow();

      ['error', 'warn', 'info', 'debug'].forEach((level) => {
        process.env.LOG_LEVEL = level;
        expect(validateEnv().LOG_LEVEL).toBe(level);
      });
    });

    it('should validate LOG_FORMAT values', () => {
      process.env.LOG_FORMAT = 'invalid';
      expect(() => validateEnv()).toThrow();

      ['combined', 'common', 'dev', 'short', 'tiny'].forEach((format) => {
        process.env.LOG_FORMAT = format;
        expect(validateEnv().LOG_FORMAT).toBe(format);
      });
    });

    it('should validate API_RATE_LIMIT is positive', () => {
      process.env.API_RATE_LIMIT = '-100';
      expect(() => validateEnv()).toThrow();

      process.env.API_RATE_LIMIT = '0';
      expect(() => validateEnv()).toThrow();

      process.env.API_RATE_LIMIT = '100';
      expect(validateEnv().API_RATE_LIMIT).toBe(100);
    });
  });

  describe('Global env variable', () => {
    it('should set global env variable after validation', () => {
      process.env.MONGODB_URL = 'mongodb://localhost:27017/test';
      validateEnv();
      expect(env).toBeDefined();
      expect(env.MONGODB_URL).toBe('mongodb://localhost:27017/test');
    });
  });
});
