import { Redis } from 'ioredis';

import config from './config';
import logger from './logger';

export const redisClient = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  db: config.redis.db,
  lazyConnect: true,
  enableReadyCheck: true,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1,
});

redisClient.on('error', (error: Error) => {
  logger.error('Redis client error:', error);
});

export const connectRedis = async (
  client: Redis = redisClient
): Promise<void> => {
  if (client.status === 'ready') {
    return;
  }

  try {
    await client.connect();
    logger.info('Connected to Redis');
  } catch (error) {
    client.disconnect();
    logger.error('Redis connection error:', error);
    throw error;
  }
};

export const disconnectRedis = async (
  client: Redis = redisClient
): Promise<void> => {
  if (client.status === 'end') {
    return;
  }

  if (client.status !== 'ready') {
    client.disconnect();
    logger.info('Disconnected from Redis');
    return;
  }

  try {
    await client.quit();
    logger.info('Disconnected from Redis');
  } catch (error) {
    client.disconnect();
    logger.error('Redis disconnection error:', error);
    throw error;
  }
};

export default redisClient;
