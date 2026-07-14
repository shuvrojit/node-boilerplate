const mockListen = jest.fn();
const mockConnectDB = jest.fn();
const mockDisconnectDB = jest.fn();
const mockConnectRedis = jest.fn();
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
};

jest.mock('../../src/app', () => ({
  __esModule: true,
  default: { listen: mockListen },
}));

jest.mock('../../src/config/db', () => ({
  connectDB: mockConnectDB,
  disconnectDB: mockDisconnectDB,
}));

jest.mock('../../src/config/redis', () => ({
  connectRedis: mockConnectRedis,
}));

jest.mock('../../src/config/config', () => ({
  __esModule: true,
  default: { port: 4321 },
}));

jest.mock('../../src/config/logger', () => ({
  __esModule: true,
  default: mockLogger,
}));

import { startServer } from '../../src/index';

describe('Application startup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConnectDB.mockResolvedValue(undefined);
    mockDisconnectDB.mockResolvedValue(undefined);
    mockConnectRedis.mockResolvedValue(undefined);
  });

  it('waits for MongoDB and Redis before accepting HTTP traffic', async () => {
    let resolveDatabase!: () => void;
    let resolveRedis!: () => void;
    const databaseConnection = new Promise<void>((resolve) => {
      resolveDatabase = resolve;
    });
    const redisConnection = new Promise<void>((resolve) => {
      resolveRedis = resolve;
    });
    const server = { close: jest.fn() };
    mockConnectDB.mockReturnValue(databaseConnection);
    mockConnectRedis.mockReturnValue(redisConnection);
    mockListen.mockImplementation((_port, callback) => {
      callback();
      return server;
    });

    const startup = startServer();

    expect(mockListen).not.toHaveBeenCalled();
    expect(mockConnectRedis).not.toHaveBeenCalled();

    resolveDatabase();
    await Promise.resolve();

    expect(mockConnectRedis).toHaveBeenCalledTimes(1);
    expect(mockListen).not.toHaveBeenCalled();

    resolveRedis();
    await expect(startup).resolves.toBe(server);
    expect(mockListen).toHaveBeenCalledWith(4321, expect.any(Function));
  });

  it('does not listen when the database connection fails', async () => {
    const error = new Error('MongoDB unavailable');
    mockConnectDB.mockRejectedValue(error);

    await expect(startServer()).rejects.toBe(error);
    expect(mockConnectRedis).not.toHaveBeenCalled();
    expect(mockDisconnectDB).not.toHaveBeenCalled();
    expect(mockListen).not.toHaveBeenCalled();
  });

  it('disconnects MongoDB and does not listen when Redis fails', async () => {
    const error = new Error('Redis unavailable');
    mockConnectRedis.mockRejectedValue(error);

    await expect(startServer()).rejects.toBe(error);

    expect(mockDisconnectDB).toHaveBeenCalledTimes(1);
    expect(mockListen).not.toHaveBeenCalled();
  });
});
