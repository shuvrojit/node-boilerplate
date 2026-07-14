const mockConnect = jest.fn();
const mockQuit = jest.fn();
const mockDisconnect = jest.fn();
const mockOn = jest.fn();
let mockStatus = 'wait';

const mockRedisClient = {
  connect: mockConnect,
  quit: mockQuit,
  disconnect: mockDisconnect,
  on: mockOn,
  get status() {
    return mockStatus;
  },
};

const mockRedisConstructor = jest.fn(() => mockRedisClient);
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
};

jest.mock('ioredis', () => ({
  Redis: mockRedisConstructor,
}));

jest.mock('../../../src/config/config', () => ({
  __esModule: true,
  default: {
    redis: {
      host: 'cache.internal',
      port: 6380,
      password: 'redis-secret',
      db: 2,
    },
  },
}));

jest.mock('../../../src/config/logger', () => ({
  __esModule: true,
  default: mockLogger,
}));

import { Redis } from 'ioredis';
import {
  connectRedis,
  disconnectRedis,
  redisClient,
} from '../../../src/config/redis';

describe('Redis client', () => {
  beforeEach(() => {
    mockStatus = 'wait';
    mockConnect.mockReset().mockResolvedValue(undefined);
    mockQuit.mockReset().mockResolvedValue('OK');
    mockDisconnect.mockReset();
    mockLogger.info.mockReset();
    mockLogger.error.mockReset();
  });

  it('creates one lazy client from validated configuration', () => {
    expect(redisClient).toBe(mockRedisClient);
    expect(Redis).toHaveBeenCalledTimes(1);
    expect(Redis).toHaveBeenCalledWith({
      host: 'cache.internal',
      port: 6380,
      password: 'redis-secret',
      db: 2,
      lazyConnect: true,
      enableReadyCheck: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
    });
    expect(mockOn).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('connects explicitly and logs readiness', async () => {
    await connectRedis();

    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockLogger.info).toHaveBeenCalledWith('Connected to Redis');
  });

  it('does not reconnect an already ready client', async () => {
    mockStatus = 'ready';

    await connectRedis();

    expect(mockConnect).not.toHaveBeenCalled();
  });

  it('disconnects and rethrows when startup connection fails', async () => {
    const error = new Error('Redis unavailable');
    mockConnect.mockRejectedValue(error);

    await expect(connectRedis()).rejects.toBe(error);

    expect(mockDisconnect).toHaveBeenCalledTimes(1);
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Redis connection error:',
      error
    );
  });

  it('quits gracefully when the client is ready', async () => {
    mockStatus = 'ready';

    await disconnectRedis();

    expect(mockQuit).toHaveBeenCalledTimes(1);
    expect(mockDisconnect).not.toHaveBeenCalled();
    expect(mockLogger.info).toHaveBeenCalledWith('Disconnected from Redis');
  });

  it.each(['wait', 'connecting', 'reconnecting', 'close'])(
    'disconnects immediately from the %s state',
    async (status) => {
      mockStatus = status;

      await disconnectRedis();

      expect(mockQuit).not.toHaveBeenCalled();
      expect(mockDisconnect).toHaveBeenCalledTimes(1);
    }
  );

  it('does nothing when the client has already ended', async () => {
    mockStatus = 'end';

    await disconnectRedis();

    expect(mockQuit).not.toHaveBeenCalled();
    expect(mockDisconnect).not.toHaveBeenCalled();
  });

  it('falls back to an immediate disconnect if graceful quit fails', async () => {
    const error = new Error('Quit failed');
    mockStatus = 'ready';
    mockQuit.mockRejectedValue(error);

    await expect(disconnectRedis()).rejects.toBe(error);

    expect(mockDisconnect).toHaveBeenCalledTimes(1);
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Redis disconnection error:',
      error
    );
  });
});
