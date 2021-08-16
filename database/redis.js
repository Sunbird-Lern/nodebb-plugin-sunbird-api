const configData = require.main.require('./config.json');
const redisConnection = require.main.require('./src/database/redis/connection');

configData.redis.database = '1';
const redis = redisConnection.connect(configData.redis);
const redisClient = {'client' : redis};


require.main.require('./src/database/redis/hash')(redisClient);
require.main.require('./src/database/redis/main')(redisClient);
require.main.require('./src/database/redis/promisify')(redisClient.client);


module.exports = redisClient;