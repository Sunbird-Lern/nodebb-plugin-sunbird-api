const redisConnection = require.main.require('./src/database/redis/connection');
const _ = require('lodash');
let redisClient;

const redis = {
    connect: (connectionObj) => {
        console.log('Redis db connection', JSON.stringify(connectionObj));
        connectionObj.redis.database = _.get(connectionObj, 'redis.secondarydb') || 11;
        const connection = redisConnection.connect(connectionObj.redis);
        redisClient = {'client' : connection};
        require.main.require('./src/database/redis/hash')(redisClient);
        require.main.require('./src/database/redis/main')(redisClient);
        require.main.require('./src/database/redis/promisify')(redisClient.client);
        console.log('Redis db connected.')
    },
    save: async (context) => {
        try {
            const key = `sbCategory:${context.sbType}:${context.sbIdentifier}`;
            context.cid = Array.isArray(context.cid) ? context.cid[0] : context.cid;
            const setData = await redisClient.setObject(key , context);
            const data = await redisClient.getObject(key);
            return data;
        } catch(error) {
            throw error
        }
    },
    getContext: async (context) => {
        try {
            const id = Array.isArray(context.identifier) ? context.identifier[0] : context.identifier;
            const key = `sbCategory:${context.type}:${id}`;
            const data = await redisClient.getObject(key);
            return data ? Array.of(data) : [];
        } catch(error) {
            throw error;
        }

    },
    removeContext: async (context) => {
        try {
            const id = Array.isArray(context.sbIdentifier) ? context.sbIdentifier[0] : context.sbIdentifier;
            const key = `sbCategory:${context.sbType}:${id}`;
            const deleteForum = await redisClient.client.async.del(key);
            redisClient.objectCache.del(key);
            return deleteForum;
        } catch(error) {
            throw error;
        }
    } 
}

module.exports = redis;