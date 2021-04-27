/* eslint-disable no-console */
import { DataSource } from 'apollo-datasource';
import {Client} from 'memjs';
import genericPool from 'generic-pool'


const maxConnections = 
  process.env.MAX_MEMCACHE_CONNECTIONS ?
    parseInt(process.env.MAX_MEMCACHE_CONNECTIONS) :
    20

const pool = genericPool.createPool({
  create() {
    return Promise.resolve(
      Client.create(process.env.MEMCACHEDCLOUD_SERVERS, {
        username: process.env.MEMCACHEDCLOUD_USERNAME,
        password: process.env.MEMCACHEDCLOUD_PASSWORD,
        retries: 0,
        keepAlive: true,
      })
    )
  },
  async destroy(client) {
    await client.quit()
  },
},
{
  min: 1,
  max: maxConnections,
  autostart: true,
})

const parseKey = (key) => {
  if (Array.isArray(key)) {
    return key.join(':');
  }
  return key;
};

export default class Cache extends DataSource {

  // 24 hours in seconds.
  DEFAULT_TIMEOUT = 86400;

  safely = async (func) => {
    return await pool.use(async (client) => {
      try {
        const result = await func(client);
        return result;
      } catch (e) {
        console.error(e);
        return null;
      }
    })
  };

  async set({ key, data, expires = this.DEFAULT_TIMEOUT }) {
    return this.safely((client) => {
      if (data === undefined || data === null) {
        return client.delete(parseKey(key))
      }
      return client.set(parseKey(key), JSON.stringify(data), { expires })
    });
  }

  async get({ key }) {
    return this.safely(async (client) => {
      const data = await client.get(parseKey(key));
      if (!data.value) {
        return null
      }
      return JSON.parse(data.value.toString());
    });
  }
}