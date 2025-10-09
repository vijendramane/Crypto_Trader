const redis = require('redis');
const { logger } = require('./logger');

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      const redisOptions = {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            logger.error('Redis server connection refused');
            return new Error('Redis server connection refused');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            logger.error('Redis retry time exhausted');
            return new Error('Redis retry time exhausted');
          }
          if (options.attempt > 10) {
            return undefined;
          }
          // Reconnect after
          return Math.min(options.attempt * 100, 3000);
        }
      };

      if (process.env.REDIS_PASSWORD) {
        redisOptions.password = process.env.REDIS_PASSWORD;
      }

      this.client = redis.createClient(redisOptions);

      this.client.on('connect', () => {
        logger.info('Redis client connected');
        this.isConnected = true;
      });

      this.client.on('error', (err) => {
        logger.error('Redis client error:', err);
        this.isConnected = false;
      });

      this.client.on('end', () => {
        logger.info('Redis client disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
      
      // Test the connection
      await this.client.ping();
      logger.info('Redis connection established successfully');
      
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      this.isConnected = false;
      
      // If Redis is not available, we'll continue without caching
      if (process.env.NODE_ENV === 'production') {
        throw error;
      }
    }
  }

  async get(key) {
    if (!this.isConnected || !this.client) {
      return null;
    }

    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis get error:', error);
      return null;
    }
  }

  async set(key, value, expireInSeconds = 3600) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const serializedValue = JSON.stringify(value);
      await this.client.setEx(key, expireInSeconds, serializedValue);
      return true;
    } catch (error) {
      logger.error('Redis set error:', error);
      return false;
    }
  }

  async del(key) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error('Redis delete error:', error);
      return false;
    }
  }

  async exists(key) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis exists error:', error);
      return false;
    }
  }

  async flushall() {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      await this.client.flushAll();
      return true;
    } catch (error) {
      logger.error('Redis flush error:', error);
      return false;
    }
  }

  async quit() {
    if (this.client) {
      try {
        await this.client.quit();
        this.isConnected = false;
        logger.info('Redis client disconnected gracefully');
      } catch (error) {
        logger.error('Error disconnecting Redis client:', error);
      }
    }
  }

  // Utility methods for common cache patterns
  async cacheUserStrategies(userId, strategies, expireInSeconds = 300) {
    const key = `user:${userId}:strategies`;
    return await this.set(key, strategies, expireInSeconds);
  }

  async getCachedUserStrategies(userId) {
    const key = `user:${userId}:strategies`;
    return await this.get(key);
  }

  async invalidateUserCache(userId) {
    const patterns = [
      `user:${userId}:strategies`,
      `user:${userId}:profile`
    ];

    for (const pattern of patterns) {
      await this.del(pattern);
    }
  }

  async cachePublicStrategies(strategies, expireInSeconds = 600) {
    const key = 'strategies:public';
    return await this.set(key, strategies, expireInSeconds);
  }

  async getCachedPublicStrategies() {
    const key = 'strategies:public';
    return await this.get(key);
  }

  async invalidatePublicStrategiesCache() {
    await this.del('strategies:public');
  }
}

// Create a singleton instance
const redisClient = new RedisClient();

// Cache middleware
const cacheMiddleware = (keyGenerator, expireInSeconds = 300) => {
  return async (req, res, next) => {
    if (!process.env.ENABLE_REDIS_CACHING || process.env.ENABLE_REDIS_CACHING !== 'true') {
      return next();
    }

    try {
      const key = keyGenerator(req);
      const cachedData = await redisClient.get(key);

      if (cachedData) {
        logger.debug(`Cache hit for key: ${key}`);
        return res.json({
          success: true,
          data: cachedData,
          cached: true
        });
      }

      // If no cache, continue to next middleware but add cache method to response
      res.cache = async (data) => {
        await redisClient.set(key, data, expireInSeconds);
        logger.debug(`Data cached for key: ${key}`);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      next();
    }
  };
};

module.exports = {
  redisClient,
  cacheMiddleware
};