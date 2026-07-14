import dotenv from 'dotenv';

dotenv.config();

import app from './app';
import config from './config/config';
import { connectDB } from './config/db';
import logger from './config/logger';

export const startServer = async () => {
  await connectDB();

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
