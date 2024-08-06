import { createClient } from 'redis';
import { promisify } from 'util';

class RedisClient {
  constructor() {
    this.client = createClient();
    this.client.on('error', (err) => {
      console.error('err is', err);
    });
    this.client.on('connect', () => {
      // console.log('Redis client connected to the server');
    });
    this.asyncget = promisify(this.client.get).bind(this.client);
  }

  isAlive() {
    return this.client.connected;
  }

  async get(key) {
    if (typeof key !== 'string') {
      return null;
    }

    try {
      const value = await this.asyncget(key);
      return value;
    } catch (error) {
      console.error(error.message);
      return null;
    }
  }

  async set(key, value, duration) {
    const setAsync = promisify(this.client.set).bind(this.client);
    try {
      await setAsync(key, value, 'EX', duration);
      // console.log(reply)
    } catch (error) {
      console.error(error);
    }
  }

  async del(key) {
    const delAsync = promisify(this.client.del).bind(this.client);
    try {
      await delAsync(key);
      // console.log(`Deleted key ${key}`);
    } catch (err) {
      console.error('Error deleting key:', err);
      throw err;
    }
  }
}

const redisClient = new RedisClient();
module.exports = redisClient;
