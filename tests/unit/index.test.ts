const mockListen = jest.fn();
const mockConnectDB = jest.fn();
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
  });

  it('waits for MongoDB before accepting HTTP traffic', async () => {
    let resolveConnection!: () => void;
    const connection = new Promise<void>((resolve) => {
      resolveConnection = resolve;
    });
    const server = { close: jest.fn() };
    mockConnectDB.mockReturnValue(connection);
    mockListen.mockImplementation((_port, callback) => {
      callback();
      return server;
    });

    const startup = startServer();

    expect(mockListen).not.toHaveBeenCalled();
    resolveConnection();
    await expect(startup).resolves.toBe(server);
    expect(mockListen).toHaveBeenCalledWith(4321, expect.any(Function));
  });

  it('does not listen when the database connection fails', async () => {
    const error = new Error('MongoDB unavailable');
    mockConnectDB.mockRejectedValue(error);

    await expect(startServer()).rejects.toBe(error);
    expect(mockListen).not.toHaveBeenCalled();
  });
});
