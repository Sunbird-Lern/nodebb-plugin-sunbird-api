const redisConnection = require.main.require('./src/database/redis/connection');
const _ = require('lodash');
let redisClient;

const redis = {
    connect: async (connectionObj) => {
        console.log('Redis db connection', JSON.stringify(connectionObj));
        connectionObj.redis.database = parseInt(_.get(connectionObj, 'redis.database')) + 1;
        const connection = await redisConnection.connect(connectionObj.redis);
        redisClient = {'client' : connection};
        require.main.require('./src/database/redis/hash')(redisClient);
        require.main.require('./src/database/redis/main')(redisClient);
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
            const nodebbData = await redisClient.getObject(key);
            console.log("context_key: ", key, " Nodebb returns: ", nodebbData ? JSON.stringify(nodebbData) : nodebbData);
            return nodebbData ? Array.of(nodebbData) : [];
        } catch(error) {
            throw error;
        }
    },
    removeContext: async (context) => {
        try {
            const id = Array.isArray(context.sbIdentifier) ? context.sbIdentifier[0] : context.sbIdentifier;
            const key = `sbCategory:${context.sbType}:${id}`;
            const deleteForum = await redisClient.delete(key);
            redisClient.objectCache.del(key);
            console.log("context_remove_key: ", key);
            return 1;
        } catch(error) {
            throw error;
        }
    } 
}

module.exports = redis;