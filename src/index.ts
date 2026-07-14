import dotenv from 'dotenv';

dotenv.config();

import app from './app';
import config from './config/config';
import { connectDB, disconnectDB } from './config/db';
import logger from './config/logger';
import { connectRedis } from './config/redis';

export const startServer = async () => {
  await connectDB();

  try {
    await connectRedis();
  } catch (error) {
    await disconnectDB();
    throw error;
  }

  return app.listen(config.port, () => {
    logger.info(`Server running on port ${config.port} ...`);
  });
};

if (require.main === module) {
  void startServer().catch((error: unknown) => {
    logger.error('Failed to start server', error);
    process.exitCode = 1;
  });
}
