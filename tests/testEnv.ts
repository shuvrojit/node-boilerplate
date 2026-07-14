// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.PORT = '3000';
process.env.MONGODB_URL = 'mongodb://localhost:27017/test-db';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.REDIS_DB = '1';
process.env.OPENAI_API_KEY = 'sk-test-dummy-key';
process.env.LOG_LEVEL = 'error';

// JWT settings for authentication tests
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_ACCESS_EXPIRATION_MINUTES = '30';
process.env.JWT_REFRESH_EXPIRATION_DAYS = '30';
process.env.JWT_EXPIRES_IN = '1d';

// Cookie settings for authentication tests
process.env.COOKIE_SECRET = 'test-cookie-secret';
process.env.COOKIE_SECURE = 'false';
