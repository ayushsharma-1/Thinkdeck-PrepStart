const redis = require('redis');
const logger = require('../utils/logger');

let client = null;
let isConnected = false;

const connectRedis = async () => {
  if (isConnected && client) {
    logger.info('Redis already connected');
    return client;
  }

  try {
    client = redis.createClient({
      url: process.env.REDIS_URL,
      socket: {
        connectTimeout: 10000,
        lazyConnect: true,
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            logger.error('Redis connection failed after 3 retries');
            return new Error('Redis connection failed');
          }
          return Math.min(retries * 50, 500);
        }
      }
    });

    // Event listeners
    client.on('connect', () => {
      logger.info('Redis client connecting...');
    });

    client.on('ready', () => {
      logger.info('Redis client ready');
      isConnected = true;
    });

    client.on('error', (error) => {
      logger.error('Redis client error:', error);
      isConnected = false;
    });

    client.on('end', () => {
      logger.warn('Redis client connection ended');
      isConnected = false;
    });

    await client.connect();
    return client;

  } catch (error) {
    logger.error('Redis connection failed:', error);
    throw error;
  }
};

const getRedisClient = () => {
  if (!client || !isConnected) {
    throw new Error('Redis client not connected');
  }
  return client;
};

const disconnectRedis = async () => {
  if (client) {
    try {
      await client.disconnect();
      isConnected = false;
      logger.info('Redis connection closed');
    } catch (error) {
      logger.error('Error closing Redis connection:', error);
    }
  }
};

module.exports = { connectRedis, getRedisClient, disconnectRedis };
